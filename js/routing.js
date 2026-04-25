// ==========================
// CONFIG
// ==========================

const SPEEDS = {
  foot: 5,
  bike: 35,
  car: 50
};

// ==========================
// LAYERS GLOBAIS
// ==========================

window.routeLayer = L.layerGroup().addTo(window.map);

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
// ROTA
// ==========================

function traceRoute(from, to, mode) {

  if (!window.map) return;

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

      clearRoute();

      const geo = L.geoJSON(route.geometry, {
        style: { weight: 5, opacity: 0.9 }
      });

      geo.addTo(window.routeLayer);

      window.map.fitBounds(geo.getBounds(), {
        padding: [50, 50]
      });

      // manter POIs por cima
      if (window.poiLayer) {
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

  // busca no índice
  if (window.poiIndex) {
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
// BOTÃO FECHAR (CORRIGIDO)
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