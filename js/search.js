let searchOpen = false;

// ======================================
// NORMALIZAR TEXTO
// ======================================

function normalizeText(text) {

  return (text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

// ======================================
// FECHAR PAINÉIS
// ======================================

function closePanels(except = null) {

  const panels = [
    "search-panel",
    "action-panel",
    "route-panel"
  ];

  panels.forEach(id => {

    if (id === except) return;

    const el =
      document.getElementById(id);

    if (el) {
      el.style.display = "none";
    }
  });
}

window.closePanels = closePanels;

// ======================================
// TOGGLE SEARCH
// ======================================

function toggleSearch() {

  const panel =
    document.getElementById(
      "search-panel"
    );

  if (!panel) return;

  const opened =
    panel.style.display === "block";

  if (opened) {

    panel.style.display = "none";

    return;
  }

  closePanels("search-panel");

  panel.style.display = "block";

  setTimeout(() => {

    document
      .getElementById(
        "search-input"
      )
      ?.focus();

  }, 100);
}

window.toggleSearch =
  toggleSearch;

// ======================================
// ZOOM
// ======================================

function smartZoomToPlace(poi) {

  if (!window.map) return;

  const lng =
    poi.lng ?? poi.lon;

  const name =
    normalizeText(poi.name);

  // estados
  const states = [
    "pernambuco",
    "sao paulo",
    "bahia",
    "ceara",
    "amazonas",
    "rio de janeiro",
    "minas gerais"
  ];

  if (
    states.some(s =>
      name.includes(s)
    )
  ) {

    window.map.setView(
      [poi.lat, lng],
      7
    );

    return;
  }

  // cidades
  const cities = [
    "goiana",
    "recife",
    "olinda",
    "caruaru",
    "petrolina",
    "fortaleza",
    "salvador",
    "curitiba"
  ];

  if (
    cities.some(c =>
      name.includes(c)
    )
  ) {

    window.map.setView(
      [poi.lat, lng],
      11
    );

    return;
  }

  // padrão
  window.map.setView(
    [poi.lat, lng],
    16
  );
}

// ======================================
// VIEW ON MAP
// ======================================

function viewOnMap(lat, lng) {

  if (!window.map) return;

  closePanels();

  window.map.setView(
    [lat, lng],
    17
  );
}

window.viewOnMap =
  viewOnMap;

// ======================================
// ROUTE PANEL
// ======================================

function openRoutePanel(name) {

  closePanels("route-panel");

  const panel =
    document.getElementById(
      "route-panel"
    );

  const input =
    document.getElementById(
      "route-destination"
    );

  if (input && name) {
    input.value = name;
  }

  if (panel) {
    panel.style.display = "flex";
  }
}

window.openRoutePanel =
  openRoutePanel;

// ======================================
// ACTION PANEL
// ======================================

function showActionPanel(poi) {

  const panel =
    document.getElementById(
      "action-panel"
    );

  if (!panel) return;

  const lng =
    poi.lng ?? poi.lon;

  // NÃO FECHA SEARCH
  closePanels("search-panel");

  panel.innerHTML = `

    <div style="
      display:flex;
      justify-content:space-between;
      align-items:center;
      margin-bottom:10px;
    ">

      <b>${poi.name}</b>

      <button
        onclick="
          document.getElementById('action-panel').style.display='none'
        "
      >
        ✕
      </button>

    </div>

    <button
      onclick="
        viewOnMap(${poi.lat}, ${lng})
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
        openRoutePanel('${poi.name.replace(/'/g, "")}')
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

async function searchPlace(query) {

  const container =
    document.getElementById(
      "search-results"
    );

  if (!container) return;

  query = query?.trim();

  if (!query || query.length < 2) {

    container.innerHTML = "";

    return;
  }

  let results = [];

  // ======================================
  // LOCAL
  // ======================================

  if (
    Array.isArray(
      window.poiIndex
    )
  ) {

    const local =
      window.poiIndex.filter(
        poi =>
          normalizeText(
            poi.name
          ).includes(
            normalizeText(query)
          )
      );

    results.push(...local);
  }

  // ======================================
  // GEOCODE
  // ======================================

  if (window.geocode) {

    try {

      const geo =
        await window.geocode(
          query
        );

      if (geo) {

        const exists =
          results.some(
            r =>
              normalizeText(r.name) ===
              normalizeText(geo.name)
          );

        if (!exists) {

          results.push(geo);
        }
      }

    } catch (err) {

      console.error(err);
    }
  }

  renderResults(results);
}

window.searchPlace =
  searchPlace;

// ======================================
// RENDER
// ======================================

function renderResults(results) {

  const container =
    document.getElementById(
      "search-results"
    );

  if (!container) return;

  container.innerHTML = "";

  if (!results.length) {

    container.innerHTML = `
      <div style="
        padding:12px;
        color:#666;
      ">
        Nenhum resultado
      </div>
    `;

    return;
  }

  results.forEach(poi => {

    const div =
      document.createElement("div");

    div.style.padding =
      "10px";

    div.style.borderBottom =
      "1px solid #ddd";

    div.style.cursor =
      "pointer";

    div.style.background =
      "white";

    div.innerHTML = `
      <b>${poi.name}</b>
    `;

    div.onclick = () => {

      smartZoomToPlace(poi);

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

        searchPlace(
          e.target.value
        );
      }
    );
  }
);