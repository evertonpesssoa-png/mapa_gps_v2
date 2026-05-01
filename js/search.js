let searchOpen = false;

// ======================================
// FECHAR TODOS OS PAINÉIS
// ======================================

function closeAllPanels() {

  const search =
    document.getElementById(
      "search-panel"
    );

  const action =
    document.getElementById(
      "action-panel"
    );

  const route =
    document.getElementById(
      "route-panel"
    );

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

window.closeAllPanels =
  closeAllPanels;

// ======================================
// TOGGLE SEARCH
// ======================================

function toggleSearch() {

  const panel =
    document.getElementById(
      "search-panel"
    );

  if (!panel) return;

  const isOpen =
    panel.style.display === "block";

  closeAllPanels();

  if (!isOpen) {

    panel.style.display = "block";

    searchOpen = true;

    setTimeout(() => {

      document
        .getElementById(
          "search-input"
        )
        ?.focus();

    }, 100);
  }
}

window.toggleSearch =
  toggleSearch;

// ======================================
// ZOOM INTELIGENTE
// ======================================

function smartZoomToPlace(poi) {

  if (!window.map) return;

  const name =
    (poi.name || "")
      .toLowerCase();

  // estados
  const states = [

    "acre",
    "alagoas",
    "amapá",
    "amazonas",
    "bahia",
    "ceará",
    "espírito santo",
    "goiás",
    "maranhão",
    "mato grosso",
    "mato grosso do sul",
    "minas gerais",
    "pará",
    "paraíba",
    "paraná",
    "pernambuco",
    "piauí",
    "rio de janeiro",
    "rio grande do norte",
    "rio grande do sul",
    "rondônia",
    "roraima",
    "santa catarina",
    "são paulo",
    "sergipe",
    "tocantins"
  ];

  const isState =
    states.some(state =>
      name.includes(state)
    );

  if (isState) {

    window.map.setView(
      [poi.lat, poi.lng],
      7
    );

    return;
  }

  // cidades grandes
  const bigCities = [

    "recife",
    "goiana",
    "olinda",
    "jaboatão",
    "paulista",
    "caruaru",
    "petrolina",
    "são paulo",
    "rio de janeiro",
    "salvador",
    "fortaleza",
    "curitiba",
    "manaus",
    "belém",
    "brasília"
  ];

  const isCity =
    bigCities.some(city =>
      name.includes(city)
    );

  if (isCity) {

    window.map.setView(
      [poi.lat, poi.lng],
      11
    );

    return;
  }

  // padrão
  window.map.setView(
    [poi.lat, poi.lng],
    16
  );
}

// ======================================
// VIEW ON MAP
// ======================================

function viewOnMap(
  lat,
  lng
) {

  if (!window.map) return;

  closeAllPanels();

  window.map.setView(
    [lat, lng],
    17
  );
}

window.viewOnMap =
  viewOnMap;

// ======================================
// ABRIR ROTA
// ======================================

function openRoutePanel(
  destinationName
) {

  closeAllPanels();

  const panel =
    document.getElementById(
      "route-panel"
    );

  const destination =
    document.getElementById(
      "route-destination"
    );

  if (!panel) return;

  if (
    destinationName &&
    destination
  ) {

    destination.value =
      destinationName;
  }

  panel.style.display =
    "flex";
}

window.openRoutePanel =
  openRoutePanel;

// ======================================
// ACTION PANEL
// ======================================

function showActionPanel(
  poi
) {

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
      onclick="
        viewOnMap(
          ${poi.lat},
          ${poi.lng}
        )
      "
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
          '${poi.name.replace(/'/g, "")}'
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

  panel.style.display =
    "block";
}

window.showActionPanel =
  showActionPanel;

// ======================================
// SEARCH
// ======================================

async function searchPlace(
  query
) {

  const container =
    document.getElementById(
      "search-results"
    );

  if (!container) return;

  if (
    !query ||
    query.trim().length < 2
  ) {

    container.innerHTML = "";

    return;
  }

  // ======================================
  // BUSCA LOCAL
  // ======================================

  const local =
    window.findPlacesByName
      ? window.findPlacesByName(
          query
        )
      : { results: [] };

  if (
    local.results.length > 0
  ) {

    renderResults(
      local.results
    );

    return;
  }

  // ======================================
  // GEOCODING
  // ======================================

  if (window.geocode) {

    try {

      const geo =
        await window.geocode(
          query
        );

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

window.searchPlace =
  searchPlace;

// ======================================
// RENDER RESULTS
// ======================================

function renderResults(
  results
) {

  const container =
    document.getElementById(
      "search-results"
    );

  if (!container) return;

  container.innerHTML = "";

  results.forEach(poi => {

    const div =
      document.createElement(
        "div"
      );

    div.style.padding =
      "10px";

    div.style.borderBottom =
      "1px solid #ddd";

    div.style.cursor =
      "pointer";

    div.style.background =
      "white";

    div.innerText =
      poi.name;

    div.onclick = () => {

      smartZoomToPlace(
        poi
      );

      showActionPanel(
        poi
      );
    };

    container.appendChild(div);
  });
}

// ======================================
// INPUT EVENTS
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

        searchPlace(
          e.target.value
        );
      }
    );

    input.addEventListener(
      "keydown",
      e => {

        if (
          e.key === "Enter"
        ) {

          searchPlace(
            input.value
          );
        }
      }
    );
  }
);