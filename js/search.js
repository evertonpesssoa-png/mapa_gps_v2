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
// DEBOUNCE SAFE
// ======================================

function debounce(
  fn,
  delay = 300
) {

  let timeout = null;

  return function (...args) {

    clearTimeout(timeout);

    timeout = setTimeout(() => {

      fn.apply(this, args);

    }, delay);
  };
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

  const lat =
    Number(poi.lat);

  const lng =
    Number(
      poi.lng ??
      poi.lon
    );

  if (
    isNaN(lat) ||
    isNaN(lng)
  ) {

    console.warn(
      "POI inválido:",
      poi
    );

    return;
  }

  const type =
    normalizeText(
      poi.type ||
      poi.category ||
      ""
    );

  // estados
  if (
    type.includes("state") ||
    type.includes("estado")
  ) {

    window.map.setView(
      [lat, lng],
      7
    );

    return;
  }

  // cidades
  if (
    type.includes("city") ||
    type.includes("town") ||
    type.includes("cidade")
  ) {

    window.map.setView(
      [lat, lng],
      11
    );

    return;
  }

  // padrão
  window.map.setView(
    [lat, lng],
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

function openRoutePanel(poi) {

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

  if (poi) {

    window.selectedDestination = {
      name: poi.name,
      lat: Number(poi.lat),
      lng: Number(
        poi.lng ?? poi.lon
      )
    };

    if (input) {
      input.value = poi.name;
    }
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

  const lat =
    Number(poi.lat);

  const lng =
    Number(
      poi.lng ??
      poi.lon
    );

  closePanels(
    "action-panel"
  );

  const safeName =
    String(poi.name || "")
      .replace(/'/g, "")
      .replace(/"/g, "");

  panel.innerHTML = `

    <div style="
      display:flex;
      justify-content:space-between;
      align-items:center;
      margin-bottom:10px;
    ">

      <b>${safeName}</b>

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

    ${
      poi.fullName
        ? `
          <div style="
            font-size:12px;
            color:#666;
            margin-bottom:10px;
          ">
            ${poi.fullName}
          </div>
        `
        : ""
    }

    <button
      onclick="
        viewOnMap(
          ${lat},
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
          '${safeName}'
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

    results.push(...local);
  }

  // ======================================
  // CACHE LOCAL
  // ======================================

  const cached =
    window.searchCache[
      normalizedQuery
    ];

  if (
    Array.isArray(cached)
  ) {

    results.push(...cached);
  }

  // ======================================
  // RENDER INSTANTÂNEO
  // ======================================

  renderResults(results);

  // ======================================
  // LOCATION ENGINE
  // ======================================

  if (
    typeof window.locationEngine
      ?.searchLocation ===
    "function"
  ) {

    try {

      const geoResults =
        await window.locationEngine.searchLocation(
          query
        );

      // ignora buscas antigas
      if (
        searchId !==
        currentSearchId
      ) {

        return;
      }

      if (
        Array.isArray(
          geoResults
        ) &&
        geoResults.length > 0
      ) {

        // salva cache
        window.searchCache[
          normalizedQuery
        ] = geoResults;

        geoResults.forEach(
          geo => {

            const geoLat =
              Number(geo.lat);

            const geoLng =
              Number(
                geo.lng ??
                geo.lon
              );

            const exists =
              results.some(
                r => {

                  const sameName =
                    normalizeText(r.name) ===
                    normalizeText(geo.name);

                  const sameLat =
                    Math.abs(
                      Number(r.lat) -
                      geoLat
                    ) < 0.0001;

                  const sameLng =
                    Math.abs(
                      Number(
                        r.lng ??
                        r.lon
                      ) - geoLng
                    ) < 0.0001;

                  return (
                    sameName &&
                    sameLat &&
                    sameLng
                  );
                }
              );

            if (!exists) {

              results.push({

                name:
                  geo.name,

                fullName:
                  geo.fullName,

                lat:
                  geoLat,

                lng:
                  geoLng,

                type:
                  geo.type,

                category:
                  geo.category ||
                  "global"
              });
            }
          });
      }

      renderResults(results);

    } catch (err) {

      console.error(
        "Erro search:",
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

  // ======================================
  // REMOVE DUPLICADOS
  // ======================================

  const unique = [];

  results.forEach(poi => {

    const lat =
      Number(poi.lat);

    const lng =
      Number(
        poi.lng ??
        poi.lon
      );

    const exists =
      unique.some(
        p => {

          const sameName =
            normalizeText(p.name) ===
            normalizeText(poi.name);

          const sameLat =
            Math.abs(
              Number(p.lat) -
              lat
            ) < 0.0001;

          const sameLng =
            Math.abs(
              Number(
                p.lng ??
                p.lon
              ) - lng
            ) < 0.0001;

          return (
            sameName &&
            sameLat &&
            sameLng
          );
        }
      );

    if (!exists) {

      unique.push({
        ...poi,
        lat,
        lng
      });
    }
  });

  // ======================================
  // RENDER
  // ======================================

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

      ${
        poi.fullName
          ? `
            <div style="
              font-size:12px;
              color:#666;
              margin-top:4px;
            ">
              ${poi.fullName}
            </div>
          `
          : ""
      }
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

    if (!input) {

      console.warn(
        "search-input não encontrado"
      );

      return;
    }

    // debounce
    const debouncedSearch =
      debounce(value => {

        searchPlace(value);

      }, 400);

    input.addEventListener(
      "input",
      e => {

        debouncedSearch(
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