const SPEEDS = {
  foot: 5,
  bike: 18,
  car: 50
};

// ======================================
// CONTROLE REQUESTS
// ======================================

let currentRouteController = null;

// ======================================
// TOGGLE ROUTE PANEL
// ======================================

function toggleRoute() {

  const panel =
    document.getElementById(
      "route-panel"
    );

  const search =
    document.getElementById(
      "search-panel"
    );

  const action =
    document.getElementById(
      "action-panel"
    );

  if (!panel) return;

  const isOpen =
    panel.style.display === "flex";

  if (search) {
    search.style.display = "none";
  }

  if (action) {
    action.style.display = "none";
  }

  panel.style.display =
    isOpen
      ? "none"
      : "flex";
}

window.toggleRoute =
  toggleRoute;

// ======================================
// FORMATADORES
// ======================================

function formatDistance(meters) {

  if (!meters || isNaN(meters)) {
    return "0 m";
  }

  if (meters < 1000) {
    return `${meters.toFixed(0)} m`;
  }

  return `${(meters / 1000).toFixed(1)} km`;
}

function formatTime(
  distance,
  mode
) {

  const speed =
    SPEEDS[mode] ||
    SPEEDS.car;

  const km =
    distance / 1000;

  const minutes =
    Math.round(
      (km / speed) * 60
    );

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours =
    Math.floor(minutes / 60);

  const rest =
    minutes % 60;

  return `${hours}h ${rest}min`;
}

// ======================================
// LIMPAR ROTA
// ======================================

function clearRoute() {

  if (
    window.routeLayer
  ) {

    window.routeLayer.clearLayers();
  }

  const info =
    document.getElementById(
      "route-info"
    );

  if (info) {
    info.innerHTML = "";
  }
}

window.clearRoute =
  clearRoute;

// ======================================
// NORMALIZAR TEXTO
// ======================================

function normalizeText(
  text
) {

  return (text || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .trim();
}

// ======================================
// RESOLVER LOCALIZAÇÃO
// ======================================

async function resolveText(
  text
) {

  if (!text) return null;

  const normalized =
    normalizeText(text);

  // ======================================
  // LOCATION ENGINE
  // ======================================

  if (
    typeof window.resolveLocation ===
    "function"
  ) {

    try {

      const resolved =
        await window.resolveLocation(
          text
        );

      if (
        resolved &&
        !isNaN(resolved.lat) &&
        !isNaN(resolved.lng)
      ) {

        return {

          lat:
            Number(
              resolved.lat
            ),

          lng:
            Number(
              resolved.lng
            ),

          name:
            resolved.name ||
            text
        };
      }

    } catch (err) {

      console.warn(
        "Erro locationEngine:",
        err
      );
    }
  }

  // ======================================
  // BUSCA LOCAL FALLBACK
  // ======================================

  if (
    Array.isArray(
      window.poiIndex
    )
  ) {

    let local =
      window.poiIndex.find(
        p =>
          normalizeText(
            p.name
          ) === normalized
      );

    if (!local) {

      local =
        window.poiIndex.find(
          p =>
            normalizeText(
              p.name
            ).includes(
              normalized
            )
        );
    }

    if (local) {

      return {

        lat:
          Number(
            local.lat
          ),

        lng:
          Number(
            local.lng ??
            local.lon
          ),

        name:
          local.name
      };
    }
  }

  // ======================================
  // GEOCODING FALLBACK
  // ======================================

  if (
    typeof window.geocode ===
    "function"
  ) {

    try {

      const geo =
        await window.geocode(
          text
        );

      if (!geo) {
        return null;
      }

      // array
      if (
        Array.isArray(geo) &&
        geo.length > 0
      ) {

        const best =
          geo[0];

        return {

          lat:
            Number(
              best.lat
            ),

          lng:
            Number(
              best.lng ??
              best.lon
            ),

          name:
            best.name ||
            text
        };
      }

      // objeto
      return {

        lat:
          Number(
            geo.lat
          ),

        lng:
          Number(
            geo.lng ??
            geo.lon
          ),

        name:
          geo.name ||
          text
      };

    } catch (err) {

      console.error(
        "Erro geocode:",
        err
      );
    }
  }

  return null;
}

window.resolveText =
  resolveText;

// ======================================
// TRAÇAR ROTA
// ======================================

async function traceRoute(
  from,
  to,
  mode = "car"
) {

  if (
    !window.map ||
    !window.routeLayer
  ) {

    console.error(
      "Mapa ou routeLayer não encontrado"
    );

    return;
  }

  // cancela request anterior
  if (
    currentRouteController
  ) {

    currentRouteController.abort();
  }

  currentRouteController =
    new AbortController();

  const profile =
    mode === "foot"
      ? "walking"
      : mode === "bike"
      ? "cycling"
      : "driving";

  const url =
    `https://router.project-osrm.org/route/v1/${profile}/` +
    `${from.lng},${from.lat};${to.lng},${to.lat}` +
    `?overview=full&geometries=geojson`;

  try {

    const timeout =
      setTimeout(() => {

        currentRouteController.abort();

      }, 12000);

    const response =
      await fetch(url, {
        signal:
          currentRouteController.signal
      });

    clearTimeout(timeout);

    if (!response.ok) {

      console.error(
        "Erro OSRM:",
        response.status
      );

      alert(
        "Erro ao buscar rota"
      );

      return;
    }

    const data =
      await response.json();

    if (
      !data.routes ||
      !data.routes.length
    ) {

      alert(
        "Rota não encontrada"
      );

      return;
    }

    clearRoute();

    const route =
      data.routes[0];

    // ======================================
    // LINHA
    // ======================================

    const geo =
      L.geoJSON(
        route.geometry,
        {
          style: {
            weight: 6,
            opacity: 0.9
          }
        }
      );

    geo.addTo(
      window.routeLayer
    );

    // ======================================
    // FIT BOUNDS
    // ======================================

    window.map.fitBounds(
      geo.getBounds(),
      {
        padding: [40, 40]
      }
    );

    // ======================================
    // INFO
    // ======================================

    const info =
      document.getElementById(
        "route-info"
      );

    if (info) {

      info.innerHTML = `
        📏 ${formatDistance(route.distance)}
        <br>
        ⏱ ${formatTime(route.distance, mode)}
      `;
    }

  } catch (err) {

    if (
      err.name === "AbortError"
    ) {

      console.log(
        "Rota cancelada"
      );

      return;
    }

    console.error(
      "Erro rota:",
      err
    );

    alert(
      "Erro ao criar rota"
    );
  }
}

window.traceRoute =
  traceRoute;

// ======================================
// CREATE ROUTE
// ======================================

async function createRoute(
  originText,
  destinationText,
  mode = "car"
) {

  let from = null;
  let to = null;

  // ======================================
  // ORIGEM
  // ======================================

  if (
    !originText ||
    originText.trim() === ""
  ) {

    if (
      !window.userMarker
    ) {

      alert(
        "GPS indisponível"
      );

      return;
    }

    const pos =
      window.userMarker.getLatLng();

    from = {

      lat: pos.lat,
      lng: pos.lng
    };

  } else {

    from =
      await resolveText(
        originText
      );
  }

  // ======================================
  // DESTINO
  // ======================================

  to =
    await resolveText(
      destinationText
    );

  // ======================================
  // VALIDAÇÃO
  // ======================================

  if (!from) {

    alert(
      "Origem inválida"
    );

    return;
  }

  if (!to) {

    alert(
      "Destino inválido"
    );

    return;
  }

  // ======================================
  // TRACE
  // ======================================

  await traceRoute(
    from,
    to,
    mode
  );
}

window.createRoute =
  createRoute;

// ======================================
// ROTA DIRETA
// ======================================

async function routeToPlace(
  lat,
  lng
) {

  if (
    !window.userMarker
  ) {

    alert(
      "GPS indisponível"
    );

    return;
  }

  const pos =
    window.userMarker.getLatLng();

  await traceRoute(
    {
      lat: pos.lat,
      lng: pos.lng
    },
    {
      lat,
      lng
    },
    "car"
  );

  const routePanel =
    document.getElementById(
      "route-panel"
    );

  if (routePanel) {

    routePanel.style.display =
      "flex";
  }
}

window.routeToPlace =
  routeToPlace;

// ======================================
// EVENTS
// ======================================

document.addEventListener(
  "DOMContentLoaded",
  () => {

    const btn =
      document.getElementById(
        "createRouteBtn"
      );

    const modeButtons =
      document.querySelectorAll(
        ".mode-btn"
      );

    let selectedMode =
      "foot";

    // ======================================
    // MODO
    // ======================================

    modeButtons.forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            modeButtons.forEach(
              b =>
                b.classList.remove(
                  "active"
                )
            );

            button.classList.add(
              "active"
            );

            selectedMode =
              button.dataset.mode;
          }
        );
      }
    );

    // ======================================
    // DEFAULT ACTIVE
    // ======================================

    const firstButton =
      document.querySelector(
        '.mode-btn[data-mode="foot"]'
      );

    if (firstButton) {

      firstButton.classList.add(
        "active"
      );
    }

    // ======================================
    // CREATE ROUTE BTN
    // ======================================

    btn?.addEventListener(
      "click",
      async () => {

        const origin =
          document.getElementById(
            "route-origin"
          )?.value || "";

        const destination =
          document.getElementById(
            "route-destination"
          )?.value || "";

        if (
          !destination ||
          destination.trim() === ""
        ) {

          alert(
            "Digite um destino"
          );

          return;
        }

        btn.disabled = true;

        try {

          await createRoute(
            origin,
            destination,
            selectedMode
          );

        } finally {

          btn.disabled = false;
        }
      }
    );
  }
);