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
// AÇÃO AO CLICAR NO MARCADOR
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
// CARREGAR POIs MANUAIS
// LÊ window.manualPOIs (manual-pois.js)
// ======================================
function loadManualPOIs(layer) {
  if (!layer) return;

  if (!window.manualPOIs || window.manualPOIs.length === 0) {
    console.warn("manual-pois.js não encontrado ou vazio");
    return;
  }

  window.manualPOIs.forEach(poi => {

    // ==========================
    // REGISTRA NO ÍNDICE GLOBAL
    // ==========================
    if (typeof window.registerPOI === "function") {
      window.registerPOI(poi); // usa o índice do mapa.js
    } else {
      window.poiIndex.push(poi);
    }

    // ==========================
    // ÍCONE (se existir icons.js)
    // ==========================
    let marker;

    if (typeof getIcon === "function") {
      marker = L.marker([poi.lat, poi.lon], {
        icon: getIcon(poi.category)
      });
    } else {
      marker = L.marker([poi.lat, poi.lon]);
    }

    // ==========================
    // POPUP
    // ==========================
    marker.bindPopup(createPopupContent(poi));

    // ==========================
    // CLICK NO POI
    // ==========================
    marker.on("click", () => handlePOIClick(poi));

    marker.addTo(layer);
  });

  console.log("POIs manuais carregados:", window.manualPOIs.length);
}

window.loadManualPOIs = loadManualPOIs;

// ======================================
// POIs AUTOMÁTICOS (placeholder seguro)
// ======================================
function loadAutoPOIs(lat, lon, radius, layer) {
  // Mantido vazio para não quebrar o mapa.js
}

window.loadAutoPOIs = loadAutoPOIs;
