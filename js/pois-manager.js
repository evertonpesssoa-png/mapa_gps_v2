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
// FUNÇÃO PRINCIPAL DE BUSCA
// ======================================

async function searchPOIs(lat, lng, type = 'all', radius = 1000) {
    const startTime = performance.now();
    const results = [];
    
    // Verificar cache primeiro
    const cacheKey = `${lat},${lng},${type},${radius}`;
    if (cache.has(cacheKey)) {
        const cached = cache.get(cacheKey);
        if (Date.now() - cached.timestamp < CACHE_TTL) {
            console.log(`📦 Cache hit para ${cacheKey}`);
            return cached.results;
        }
        cache.delete(cacheKey);
    }
    
    console.log(`🔍 Buscando POIs para ${lat},${lng} - Tipo: ${type}`);
    
    // 1. POIs MANUAIS (SEMPRE)
    const manualPOIs = await buscarPOIsManuais(lat, lng, type, radius);
    results.push(...manualPOIs);
    console.log(`📌 Manuais: ${manualPOIs.length} POIs`);
    
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
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout
    
    try {
        // Placeholder - você precisará da chave do Google
        const response = await fetch(`/api/places?lat=${lat}&lng=${lng}&radius=${radius}&type=${type}`, {
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        apiState.google.dailyCount++;
        apiState.google.monthlyCount++;
        apiState.google.lastSuccess = Date.now();
        apiState.google.status = API_STATUS.ACTIVE;
        
        return { success: true, data: data.results || [] };
        
    } catch (error) {
        clearTimeout(timeoutId);
        apiState.google.lastError = Date.now();
        
        if (error.name === 'AbortError') {
            console.warn('⏱️ Google timeout');
        } else if (error.message?.includes('OVER_QUERY_LIMIT')) {
            return { success: false, quotaExceeded: true, data: [] };
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
        // Placeholder - você precisará da chave do Mapbox
        const response = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?proximity=${lng},${lat}&types=poi&limit=20&access_token=SEU_TOKEN`, {
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        apiState.mapbox.lastSuccess = Date.now();
        
        return { success: true, data: data.features || [] };
        
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
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout
    
    try {
        // Converter radius para graus (aprox 1km = 0.009 graus)
        const radiusDeg = radius / 111000;
        
        const bbox = [
            lng - radiusDeg,
            lat - radiusDeg,
            lng + radiusDeg,
            lat + radiusDeg
        ].join(',');
        
        // Query Overpass para buscar POIs
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

// Verificar reset do Google no início do mês
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
    
    // Mostrar loading
    const loadingDiv = document.getElementById('pois-loading');
    if (loadingDiv) loadingDiv.style.display = 'block';
    
    try {
        const pois = await searchPOIs(lat, lng, 'all', 2000);
        
        // Limpar POIs existentes
        if (window.poiLayer) {
            window.poiLayer.clearLayers();
        }
        
        // Adicionar POIs ao mapa
        pois.forEach(poi => {
            const marker = L.marker([poi.lat, poi.lng]);
            
            // Popup com informações
            marker.bindPopup(`
                <strong>${poi.name}</strong><br>
                ${poi.category ? `📌 ${poi.category}` : ''}<br>
                <small>📡 ${poi.source || 'manual'}</small>
            `);
            
            marker.addTo(window.poiLayer);
        });
        
        console.log(`🗺️ ${pois.length} POIs carregados no mapa`);
        
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

console.log('✅ POIs Manager - Sistema de 4 camadas carregado');