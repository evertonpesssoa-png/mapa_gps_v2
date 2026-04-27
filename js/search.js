function openSearchPanel() {
  document.getElementById("search-panel").style.display = "block";
  document.getElementById("route-panel").style.display = "none";
}

function showActionPanel(poi) {
  const panel = document.getElementById("action-panel");

  panel.innerHTML = `
    <b>${poi.name}</b><br><br>

    <button onclick="viewOnMap(${poi.lat},${poi.lon})">
      📍 Ver no mapa
    </button><br><br>

    <button onclick="routeToPlace(${poi.lat},${poi.lon})">
      🧭 Traçar rota
    </button><br><br>

    <button onclick="setDestination('${poi.name}')">
      🎯 Definir destino
    </button>
  `;

  panel.style.display = "block";
}

function viewOnMap(lat, lon) {
  if (!window.map) return;

  window.map.setView([lat, lon], 17);
}

function setDestination(name) {
  const input = document.getElementById("route-destination");

  if (input) {
    input.value = name;
  }

  document.getElementById("route-panel").style.display = "flex";
  document.getElementById("search-panel").style.display = "none";
}

// ==========================
// BUSCA PRINCIPAL
// ==========================

async function searchPlace(query) {

  if (!query) return;

  // 1. POIs locais primeiro
  const local = findPlacesByName(query);

  if (local.results.length > 0) {
    renderResults(local.results);
    return;
  }

  // 2. Geocoding global
  const geo = await window.geocode(query);

  if (geo) {
    const result = [{
      name: geo.name,
      lat: geo.lat,
      lon: geo.lng
    }];

    renderResults(result);
  }
}

function renderResults(results) {

  const container = document.getElementById("search-results");
  container.innerHTML = "";

  results.forEach(poi => {

    const div = document.createElement("div");
    div.style.padding = "8px";
    div.style.borderBottom = "1px solid #ccc";
    div.style.cursor = "pointer";

    div.innerHTML = poi.name;

    div.onclick = () => {
      window.map.setView([poi.lat, poi.lon], 16);
      showActionPanel(poi);
    };

    container.appendChild(div);
  });
}

// INPUT EVENT
document.addEventListener("DOMContentLoaded", () => {

  const input = document.getElementById("search-input");

  input.addEventListener("input", (e) => {
    searchPlace(e.target.value);
  });

});

window.openSearchPanel = openSearchPanel;
window.searchPlace = searchPlace;
window.showActionPanel = showActionPanel;