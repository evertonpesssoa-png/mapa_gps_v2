// ======================================
// POIS MANAGER - SISTEMA DE 4 CAMADAS
// ======================================

// ======================================
// ESTADO DAS APIs
// ======================================

const API_STATUS = {
    ACTIVE: 'active',
    DEGRADED: 'degraded',
    BLOCKED: 'blocked',
    QUOTA_EXCEEDED: 'quota'
};

const apiState = {
    google: {
        status: API_STATUS.ACTIVE,
        dailyCount: 0,
        monthlyCount: 0,
        lastError: null,
        lastSuccess: null,
        blockedUntil: null
    },
    mapbox: {
        status: API_STATUS.ACTIVE,
        dailyCount: 0,
        lastError: null,
        lastSuccess: null
    },
    osm: {
        status: API_STATUS.ACTIVE,
        lastError: null,
        lastSuccess: null
    }
};

// Limites (seguros)
const LIMITS = {
    google: {
        maxMonthly: 4800,      // Seguro (5k - margem)
        maxDaily: 160,         // 4800 / 30
        cooldownMinutes: 5     // Se falhar, espera 5 min
    },
    mapbox: {
        maxDaily: 3000
    },
    osm: {
        rateLimitMs: 1000      // 1 requisição por segundo
    }
};

// Cache para evitar buscas repetidas
const cache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutos

// ======================================
// FUNÇÃO PARA OBTER ZOOM ATUAL
// ======================================

function getZoomAtual() {
    return window.map ? window.map.getZoom() : 15;
}

// ======================================
// FUNÇÃO PRINCIPAL DE BUSCA
// ======================================

async function searchPOIs(lat, lng, type = 'all', radius = 1000) {
    const startTime = performance.now();
    const results = [];
    const zoomAtual = getZoomAtual();
    
    // Verificar cache primeiro
    const cacheKey = `${lat},${lng},${type},${radius},${zoomAtual}`;
    if (cache.has(cacheKey)) {
        const cached = cache.get(cacheKey);
        if (Date.now() - cached.timestamp < CACHE_TTL) {
            console.log(`📦 Cache hit para ${cacheKey}`);
            return cached.results;
        }
        cache.delete(cacheKey);
    }
    
    console.log(`🔍 Buscando POIs para ${lat},${lng} - Tipo: ${type} - Zoom: ${zoomAtual}`);
    
    // 1. POIs MANUAIS (SEMPRE - com controle de zoom)
    const manualPOIs = await buscarPOIsManuais(lat, lng, type, radius, zoomAtual);
    results.push(...manualPOIs);
    console.log(`📌 Manuais: ${manualPOIs.length} POIs (zoom ${zoomAtual})`);
    
    // 2. GOOGLE (se ativo)
    if (apiState.google.status !== API_STATUS.BLOCKED && 
        apiState.google.status !== API_STATUS.QUOTA_EXCEEDED) {
        
        const googleResult = await buscarComGoogle(lat, lng, type, radius);
        if (googleResult.success) {
            results.push(...googleResult.data);
            console.log(`🌎 Google: ${googleResult.data.length} POIs`);
        } else if (googleResult.quotaExceeded) {
            apiState.google.status = API_STATUS.QUOTA_EXCEEDED;
            apiState.google.blockedUntil = getNextMonthDate();
            console.log(`🚫 Google - Cota esgotada até ${apiState.google.blockedUntil}`);
        }
    }
    
    // 3. MAPBOX (fallback)
    if (results.length < 5 && apiState.mapbox.status !== API_STATUS.BLOCKED) {
        const mapboxResult = await buscarComMapbox(lat, lng, type, radius);
        if (mapboxResult.success) {
            results.push(...mapboxResult.data);
            console.log(`🗺️ Mapbox: ${mapboxResult.data.length} POIs`);
        } else if (mapboxResult.degraded) {
            apiState.mapbox.status = API_STATUS.DEGRADED;
        }
    }
    
    // 4. OPENSTREETMAP (último recurso)
    if (results.length < 3 && apiState.osm.status !== API_STATUS.BLOCKED) {
        const osmResult = await buscarComOSM(lat, lng, type, radius);
        if (osmResult.success) {
            results.push(...osmResult.data);
            console.log(`🌿 OSM: ${osmResult.data.length} POIs`);
        }
    }
    
    // Remover duplicatas (baseado em nome + coordenadas aproximadas)
    const uniqueResults = removeDuplicates(results);
    
    const duration = performance.now() - startTime;
    console.log(`✅ Total: ${uniqueResults.length} POIs únicos (${duration.toFixed(0)}ms)`);
    
    // Salvar no cache
    cache.set(cacheKey, {
        timestamp: Date.now(),
        results: uniqueResults
    });
    
    return uniqueResults;
}

// ======================================
// BUSCA COM GOOGLE PLACES API
// ======================================

async function buscarComGoogle(lat, lng, type, radius) {
    // Verificar rate limit diário/mensal
    if (apiState.google.dailyCount >= LIMITS.google.maxDaily) {
        return { success: false, quotaExceeded: true, data: [] };
    }
    
    // Verificar cooldown de erro
    if (apiState.google.lastError && 
        (Date.now() - apiState.google.lastError) < LIMITS.google.cooldownMinutes * 60 * 1000) {
        return { success: false, data: [], error: 'cooldown' };
    }
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    
    try {
        // URL real da Google Places API
        const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=${type}&key=${window.GOOGLE_PLACES_API_KEY}`;
        
        const response = await fetch(url, {
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.status === 'REQUEST_DENIED') {
            console.error('❌ Google Places - Chave inválida ou restrita');
            return { success: false, data: [], error: 'invalid_key' };
        }
        
        if (data.status === 'OVER_QUERY_LIMIT') {
            console.error('❌ Google Places - Cota excedida');
            return { success: false, quotaExceeded: true, data: [] };
        }
        
        apiState.google.dailyCount++;
        apiState.google.monthlyCount++;
        apiState.google.lastSuccess = Date.now();
        apiState.google.status = API_STATUS.ACTIVE;
        
        const pois = (data.results || []).map(place => ({
            id: place.place_id,
            name: place.name,
            lat: place.geometry.location.lat,
            lng: place.geometry.location.lng,
            category: place.types[0],
            address: place.vicinity,
            rating: place.rating,
            userRatingsTotal: place.user_ratings_total,
            source: 'google'
        }));
        
        return { success: true, data: pois };
        
    } catch (error) {
        clearTimeout(timeoutId);
        apiState.google.lastError = Date.now();
        
        if (error.name === 'AbortError') {
            console.warn('⏱️ Google timeout');
        }
        
        return { success: false, data: [], error: error.message };
    }
}

// ======================================
// BUSCA COM MAPBOX API
// ======================================

async function buscarComMapbox(lat, lng, type, radius) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    
    try {
        const token = window.MAPBOX_TOKEN || 'pk.eyJ1IjoiZXZlcnRvbnBlc3NvYTg4IiwiYSI6ImNtcGRmMTk5czBiYWEycG9sd2NlZ3RxdWsifQ.W7ayNU1STdXgV-cqNJ1AKA';
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?proximity=${lng},${lat}&types=poi&limit=20&access_token=${token}`;
        
        const response = await fetch(url, {
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        apiState.mapbox.lastSuccess = Date.now();
        
        const pois = (data.features || []).map(feature => ({
            id: feature.id,
            name: feature.properties.name || feature.properties.address || 'Local',
            lat: feature.geometry.coordinates[1],
            lng: feature.geometry.coordinates[0],
            category: feature.properties.category || 'poi',
            address: feature.properties.address,
            source: 'mapbox'
        }));
        
        return { success: true, data: pois };
        
    } catch (error) {
        clearTimeout(timeoutId);
        apiState.mapbox.lastError = Date.now();
        return { success: false, data: [], degraded: true };
    }
}

// ======================================
// BUSCA COM OPENSTREETMAP (Overpass API)
// ======================================

async function buscarComOSM(lat, lng, type, radius) {
    // Rate limiting - 1 requisição por segundo
    await new Promise(resolve => setTimeout(resolve, LIMITS.osm.rateLimitMs));
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    try {
        const radiusDeg = radius / 111000;
        
        const bbox = [
            lng - radiusDeg,
            lat - radiusDeg,
            lng + radiusDeg,
            lat + radiusDeg
        ].join(',');
        
        const overpassQuery = `
            [out:json][timeout:25];
            (
                node["amenity"](${bbox});
                node["shop"](${bbox});
                node["tourism"](${bbox});
                node["leisure"](${bbox});
            );
            out center;
        `;
        
        const response = await fetch('https://overpass-api.de/api/interpreter', {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: overpassQuery,
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        const pois = (data.elements || []).map(element => ({
            id: element.id,
            name: element.tags?.name || 'Local sem nome',
            lat: element.lat || element.center?.lat,
            lng: element.lon || element.center?.lon,
            type: element.tags?.amenity || element.tags?.shop || 'poi',
            category: element.tags?.amenity || element.tags?.shop,
            source: 'openstreetmap'
        }));
        
        return { success: true, data: pois };
        
    } catch (error) {
        clearTimeout(timeoutId);
        console.error('Erro OSM:', error);
        return { success: false, data: [] };
    }
}

// ======================================
// FUNÇÕES AUXILIARES
// ======================================

function removeDuplicates(pois) {
    const seen = new Map();
    
    return pois.filter(poi => {
        const key = `${poi.name}|${Math.round(poi.lat * 1000)}|${Math.round(poi.lng * 1000)}`;
        if (seen.has(key)) return false;
        seen.set(key, true);
        return true;
    });
}

function getNextMonthDate() {
    const date = new Date();
    date.setMonth(date.getMonth() + 1);
    date.setDate(1);
    return date;
}

function verificarResetMensal() {
    const hoje = new Date();
    const ultimoReset = localStorage.getItem('google_last_reset');
    
    if (!ultimoReset || new Date(ultimoReset).getMonth() !== hoje.getMonth()) {
        console.log('🔄 Reset mensal do Google detectado');
        apiState.google.status = API_STATUS.ACTIVE;
        apiState.google.dailyCount = 0;
        apiState.google.monthlyCount = 0;
        apiState.google.blockedUntil = null;
        localStorage.setItem('google_last_reset', hoje.toISOString());
    }
}

// ======================================
// FUNÇÃO PARA ATUALIZAR POIs NO MAPA
// ======================================

async function loadPOIsToMap(lat, lng) {
    if (!window.map || !window.poiLayer) return;
    
    const loadingDiv = document.getElementById('pois-loading');
    if (loadingDiv) loadingDiv.style.display = 'block';
    
    try {
        const zoom = getZoomAtual();
        const pois = await searchPOIs(lat, lng, 'all', 2000);
        
        if (window.poiLayer) {
            window.poiLayer.clearLayers();
        }
        
        pois.forEach(poi => {
            let iconChar = '📍';
            let borderColor = '#ff4db8';
            
            if (poi.source === 'manual') {
                const iconMap = {
                    'hospital': '🏥', 'police': '👮', 'policeman': '🚓',
                    'pharmacy': '💊', 'gas': '⛽', 'supermarket': '🛒',
                    'home': '🏠', 'mechanic': '🔧', 'medical': '🏥'
                };
                iconChar = poi.icon || iconMap[poi.category] || '📌';
                borderColor = '#ff4db8';
            } else if (poi.source === 'google') {
                borderColor = '#4285f4';
                iconChar = '🌎';
            } else if (poi.source === 'mapbox') {
                borderColor = '#3b82f6';
                iconChar = '🗺️';
            } else if (poi.source === 'openstreetmap') {
                borderColor = '#22c55e';
                iconChar = '🌿';
            }
            
            const customIcon = L.divIcon({
                className: 'poi-marker',
                html: `<div style="background: white; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.2); border: 2px solid ${borderColor}; font-size: 16px;">${iconChar}</div>`,
                iconSize: [32, 32],
                iconAnchor: [16, 16],
                popupAnchor: [0, -16]
            });
            
            const marker = L.marker([poi.lat, poi.lng], { icon: customIcon });
            
            const distancia = poi.distance ? `${(poi.distance / 1000).toFixed(1)}km` : '';
            const fonteText = {
                'manual': '📌 Manual',
                'google': '🌎 Google',
                'mapbox': '🗺️ Mapbox',
                'openstreetmap': '🌿 OSM'
            };
            
            marker.bindPopup(`
                <div style="min-width: 180px;">
                    <strong>${poi.name}</strong><br>
                    <span style="color: #666;">📌 ${poi.category || 'Ponto de interesse'}</span><br>
                    <span style="color: #888; font-size: 11px;">📡 ${fonteText[poi.source] || poi.source}</span>
                    ${distancia ? `<br><span style="color: #888; font-size: 11px;">📏 ${distancia}</span>` : ''}
                    ${poi.address ? `<br><span style="color: #888; font-size: 11px;">📍 ${poi.address}</span>` : ''}
                    ${poi.rating ? `<br><span style="color: #f59e0b; font-size: 11px;">⭐ ${poi.rating}</span>` : ''}
                </div>
            `);
            
            marker.addTo(window.poiLayer);
        });
        
        console.log(`🗺️ ${pois.length} POIs carregados no mapa (zoom: ${zoom})`);
        
    } catch (error) {
        console.error('Erro ao carregar POIs:', error);
    } finally {
        if (loadingDiv) loadingDiv.style.display = 'none';
    }
}

// ======================================
// INICIALIZAÇÃO
// ======================================

// Verificar reset mensal ao carregar
verificarResetMensal();

// Exportar funções
window.searchPOIs = searchPOIs;
window.loadPOIsToMap = loadPOIsToMap;
window.apiState = apiState;
window.getZoomAtual = getZoomAtual;

console.log('✅ POIs Manager - Sistema de 4 camadas carregado');
console.log('📍 POIs manuais integrados com controle de zoom');