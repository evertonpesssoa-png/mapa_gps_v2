// ==========================
// ESTADO GLOBAL DO SEARCH
// ==========================

let searchOpen = false;

// ==========================
// UI CONTROL
// ==========================

function openSearchPanel() {
  const panel = document.getElementById("search-panel");
  const routePanel = document.getElementById("route-panel");

  if (!panel) return;

  searchOpen = !searchOpen;

  panel.style.display = searchOpen ? "block" : "none";

  // fecha rota se abrir search
  if (searchOpen && routePanel) {
    routePanel.style.display = "none";
  }

  // limpa busca ao fechar
  if (!searchOpen) {
    clearSearch();
  }
}

function closeSearchPanel() {
  const panel = document.getElementById("search-panel");
  if (!panel) return;

  panel.style.display = "none";
  searchOpen = false;

  clearSearch();
}

function clearSearch() {
  const container = document.getElementById("search-results");
  if (container) container.innerHTML = "";
}

// expõe global
window.openSearchPanel = openSearchPanel;
window.closeSearchPanel = closeSearchPanel;

// ==========================
// ACTION PANEL
// ==========================

function showActionPanel(poi) {
  const panel = document.getElementById("action-panel");
  if (!panel) return;

  panel.innerHTML = `
    <b>${poi.name}</b><br><br>

    <button onclick="viewOnMap(${poi.lat},${poi.lon})">
      📍 Ver no mapa
    </button><br><br>

    <button onclick="routeToPlace(${poi.lat},${poi.lon})">
      🧭 Traçar rota
    </button><br><br>

    <button onclick="setDestination('${poi.name.replace(/'/g, "")}')">
      🎯 Definir destino
    </button>
  `;

  panel.style.display = "block";
}

window.showActionPanel = showActionPanel;

// ==========================
// MAP ACTIONS
// ==========================

function viewOnMap(lat, lon) {
  if (!window.map) return;
  window.map.setView([lat, lon], 17);
}

function setDestination(name) {
  const input = document.getElementById("route-destination");
  const routePanel = document.getElementById("route-panel");
  const searchPanel = document.getElementById("search-panel");

  if (input) input.value = name;

  if (routePanel) routePanel.style.display = "flex";
  if (searchPanel) searchPanel.style.display = "none";

  searchOpen = false;
  clearSearch();
}

window.viewOnMap = viewOnMap;
window.setDestination = setDestination;

// ==========================
// BUSCA PRINCIPAL (POI + GEO)
// ==========================

async function searchPlace(query) {
  if (!query || query.trim().length < 2) {
    clearSearch();
    return;
  }

  query = query.trim();

  // 1. POIs locais primeiro
  const local = window.findPlacesByName
    ? window.findPlacesByName(query)
    : { results: [] };

  if (local.results.length > 0) {
    renderResults(local.results);
    return;
  }

  // 2. fallback geocoding
  if (window.geocode) {
    try {
      const geo = await window.geocode(query);

      if (geo) {
        renderResults([{
          name: geo.name,
          lat: geo.lat,
          lon: geo.lng
        }]);
        return;
      }
    } catch (err) {
      console.warn("geocode erro:", err);
    }
  }

  clearSearch();
}

window.searchPlace = searchPlace;

// ==========================
// RENDER RESULTADOS
// ==========================

function renderResults(results) {
  const container = document.getElementById("search-results");
  if (!container) return;

  container.innerHTML = "";

  results.forEach(poi => {
    const div = document.createElement("div");

    div.style.padding = "8px";
    div.style.borderBottom = "1px solid #ddd";
    div.style.cursor = "pointer";

    div.textContent = poi.name;

    div.onclick = () => {
      if (window.map) {
        window.map.setView([poi.lat, poi.lon], 16);
      }

      showActionPanel(poi);
      closeSearchPanel();
    };

    container.appendChild(div);
  });
}

// ==========================
// INPUT EVENTS (FIX BUG DUPLO)
// ==========================

document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("search-input");
  const panel = document.getElementById("search-panel");

  if (!input) return;

  // remove listener antigo (evita bug de duplicação)
  const newInput = input.cloneNode(true);
  input.parentNode.replaceChild(newInput, input);

  newInput.addEventListener("input", (e) => {
    searchPlace(e.target.value);
  });

  // ENTER para buscar (corrige teu bug)
  newInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      searchPlace(newInput.value);
    }
  });

  // clique fora fecha painel
  document.addEventListener("click", (e) => {
    if (!panel) return;

    const clickedInside =
      panel.contains(e.target) ||
      e.target.id === "search-input";

    if (!clickedInside && searchOpen) {
      closeSearchPanel();
    }
  });
});