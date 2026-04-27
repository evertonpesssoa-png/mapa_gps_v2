// ==========================
// ESTADO
// ==========================

let searchOpen = false;

// ==========================
// OPEN / CLOSE SEARCH
// ==========================

function openSearchPanel() {
  const panel = document.getElementById("search-panel");
  const route = document.getElementById("route-panel");

  if (!panel) return;

  searchOpen = true;

  panel.style.display = "block";

  // fecha rota
  if (route) route.style.display = "none";
}

function closeSearchPanel() {
  const panel = document.getElementById("search-panel");

  if (!panel) return;

  searchOpen = false;
  panel.style.display = "none";

  const container = document.getElementById("search-results");
  if (container) container.innerHTML = "";
}

// toggle REAL (corrigido)
function toggleSearch() {
  const panel = document.getElementById("search-panel");
  const route = document.getElementById("route-panel");

  if (!panel) return;

  const isOpen = panel.style.display === "block";

  if (isOpen) {
    closeSearchPanel();
  } else {
    openSearchPanel();
  }

  if (route) route.style.display = "none";
}

// ==========================
// ACTION PANEL
// ==========================

function showActionPanel(poi) {
  const panel = document.getElementById("action-panel");
  if (!panel) return;

  panel.innerHTML = `
    <b>${poi.name}</b><br><br>

    <button onclick="viewOnMap(${poi.lat},${poi.lon})">📍 Ver no mapa</button><br><br>

    <button onclick="routeToPlace(${poi.lat},${poi.lon})">🧭 Traçar rota</button><br><br>

    <button onclick="setDestination('${poi.name.replace(/'/g, "")}')">🎯 Definir destino</button>
  `;

  panel.style.display = "block";
}

// ==========================
// SEARCH PRINCIPAL
// ==========================

async function searchPlace(query) {
  const container = document.getElementById("search-results");
  if (!container) return;

  if (!query || query.trim().length < 2) {
    container.innerHTML = "";
    return;
  }

  const local = window.findPlacesByName
    ? window.findPlacesByName(query)
    : { results: [] };

  if (local.results.length > 0) {
    renderResults(local.results);
    return;
  }

  if (window.geocode) {
    try {
      const geo = await window.geocode(query);

      if (geo) {
        renderResults([{
          name: geo.name,
          lat: geo.lat,
          lon: geo.lng
        }]);
      }
    } catch (e) {
      console.warn(e);
    }
  }
}

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
      window.map?.setView([poi.lat, poi.lon], 16);
      showActionPanel(poi);
      closeSearchPanel();
    };

    container.appendChild(div);
  });
}

// ==========================
// INPUT FIX (ENTER + BUG FIX)
// ==========================

document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("search-input");

  if (!input) return;

  input.addEventListener("input", (e) => {
    searchPlace(e.target.value);
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      searchPlace(input.value);
    }
  });
});

// ==========================
// EXPORT GLOBAL (ESSENCIAL)
// ==========================

window.openSearchPanel = openSearchPanel;
window.closeSearchPanel = closeSearchPanel;
window.toggleSearch = toggleSearch;
window.searchPlace = searchPlace;
window.showActionPanel = showActionPanel;