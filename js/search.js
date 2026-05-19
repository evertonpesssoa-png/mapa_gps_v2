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
// DESTINO GLOBAL SELECIONADO
// ======================================

window.selectedDestination =
  window.selectedDestination || null;

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
// ESCAPE HTML
// ======================================

function escapeHTML(text) {

  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
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

  // estado
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

  // cidade
  if (
    type.includes("city") ||
    type.includes("town") ||
    type.includes("cidade") ||
    type.includes("municipality")
  ) {

    window.map.setView(
      [lat, lng],
      11
    );

    return;
  }

  // rua / bairro
  if (
    type.includes("road") ||
    type.includes("street") ||
    type.includes("residential") ||
    type.includes("suburb")
  ) {

    window.map.setView(
      [lat, lng],
      15
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

function openRoutePanel(
  poi = null
) {

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
    poi &&
    !isNaN(Number(poi.lat)) &&
    !isNaN(Number(
      poi.lng ?? poi.lon
    ))
  ) {

    window.selectedDestination = {

      name:
        poi.name || "Destino",

      lat:
        Number(poi.lat),

      lng:
        Number(
          poi.lng ??
          poi.lon
        ),

      fullName:
        poi.fullName || "",

      type:
        poi.type || ""
    };

    if (input) {

      input.value =
        poi.name || "";
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
    escapeHTML(
      poi.name || "Local"
    );

  const safeFullName =
    escapeHTML(
      poi.fullName || ""
    );

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
      safeFullName
        ? `
          <div style="
            font-size:12px;
            color:#666;
            margin-bottom:10px;
            line-height:1.4;
          ">
            ${safeFullName}
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
        border:none;
        border-radius:10px;
        cursor:pointer;
      "
    >
      📍 Ver no mapa
    </button>

    <button
      onclick='openRoutePanel(${JSON.stringify({
        name: poi.name,
        fullName: poi.fullName,
        lat,
        lng,
        type: poi.type
      })})'
      style="
        width:100%;
        padding:10px;
        border:none;
        border-radius:10px;
        cursor:pointer;
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

          const full =
            normalizeText(
              poi.fullName
            );

          return (

            name.includes(
              normalizedQuery
            ) ||

            full.includes(
              normalizedQuery
            )
          );
        }
      );

    results.push(...local);
  }

  // ======================================
  // CACHE
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
  // GEOCODE GLOBAL
  // ======================================

  if (
    typeof window.geocode ===
    "function"
  ) {

    try {

      const geoResults =
        await window.geocode(
          query
        );

      // ignora busca antiga
      if (
        searchId !==
        currentSearchId
      ) {

        return;
      }

      if (
        Array.isArray(
          geoResults
        )
      ) {

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

                    normalizeText(
                      r.name
                    ) ===

                    normalizeText(
                      geo.name
                    );

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
                  geo.type ||
                  "global",

                source:
                  geo.source ||
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

            normalizeText(
              p.name
            ) ===

            normalizeText(
              poi.name
            );

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
  // LIMITA RESULTADOS
  // ======================================

  const finalResults =
    unique.slice(0, 25);

  // ======================================
  // RENDER
  // ======================================

  finalResults.forEach(poi => {

    const div =
      document.createElement(
        "div"
      );

    div.style.padding =
      "12px";

    div.style.borderBottom =
      "1px solid #eee";

    div.style.cursor =
      "pointer";

    div.style.background =
      "white";

    div.style.transition =
      "0.2s";

    div.style.lineHeight =
      "1.4";

    const sourceLabel =

      poi.auto
        ? "📍 Próximo"

      : poi.source ===
        "nominatim"
        ? "🌎 Global"

      : "🗂 Local";

    div.innerHTML = `

      <div style="
        font-weight:bold;
        margin-bottom:4px;
      ">
        ${escapeHTML(poi.name)}
      </div>

      ${
        poi.fullName
          ? `
            <div style="
              font-size:12px;
              color:#666;
              margin-bottom:4px;
            ">
              ${escapeHTML(
                poi.fullName
              )}
            </div>
          `
          : ""
      }

      <div style="
        font-size:11px;
        color:#999;
      ">
        ${sourceLabel}
      </div>
    `;

    div.onmouseenter =
      () => {

        div.style.background =
          "#f5f5f5";
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

    const debouncedSearch =
      debounce(value => {

        searchPlace(value);

      }, 350);

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

// ======================================
// PESQUISA INTELIGENTE POR CATEGORIA (PARA ASURAS)
// ======================================

function searchByCategory(category, query = "") {
  if (!window.poiIndex) return [];
  
  const normalizedQuery = normalizeText(query);
  
  return window.poiIndex.filter(poi => {
    const matchesCategory = poi.category === category || poi.type === category;
    const matchesQuery = normalizedQuery === "" || normalizeText(poi.name).includes(normalizedQuery);
    return matchesCategory && matchesQuery;
  });
}

window.searchByCategory = searchByCategory;

// ======================================
// PESQUISA PRÓXIMO (RAIO)
// ======================================

function searchNearby(lat, lng, radius = 1000, category = null) {
  if (!window.poiIndex) return [];
  
  const results = [];
  
  window.poiIndex.forEach(poi => {
    const poiLat = Number(poi.lat);
    const poiLng = Number(poi.lng ?? poi.lon);
    
    if (isNaN(poiLat) || isNaN(poiLng)) return;
    
    const distance = distanceInMeters(lat, lng, poiLat, poiLng);
    
    if (distance <= radius) {
      if (category === null || poi.category === category || poi.type === category) {
        results.push({ ...poi, distance: Math.round(distance) });
      }
    }
  });
  
  // Ordenar por distância
  results.sort((a, b) => (a.distance || 99999) - (b.distance || 99999));
  
  return results;
}

window.searchNearby = searchNearby;

// ======================================
// FUNÇÃO DE DISTÂNCIA (COPIA DO MAPA.JS)
// ======================================

function distanceInMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ======================================
// ROTA INTELIGENTE (COM MÚLTIPLAS OPÇÕES)
// ======================================

async function smartRoute(originLat, originLng, destLat, destLng, mode = "car") {
  const profile = mode === "foot" ? "walking" : mode === "bike" ? "cycling" : "driving";
  const url = `https://router.project-osrm.org/route/v1/${profile}/${originLng},${originLat};${destLng},${destLat}?overview=full&geometries=geojson&steps=true&alternatives=true`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data.routes || data.routes.length === 0) return null;
    
    const routes = data.routes.map(route => ({
      distance: (route.distance / 1000).toFixed(1),
      duration: Math.round(route.duration / 60),
      geometry: route.geometry,
      steps: route.legs[0]?.steps || []
    }));
    
    // Ordenar por duração
    routes.sort((a, b) => a.duration - b.duration);
    
    return routes;
  } catch (error) {
    console.error("Erro na rota:", error);
    return null;
  }
}

window.smartRoute = smartRoute;

// ======================================
// MOSTRAR ROTAS NO MAPA (MÚLTIPLAS OPÇÕES)
// ======================================

async function showSmartRoute(destLat, destLng, mode = "car") {
  const pos = window.locationEngine?.getPosition();
  if (!pos) {
    alert("GPS indisponível");
    return;
  }
  
  const routes = await smartRoute(pos.lat, pos.lng, destLat, destLng, mode);
  
  if (!routes || routes.length === 0) {
    alert("Nenhuma rota encontrada");
    return;
  }
  
  // Limpar rotas anteriores
  if (window.routeLayer) window.routeLayer.clearLayers();
  
  // Cores para diferentes rotas
  const colors = ["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6"];
  
  routes.forEach((route, index) => {
    const geojson = L.geoJSON(route.geometry, {
      color: colors[index % colors.length],
      weight: index === 0 ? 5 : 3,
      opacity: index === 0 ? 0.9 : 0.6,
      dashArray: index === 0 ? null : "5, 10"
    }).addTo(window.routeLayer);
    
    // Adicionar marcadores de início e fim (apenas na primeira rota)
    if (index === 0) {
      L.marker([pos.lat, pos.lng], {
        icon: L.divIcon({ html: "🚀", className: "custom-marker", iconSize: [20, 20] })
      }).addTo(window.routeLayer);
      
      L.marker([destLat, destLng], {
        icon: L.divIcon({ html: "🏁", className: "custom-marker", iconSize: [20, 20] })
      }).addTo(window.routeLayer);
    }
  });
  
  // Ajustar zoom
  const bounds = L.latLngBounds([[pos.lat, pos.lng], [destLat, destLng]]);
  window.map.fitBounds(bounds, { padding: [50, 50] });
  
  // Mostrar informações
  const best = routes[0];
  showRouteComparison(routes, destLat, destLng);
  
  return routes;
}

window.showSmartRoute = showSmartRoute;

// ======================================
// MOSTRAR COMPARAÇÃO DE ROTAS
// ======================================

function showRouteComparison(routes, destLat, destLng) {
  const infoDiv = document.getElementById("route-info");
  if (!infoDiv) return;
  
  if (!routes || routes.length === 0) {
    infoDiv.style.display = "none";
    return;
  }
  
  let html = `
    <div style="font-weight: bold; margin-bottom: 8px;">📋 MÚLTIPLAS ROTAS</div>
    <div style="display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;">
  `;
  
  const icons = { car: "🚗", foot: "🚶", bike: "🚴" };
  const modeNames = { car: "Carro", foot: "A pé", bike: "Bicicleta" };
  const colors = { car: "#ef4444", foot: "#10b981", bike: "#3b82f6" };
  
  // Por enquanto só uma rota, mas estrutura pronta para múltiplos modos
  routes.forEach((route, idx) => {
    const mode = idx === 0 ? "car" : idx === 1 ? "foot" : "bike";
    html += `
      <div style="
        background: ${colors[mode]}22;
        border-radius: 12px;
        padding: 6px 12px;
        text-align: center;
        border: 1px solid ${colors[mode]};
        cursor: pointer;
      " onclick="selectRouteAndZoom(${destLat}, ${destLng}, '${mode}')">
        <div style="font-size: 20px;">${icons[mode]}</div>
        <div style="font-size: 11px; font-weight: bold;">${modeNames[mode]}</div>
        <div style="font-size: 10px;">${route.distance}km • ${route.duration}min</div>
      </div>
    `;
  });
  
  html += `</div>`;
  infoDiv.innerHTML = html;
  infoDiv.style.display = "block";
}

window.showRouteComparison = showRouteComparison;

// ======================================
// SELECIONAR ROTA E ZOOM
// ======================================

async function selectRouteAndZoom(destLat, destLng, mode) {
  await showSmartRoute(destLat, destLng, mode);
}

window.selectRouteAndZoom = selectRouteAndZoom;

// ======================================
// PESQUISA PARA ASURAS (DIVA, ASTREIA, SIRIA)
// ======================================

async function searchForAsura(asuraName, query, lat, lng) {
  const asuraCategories = {
    diva: ["pharmacy", "supermarket", "restaurant", "cafe", "gas_station", "bakery"],
    astreia: ["police", "police_station", "security", "government"],
    siria: ["bank", "atm", "finance", "exchange"]
  };
  
  const categories = asuraCategories[asuraName] || [];
  
  if (categories.length === 0) {
    return searchPlace(query);
  }
  
  // Busca local nos POIs por categoria
  let results = [];
  categories.forEach(cat => {
    const categoryResults = searchByCategory(cat, query);
    results.push(...categoryResults);
  });
  
  // Busca por texto normal também
  if (typeof searchPlace === "function") {
    // A função searchPlace já existe e faz a busca completa
    await searchPlace(query);
  }
  
  // Se tiver coordenadas, filtrar por proximidade
  if (lat && lng) {
    const nearby = searchNearby(lat, lng, 2000);
    results = [...results, ...nearby];
  }
  
  // Remover duplicados
  const uniqueResults = [];
  results.forEach(r => {
    if (!uniqueResults.some(u => u.name === r.name && u.lat === r.lat)) {
      uniqueResults.push(r);
    }
  });
  
  renderResults(uniqueResults);
  
  return uniqueResults;
}

window.searchForAsura = searchForAsura;