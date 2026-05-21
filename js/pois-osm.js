// ======================================
// OPENSTREETMAP OVERPASS API - ÚLTIMO RECURSO
// ======================================

// Configurações
const OSM_CONFIG = {
    endpoints: [
        'https://overpass-api.de/api/interpreter',
        'https://overpass.kumi.systems/api/interpreter',
        'https://overpass.openstreetmap.fr/api/interpreter'
    ],
    timeout: 15000,        // 15 segundos
    rateLimitMs: 1000,     // 1 requisição por segundo
    maxRetries: 2
};

// Cache para evitar requisições repetidas
const osmCache = new Map();
const OSM_CACHE_TTL = 30 * 60 * 1000; // 30 minutos
const MAX_CACHE_SIZE = 30;

// Controle de rate limiting
let lastRequestTime = 0;

// Contadores para diagnóstico
let osmRequestsCount = 0;
let osmErrorsCount = 0;
let osmSuccessCount = 0;

// ======================================
// FUNÇÃO PARA VERIFICAR TEMA ESCURO
// ======================================

function isDarkTheme() {
    return document.documentElement.getAttribute('data-theme') === 'dark';
}

// ======================================
// MAPEAMENTO DE CATEGORIAS
// ======================================

const categoryMapping = {
    'pharmacy': ['amenity=pharmacy'],
    'hospital': ['amenity=hospital', 'amenity=clinic', 'amenity=doctors'],
    'police': ['amenity=police'],
    'gas': ['amenity=fuel'],
    'supermarket': ['shop=supermarket', 'shop=grocery'],
    'restaurant': ['amenity=restaurant', 'amenity=cafe', 'amenity=fast_food'],
    'hotel': ['tourism=hotel', 'tourism=motel', 'tourism=hostel'],
    'bank': ['amenity=bank', 'amenity=atm'],
    'school': ['amenity=school', 'amenity=university'],
    'parking': ['amenity=parking'],
    'mechanic': ['shop=car_repair', 'amenity=vehicle_repair'],
    'medical': ['amenity=hospital', 'amenity=clinic', 'amenity=doctors', 'healthcare=yes'],
    'all': [
        'amenity=pharmacy', 'amenity=hospital', 'amenity=clinic', 'amenity=police',
        'amenity=fuel', 'shop=supermarket', 'shop=grocery', 'amenity=restaurant',
        'amenity=cafe', 'amenity=fast_food', 'tourism=hotel', 'amenity=bank',
        'amenity=school', 'amenity=parking', 'shop=car_repair'
    ]
};

// ======================================
// FUNÇÃO PARA ESPERAR (RATE LIMITING)
// ======================================

async function aguardarRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    if (timeSinceLastRequest < OSM_CONFIG.rateLimitMs) {
        const waitTime = OSM_CONFIG.rateLimitMs - timeSinceLastRequest;
        await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    lastRequestTime = Date.now();
}

// ======================================
// CONSTRUIR QUERY OVERPASS
// ======================================

function buildOverpassQuery(lat, lng, radius, type) {
    const radiusDeg = radius / 111000;
    
    const bbox = [
        lng - radiusDeg,
        lat - radiusDeg,
        lng + radiusDeg,
        lat + radiusDeg
    ].join(',');
    
    const tags = categoryMapping[type] || categoryMapping['all'];
    
    const tagQueries = tags.map(tag => {
        const [key, value] = tag.split('=');
        return `node["${key}"="${value}"](${bbox});`;
    }).join('\n  ');
    
    const query = `[out:json][timeout:25];
    (
      ${tagQueries}
    );
    out body center;
    >;
    out skel qt;`;
    
    return query;
}

// ======================================
// CONVERTER RESULTADO OVERPASS PARA POI
// ======================================

function convertOSMToPOI(element, distance) {
    let name = element.tags?.name || 
               element.tags?.['name:pt'] || 
               element.tags?.nome || 
               'Local sem nome';
    
    let category = 'poi';
    if (element.tags?.amenity) category = element.tags.amenity;
    else if (element.tags?.shop) category = element.tags.shop;
    else if (element.tags?.tourism) category = element.tags.tourism;
    else if (element.tags?.leisure) category = element.tags.leisure;
    
    const categoryMap = {
        'pharmacy': 'farmácia',
        'hospital': 'hospital',
        'clinic': 'clínica',
        'doctors': 'consultório',
        'police': 'delegacia',
        'fuel': 'posto de gasolina',
        'supermarket': 'supermercado',
        'grocery': 'mercado',
        'restaurant': 'restaurante',
        'cafe': 'cafeteria',
        'fast_food': 'fast food',
        'hotel': 'hotel',
        'motel': 'motel',
        'bank': 'banco',
        'atm': 'caixa eletrônico',
        'school': 'escola',
        'parking': 'estacionamento'
    };
    
    const friendlyCategory = categoryMap[category] || category;
    
    const lat = element.lat || element.center?.lat;
    const lon = element.lon || element.center?.lon;
    
    if (!lat || !lon) return null;
    
    return {
        id: `${element.type}_${element.id}`,
        name: name,
        lat: parseFloat(lat),
        lon: parseFloat(lon),
        lng: parseFloat(lon),
        category: category,
        friendlyCategory: friendlyCategory,
        address: element.tags?.addr_full || element.tags?.['addr:street'] || '',
        phone: element.tags?.phone || '',
        website: element.tags?.website || '',
        openingHours: element.tags?.opening_hours || '',
        distance: distance,
        source: 'openstreetmap',
        icon: getIconForCategoryOSM(category)
    };
}

// ======================================
// ÍCONE POR CATEGORIA (VERSÃO OSM)
// ======================================

function getIconForCategoryOSM(category) {
    const icons = {
        'pharmacy': '💊',
        'hospital': '🏥',
        'clinic': '🏥',
        'doctors': '👨‍⚕️',
        'police': '👮',
        'fuel': '⛽',
        'supermarket': '🛒',
        'grocery': '🛒',
        'restaurant': '🍽️',
        'cafe': '☕',
        'fast_food': '🍔',
        'hotel': '🏨',
        'motel': '🏨',
        'bank': '🏦',
        'atm': '💵',
        'school': '📚',
        'parking': '🅿️',
        'car_repair': '🔧',
        'vehicle_repair': '🔧'
    };
    return icons[category] || '📍';
}

// ======================================
// ADICIONAR AO CACHE COM LIMITE
// ======================================

function addToOsmCache(key, data) {
    if (osmCache.size >= MAX_CACHE_SIZE) {
        const firstKey = osmCache.keys().next().value;
        osmCache.delete(firstKey);
    }
    osmCache.set(key, data);
}

// ======================================
// FUNÇÃO PRINCIPAL DE BUSCA
// ======================================

async function buscarOSMPOIs(lat, lng, type = 'all', radius = 2000) {
    osmRequestsCount++;
    console.log(`🌿 OSM: Requisição #${osmRequestsCount} para ${lat},${lng}`);
    
    // Validar coordenadas
    if (!lat || !lng || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
        console.warn('⚠️ OSM: Coordenadas inválidas');
        return { success: false, data: [], error: 'invalid_coords' };
    }
    
    // Verificar cache
    const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)},${type},${radius}`;
    if (osmCache.has(cacheKey)) {
        const cached = osmCache.get(cacheKey);
        if (Date.now() - cached.timestamp < OSM_CACHE_TTL) {
            console.log(`📦 OSM cache hit: ${cached.data.length} POIs`);
            return { success: true, data: cached.data };
        }
        osmCache.delete(cacheKey);
    }
    
    // Aguardar rate limiting
    await aguardarRateLimit();
    
    const query = buildOverpassQuery(lat, lng, radius, type);
    
    for (let attempt = 0; attempt < OSM_CONFIG.maxRetries; attempt++) {
        for (const endpoint of OSM_CONFIG.endpoints) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), OSM_CONFIG.timeout);
                
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: `data=${encodeURIComponent(query)}`,
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    console.warn(`OSM endpoint ${endpoint} retornou ${response.status}`);
                    continue;
                }
                
                const data = await response.json();
                
                if (!data.elements || data.elements.length === 0) {
                    console.log(`OSM: nenhum elemento encontrado`);
                    return { success: true, data: [] };
                }
                
                const pois = data.elements.map(element => {
                    const distance = calcularDistanciaOSM(lat, lng, element);
                    return convertOSMToPOI(element, distance);
                }).filter(poi => poi && poi.lat && poi.lon);
                
                const unique = removeDuplicatasOSM(pois);
                unique.sort((a, b) => a.distance - b.distance);
                const limited = unique.slice(0, 50);
                
                osmSuccessCount++;
                console.log(`🌿 OSM: ${limited.length} POIs encontrados (✅ ${osmSuccessCount} | ❌ ${osmErrorsCount})`);
                
                addToOsmCache(cacheKey, {
                    timestamp: Date.now(),
                    data: limited
                });
                
                return { success: true, data: limited };
                
            } catch (error) {
                if (error.name === 'AbortError') {
                    console.warn(`⏱️ OSM timeout no endpoint ${endpoint}`);
                } else {
                    console.warn(`❌ OSM erro no endpoint ${endpoint}:`, error.message);
                }
            }
        }
        
        if (attempt < OSM_CONFIG.maxRetries - 1) {
            console.log(`🔄 OSM tentativa ${attempt + 2}...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
    
    osmErrorsCount++;
    console.error('❌ OSM: todas as tentativas falharam');
    return { success: false, data: [], error: 'All endpoints failed' };
}

// ======================================
// CALCULAR DISTÂNCIA
// ======================================

function calcularDistanciaOSM(lat1, lon1, element) {
    const lat2 = element.lat || element.center?.lat;
    const lon2 = element.lon || element.center?.lon;
    
    if (!lat2 || !lon2) return Infinity;
    
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// ======================================
// REMOVER DUPLICATAS
// ======================================

function removeDuplicatasOSM(pois) {
    const seen = new Map();
    
    return pois.filter(poi => {
        const normalizedName = poi.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const roundedLat = Math.round(poi.lat * 1000);
        const roundedLon = Math.round(poi.lon * 1000);
        const key = `${normalizedName}|${roundedLat}|${roundedLon}`;
        
        if (seen.has(key)) return false;
        seen.set(key, true);
        return true;
    });
}

// ======================================
// FUNÇÃO PARA BUSCAR POR TEXTO
// ======================================

async function buscarOSMText(query, lat, lng, radius = 5000) {
    await aguardarRateLimit();
    
    const radiusDeg = radius / 111000;
    const bbox = [
        lng - radiusDeg,
        lat - radiusDeg,
        lng + radiusDeg,
        lat + radiusDeg
    ].join(',');
    
    const overpassQuery = `[out:json][timeout:25];
    (
      node["name"~"${query}", i](${bbox});
      way["name"~"${query}", i](${bbox});
      relation["name"~"${query}", i](${bbox});
    );
    out body center;
    >;
    out skel qt;`;
    
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), OSM_CONFIG.timeout);
        
        const response = await fetch(OSM_CONFIG.endpoints[0], {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `data=${encodeURIComponent(overpassQuery)}`,
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) return { success: false, data: [] };
        
        const data = await response.json();
        const pois = (data.elements || []).map(element => convertOSMToPOI(element, 0)).filter(p => p);
        
        return { success: true, data: pois };
        
    } catch (error) {
        console.error('Erro busca OSM texto:', error);
        return { success: false, data: [] };
    }
}

// ======================================
// TESTAR CONEXÃO OSM
// ======================================

async function testarOSM() {
    console.log('🔧 TESTANDO OPENSTREETMAP OVERPASS API...');
    
    try {
        const result = await buscarOSMPOIs(-23.5505, -46.6333, 'restaurant', 1000);
        if (result.success) {
            console.log(`✅✅✅ OSM FUNCIONANDO! Encontrou ${result.data.length} POIs`);
            return true;
        } else {
            console.error('❌ OSM com problemas');
            return false;
        }
    } catch (error) {
        console.error('❌ Erro no teste OSM:', error);
        return false;
    }
}

// ======================================
// EXECUTAR TESTE APÓS 5 SEGUNDOS
// ======================================

setTimeout(() => {
    testarOSM();
}, 5000);

// ======================================
// EXPORTAR FUNÇÕES
// ======================================

window.buscarOSMPOIs = buscarOSMPOIs;
window.buscarOSMText = buscarOSMText;
window.getIconForCategoryOSM = getIconForCategoryOSM;

console.log('✅ OpenStreetMap Overpass API - Último recurso carregado');