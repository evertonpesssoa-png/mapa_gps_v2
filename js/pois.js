// ==============================
// ÍNDICE GLOBAL DE POIs
// ==============================
window.poiIndex = window.poiIndex || [];

// ==============================
// DADOS MANUAIS (EXEMPLO)
// Substitua pelos seus POIs
// ==============================
const MANUAL_POIS = [
  {
    name: "Padaria Central",
    lat: -23.551,
    lon: -46.631,
    category: "food"
  },
  {
    name: "Farmácia Popular",
    lat: -23.553,
    lon: -46.628,
    category: "health"
  },
  {
    name: "Mercado Bom Preço",
    lat: -23.549,
    lon: -46.635,
    category: "market"
  }
];

// ==============================
// BUSCA POR NOME (para routing)
// ==============================
function findPlacesByName(text) {
  text = text.toLowerCase().trim();

  const results = window.poiIndex.filter(p =>
    p.name.toLowerCase().includes(text)
  );

  return { results };
}

window.findPlacesByName = findPlacesByName;

// ==============================
// CRIAR POPUP DO POI
// ==============================
function createPopupContent(poi) {
  return `
    <div style="min-width:150px">
      <b>${poi.name}</b><br>
      <button onclick="routeToPlace(${poi.lat}, ${poi.lon})">
        Traçar rota até aqui
      </button>
    </div>
  `;
}

// ==============================
// AÇÃO AO CLICAR NO MARCADOR
// ==============================
function handlePOIClick(poi) {
  const panel = document.getElementById("route-panel");
  const destInput = document.getElementById("route-destination");
  const toggleBtn = document.getElementById("routeToggleBtn");

  if (destInput) destInput.value = poi.name;

  if (panel) panel.style.display = "flex";

  if (toggleBtn) toggleBtn.classList.add("active");
}

// ==============================
// CARREGAR POIs MANUAIS
// ==============================
function loadManualPOIs(layer) {
  if (!layer) return;

  MANUAL_POIS.forEach(poi => {

    // Adiciona ao índice global
    window.poiIndex.push({
      name: poi.name,
      lat: poi.lat,
      lon: poi.lon,
      category: poi.category
    });

    // Cria marcador
    const marker = L.marker([poi.lat, poi.lon]);

    // Popup com botão de rota direta
    marker.bindPopup(createPopupContent(poi));

    // Clique no marcador abre painel de rota
    marker.on("click", () => handlePOIClick(poi));

    marker.addTo(layer);
  });

  console.log("POIs carregados:", window.poiIndex.length);
}

window.loadManualPOIs = loadManualPOIs;

// ==============================
// (Opcional) POIs automáticos
// Se você já tiver, pode manter o seu.
// Aqui deixo um placeholder seguro.
// ==============================
function loadAutoPOIs(lat, lon, radius, layer) {
  // Placeholder — não faz nada por enquanto
  // Evita erro caso mapa.js chame a função
}

window.loadAutoPOIs = loadAutoPOIs;
