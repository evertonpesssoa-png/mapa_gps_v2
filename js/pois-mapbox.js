// ======================================
// MAPBOX SEARCH API (FALLBACK)
// ======================================

// Cadastre-se em: https://account.mapbox.com/auth/signup/
// Cole seu token aqui:
const MAPBOX_SEARCH_TOKEN = 'SEU_TOKEN_MAPBOX_AQUI';

async function buscarMapboxPOIs(lat, lng, type, radius) {
    if (!MAPBOX_SEARCH_TOKEN || MAPBOX_SEARCH_TOKEN === 'SEU_TOKEN_MAPBOX_AQUI') {
        console.warn('⚠️ Mapbox token não configurado');
        return { success: false, data: [] };
    }
    
    const categories = getMapboxCategories(type);
    const promises = categories.map(cat => 
        fetch(`https://api.mapbox.com/search/searchbox/v1/category/${cat}?proximity=${lng},${lat}&limit=10&access_token=${MAPBOX_SEARCH_TOKEN}`)
            .then(r => r.json())
    );
    
    const results = await Promise.all(promises);
    const allFeatures = results.flatMap(r => r.features || []);
    
    const pois = allFeatures.map(feature => ({
        id: feature.id,
        name: feature.properties.name || feature.properties.address,
        lat: feature.geometry.coordinates[1],
        lng: feature.geometry.coordinates[0],
        category: feature.properties.category,
        address: feature.properties.address,
        source: 'mapbox'
    }));
    
    return { success: true, data: pois };
}

function getMapboxCategories(generalType) {
    const categories = {
        'farmácia': ['pharmacy'],
        'restaurante': ['restaurant'],
        'mercado': ['grocery'],
        'posto': ['fuel'],
        'all': ['pharmacy', 'restaurant', 'grocery', 'fuel', 'hospital', 'cafe', 'bank']
    };
    return categories[generalType] || categories['all'];
}

window.buscarMapboxPOIs = buscarMapboxPOIs;