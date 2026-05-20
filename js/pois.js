// ======================================
// POIs.js - SISTEMA DE PONTOS DE INTERESSE
// ======================================

window.poiIndex = window.poiIndex || [];
window.autoPOILayer = window.autoPOILayer || L.layerGroup();
window.loadedPOIAreas = window.loadedPOIAreas || {};
window.currentPOIController = null;

function normalizeText(text) {
  return (text || "").toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function isValidCoordinate(lat, lng) {
  return !isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

function getIconByCategory(category) {
  const icons = {
    hospital: "🏥", pharmacy: "💊", police: "👮", policeman: "👮",
    gas_station: "⛽", gas: "⛽", supermarket: "🛒", restaurant: "🍽️",
    bank: "🏦", school: "🏫", cafe: "☕", home: "🏠", mechanic: "🔧",
    medical: "🏥", generic: "📍"
  };
  return icons[category] || icons.generic;
}

function safeIcon(category) {
  const iconEmoji = getIconByCategory(category);
  return L.divIcon({
    html: `<div style="background: white; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: bold; box-shadow: 0 2px 8px rgba(0,0,0,0.2); border: 2px solid #4a90e2; cursor: pointer;">${iconEmoji}</div>`,
    iconSize: [32, 32],
    popupAnchor: [0, -16],
    className: "custom-poi-marker"
  });
}

function registerPOI(poi) {
  if (!poi) return null;
  poi.lng = poi.lng ?? poi.lon;
  poi.lat = Number(poi.lat);
  poi.lng = Number(poi.lng);
  
  if (!isValidCoordinate(poi.lat, poi.lng)) return null;
  if (!poi.name || !String(poi.name).trim()) poi.name = "Local";
  poi.name = String(poi.name).trim();
  poi.category = poi.category || "generic";
  
  const exists = window.poiIndex.find(p => {
    return normalizeText(p.name) === normalizeText(poi.name) &&
           Math.abs(Number(p.lat) - poi.lat) < 0.00001 &&
           Math.abs(Number(p.lng ?? p.lon) - poi.lng) < 0.00001;
  });
  if (exists) return exists;
  
  window.poiIndex.push({ ...poi, lat: poi.lat, lng: poi.lng });
  return poi;
}

function createPopupContent(poi) {
  const safeName = escapeHTML(poi.name);
  const lat = Number(poi.lat);
  const lng = Number(poi.lng ?? poi.lon);
  const iconEmoji = getIconByCategory(poi.category);
  
  return `
    <div style="min-width: 200px; font-family: Arial, sans-serif;">
      <div style="font-weight: bold; font-size: 14px; margin-bottom: 5px; display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 18px;">${iconEmoji}</span>
        <span>${safeName}</span>
      </div>
      <div style="font-size: 11px; color: #666; margin-bottom: 12px;">📍 ${poi.category || "local"}</div>
      <div style="display: flex; gap: 8px; flex-wrap: wrap;">
        <button onclick="window.routeToPlace(${lat}, ${lng}, 'foot')" style="background: #10b981; border: none; color: white; padding: 6px 12px; border-radius: 20px; cursor: pointer;">
          🚶 Ir a pé
        </button>
        <button onclick="window.routeToPlace(${lat}, ${lng}, 'car')" style="background: #ef4444; border: none; color: white; padding: 6px 12px; border-radius: 20px; cursor: pointer;">
          🚗 Ir de carro
        </button>
        <button onclick="window.viewOnMap(${lat}, ${lng})" style="background: #3b82f6; border: none; color: white; padding: 6px 12px; border-radius: 20px; cursor: pointer;">
          📍 Ver no mapa
        </button>
      </div>
    </div>
  `;
}

function escapeHTML(text) {
  return String(text || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function createMarker(poi, layer) {
  if (!layer || !poi) return null;
  const lat = Number(poi.lat);
  const lng = Number(poi.lng ?? poi.lon);
  if (!isValidCoordinate(lat, lng)) return null;
  
  const marker = L.marker([lat, lng], { icon: safeIcon(poi.category), riseOnHover: true });
  marker.bindPopup(createPopupContent(poi), { maxWidth: 260, minWidth: 200 });
  marker._poiData = poi;
  marker.addTo(layer);
  return marker;
}

function clearAutoPOIs() {
  window.autoPOILayer.clearLayers();
  window.poiIndex = window.poiIndex.filter(poi => !poi.auto);
  window.loadedPOIAreas = {};
}

window.clearAutoPOIs = clearAutoPOIs;

function loadManualPOIs(layer) {
  if (!Array.isArray(window.manualPOIs)) return;
  console.log(`🟢 Carregando ${window.manualPOIs.length} POIs manuais...`);
  window.manualPOIs.forEach(poi => {
    const registered = registerPOI(poi);
    if (registered) createMarker(registered, layer);
  });
}

window.loadManualPOIs = loadManualPOIs;

function detectCategory(tags) {
  if (!tags) return "generic";
  const amenityMap = { hospital: "hospital", pharmacy: "pharmacy", police: "police", restaurant: "restaurant", fuel: "gas_station", school: "school", bank: "bank", cafe: "cafe" };
  if (amenityMap[tags.amenity]) return amenityMap[tags.amenity];
  if (tags.shop === "supermarket") return "supermarket";
  return "generic";
}

function buildOverpassQuery(lat, lng, radius) {
  return `[out:json][timeout:15];(node["amenity"="hospital"](around:${radius},${lat},${lng});node["amenity"="pharmacy"](around:${radius},${lat},${lng});node["amenity"="police"](around:${radius},${lat},${lng});node["shop"="supermarket"](around:${radius},${lat},${lng});node["amenity"="restaurant"](around:${radius},${lat},${lng});node["amenity"="fuel"](around:${radius},${lat},${lng});node["amenity"="bank"](around:${radius},${lat},${lng});node["amenity"="school"](around:${radius},${lat},${lng});node["amenity"="cafe"](around:${radius},${lat},${lng}););out body;`;
}

async function loadAutoPOIs(lat, lng, radius = 3000, layer) {
  lat = Number(lat); lng = Number(lng);
  if (!isValidCoordinate(lat, lng)) return [];
  
  const areaKey = `${Math.floor(lat * 100)}:${Math.floor(lng * 100)}`;
  if (window.loadedPOIAreas[areaKey]) return [];
  window.loadedPOIAreas[areaKey] = true;
  if (layer && !layer.hasLayer(window.autoPOILayer)) layer.addLayer(window.autoPOILayer);
  radius = Math.min(Math.max(Number(radius) || 3000, 500), 5000);
  
  if (window.currentPOIController) window.currentPOIController.abort();
  const controller = new AbortController();
  window.currentPOIController = controller;
  
  const query = buildOverpassQuery(lat, lng, radius);
  try {
    const timeout = setTimeout(() => controller.abort(), 15000);
    const res = await fetch("https://overpass-api.de/api/interpreter", { method: "POST", body: query, signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return [];
    const data = await res.json();
    if (!data || !Array.isArray(data.elements)) return [];
    
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
      if (registered) createMarker(registered, window.autoPOILayer);
    });
    return [];
  } catch (err) {
    if (err.name === "AbortError") return [];
    console.error("Erro Overpass:", err);
    return [];
  }
}

window.loadAutoPOIs = loadAutoPOIs;