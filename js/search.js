let searchOpen = false;

// ======================================
// CONTROLE ASSÍNCRONO
// ======================================

let currentSearchId = 0;

// ======================================
// CACHE GLOBAL
// ======================================

window.searchCache =
  window.searchCache || {};

// ======================================
// NORMALIZAR TEXTO
// ======================================

function normalizeText(text) {

  return (text || "")
    .toString()
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

window.closePanels =
  closePanels;

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

    panel.style.display =
      "none";

    return;
  }

  closePanels(
    "search-panel"
  );

  panel.style.display =
    "block";

  searchOpen = true;

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
// ZOOM INTELIGENTE
// ======================================

function smartZoomToPlace(poi) {

  if (!window.map) return;

  const lng =
    poi.lng ?? poi.lon;

  const name =
    normalizeText(
      poi.name
    );

  // estados
  const states = [

    "acre",
    "alagoas",
    "amapa",
    "amazonas",
    "bahia",
    "ceara",
    "espirito santo",
    "goias",
    "maranhao",
    "mato grosso",
    "mato grosso do sul",
    "minas gerais",
    "para",
    "paraiba",
    "parana",
    "pernambuco",
    "piaui",
    "rio de janeiro",
    "rio grande do norte",
    "rio grande do sul",
    "rondonia",
    "roraima",
    "santa catarina",
    "sao paulo",
    "sergipe",
    "tocantins"

  ];

  const isState =
    states.some(state =>
      name.includes(state)
    );

  if (isState) {

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
    "curitiba",
    "manaus",
    "belem",
    "brasilia",
    "sao paulo",
    "joao pessoa"

  ];

  const isCity =
    cities.some(city =>
      name.includes(city)
    );

  if (isCity) {

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

function viewOnMap(
  lat,
  lng
) {

  if (!window.map) return;

  closePanels();

  window.map.setView(
    [lat, lng],
    16
  );
}

window.viewOnMap =
  viewOnMap;

// ======================================
// ROUTE PANEL
// ======================================

function openRoutePanel(name) {

  closePanels(
    "route-panel"
  );

  const panel =
    document.getElementById(
      "route-panel"
    );

  const input =
    document.getElementById(
      "route-destination"
    );

  if (
    input &&
    name
  ) {

    input.value = name;
  }

  if (panel) {

    panel.style.display =
      "flex";
  }
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

  const lng =
    poi.lng ?? poi.lon;

  closePanels(
    "search-panel"
  );

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
          ${lng}
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

  query = query?.trim();

  if (
    !query ||
    query.length < 2
  ) {

    container.innerHTML = "";

    return;
  }

  const searchId =
    ++currentSearchId;

  const normalizedQuery =
    normalizeText(query);

  let results = [];

  // ======================================
  // BUSCA LOCAL
  // ======================================

  if (
    Array.isArray(
      window.poiIndex
    )
  ) {

    const local =
      window.poiIndex.filter(
        poi => {

          const name =
            normalizeText(
              poi.name
            );

          return name.includes(
            normalizedQuery
          );
        }
      );

    results.push(
      ...local
    );
  }

  // ======================================
  // CACHE
  // ======================================

  if (
    window.searchCache[
      normalizedQuery
    ]
  ) {

    const cached =
      window.searchCache[
        normalizedQuery
      ];

    const exists =
      results.some(
        r =>
          normalizeText(r.name) ===
          normalizeText(cached.name)
      );

    if (!exists) {
      results.push(cached);
    }
  }

  // render imediato
  renderResults(results);

  // ======================================
  // GEOCODING
  // ======================================

  if (
    typeof window.geocode ===
    "function"
  ) {

    try {

      const geo =
        await window.geocode(
          query
        );

      // ignora busca velha
      if (
        searchId !==
        currentSearchId
      ) {

        return;
      }

      if (geo) {

        // salva cache
        window.searchCache[
          normalizedQuery
        ] = geo;

        const exists =
          results.some(
            r =>
              normalizeText(
                r.name
              ) ===
              normalizeText(
                geo.name
              )
          );

        if (!exists) {

          results.push({

            name:
              geo.name,

            lat:
              geo.lat,

            lng:
              geo.lng,

            category:
              "global"
          });
        }
      }

      renderResults(results);

    } catch (err) {

      console.error(
        "Geocode error:",
        err
      );
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

  if (
    !results ||
    results.length === 0
  ) {

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

  // remove duplicados
  const unique = [];

  results.forEach(poi => {

    const exists =
      unique.some(
        p =>
          normalizeText(p.name) ===
          normalizeText(poi.name)
      );

    if (!exists) {
      unique.push(poi);
    }
  });

  unique.forEach(poi => {

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

    div.style.transition =
      "0.2s";

    div.innerHTML = `
      <b>${poi.name}</b>
    `;

    div.onmouseenter =
      () => {

        div.style.background =
          "#f2f2f2";
      };

    div.onmouseleave =
      () => {

        div.style.background =
          "white";
      };

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