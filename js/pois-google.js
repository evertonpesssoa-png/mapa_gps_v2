// ======================================
// GOOGLE PLACES API
// ======================================

// Cadastre-se em: https://developers.google.com/maps/documentation/places/web-service/get-api-key
// Cole sua chave aqui:
const GOOGLE_PLACES_API_KEY = 'AIzaSyA6GDAM87dX4pxDBpN742a47Ho-lJwqGnU';

async function buscarGooglePlaces(lat, lng, type, radius) {
    if (!GOOGLE_PLACES_API_KEY || GOOGLE_PLACES_API_KEY === 'AIzaSyA6GDAM87dX4pxDBpN742a47Ho-lJwqGnU') {
        console.warn('⚠️ Google Places API key não configurada');
        return { success: false, data: [] };
    }
    
    const types = getGooglePlaceTypes(type);
    const promises = types.map(t => 
        fetch(`https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=${t}&key=${GOOGLE_PLACES_API_KEY}`)
            .then(r => r.json())
    );
    
    const results = await Promise.all(promises);
    const allPlaces = results.flatMap(r => r.results || []);
    
    const pois = allPlaces.map(place => ({
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
    
    console.log(`🌎 Google Places: ${pois.length} POIs encontrados`);
    return { success: true, data: pois };
}

function getGooglePlaceTypes(generalType) {
    const types = {
        'farmácia': ['pharmacy'],
        'restaurante': ['restaurant', 'cafe'],
        'mercado': ['supermarket', 'grocery'],
        'posto': ['gas_station'],
        'hospital': ['hospital', 'doctor'],
        'all': ['pharmacy', 'restaurant', 'supermarket', 'gas_station', 'hospital', 'cafe', 'bank', 'atm', 'store']
    };
    return types[generalType] || types['all'];
}

window.buscarGooglePlaces = buscarGooglePlaces;

console.log('✅ Google Places API carregada com chave configurada');