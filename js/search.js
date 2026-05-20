let searchOpen = false;
let currentSearchId = 0;
window.searchCache = window.searchCache || {};
window.selectedDestination = window.selectedDestination || null;

function normalizeText(text) { return (text || "").toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim(); }
function escapeHTML(text) { return String(text || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

function debounce(fn, delay = 300) {
  let timeout = null;
  return function(...args) { clearTimeout(timeout); timeout = setTimeout(() => fn.apply(this, args), delay); };
}

function closePanels(except = null) {
  const panels = ["search-panel", "action-panel", "route-panel"];
  panels.forEach(id => { if (id !== except) document.getElementById(id)?.style.display = "none"; });
}
window.closePanels = closePanels;

function viewOnMap(lat, lng, zoom = 16) {
  if (!window.map) return;
  closePanels();
  window.map.setView([lat, lng], zoom);
}
window.viewOnMap = viewOnMap;

function showActionPanel(poi) {
  const panel = document.getElementById("action-panel");
  if (!panel) return;
  const lat = Number(poi.lat), lng = Number(poi.lng ?? poi.lon);
  closePanels("action-panel");
  const safeName = escapeHTML(poi.name || "Local");
  panel.innerHTML = `
    <div style="display:flex; justify-content:space-between; margin-bottom:10px;"><b>${safeName}</b><button onclick="document.getElementById('action-panel').style.display='none'" style="border:none; background:none; font-size:18px; cursor:pointer;">✕</button></div>
    <button onclick="viewOnMap(${lat}, ${lng})" style="width:100%; padding:10px; margin-bottom:8px; border:none; border-radius:10px; cursor:pointer;">📍 Ver no mapa</button>
    <button onclick="window.routeToPlace(${lat}, ${lng}, 'car')" style="width:100%; padding:10px; border:none; border-radius:10px; cursor:pointer;">🧭 Criar rota</button>
  `;
  panel.style.display = "block";
}
window.showActionPanel = showActionPanel;

async function searchPlace(query) {
  const container = document.getElementById("search-results");
  if (!container) return;
  query = query?.trim();
  if (!query || query.length < 2) { container.innerHTML = ""; return; }
  
  const searchId = ++currentSearchId;
  const normalizedQuery = normalizeText(query);
  let results = [];
  
  if (Array.isArray(window.poiIndex)) {
    results.push(...window.poiIndex.filter(poi => normalizeText(poi.name).includes(normalizedQuery)));
  }
  if (window.searchCache[normalizedQuery]) results.push(...window.searchCache[normalizedQuery]);
  
  renderResults(results);
  
  if (typeof window.geocode === "function") {
    try {
      const geoResults = await window.geocode(query);
      if (searchId !== currentSearchId) return;
      if (Array.isArray(geoResults)) {
        window.searchCache[normalizedQuery] = geoResults;
        geoResults.forEach(geo => {
          if (!results.some(r => Math.abs(Number(r.lat) - Number(geo.lat)) < 0.0001 && Math.abs(Number(r.lng) - Number(geo.lng)) < 0.0001)) {
            results.push({ name: geo.name, fullName: geo.fullName, lat: geo.lat, lng: geo.lng, type: geo.type, category: geo.type || "global" });
          }
        });
        renderResults(results);
      }
    } catch (err) { console.error("Erro search:", err); }
  }
}
window.searchPlace = searchPlace;

function renderResults(results) {
  const container = document.getElementById("search-results");
  if (!container) return;
  container.innerHTML = "";
  if (!results?.length) { container.innerHTML = "<div style='padding:12px; color:#666;'>Nenhum resultado</div>"; return; }
  
  const unique = [];
  results.forEach(poi => {
    const lat = Number(poi.lat), lng = Number(poi.lng ?? poi.lon);
    if (!unique.some(p => Math.abs(Number(p.lat) - lat) < 0.0001 && Math.abs(Number(p.lng) - lng) < 0.0001)) {
      unique.push({ ...poi, lat, lng });
    }
  });
  
  unique.slice(0, 25).forEach(poi => {
    const div = document.createElement("div");
    div.style.cssText = "padding:12px; border-bottom:1px solid #eee; cursor:pointer; background:white;";
    div.innerHTML = `<div style="font-weight:bold;">${escapeHTML(poi.name)}</div>${poi.fullName ? `<div style="font-size:12px; color:#666;">${escapeHTML(poi.fullName)}</div>` : ""}<div style="font-size:11px; color:#999;">📍 local</div>`;
    div.onclick = () => { viewOnMap(poi.lat, poi.lng, 17); showActionPanel(poi); };
    div.onmouseenter = () => div.style.background = "#f5f5f5";
    div.onmouseleave = () => div.style.background = "white";
    container.appendChild(div);
  });
}
window.renderResults = renderResults;

document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("search-input");
  if (!input) return;
  const debouncedSearch = debounce(value => searchPlace(value), 350);
  input.addEventListener("input", e => debouncedSearch(e.target.value));
  input.addEventListener("keydown", e => { if (e.key === "Enter") searchPlace(input.value); });
});

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