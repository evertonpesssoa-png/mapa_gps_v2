// ======================================
// POIs.js - SISTEMA DE PONTOS DE INTERESSE
// ======================================

window.poiIndex = window.poiIndex || [];
window.autoPOIsReady = false;

// ======================================
// LAYER AUTO POIs
// ======================================

window.autoPOILayer = window.autoPOILayer || L.layerGroup();

// ======================================
// CACHE DE ÁREAS
// ======================================

window.loadedPOIAreas = window.loadedPOIAreas || {};

// ======================================
// CONTROLLER OVERPASS
// ======================================

window.currentPOIController = null;

// ======================================
// NORMALIZE
// ======================================

function normalizeText(text) {
  return (text || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

// ======================================
// ESCAPE HTML
// ======================================

function escapeHTML(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ======================================
// HASH DE ÁREA
// ======================================

function createAreaKey(lat, lng) {
  const latKey = Math.floor(Number(lat) * 100);
  const lngKey = Math.floor(Number(lng) * 100);
  return `${latKey}:${lngKey}`;
}

// ======================================
// VALIDAR COORDENADAS
// ======================================

function isValidCoordinate(lat, lng) {
  return (
    !isNaN(lat) &&
    !isNaN(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
  );
}

// ======================================
// ÍCONES POR CATEGORIA (CORRIGIDO)
// ======================================

function getIconByCategory(category) {
  const icons = {
    hospital: "🏥",
    pharmacy: "💊",
    police: "👮",
    policeman: "👮",
    gas_station: "⛽",
    gas: "⛽",
    supermarket: "🛒",
    restaurant: "🍽️",
    bank: "🏦",
    school: "🏫",
    cafe: "☕",
    tourism: "🏛️",
    generic: "📍",
    home: "🏠",
    mechanic: "🔧",
    medical: "🏥"
  };
  
  return icons[category] || icons.generic;
}

// ======================================
// ÍCONE SAFE (CORRIGIDO)
// ======================================

function safeIcon(category) {
  const iconEmoji = getIconByCategory(category);
  
  return L.divIcon({
    html: `<div style="
      background: white;
      border-radius: 50%;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      font-weight: bold;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      border: 2px solid #4a90e2;
      cursor: pointer;
      transition: transform 0.2s;
    ">${iconEmoji}</div>`,
    iconSize: [32, 32],
    popupAnchor: [0, -16],
    className: "custom-poi-marker"
  });
}

// ======================================
// REGISTRO DE POI
// ======================================

function registerPOI(poi) {
  if (!poi) return null;
  
  poi.lng = poi.lng ?? poi.lon;
  poi.lat = Number(poi.lat);
  poi.lng = Number(poi.lng);
  
  // Validação
  if (!isValidCoordinate(poi.lat, poi.lng)) {
    console.warn("POI inválido:", poi);
    return null;
  }
  
  // Garante nome
  if (!poi.name || !String(poi.name).trim()) {
    poi.name = "Local";
  }
  poi.name = String(poi.name).trim();
  poi.category = poi.category || "generic";
  
  // Remove duplicados
  const exists = window.poiIndex.find(p => {
    const sameName = normalizeText(p.name) === normalizeText(poi.name);
    const sameLat = Math.abs(Number(p.lat) - poi.lat) < 0.00001;
    const sameLng = Math.abs(Number(p.lng ?? p.lon) - poi.lng) < 0.00001;
    return sameName && sameLat && sameLng;
  });
  
  if (exists) return exists;
  
  const normalizedPOI = { ...poi, lat: poi.lat, lng: poi.lng };
  window.poiIndex.push(normalizedPOI);
  
  console.log("📌 POI registrado:", normalizedPOI.name);
  return normalizedPOI;
}

window.registerPOI = registerPOI;

// ======================================
// BUSCA POR NOME
// ======================================

function findPlacesByName(query) {
  if (!query) return { results: [] };
  
  const normalizedQuery = normalizeText(query);
  const results = window.poiIndex.filter(poi =>
    normalizeText(poi.name).includes(normalizedQuery)
  );
  
  return { results };
}

window.findPlacesByName = findPlacesByName;

// ======================================
// POPUP DO MARCADOR
// ======================================

function createPopupContent(poi) {
  const safeName = escapeHTML(poi.name);
  const lat = Number(poi.lat);
  const lng = Number(poi.lng ?? poi.lon);
  const iconEmoji = getIconByCategory(poi.category);
  
  return `
    <div style="min-width: 200px; font-family: Arial, sans-serif;">
      <div style="
        font-weight: bold;
        font-size: 14px;
        margin-bottom: 5px;
        display: flex;
        align-items: center;
        gap: 8px;
      ">
        <span style="font-size: 18px;">${iconEmoji}</span>
        <span>${safeName}</span>
      </div>
      <div style="font-size: 11px; color: #666; margin-bottom: 12px;">
        📍 ${poi.category || "local"}
      </div>
      <div style="display: flex; gap: 8px; flex-wrap: wrap;">
        <button onclick="
          routeToPlace(${lat}, ${lng}, 'foot')
        " style="
          background: #10b981;
          border: none;
          color: white;
          padding: 6px 12px;
          border-radius: 20px;
          cursor: pointer;
          font-size: 12px;
          display: flex;
          align-items: center;
          gap: 4px;
        ">
          🚶 Ir a pé
        </button>
        <button onclick="
          routeToPlace(${lat}, ${lng}, 'car')
        " style="
          background: #ef4444;
          border: none;
          color: white;
          padding: 6px 12px;
          border-radius: 20px;
          cursor: pointer;
          font-size: 12px;
          display: flex;
          align-items: center;
          gap: 4px;
        ">
          🚗 Ir de carro
        </button>
        <button onclick="
          viewOnMap(${lat}, ${lng}, 17)
        " style="
          background: #3b82f6;
          border: none;
          color: white;
          padding: 6px 12px;
          border-radius: 20px;
          cursor: pointer;
          font-size: 12px;
          display: flex;
          align-items: center;
          gap: 4px;
        ">
          📍 Ver no mapa
        </button>
      </div>
    </div>
  `;
}

// ======================================
// CRIAR MARCADOR
// ======================================

function createMarker(poi, layer) {
  if (!layer || !poi) return null;
  
  const lat = Number(poi.lat);
  const lng = Number(poi.lng ?? poi.lon);
  
  if (!isValidCoordinate(lat, lng)) {
    console.warn("POI inválido para marcador:", poi);
    return null;
  }
  
  try {
    const marker = L.marker([lat, lng], {
      icon: safeIcon(poi.category),
      riseOnHover: true
    });
    
    marker.bindPopup(createPopupContent(poi), {
      maxWidth: 260,
      minWidth: 200
    });
    
    // Armazenar dados no marcador
    marker._poiData = poi;
    marker._autoPOI = Boolean(poi.auto);
    
    marker.addTo(layer);
    return marker;
    
  } catch (err) {
    console.error("Erro ao criar marcador:", err, poi);
    return null;
  }
}

// ======================================
// LIMPAR AUTO POIs
// ======================================

function clearAutoPOIs() {
  window.autoPOILayer.clearLayers();
  window.poiIndex = window.poiIndex.filter(poi => !poi.auto);
  window.loadedPOIAreas = {};
  console.log("🗑️ Auto POIs limpos");
}

window.clearAutoPOIs = clearAutoPOIs;

// ======================================
// CARREGAR POIs MANUAIS (CORRIGIDO)
// ======================================

function loadManualPOIs(layer) {
  if (!Array.isArray(window.manualPOIs)) {
    console.warn("⚠️ manualPOIs não encontrado ou vazio");
    return;
  }
  
  console.log(`🟢 Carregando ${window.manualPOIs.length} POIs manuais...`);
  
  let count = 0;
  window.manualPOIs.forEach(poi => {
    const registered = registerPOI(poi);
    if (registered) {
      const marker = createMarker(registered, layer);
      if (marker) count++;
    }
  });
  
  console.log(`✅ ${count} POIs manuais carregados com sucesso!`);
}

window.loadManualPOIs = loadManualPOIs;

// ======================================
// DETECTAR CATEGORIA
// ======================================

function detectCategory(tags) {
  if (!tags) return "generic";
  
  const amenityMap = {
    hospital: "hospital",
    pharmacy: "pharmacy",
    police: "police",
    restaurant: "restaurant",
    fuel: "gas_station",
    school: "school",
    bank: "bank",
    cafe: "cafe"
  };
  
  if (amenityMap[tags.amenity]) return amenityMap[tags.amenity];
  if (tags.shop === "supermarket") return "supermarket";
  if (tags.shop === "mall") return "mall";
  if (tags.tourism) return "tourism";
  
  return "generic";
}

// ======================================
// QUERY OVERPASS
// ======================================

function buildOverpassQuery(lat, lng, radius) {
  return `
    [out:json][timeout:15];
    (
      node["amenity"="hospital"](around:${radius},${lat},${lng});
      node["amenity"="pharmacy"](around:${radius},${lat},${lng});
      node["amenity"="police"](around:${radius},${lat},${lng});
      node["shop"="supermarket"](around:${radius},${lat},${lng});
      node["amenity"="restaurant"](around:${radius},${lat},${lng});
      node["amenity"="fuel"](around:${radius},${lat},${lng});
      node["amenity"="bank"](around:${radius},${lat},${lng});
      node["amenity"="school"](around:${radius},${lat},${lng});
      node["amenity"="cafe"](around:${radius},${lat},${lng});
    );
    out body;
  `;
}

// ======================================
// CARREGAR POIs AUTOMÁTICOS (OVERPass)
// ======================================

async function loadAutoPOIs(lat, lng, radius = 3000, layer) {
  window.autoPOIsReady = false;
  
  lat = Number(lat);
  lng = Number(lng);
  
  if (!isValidCoordinate(lat, lng)) {
    console.warn("Coordenadas inválidas para Overpass");
    return [];
  }
  
  // Cache por área
  const areaKey = createAreaKey(lat, lng);
  if (window.loadedPOIAreas[areaKey]) {
    console.log("📦 Área já carregada:", areaKey);
    return [];
  }
  
  window.loadedPOIAreas[areaKey] = true;
  
  // Garantir layer
  if (layer && !layer.hasLayer(window.autoPOILayer)) {
    layer.addLayer(window.autoPOILayer);
  }
  
  radius = Math.min(Math.max(Number(radius) || 3000, 500), 5000);
  
  // Cancela request anterior
  if (window.currentPOIController) {
    window.currentPOIController.abort();
  }
  
  const controller = new AbortController();
  window.currentPOIController = controller;
  
  const query = buildOverpassQuery(lat, lng, radius);
  
  try {
    const timeout = setTimeout(() => controller.abort(), 15000);
    
    console.log("🌐 Buscando POIs no Overpass...");
    
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: query,
      signal: controller.signal
    });
    
    clearTimeout(timeout);
    
    if (!res.ok) {
      console.error("Erro Overpass:", res.status);
      return [];
    }
    
    const data = await res.json();
    
    if (!data || !Array.isArray(data.elements)) {
      console.error("Resposta inválida do Overpass");
      return [];
    }
    
    console.log(`📡 POIs recebidos: ${data.elements.length}`);
    
    const addedPOIs = [];
    
    data.elements.forEach(el => {
      const poi = {
        name: el.tags?.name ? String(el.tags.name) : `POI ${el.id}`,
        fullName: el.tags?.name || "",
        lat: Number(el.lat),
        lng: Number(el.lon),
        category: detectCategory(el.tags),
        auto: true,
        osmId: el.id,
        source: "overpass"
      };
      
      const registered = registerPOI(poi);
      if (registered) {
        const marker = createMarker(registered, window.autoPOILayer);
        if (marker) addedPOIs.push(registered);
      }
    });
    
    window.autoPOIsReady = true;
    console.log(`✅ ${addedPOIs.length} auto POIs carregados`);
    
    return addedPOIs;
    
  } catch (err) {
    if (err.name === "AbortError") {
      console.warn("⏹️ Overpass cancelado");
      return [];
    }
    console.error("❌ Erro Overpass:", err);
    return [];
  }
}

window.loadAutoPOIs = loadAutoPOIs;