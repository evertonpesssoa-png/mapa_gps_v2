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

// Controle de rate limiting
let lastRequestTime = 0;

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
    // Converter raio de metros para graus (aproximado)
    const radiusDeg = radius / 111000;
    
    // Calcular bounding box
    const bbox = [
        lng - radiusDeg,
        lat - radiusDeg,
        lng + radiusDeg,
        lat + radiusDeg
    ].join(',');
    
    // Obter tags baseadas no tipo
    const tags = categoryMapping[type] || categoryMapping['all'];
    
    // Construir query completa
    const tagQueries = tags.map(tag => `node["${tag.split('=')[0]}"="${tag.split('=')[1]}"](${bbox});`).join('\n  ');
    
    const query = `[out:json][timeout:25];
    (
      ${tagQueries}
      way${tags.length > 1 ? 's' : ''}["name"](${bbox});
      relation${tags.length > 1 ? 's' : ''}["name"](${bbox});
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
    // Extrair nome (priorizar name, depois name:pt, depois nome)
    let name = element.tags?.name || 
               element.tags?.['name:pt'] || 
               element.tags?.nome || 
               'Local sem nome';
    
    // Extrair categoria principal
    let category = 'poi';
    if (element.tags?.amenity) category = element.tags.amenity;
    else if (element.tags?.shop) category = element.tags.shop;
    else if (element.tags?.tourism) category = element.tags.tourism;
    else if (element.tags?.leisure) category = element.tags.leisure;
    
    // Mapear para categoria amigável
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
    
    // Obter coordenadas
    const lat = element.lat || element.center?.lat;
    const lon = element.lon || element.center?.lon;
    
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
        icon: getIconForCategory(category)
    };
}

// ======================================
// ÍCONE POR CATEGORIA
// ======================================

function getIconForCategory(category) {
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
        'parking': '🅿️'
    };
    return icons[category] || '📍';
}

// ======================================
// FUNÇÃO PRINCIPAL DE BUSCA
// ======================================

async function buscarOSMPOIs(lat, lng, type = 'all', radius = 2000) {
    // Verificar cache primeiro
    const cacheKey = `${lat},${lng},${type},${radius}`;
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
    
    // Construir query
    const query = buildOverpassQuery(lat, lng, radius, type);
    
    // Tentar múltiplos endpoints
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
                
                // Converter elementos para POIs
                const pois = data.elements.map(element => {
                    const distance = calcularDistanciaOSM(lat, lng, element);
                    return convertOSMToPOI(element, distance);
                }).filter(poi => poi.lat && poi.lon);
                
                // Remover duplicatas por nome e proximidade
                const unique = removeDuplicatasOSM(pois);
                
                // Ordenar por distância
                unique.sort((a, b) => a.distance - b.distance);
                
                // Limitar a 50 POIs por busca
                const limited = unique.slice(0, 50);
                
                console.log(`🌿 OSM: ${limited.length} POIs encontrados (${endpoint})`);
                
                // Salvar no cache
                osmCache.set(cacheKey, {
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
        // Normalizar nome (minúsculo, sem acentos)
        const normalizedName = poi.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const roundedLat = Math.round(poi.lat * 1000);
        const roundedLon = Math.round(poi.lon * 1000);
        const key = `${normalizedName}|${roundedLat}|${roundedLon}`;
        
        if (seen.has(key)) {
            return false;
        }
        seen.set(key, true);
        return true;
    });
}

// ======================================
// FUNÇÃO PARA BUSCAR POR TEXTO (fallback)
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
        const pois = (data.elements || []).map(element => convertOSMToPOI(element, 0));
        
        return { success: true, data: pois };
        
    } catch (error) {
        console.error('Erro busca OSM texto:', error);
        return { success: false, data: [] };
    }
}

// ======================================
// EXPORTAR FUNÇÕES
// ======================================

window.buscarOSMPOIs = buscarOSMPOIs;
window.buscarOSMText = buscarOSMText;
window.getIconForCategory = getIconForCategory;

console.log('✅ OpenStreetMap Overpass API - Último recurso carregado');