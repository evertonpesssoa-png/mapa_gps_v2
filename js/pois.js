// ======================================
// GARANTE ÍNDICE GLOBAL
// ======================================
window.poiIndex = window.poiIndex || [];

// ======================================
// BUSCA POR NOME (usado pelo routing.js)
// ======================================
function findPlacesByName(text) {
  if (!text) return { results: [] };

  text = text.toLowerCase().trim();

  const results = window.poiIndex.filter(p =>
    p.name.toLowerCase().includes(text)
  );

  return { results };
}

window.findPlacesByName = findPlacesByName;

// ======================================
// POPUP DO POI
// ======================================
function createPopupContent(poi) {
  return `
    <div style="min-width:160px">
      <b>${poi.name}</b><br><br>
      <button onclick="routeToPlace(${poi.lat}, ${poi.lon})">
        ➜ Rota direta
      </button>
    </div>
  `;
}

// ======================================
// AÇÃO AO CLICAR NO POI
// ======================================
function handlePOIClick(poi) {
  const panel = document.getElementById("route-panel");
  const destInput = document.getElementById("route-destination");
  const toggleBtn = document.getElementById("routeToggleBtn");

  if (destInput) destInput.value = poi.name;
  if (panel) panel.style.display = "flex";
  if (toggleBtn) toggleBtn.classList.add("active");
}

// ======================================
// REGISTRO UNIFICADO DE POI
// ======================================
function registerPOI(poi) {
  if (!poi || !poi.name) return;

  window.poiIndex.push(poi);
}

window.registerPOI = registerPOI;

// ======================================
// CARREGAR POIs MANUAIS
// ======================================
function loadManualPOIs(layer) {
  if (!layer) return;

  if (!window.manualPOIs || window.manualPOIs.length === 0) {
    console.warn("manual-pois.js não encontrado ou vazio");
    return;
  }

  window.manualPOIs.forEach(poi => {

    registerPOI(poi);

    let marker;

    if (typeof getIcon === "function") {
      marker = L.marker([poi.lat, poi.lon], {
        icon: getIcon(poi.category)
      });
    } else {
      marker = L.marker([poi.lat, poi.lon]);
    }

    marker.bindPopup(createPopupContent(poi));
    marker.on("click", () => handlePOIClick(poi));

    marker.addTo(layer);
  });

  console.log("POIs manuais carregados:", window.manualPOIs.length);
}

window.loadManualPOIs = loadManualPOIs;

// ======================================
// POIs AUTOMÁTICOS (OVERPASS API)
// ======================================
async function loadAutoPOIs(lat, lon, radius, layer) {

  const query = `
    [out:json];
    node
      (around:${radius},${lat},${lon})
      ["amenity"];
    out;
  `;

  const url = "https://overpass-api.de/api/interpreter";

  try {
    const res = await fetch(url, {
      method: "POST",
      body: query
    });

    const data = await res.json();

    data.elements.forEach(el => {

      const poi = {
        name: el.tags?.name || "POI",
        lat: el.lat,
        lon: el.lon,
        category: el.tags?.amenity || "auto"
      };

      registerPOI(poi);

      const marker = L.marker([poi.lat, poi.lon])
        .bindPopup(createPopupContent(poi))
        .on("click", () => handlePOIClick(poi));

      marker.addTo(layer);
    });

    console.log("POIs dinâmicos carregados:", data.elements.length);

  } catch (e) {
    console.error("Erro Overpass:", e);
  }
}

window.loadAutoPOIs = loadAutoPOIs;