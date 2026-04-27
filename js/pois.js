// ======================================
// GARANTE ÍNDICE GLOBAL
// ======================================
window.poiIndex = window.poiIndex || [];

// ======================================
// BUSCA POR NOME (routing support)
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
// CLICK POI
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
// POIs MANUAIS
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
// POIs AUTOMÁTICOS (OVERPASS API MELHORADA)
// ======================================
async function loadAutoPOIs(lat, lon, radius, layer) {

  const query = `
    [out:json];
    (
      node["amenity"="hospital"](around:${radius},${lat},${lon});
      node["amenity"="pharmacy"](around:${radius},${lat},${lon});
      node["amenity"="police"](around:${radius},${lat},${lon});
      node["shop"="supermarket"](around:${radius},${lat},${lon});
      node["amenity"="fuel"](around:${radius},${lat},${lon});
    );
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

      const name = el.tags?.name || "Local";

      let category = "generic";

      if (el.tags?.amenity === "hospital") category = "hospital";
      if (el.tags?.amenity === "pharmacy") category = "pharmacy";
      if (el.tags?.amenity === "police") category = "police";
      if (el.tags?.shop === "supermarket") category = "supermarket";
      if (el.tags?.amenity === "fuel") category = "gas";

      const poi = {
        name,
        lat: el.lat,
        lon: el.lon,
        category
      };

      registerPOI(poi);

      const marker = L.marker([poi.lat, poi.lon], {
        icon: typeof getIcon === "function"
          ? getIcon(poi.category)
          : undefined
      });

      marker.bindPopup(createPopupContent(poi));
      marker.on("click", () => handlePOIClick(poi));

      marker.addTo(layer);
    });

    console.log("POIs dinâmicos carregados:", data.elements.length);

  } catch (err) {
    console.error("Erro Overpass:", err);
  }
}

window.loadAutoPOIs = loadAutoPOIs;