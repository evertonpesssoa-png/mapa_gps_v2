// ======================================
// GOOGLE PLACES API
// ======================================

// SUA CHAVE API DO GOOGLE PLACES
const GOOGLE_PLACES_API_KEY = 'AIzaSyA6GDAM87dX4pxDBpN742a47Ho-lJwqGnU';

// Contador de requisições para diagnóstico
let googleRequestsCount = 0;
let googleErrorsCount = 0;
let googleSuccessCount = 0;

// ======================================
// BUSCAR GOOGLE PLACES
// ======================================

async function buscarGooglePlaces(lat, lng, type, radius) {
    if (!GOOGLE_PLACES_API_KEY || GOOGLE_PLACES_API_KEY === 'AIzaSyA6GDAM87dX4pxDBpN742a47Ho-lJwqGnU') {
        console.warn('⚠️ Google Places API key não configurada');
        return { success: false, data: [], error: 'no_key' };
    }
    
    googleRequestsCount++;
    console.log(`🌎 Google Places: Requisição #${googleRequestsCount} para ${lat},${lng} - Tipo: ${type}`);
    
    const types = getGooglePlaceTypes(type);
    
    try {
        // Buscar todas as categorias em paralelo
        const promises = types.map(t => 
            fetch(`https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=${t}&key=${GOOGLE_PLACES_API_KEY}`)
                .then(r => r.json())
                .catch(err => ({ error: err, type: t }))
        );
        
        const results = await Promise.all(promises);
        
        // Verificar erros
        const hasError = results.some(r => r.error || r.status === 'REQUEST_DENIED');
        if (hasError) {
            const errorResult = results.find(r => r.error || r.status === 'REQUEST_DENIED');
            console.error('❌ Google Places erro:', errorResult);
            googleErrorsCount++;
            
            if (errorResult.status === 'REQUEST_DENIED') {
                console.error('🔑 Chave da API inválida ou restrita! Verifique no Google Cloud Console');
                console.error('   Chave atual:', GOOGLE_PLACES_API_KEY);
                return { success: false, data: [], error: 'invalid_key' };
            }
            if (errorResult.status === 'OVER_QUERY_LIMIT') {
                console.error('📊 Cota do Google Places excedida!');
                return { success: false, data: [], error: 'quota_exceeded' };
            }
        }
        
        const allPlaces = results.flatMap(r => r.results || []);
        
        const pois = allPlaces.map(place => ({
            id: place.place_id,
            name: place.name,
            lat: place.geometry.location.lat,
            lng: place.geometry.location.lng,
            category: place.types[0],
            friendlyCategory: getFriendlyCategory(place.types[0]),
            address: place.vicinity,
            rating: place.rating,
            userRatingsTotal: place.user_ratings_total,
            openNow: place.opening_hours?.open_now,
            priceLevel: place.price_level,
            source: 'google'
        }));
        
        googleSuccessCount++;
        console.log(`🌎 Google Places: ${pois.length} POIs encontrados (✅ ${googleSuccessCount} | ❌ ${googleErrorsCount} | 📊 ${googleRequestsCount})`);
        
        return { success: true, data: pois };
        
    } catch (error) {
        console.error('❌ Erro na requisição Google Places:', error);
        googleErrorsCount++;
        return { success: false, data: [], error: error.message };
    }
}

// ======================================
// OBTER CATEGORIAS AMIGÁVEIS
// ======================================

function getFriendlyCategory(type) {
    const categories = {
        'pharmacy': 'Farmácia',
        'hospital': 'Hospital',
        'clinic': 'Clínica',
        'doctor': 'Consultório Médico',
        'police': 'Delegacia',
        'gas_station': 'Posto de Gasolina',
        'supermarket': 'Supermercado',
        'grocery': 'Mercado',
        'restaurant': 'Restaurante',
        'cafe': 'Cafeteria',
        'fast_food': 'Fast Food',
        'hotel': 'Hotel',
        'bank': 'Banco',
        'atm': 'Caixa Eletrônico',
        'school': 'Escola',
        'university': 'Universidade',
        'parking': 'Estacionamento',
        'bar': 'Bar',
        'bakery': 'Padaria',
        'pharmacy': 'Farmácia'
    };
    return categories[type] || type || 'Ponto de Interesse';
}

// ======================================
// MAPEAR TIPOS GERAIS PARA TIPOS DA API
// ======================================

function getGooglePlaceTypes(generalType) {
    const types = {
        'farmácia': ['pharmacy'],
        'farmacia': ['pharmacy'],
        'restaurante': ['restaurant', 'cafe'],
        'mercado': ['supermarket', 'grocery'],
        'posto': ['gas_station'],
        'hospital': ['hospital', 'doctor', 'clinic'],
        'polícia': ['police'],
        'police': ['police'],
        'banco': ['bank', 'atm'],
        'hotel': ['hotel'],
        'escola': ['school', 'university'],
        'all': ['pharmacy', 'restaurant', 'supermarket', 'gas_station', 'hospital', 'cafe', 'bank', 'atm', 'store', 'clinic', 'doctor', 'police', 'hotel', 'school']
    };
    return types[generalType] || types['all'];
}

// ======================================
// TESTAR CHAVE DIRETAMENTE (DIAGNÓSTICO)
// ======================================

async function testarGooglePlacesKey() {
    console.log('🔧 TESTANDO GOOGLE PLACES API KEY...');
    console.log('🔑 Chave:', GOOGLE_PLACES_API_KEY.substring(0, 10) + '...');
    
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=-23.5505,-46.6333&radius=1000&type=restaurant&key=${GOOGLE_PLACES_API_KEY}`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.status === 'OK') {
            console.log('✅✅✅ GOOGLE PLACES API KEY FUNCIONANDO! ✅✅✅');
            console.log(`   📦 Encontrou ${data.results.length} restaurantes em São Paulo`);
            console.log('   🎉 Tudo certo! Os POIs do Google vão aparecer no mapa!');
            return true;
        } else if (data.status === 'REQUEST_DENIED') {
            console.error('❌❌❌ GOOGLE PLACES API KEY INVÁLIDA OU RESTRITA! ❌❌❌');
            console.error('   🔧 Soluções:');
            console.error('   1. Verifique se a Places API está ativada no Google Cloud');
            console.error('   2. Adicione seu domínio nas restrições da chave');
            console.error('   3. Verifique se a chave está correta');
            console.error(`   Mensagem: ${data.error_message}`);
            return false;
        } else if (data.status === 'OVER_QUERY_LIMIT') {
            console.error('⚠️ COTA DO GOOGLE PLACES EXCEDIDA! Aguarde o próximo mês');
            return false;
        } else if (data.status === 'ZERO_RESULTS') {
            console.warn('⚠️ Nenhum resultado encontrado (API funciona, mas não achou nada)');
            return true;
        } else {
            console.warn('⚠️ Status inesperado:', data.status);
            return false;
        }
    } catch (error) {
        console.error('❌ Erro ao testar Google Places:', error);
        return false;
    }
}

// ======================================
// EXECUTAR TESTE AUTOMÁTICO APÓS 3 SEGUNDOS
// ======================================

setTimeout(() => {
    testarGooglePlacesKey();
}, 3000);

// ======================================
// EXPORTAR FUNÇÕES
// ======================================

window.buscarGooglePlaces = buscarGooglePlaces;
window.testarGooglePlacesKey = testarGooglePlacesKey;

console.log('✅ Google Places API carregada com sucesso!');
console.log('🔑 Chave configurada:', GOOGLE_PLACES_API_KEY.substring(0, 8) + '...');