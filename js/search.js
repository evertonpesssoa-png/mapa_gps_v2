function toggleSearch() {

  const panel = document.getElementById("search-panel");
  const route = document.getElementById("route-panel");

  if (!panel) return;

  const open = panel.style.display === "block";

  panel.style.display = open ? "none" : "block";

  if (route) {
    route.style.display = "none";
  }
}

window.toggleSearch = toggleSearch;

function showActionPanel(poi) {

  const panel = document.getElementById("action-panel");

  if (!panel) return;

  panel.innerHTML = `

    <b>${poi.name}</b><br><br>

    <button onclick="viewOnMap(${poi.lat}, ${poi.lng})">
      📍 Ver no mapa
    </button>

    <br><br>

    <button onclick="routeToPlace(${poi.lat}, ${poi.lng})">
      🧭 Criar rota
    </button>

  `;

  panel.style.display = "block";
}

window.showActionPanel = showActionPanel;

function viewOnMap(lat, lng) {

  if (!window.map) return;

  window.map.setView([lat, lng], 17);
}

window.viewOnMap = viewOnMap;

async function searchPlace(query) {

  const resultsBox = document.getElementById("search-results");

  if (!resultsBox) return;

  if (!query || query.length < 2) {
    resultsBox.innerHTML = "";
    return;
  }

  const local = window.findPlacesByName(query);

  if (local.results.length > 0) {
    renderResults(local.results);
    return;
  }

  if (window.geocode) {

    const geo = await window.geocode(query);

    if (geo) {

      renderResults([
        {
          name: geo.name,
          lat: geo.lat,
          lng: geo.lng
        }
      ]);
    }
  }
}

window.searchPlace = searchPlace;

function renderResults(results) {

  const box = document.getElementById("search-results");

  if (!box) return;

  box.innerHTML = "";

  results.forEach(poi => {

    const div = document.createElement("div");

    div.style.padding = "8px";
    div.style.borderBottom = "1px solid #ddd";
    div.style.cursor = "pointer";

    div.innerText = poi.name;

    div.onclick = () => {

      viewOnMap(poi.lat, poi.lng);

      showActionPanel(poi);

      document.getElementById("search-panel").style.display = "none";
    };

    box.appendChild(div);
  });
}

document.addEventListener("DOMContentLoaded", () => {

  const input = document.getElementById("search-input");

  if (!input) return;

  input.addEventListener("input", e => {
    searchPlace(e.target.value);
  });
});