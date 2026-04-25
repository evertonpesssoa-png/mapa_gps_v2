// ==========================
// CONFIG
// ==========================

const SPEEDS = {
  foot: 5,
  bike: 35,
  car: 50
};

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
    window.routeLayer.clearLayers(); // ✅ não remove o mapa inteiro
  }

  const info = document.getElementById("route-info");
  if (info) info.innerText = "";
}

window.clearRoute = clearRoute;

// ==========================
// ROTA
// ==========================

function traceRoute(from, to, mode) {

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
    .then(res => res.json())
    .then(data => {

      if (!data.routes || !data.routes.length) {
        alert("Rota não encontrada");
        return;
      }

      const route = data.routes[0];

      clearRoute();

      const geo = L.geoJSON(route.geometry, {
        style: { weight: 5, opacity: 0.9 }
      }).addTo(window.routeLayer); // ✅ usa layer separada

      window.map.fitBounds(geo.getBounds(), {
        padding: [50, 50]
      });

      // ✅ GARANTE POIs NA FRENTE
      if (window.poiLayer) {
        window.poiLayer.bringToFront();
      }

      if (info) {
        info.innerText =
          `📏 ${formatDistance(route.distance)} | ` +
          `⏱️ ${formatTimeFromDistance(route.distance, mode)}`;
      }
    })
    .catch(() => {
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

  if (text.includes(",")) {
    const parts = text.split(",");
    return {
      lat: parseFloat(parts[0]),
      lng: parseFloat(parts[1])
    };
  }

  const found = window.poiIndex.find(p =>
    p.name.toLowerCase() === text
  );

  return found ? { lat: found.lat, lng: found.lon } : null;
}

// ==========================
// CRIAR ROTA
// ==========================

function createRoute(originText, destinationText, mode) {

  let fromCoords = null;
  let toCoords = null;

  if (!originText || originText.includes("minha")) {
    const pos = window.userMarker.getLatLng();
    fromCoords = { lat: pos.lat, lng: pos.lng };
  } else {
    fromCoords = resolveTextToCoords(originText);
  }

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
  const pos = window.userMarker.getLatLng();

  traceRoute(
    { lat: pos.lat, lng: pos.lng },
    { lat, lng: lon },
    "car"
  );
}

window.routeToPlace = routeToPlace;