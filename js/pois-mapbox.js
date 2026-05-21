// ======================================
// MAPBOX SEARCH API (FALLBACK)
// ======================================

// Seu token do Mapbox
const MAPBOX_SEARCH_TOKEN = 'pk.eyJ1IjoiZXZlcnRvbnBlc3NvYTg4IiwiYSI6ImNtcGRmMTk5czBiYWEycG9sd2NlZ3RxdWsifQ.W7ayNU1STdXgV-cqNJ1AKA';

// Cache para evitar buscas repetidas
const mapboxCache = new Map();
const MAPBOX_CACHE_TTL = 5 * 60 * 1000; // 5 minutos

// Contadores para diagnóstico
let mapboxRequestsCount = 0;
let mapboxErrorsCount = 0;
let mapboxSuccessCount = 0;

// ======================================
// BUSCAR POIS NO MAPBOX
// ======================================

async function buscarMapboxPOIs(lat, lng, type, radius) {
    if (!MAPBOX_SEARCH_TOKEN || MAPBOX_SEARCH_TOKEN === 'SEU_TOKEN_MAPBOX_AQUI') {
        console.warn('⚠️ Mapbox token não configurado');
        return { success: false, data: [], error: 'no_token' };
    }
    
    mapboxRequestsCount++;
    console.log(`🗺️ Mapbox: Requisição #${mapboxRequestsCount} para ${lat},${lng}`);
    
    // Verificar cache
    const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)},${type}`;
    if (mapboxCache.has(cacheKey)) {
        const cached = mapboxCache.get(cacheKey);
        if (Date.now() - cached.timestamp < MAPBOX_CACHE_TTL) {
            console.log(`📦 Mapbox cache hit: ${cached.data.length} POIs`);
            return { success: true, data: cached.data };
        }
        mapboxCache.delete(cacheKey);
    }
    
    const categories = getMapboxCategories(type);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    
    try {
        // Usar a API de Geocoding do Mapbox (mais estável)
        const promises = categories.map(cat => 
            fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(cat)}.json?proximity=${lng},${lat}&limit=10&access_token=${MAPBOX_SEARCH_TOKEN}`, {
                signal: controller.signal
            })
                .then(r => r.json())
                .catch(err => ({ error: err, category: cat }))
        );
        
        const results = await Promise.all(promises);
        clearTimeout(timeoutId);
        
        // Verificar erros
        const hasError = results.some(r => r.error);
        if (hasError) {
            console.error('❌ Mapbox erro:', results.find(r => r.error));
            mapboxErrorsCount++;
            return { success: false, data: [], degraded: true };
        }
        
        const allFeatures = results.flatMap(r => r.features || []);
        
        // Remover duplicatas
        const uniqueFeatures = [];
        const seen = new Set();
        for (const feature of allFeatures) {
            const key = `${feature.geometry.coordinates[0]},${feature.geometry.coordinates[1]}`;
            if (!seen.has(key)) {
                seen.add(key);
                uniqueFeatures.push(feature);
            }
        }
        
        const pois = uniqueFeatures.map(feature => ({
            id: feature.id,
            name: feature.text || feature.properties?.name || feature.place_name || 'Local',
            lat: feature.geometry.coordinates[1],
            lng: feature.geometry.coordinates[0],
            category: feature.properties?.category || feature.id?.split('.')[0] || 'poi',
            address: feature.place_name || '',
            source: 'mapbox'
        }));
        
        mapboxSuccessCount++;
        console.log(`🗺️ Mapbox: ${pois.length} POIs encontrados (✅ ${mapboxSuccessCount} | ❌ ${mapboxErrorsCount})`);
        
        // Salvar no cache
        mapboxCache.set(cacheKey, {
            timestamp: Date.now(),
            data: pois
        });
        
        return { success: true, data: pois };
        
    } catch (error) {
        clearTimeout(timeoutId);
        mapboxErrorsCount++;
        
        if (error.name === 'AbortError') {
            console.warn('⏱️ Mapbox timeout');
        } else {
            console.error('❌ Erro Mapbox:', error);
        }
        
        return { success: false, data: [], degraded: true, error: error.message };
    }
}

// ======================================
// MAPEAR CATEGORIAS PARA MAPBOX
// ======================================

function getMapboxCategories(generalType) {
    const categories = {
        'farmácia': ['pharmacy'],
        'farmacia': ['pharmacy'],
        'restaurante': ['restaurant'],
        'mercado': ['grocery', 'supermarket'],
        'posto': ['fuel', 'gas'],
        'hospital': ['hospital', 'clinic'],
        'padaria': ['bakery'],
        'hotel': ['hotel'],
        'banco': ['bank'],
        'all': ['pharmacy', 'restaurant', 'grocery', 'fuel', 'hospital', 'cafe', 'bank', 'hotel', 'bakery', 'clinic']
    };
    return categories[generalType] || categories['all'];
}

// ======================================
// TESTAR TOKEN DO MAPBOX
// ======================================

async function testarMapboxToken() {
    console.log('🔧 TESTANDO MAPBOX TOKEN...');
    
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/restaurant.json?proximity=-46.6333,-23.5505&limit=1&access_token=${MAPBOX_SEARCH_TOKEN}`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.features) {
            console.log('✅✅✅ MAPBOX TOKEN FUNCIONANDO! ✅✅✅');
            console.log('   🎉 Mapbox está pronto para fallback!');
            return true;
        } else if (data.message) {
            console.error('❌❌❌ MAPBOX TOKEN INVÁLIDO! ❌❌❌');
            console.error(`   Mensagem: ${data.message}`);
            return false;
        } else {
            console.warn('⚠️ Mapbox respondeu, mas formato inesperado');
            return true;
        }
    } catch (error) {
        console.error('❌ Erro ao testar Mapbox:', error);
        return false;
    }
}

// ======================================
// EXECUTAR TESTE AUTOMÁTICO APÓS 4 SEGUNDOS
// ======================================

setTimeout(() => {
    testarMapboxToken();
}, 4000);

// ======================================
// EXPORTAR FUNÇÕES
// ======================================

window.buscarMapboxPOIs = buscarMapboxPOIs;
window.testarMapboxToken = testarMapboxToken;

console.log('✅ Mapbox Search API carregada como fallback');