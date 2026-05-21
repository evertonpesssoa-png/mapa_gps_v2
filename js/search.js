let searchOpen = false;

// ======================================
// CONTROLE ASSÍNCRONO
// ======================================

let currentSearchId = 0;

// ======================================
// CACHE GLOBAL
// ======================================

window.searchCache = window.searchCache || {};

// ======================================
// DESTINO GLOBAL SELECIONADO
// ======================================

window.selectedDestination = window.selectedDestination || null;

// ======================================
// NORMALIZAR TEXTO
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
// DEBOUNCE SAFE
// ======================================

function debounce(fn, delay = 300) {
  let timeout = null;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
}

// ======================================
// FECHAR PAINÉIS
// ======================================

function closePanels(except = null) {
  const panels = ["search-panel", "action-panel", "route-panel"];
  panels.forEach(id => {
    if (id === except) return;
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  });
}
window.closePanels = closePanels;

// ======================================
// TOGGLE SEARCH
// ======================================

function toggleSearch() {
  const panel = document.getElementById("search-panel");
  if (!panel) return;
  const opened = panel.style.display === "block";
  if (opened) {
    panel.style.display = "none";
    return;
  }
  closePanels("search-panel");
  panel.style.display = "block";
  searchOpen = true;
  setTimeout(() => {
    document.getElementById("search-input")?.focus();
  }, 100);
}
window.toggleSearch = toggleSearch;

// ======================================
// ZOOM INTELIGENTE
// ======================================

function smartZoomToPlace(poi) {
  if (!window.map) return;
  const lat = Number(poi.lat);
  const lng = Number(poi.lng ?? poi.lon);
  if (isNaN(lat) || isNaN(lng)) {
    console.warn("POI inválido:", poi);
    return;
  }
  const type = normalizeText(poi.type || poi.category || "");
  if (type.includes("state") || type.includes("estado")) {
    window.map.setView([lat, lng], 7);
    return;
  }
  if (type.includes("city") || type.includes("town") || type.includes("cidade") || type.includes("municipality")) {
    window.map.setView([lat, lng], 11);
    return;
  }
  if (type.includes("road") || type.includes("street") || type.includes("residential") || type.includes("suburb")) {
    window.map.setView([lat, lng], 15);
    return;
  }
  window.map.setView([lat, lng], 16);
}

// ======================================
// VIEW ON MAP
// ======================================

function viewOnMap(lat, lng) {
  if (!window.map) return;
  closePanels();
  window.map.setView([lat, lng], 16);
}
window.viewOnMap = viewOnMap;

// ======================================
// ROUTE PANEL
// ======================================

function openRoutePanel(poi = null) {
  closePanels("route-panel");
  const panel = document.getElementById("route-panel");
  const input = document.getElementById("route-destination");
  if (poi && !isNaN(Number(poi.lat)) && !isNaN(Number(poi.lng ?? poi.lon))) {
    window.selectedDestination = {
      name: poi.name || "Destino",
      lat: Number(poi.lat),
      lng: Number(poi.lng ?? poi.lon),
      fullName: poi.fullName || "",
      type: poi.type || ""
    };
    if (input) input.value = poi.name || "";
  }
  if (panel) panel.style.display = "flex";
}
window.openRoutePanel = openRoutePanel;

// ======================================
// ACTION PANEL
// ======================================

function showActionPanel(poi) {
  const panel = document.getElementById("action-panel");
  if (!panel) return;
  const lat = Number(poi.lat);
  const lng = Number(poi.lng ?? poi.lon);
  closePanels("action-panel");
  const safeName = escapeHTML(poi.name || "Local");
  const safeFullName = escapeHTML(poi.fullName || "");
  panel.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
      <b>${safeName}</b>
      <button onclick="document.getElementById('action-panel').style.display='none'" style="border:none; background:none; font-size:18px; cursor:pointer;">✕</button>
    </div>
    ${safeFullName ? `<div style="font-size:12px; color:#666; margin-bottom:10px; line-height:1.4;">${safeFullName}</div>` : ""}
    <button onclick="viewOnMap(${lat}, ${lng})" style="width:100%; padding:10px; margin-bottom:8px; border:none; border-radius:10px; cursor:pointer;">📍 Ver no mapa</button>
    <button onclick='openRoutePanel(${JSON.stringify({ name: poi.name, fullName: poi.fullName, lat, lng, type: poi.type })})' style="width:100%; padding:10px; border:none; border-radius:10px; cursor:pointer;">🧭 Criar rota</button>
  `;
  panel.style.display = "block";
}
window.showActionPanel = showActionPanel;

// ======================================
// BUSCAR POIs DO SISTEMA DE 4 CAMADAS
// ======================================

async function buscarPOIsParaBusca(texto, lat, lng) {
  const resultados = [];
  const termoNormalizado = normalizeText(texto);
  
  // 1. Buscar nos POIs manuais (window.manualPOIs)
  if (window.manualPOIs && Array.isArray(window.manualPOIs)) {
    window.manualPOIs.forEach(poi => {
      const nomePOI = normalizeText(poi.name);
      if (nomePOI.includes(termoNormalizado) || termoNormalizado.includes(nomePOI)) {
        resultados.push({
          name: poi.name,
          fullName: `${poi.category || ''} em ${poi.name}`,
          lat: poi.lat,
          lng: poi.lon,
          type: poi.category,
          category: poi.category,
          source: 'manual',
          auto: false
        });
      }
    });
  }
  
  // 2. Buscar nos POIs carregados no mapa (cache)
  if (window.poiLayer && window.poiLayer._layers) {
    const layers = window.poiLayer._layers;
    for (let id in layers) {
      const layer = layers[id];
      if (layer._poiData) {
        const poi = layer._poiData;
        const nomePOI = normalizeText(poi.name);
        if (nomePOI.includes(termoNormalizado) || termoNormalizado.includes(nomePOI)) {
          // Evitar duplicatas
          const existe = resultados.some(r => 
            r.name === poi.name && 
            Math.abs(r.lat - (poi.lat || 0)) < 0.0001
          );
          if (!existe) {
            resultados.push({
              name: poi.name,
              fullName: poi.address || `${poi.category || 'POI'} em ${poi.name}`,
              lat: poi.lat,
              lng: poi.lng || poi.lon,
              type: poi.category,
              category: poi.category,
              source: poi.source || 'poi',
              auto: true
            });
          }
        }
      }
    }
  }
  
  return resultados;
}

// ======================================
// SEARCH
// ======================================

async function searchPlace(query) {
  const container = document.getElementById("search-results");
  if (!container) return;
  query = query?.trim();
  if (!query || query.length < 2) {
    container.innerHTML = "";
    return;
  }
  const searchId = ++currentSearchId;
  const normalizedQuery = normalizeText(query);
  let results = [];
  
  // 1. Buscar no índice global (poiIndex)
  if (Array.isArray(window.poiIndex)) {
    const local = window.poiIndex.filter(poi => {
      const name = normalizeText(poi.name);
      const full = normalizeText(poi.fullName);
      return name.includes(normalizedQuery) || full.includes(normalizedQuery);
    });
    results.push(...local);
  }
  
  // 2. Buscar nos POIs do sistema de 4 camadas
  if (window.map && window.map.getCenter) {
    const center = window.map.getCenter();
    const centerLat = center.lat;
    const centerLng = center.lng;
    const quatroCamadasPOIs = await buscarPOIsParaBusca(query, centerLat, centerLng);
    results.push(...quatroCamadasPOIs);
  }
  
  // 3. Buscar no cache
  const cached = window.searchCache[normalizedQuery];
  if (Array.isArray(cached)) results.push(...cached);
  
  renderResults(results);
  
  // 4. Busca externa (geocoding)
  if (typeof window.geocode === "function") {
    try {
      const geoResults = await window.geocode(query);
      if (searchId !== currentSearchId) return;
      if (Array.isArray(geoResults)) {
        window.searchCache[normalizedQuery] = geoResults;
        geoResults.forEach(geo => {
          const geoLat = Number(geo.lat);
          const geoLng = Number(geo.lng ?? geo.lon);
          const exists = results.some(r => {
            return normalizeText(r.name) === normalizeText(geo.name) &&
                   Math.abs(Number(r.lat) - geoLat) < 0.0001 &&
                   Math.abs(Number(r.lng ?? r.lon) - geoLng) < 0.0001;
          });
          if (!exists) {
            results.push({
              name: geo.name,
              fullName: geo.fullName,
              lat: geoLat,
              lng: geoLng,
              type: geo.type,
              category: geo.category || geo.type || "global",
              source: geo.source || "global"
            });
          }
        });
        renderResults(results);
      }
    } catch (err) {
      console.error("Erro search:", err);
    }
  }
}
window.searchPlace = searchPlace;

// ======================================
// RENDER RESULTS
// ======================================

function renderResults(results) {
  const container = document.getElementById("search-results");
  if (!container) return;
  container.innerHTML = "";
  if (!results || results.length === 0) {
    container.innerHTML = `<div style="padding:12px; color:#666;">Nenhum resultado</div>`;
    return;
  }
  
  const unique = [];
  results.forEach(poi => {
    const lat = Number(poi.lat);
    const lng = Number(poi.lng ?? poi.lon);
    const exists = unique.some(p => {
      return normalizeText(p.name) === normalizeText(poi.name) &&
             Math.abs(Number(p.lat) - lat) < 0.0001 &&
             Math.abs(Number(p.lng ?? p.lon) - lng) < 0.0001;
    });
    if (!exists) unique.push({ ...poi, lat, lng });
  });
  
  const finalResults = unique.slice(0, 25);
  
  finalResults.forEach(poi => {
    const div = document.createElement("div");
    div.style.padding = "12px";
    div.style.borderBottom = "1px solid #eee";
    div.style.cursor = "pointer";
    div.style.background = "white";
    div.style.transition = "0.2s";
    div.style.lineHeight = "1.4";
    
    // Definir rótulo da fonte
    let sourceLabel = "🗂 Local";
    if (poi.auto) sourceLabel = "📍 Próximo";
    if (poi.source === "nominatim") sourceLabel = "🌎 Global";
    if (poi.source === "manual") sourceLabel = "📌 Manual (fixo)";
    if (poi.source === "google") sourceLabel = "🌎 Google Places";
    if (poi.source === "mapbox") sourceLabel = "🗺️ Mapbox";
    if (poi.source === "openstreetmap") sourceLabel = "🌿 OpenStreetMap";
    
    div.innerHTML = `
      <div style="font-weight:bold; margin-bottom:4px;">${escapeHTML(poi.name)}</div>
      ${poi.fullName ? `<div style="font-size:12px; color:#666; margin-bottom:4px;">${escapeHTML(poi.fullName)}</div>` : ""}
      <div style="font-size:11px; color:#999;">${sourceLabel}</div>
    `;
    
    div.onmouseenter = () => div.style.background = "#f5f5f5";
    div.onmouseleave = () => div.style.background = "white";
    div.onclick = () => {
      smartZoomToPlace(poi);
      showActionPanel(poi);
    };
    
    container.appendChild(div);
  });
}

// ======================================
// INPUT EVENTS
// ======================================

document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("search-input");
  if (!input) {
    console.warn("search-input não encontrado");
    return;
  }
  const debouncedSearch = debounce(value => searchPlace(value), 350);
  input.addEventListener("input", e => debouncedSearch(e.target.value));
  input.addEventListener("keydown", e => {
    if (e.key === "Enter") searchPlace(input.value);
  });
});

// ======================================
// FUNÇÕES AUXILIARES
// ======================================

window.searchByCategory = function(category, query = "") {
  if (!window.poiIndex) return [];
  const normalizedQuery = normalizeText(query);
  return window.poiIndex.filter(poi => (poi.category === category || poi.type === category) && (normalizedQuery === "" || normalizeText(poi.name).includes(normalizedQuery)));
};

window.searchNearby = function(lat, lng, radius = 1000, category = null) {
  if (!window.poiIndex || !window.locationEngine) return [];
  return window.poiIndex.filter(poi => {
    const dist = window.locationEngine.distance({ lat, lng }, { lat: poi.lat, lng: poi.lng });
    return dist <= radius && (category === null || poi.category === category || poi.type === category);
  }).sort((a,b) => (a.distance||0) - (b.distance||0));
};

console.log("✅ search.js carregado com integração de POIs de 4 camadas!");