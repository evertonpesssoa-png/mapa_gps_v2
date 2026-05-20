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

  if (!panel) return;

  // sincroniza com search.js
  if (
    typeof window.closePanels ===
    "function"
  ) {

    window.closePanels(
      "route-panel"
    );
  }

  const isOpen =
    panel.style.display ===
    "flex";

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

function formatDistance(
  meters
) {

  meters =
    Number(meters);

  if (
    isNaN(meters) ||
    meters <= 0
  ) {

    return "0 m";
  }

  if (meters < 1000) {

    return `${meters.toFixed(0)} m`;
  }

  return `${(
    meters / 1000
  ).toFixed(1)} km`;
}

function formatTime(
  distance,
  mode
) {

  distance =
    Number(distance);

  if (
    isNaN(distance) ||
    distance <= 0
  ) {

    return "0 min";
  }

  const speed =
    SPEEDS[mode] ||
    SPEEDS.car;

  const km =
    distance / 1000;

  const minutes =
    Math.max(
      1,
      Math.round(
        (km / speed) * 60
      )
    );

  if (minutes < 60) {

    return `${minutes} min`;
  }

  const hours =
    Math.floor(
      minutes / 60
    );

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

    info.style.display =
      "none";
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
// VALIDAR COORDENADAS
// ======================================

function isValidCoordinate(
  lat,
  lng
) {

  return (
    !isNaN(lat) &&
    !isNaN(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
  );
}

// ======================================
// RESOLVER LOCALIZAÇÃO
// ======================================

async function resolveText(
  text
) {

  if (
    !text ||
    typeof text !==
      "string"
  ) {

    return null;
  }

  text = text.trim();

  if (!text) {

    return null;
  }

  const normalized =
    normalizeText(text);

  // ======================================
  // DESTINO SELECIONADO
  // ======================================

  if (
    window.selectedDestination &&
    normalizeText(
      window.selectedDestination
        .name
    ) === normalized
  ) {

    return {

      lat: Number(
        window.selectedDestination
          .lat
      ),

      lng: Number(
        window.selectedDestination
          .lng
      ),

      name:
        window.selectedDestination
          .name
    };
  }

  // ======================================
  // BUSCA LOCAL
  // ======================================

  if (
    Array.isArray(
      window.poiIndex
    )
  ) {

    let local =
      window.poiIndex.find(
        poi =>

          normalizeText(
            poi.name
          ) === normalized
      );

    if (!local) {

      local =
        window.poiIndex.find(
          poi =>

            normalizeText(
              poi.name
            ).includes(
              normalized
            )
        );
    }

    if (local) {

      const lat =
        Number(local.lat);

      const lng =
        Number(
          local.lng ??
          local.lon
        );

      if (
        isValidCoordinate(
          lat,
          lng
        )
      ) {

        return {

          lat,
          lng,

          name:
            local.name
        };
      }
    }
  }

  // ======================================
  // GEOCODING
  // ======================================

  if (
    typeof window.geocode ===
    "function"
  ) {

    try {

      const results =
        await window.geocode(
          text
        );

      if (
        !Array.isArray(
          results
        ) ||

        results.length === 0
      ) {

        return null;
      }

      const best =
        results[0];

      const lat =
        Number(best.lat);

      const lng =
        Number(
          best.lng ??
          best.lon
        );

      if (
        !isValidCoordinate(
          lat,
          lng
        )
      ) {

        return null;
      }

      return {

        lat,
        lng,

        name:
          best.name ||
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
// ESTILO DA ROTA
// ======================================

function getRouteStyle(
  mode
) {

  switch (mode) {

    case "foot":

      return {
        color: "#16a34a",
        weight: 6,
        opacity: 0.9
      };

    case "bike":

      return {
        color: "#2563eb",
        weight: 6,
        opacity: 0.9
      };

    default:

      return {
        color: "#ef4444",
        weight: 6,
        opacity: 0.9
      };
  }
}

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

    return false;
  }

  const fromLat =
    Number(from?.lat);

  const fromLng =
    Number(from?.lng);

  const toLat =
    Number(to?.lat);

  const toLng =
    Number(to?.lng);

  if (
    !isValidCoordinate(
      fromLat,
      fromLng
    ) ||

    !isValidCoordinate(
      toLat,
      toLng
    )
  ) {

    alert(
      "Coordenadas inválidas"
    );

    return false;
  }

  // ======================================
  // CANCELA REQUEST ANTERIOR
  // ======================================

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
    `${fromLng},${fromLat};${toLng},${toLat}` +
    `?overview=full` +
    `&geometries=geojson` +
    `&steps=true`;

  try {

    const timeout =
      setTimeout(() => {

        currentRouteController.abort();

      }, 15000);

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

      return false;
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

      return false;
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
          style:
            getRouteStyle(
              mode
            )
        }
      );

    geo.addTo(
      window.routeLayer
    );

    // ======================================
    // MARCADORES
    // ======================================

    L.marker([
      fromLat,
      fromLng
    ]).addTo(
      window.routeLayer
    );

    L.marker([
      toLat,
      toLng
    ]).addTo(
      window.routeLayer
    );

    // ======================================
    // FIT BOUNDS
    // ======================================

    window.map.fitBounds(
      geo.getBounds(),
      {
        padding: [50, 50]
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

      info.style.display =
        "block";

      info.innerHTML = `
        <div style="
          display:flex;
          flex-direction:column;
          gap:6px;
        ">

          <div>
            📏 ${formatDistance(
              route.distance
            )}
          </div>

          <div>
            ⏱ ${formatTime(
              route.distance,
              mode
            )}
          </div>

        </div>
      `;
    }

    return true;

  } catch (err) {

    if (
      err.name ===
      "AbortError"
    ) {

      console.log(
        "Rota cancelada"
      );

      return false;
    }

    console.error(
      "Erro rota:",
      err
    );

    alert(
      "Erro ao criar rota"
    );

    return false;
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

    const pos =
      window.locationEngine?.
        getPosition?.();

    if (!pos) {

      alert(
        "GPS indisponível"
      );

      return false;
    }

    from = {

      lat:
        Number(pos.lat),

      lng:
        Number(pos.lng),

      name:
        "Minha localização"
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

    return false;
  }

  if (!to) {

    alert(
      "Destino inválido"
    );

    return false;
  }

  // ======================================
  // TRACE
  // ======================================

  return await traceRoute(
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
  lng,
  mode = "car"
) {

  const pos =
    window.locationEngine?.
      getPosition?.();

  if (!pos) {

    alert(
      "GPS indisponível"
    );

    return;
  }

  if (
    typeof window.closePanels ===
    "function"
  ) {

    window.closePanels(
      "route-panel"
    );
  }

  const panel =
    document.getElementById(
      "route-panel"
    );

  if (panel) {

    panel.style.display =
      "flex";
  }

  const destinationInput =
    document.getElementById(
      "route-destination"
    );

  if (destinationInput) {

    destinationInput.value =
      `${lat}, ${lng}`;
  }

  await traceRoute(
    {
      lat: pos.lat,
      lng: pos.lng
    },
    {
      lat,
      lng
    },
    mode
  );
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
          !destination.trim()
        ) {

          alert(
            "Digite um destino"
          );

          return;
        }

        btn.disabled = true;

        const originalText =
          btn.innerHTML;

        btn.innerHTML =
          "Calculando...";

        try {

          await createRoute(
            origin,
            destination,
            selectedMode
          );

        } finally {

          btn.disabled = false;

          btn.innerHTML =
            originalText;
        }
      }
    );
  }
);