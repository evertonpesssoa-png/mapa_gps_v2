// ======================================
// GEOCODING ENGINE COM RATE LIMITING
// ======================================

window.geoCache = window.geoCache || {};
let currentGeocodeController = null;
let lastNominatimRequest = 0;

function normalizeText(text) {
  return (text || "").toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function distanceInMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function searchLocalPOIs(query) {
  if (!Array.isArray(window.poiIndex)) return [];
  const normalized = normalizeText(query);
  return window.poiIndex.filter(poi => normalizeText(poi.name).includes(normalized));
}

function scorePlace(place, query) {
  const normalizedQuery = normalizeText(query);
  const name = normalizeText(place.name);
  let score = 0;
  if (name === normalizedQuery) score += 100;
  if (name.startsWith(normalizedQuery)) score += 40;
  if (name.includes(normalizedQuery)) score += 20;
  score += (place.importance || 0) * 10;
  
  if (window.lastGPS) {
    const dist = distanceInMeters(window.lastGPS.lat, window.lastGPS.lng, Number(place.lat), Number(place.lng ?? place.lon));
    if (dist < 3000) score += 30;
    else if (dist < 10000) score += 15;
  }
  return score;
}

function normalizePlace(place) {
  return {
    name: String(place.name || place.display_name || "Local"),
    fullName: String(place.fullName || place.display_name || ""),
    lat: Number(place.lat),
    lng: Number(place.lng ?? place.lon),
    type: place.type || "place",
    importance: Number(place.importance || 0),
    source: place.source || "global"
  };
}

// ======================================
// DETECTAR SE A BUSCA É ESPECÍFICA DE UM PAÍS
// ======================================

function detectCountryCode(query) {
  // Lista de países e seus códigos comuns
  const countryMap = {
    'brasil': 'br', 'brazil': 'br', 'br': 'br',
    'eua': 'us', 'usa': 'us', 'united states': 'us', 'estados unidos': 'us',
    'portugal': 'pt', 'pt': 'pt',
    'frança': 'fr', 'franca': 'fr', 'france': 'fr',
    'alemanha': 'de', 'germany': 'de',
    'espanha': 'es', 'spain': 'es',
    'italia': 'it', 'italy': 'it',
    'japão': 'jp', 'japao': 'jp', 'japan': 'jp',
    'inglaterra': 'gb', 'england': 'gb', 'reino unido': 'gb', 'uk': 'gb',
    'argentina': 'ar', 'mexico': 'mx', 'canada': 'ca'
  };
  
  const queryLower = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  // Verificar se o usuário especificou um país com vírgula (ex: "Paris, França")
  const parts = queryLower.split(/[,|]/);
  if (parts.length > 1) {
    const lastPart = parts[parts.length - 1].trim();
    for (let [country, code] of Object.entries(countryMap)) {
      if (lastPart.includes(country)) {
        return code;
      }
    }
  }
  
  // Verificar se a query contém nome de país
  for (let [country, code] of Object.entries(countryMap)) {
    if (queryLower.includes(country)) {
      return code;
    }
  }
  
  return null; // Sem restrição de país (busca mundial)
}

// ======================================
// CONSTRUIR URL DO NOMINATIM
// ======================================

function buildNominatimUrl(query) {
  const countryCode = detectCountryCode(query);
  const lang = 'pt-BR';
  
  // Se detectou um país específico, restringe a ele
  if (countryCode) {
    return `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=10&countrycodes=${countryCode}&accept-language=${lang}&q=${encodeURIComponent(query)}`;
  }
  
  // Busca mundial (sem restrição de país)
  return `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=10&accept-language=${lang}&q=${encodeURIComponent(query)}`;
}

// ======================================
// BUSCAR NO NOMINATIM
// ======================================

async function fetchNominatim(query) {
  // Rate limiting: 1 segundo entre requests (cortesia ao Nominatim)
  const now = Date.now();
  const timeToWait = 1000 - (now - lastNominatimRequest);
  if (timeToWait > 0) {
    await new Promise(r => setTimeout(r, timeToWait));
  }
  lastNominatimRequest = Date.now();

  if (currentGeocodeController) currentGeocodeController.abort();
  currentGeocodeController = new AbortController();

  const url = buildNominatimUrl(query);
  console.log(`🌍 Geocoding URL: ${url}`);

  try {
    const res = await fetch(url, { signal: currentGeocodeController.signal, headers: { "Accept": "application/json" } });
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data.map(place => normalizePlace({
      name: place.name || place.display_name,
      fullName: place.display_name,
      lat: Number(place.lat),
      lng: Number(place.lon),
      type: place.type,
      importance: place.importance,
      source: "nominatim"
    }));
  } catch (err) {
    if (err.name === "AbortError") return [];
    console.error("Erro Nominatim:", err);
    return [];
  }
}

// ======================================
// FUNÇÃO PRINCIPAL GEOCODE
// ======================================

async function geocode(query) {
  if (!query || typeof query !== "string") return [];
  query = query.trim();
  if (query.length < 2) return [];

  const normalizedQuery = normalizeText(query);
  
  // Verificar cache
  if (window.geoCache[normalizedQuery]) {
    console.log(`📦 Geocode cache hit para "${query}"`);
    return window.geoCache[normalizedQuery];
  }

  // Buscar nos POIs locais
  const localResults = searchLocalPOIs(query).map(poi => normalizePlace({ ...poi, source: "local" }));
  
  // Buscar no Nominatim (mundo todo)
  const globalResults = await fetchNominatim(query);
  
  // Mesclar resultados
  const merged = [...localResults, ...globalResults];

  // Remover duplicatas
  const unique = [];
  merged.forEach(place => {
    const exists = unique.some(p => {
      return normalizeText(p.name) === normalizeText(place.name) &&
             Math.abs(p.lat - place.lat) < 0.00001 &&
             Math.abs(p.lng - place.lng) < 0.00001;
    });
    if (!exists) unique.push(place);
  });

  // Ordenar por relevância
  unique.forEach(place => { place.score = scorePlace(place, query); });
  unique.sort((a, b) => b.score - a.score);

  // Salvar no cache
  window.geoCache[normalizedQuery] = unique;
  console.log(`✅ Geocode: ${unique.length} resultados para "${query}" (${detectCountryCode(query) ? 'restringido' : 'mundial'})`);
  return unique;
}

// ======================================
// REVERSE GEOCODE
// ======================================

async function reverseGeocode(lat, lng) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=pt-BR`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    return { name: data.name || data.display_name, fullName: data.display_name, lat: Number(lat), lng: Number(lng) };
  } catch (err) {
    console.error("Reverse geocode error:", err);
    return null;
  }
}

window.geocode = geocode;
window.reverseGeocode = reverseGeocode;

console.log("✅ geocoding.js carregado - Busca MUNDIAL ativada!");