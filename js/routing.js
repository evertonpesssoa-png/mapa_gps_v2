// ==========================
// CONFIG
// ==========================

const SPEEDS = {
  foot: 5,
  bike: 35,
  car: 50
};

// ==========================
// LAYER GLOBAL (SAFE)
// ==========================

window.routeLayer = null;

// ==========================
// UTIL
// ==========================

function formatDistance(m) {
  return m < 1000 ? `${m.toFixed(0)} m` : `${(m / 1000).toFixed(2)} km`;
}

function formatTimeFromDistance(distanceMeters, mode) {
  const speed = SPEEDS[mode] || SPEEDS.car;
  const distanceKm = distanceMeters / 1000;
  const hours = distanceKm / speed;
  const minutes = Math.round(hours * 60);

  return minutes < 60
    ? `${minutes} min`
    : `${Math.floor(minutes / 60)}h ${minutes % 60}min`;
}

// ==========================
// LIMPAR ROTA
// ==========================

function clearRoute() {
  if (window.routeLayer) {
    window.routeLayer.clearLayers();
  }

  const info = document.getElementById("route-info");
  if (info) info.innerText = "";
}

window.clearRoute = clearRoute;

// ==========================
// GARANTE LAYER
// ==========================

function ensureRouteLayer() {
  if (!window.map) return null;

  if (!window.routeLayer) {
    window.routeLayer = L.layerGroup().addTo(window.map);
  }

  return window.routeLayer;
}

// ==========================
// ROTA
// ==========================

function traceRoute(from, to, mode) {

  if (!window.map) {
    console.error("Mapa não inicializado");
    return;
  }

  let profile = "driving";
  if (mode === "foot") profile = "walking";
  if (mode === "bike") profile = "cycling";

  const url =
    `https://router.project-osrm.org/route/v1/${profile}/` +
    `${from.lng},${from.lat};${to.lng},${to.lat}` +
    `?overview=full&geometries=geojson`;

  const info = document.getElementById("route-info");
  if (info) info.innerText = "🧭 Calculando rota...";

  fetch(url)
    .then(res => {
      if (!res.ok) throw new Error("Erro na API");
      return res.json();
    })
    .then(data => {

      if (!data.routes || !data.routes.length) {
        alert("Rota não encontrada");
        return;
      }

      const route = data.routes[0];

      const layer = ensureRouteLayer();
      if (!layer) return;

      clearRoute();

      const geo = L.geoJSON(route.geometry, {
        style: { weight: 5, opacity: 0.9 }
      });

      geo.addTo(layer);

      window.map.fitBounds(geo.getBounds(), {
        padding: [50, 50]
      });

      // mantém POIs na frente (se existir)
      if (window.poiLayer && typeof window.poiLayer.bringToFront === "function") {
        window.poiLayer.bringToFront();
      }

      if (info) {
        info.innerText =
          `📏 ${formatDistance(route.distance)} | ` +
          `⏱️ ${formatTimeFromDistance(route.distance, mode)}`;
      }
    })
    .catch(err => {
      console.error(err);
      alert("Erro ao calcular rota");
    });
}

window.traceRoute = traceRoute;

// ==========================
// RESOLVER TEXTO
// ==========================

function resolveTextToCoords(text) {
  if (!text) return null;

  text = text.trim().toLowerCase();

  // coordenadas diretas
  if (text.includes(",")) {
    const parts = text.split(",");
    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);

    if (!isNaN(lat) && !isNaN(lng)) {
      return { lat, lng };
    }
  }

  // busca em POIs
  if (window.poiIndex && window.poiIndex.length) {
    const found = window.poiIndex.find(p =>
      p.name.toLowerCase() === text
    );

    if (found) {
      return { lat: found.lat, lng: found.lon };
    }
  }

  return null;
}

// ==========================
// CRIAR ROTA
// ==========================

function createRoute(originText, destinationText, mode) {

  if (!window.map) {
    alert("Mapa ainda não carregado");
    return;
  }

  let fromCoords = null;
  let toCoords = null;

  // origem
  if (!originText || originText.toLowerCase().includes("minha")) {
    if (!window.userMarker) {
      alert("Localização ainda não disponível");
      return;
    }

    const pos = window.userMarker.getLatLng();
    fromCoords = { lat: pos.lat, lng: pos.lng };
  } else {
    fromCoords = resolveTextToCoords(originText);
  }

  // destino
  toCoords = resolveTextToCoords(destinationText);

  if (!fromCoords || !toCoords) {
    alert("Origem ou destino inválido");
    return;
  }

  traceRoute(fromCoords, toCoords, mode);
}

window.createRoute = createRoute;

// ==========================
// ROTA DIRETA
// ==========================

function routeToPlace(lat, lon) {

  if (!window.userMarker) {
    alert("Localização ainda não disponível");
    return;
  }

  const pos = window.userMarker.getLatLng();

  traceRoute(
    { lat: pos.lat, lng: pos.lng },
    { lat, lng: lon },
    "car"
  );
}

window.routeToPlace = routeToPlace;

// ==========================
// BOTÃO FECHAR (ROBUSTO)
// ==========================

document.addEventListener("click", (e) => {

  if (e.target && e.target.id === "closeRoutePanel") {

    const panel = document.getElementById("route-panel");
    const toggleBtn = document.getElementById("routeToggleBtn");

    if (panel) panel.style.display = "none";
    if (toggleBtn) toggleBtn.classList.remove("active");

    clearRoute();
  }

});