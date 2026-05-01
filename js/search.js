let searchOpen = false;

// ======================================
// FECHAR TODOS
// ======================================

function closeAllPanels() {

  const search =
    document.getElementById("search-panel");

  const action =
    document.getElementById("action-panel");

  const route =
    document.getElementById("route-panel");

  if (search) {
    search.style.display = "none";
  }

  if (action) {
    action.style.display = "none";
  }

  if (route) {
    route.style.display = "none";
  }

  searchOpen = false;
}

window.closeAllPanels = closeAllPanels;

// ======================================
// TOGGLE SEARCH
// ======================================

function toggleSearch() {

  const panel =
    document.getElementById("search-panel");

  if (!panel) return;

  const opened =
    panel.style.display === "block";

  closeAllPanels();

  if (!opened) {

    panel.style.display = "block";

    searchOpen = true;

    setTimeout(() => {

      document
        .getElementById("search-input")
        ?.focus();

    }, 100);
  }
}

window.toggleSearch = toggleSearch;

// ======================================
// VIEW ON MAP
// ======================================

function viewOnMap(lat, lng) {

  if (!window.map) return;

  closeAllPanels();

  window.map.setView(
    [lat, lng],
    17
  );
}

window.viewOnMap = viewOnMap;

// ======================================
// ABRIR UX DE ROTA
// ======================================

function openRoutePanel(destinationName) {

  closeAllPanels();

  const panel =
    document.getElementById("route-panel");

  const destination =
    document.getElementById(
      "route-destination"
    );

  if (!panel) return;

  if (destinationName && destination) {
    destination.value = destinationName;
  }

  panel.style.display = "flex";
}

window.openRoutePanel = openRoutePanel;

// ======================================
// ACTION PANEL
// ======================================

function showActionPanel(poi) {

  const panel =
    document.getElementById(
      "action-panel"
    );

  if (!panel) return;

  closeAllPanels();

  panel.innerHTML = `

    <div style="
      display:flex;
      justify-content:space-between;
      align-items:center;
      margin-bottom:10px;
    ">

      <b>${poi.name}</b>

      <button
        onclick="closeAllPanels()"
        style="
          border:none;
          background:none;
          font-size:18px;
          cursor:pointer;
        "
      >
        ✕
      </button>

    </div>

    <button
      onclick="viewOnMap(${poi.lat}, ${poi.lng})"
      style="
        width:100%;
        padding:10px;
        margin-bottom:8px;
      "
    >
      📍 Ver no mapa
    </button>

    <button
      onclick="
        openRoutePanel(
          '${poi.name.replace(/'/g, '')}'
        )
      "
      style="
        width:100%;
        padding:10px;
      "
    >
      🧭 Criar rota
    </button>
  `;

  panel.style.display = "block";
}

window.showActionPanel =
  showActionPanel;

// ======================================
// SEARCH
// ======================================

async function searchPlace(query) {

  const container =
    document.getElementById(
      "search-results"
    );

  if (!container) return;

  if (!query || query.length < 2) {

    container.innerHTML = "";

    return;
  }

  const local =
    window.findPlacesByName
      ? window.findPlacesByName(query)
      : { results: [] };

  if (local.results.length > 0) {

    renderResults(local.results);

    return;
  }

  if (window.geocode) {

    try {

      const geo =
        await window.geocode(query);

      if (geo) {

        renderResults([
          {
            name: geo.name,
            lat: geo.lat,
            lng: geo.lng
          }
        ]);
      }

    } catch (err) {

      console.error(err);
    }
  }
}

window.searchPlace = searchPlace;

// ======================================
// RENDER RESULTS
// ======================================

function renderResults(results) {

  const container =
    document.getElementById(
      "search-results"
    );

  if (!container) return;

  container.innerHTML = "";

  results.forEach(poi => {

    const div =
      document.createElement("div");

    div.style.padding = "10px";

    div.style.borderBottom =
      "1px solid #ddd";

    div.style.cursor = "pointer";

    div.innerText = poi.name;

    div.onclick = () => {

      if (window.map) {

        window.map.setView(
          [poi.lat, poi.lng],
          16
        );
      }

      showActionPanel(poi);
    };

    container.appendChild(div);
  });
}

// ======================================
// INPUT
// ======================================

document.addEventListener(
  "DOMContentLoaded",
  () => {

    const input =
      document.getElementById(
        "search-input"
      );

    if (!input) return;

    input.addEventListener(
      "input",
      e => {

        searchPlace(e.target.value);
      }
    );

    input.addEventListener(
      "keydown",
      e => {

        if (e.key === "Enter") {

          searchPlace(input.value);
        }
      }
    );
  }
);