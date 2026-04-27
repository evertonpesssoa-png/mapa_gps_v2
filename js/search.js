// ==========================
// ESTADO GLOBAL DO SEARCH
// ==========================

let searchOpen = false;

// ==========================
// UTIL: garantir sync real com DOM
// ==========================

function setSearchState(state) {
  const panel = document.getElementById("search-panel");
  const routePanel = document.getElementById("route-panel");

  if (!panel) return;

  searchOpen = state;
  panel.style.display = state ? "block" : "none";

  if (state && routePanel) {
    routePanel.style.display = "none";
  }

  if (!state) {
    clearSearch();
  }
}

// ==========================
// TOGGLE (BOTÃO 🔎)
// ==========================

function toggleSearch() {
  setSearchState(!searchOpen);
}

function openSearchPanel() {
  setSearchState(true);
}

function closeSearchPanel() {
  setSearchState(false);
}

// expõe global
window.toggleSearch = toggleSearch;
window.openSearchPanel = openSearchPanel;
window.closeSearchPanel = closeSearchPanel;

// ==========================
// LIMPAR SEARCH
// ==========================

function clearSearch() {
  const container = document.getElementById("search-results");
  if (container) container.innerHTML = "";
}

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

  if (input) input.value = name;

  const routePanel = document.getElementById("route-panel");
  if (routePanel) routePanel.style.display = "flex";

  setSearchState(false);
  clearSearch();
}

window.viewOnMap = viewOnMap;
window.setDestination = setDestination;

// ==========================
// BUSCA PRINCIPAL
// ==========================

async function searchPlace(query) {
  if (!query || query.trim().length < 2) {
    clearSearch();
    return;
  }

  query = query.trim();

  // 1. POIs locais
  const local = window.findPlacesByName
    ? window.findPlacesByName(query)
    : { results: [] };

  if (local.results.length > 0) {
    renderResults(local.results);
    return;
  }

  // 2. geocoding fallback
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
// RENDER
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
// INPUT (BUG FIX REAL)
// ==========================

document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("search-input");
  const panel = document.getElementById("search-panel");

  if (!input || !panel) return;

  input.addEventListener("input", (e) => {
    searchPlace(e.target.value);
  });

  // ENTER FUNCIONANDO DE VERDADE
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      searchPlace(input.value);
    }
  });

  // clique fora fecha
  document.addEventListener("click", (e) => {
    const clickedInside =
      panel.contains(e.target) ||
      e.target.id === "search-input";

    if (!clickedInside && searchOpen) {
      closeSearchPanel();
    }
  });
});