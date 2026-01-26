let routeLayer = null;

// Velocidades médias (km/h)
const SPEEDS = {
  foot: 5,
  bike: 35, // moto
  car: 50
};

function formatDistance(m) {
  return m < 1000
    ? `${m.toFixed(0)} m`
    : `${(m / 1000).toFixed(2)} km`;
}

function formatTimeFromDistance(distanceMeters, mode) {
  const speed = SPEEDS[mode] || SPEEDS.car; // km/h
  const distanceKm = distanceMeters / 1000;

  const hours = distanceKm / speed;
  const minutes = Math.round(hours * 60);

  return minutes < 60
    ? `${minutes} min`
    : `${Math.floor(minutes / 60)}h ${minutes % 60}min`;
}

function traceRoute(from, to, mode) {
  // 🔴 OSRM público só funciona bem com driving
  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${from.lng},${from.lat};${to.lng},${to.lat}` +
    `?overview=full&geometries=geojson`;

  const info = document.getElementById("route-info");
  if (info) info.innerText = "🧭 Calculando rota...";

  fetch(url)
    .then(res => {
      if (!res.ok) throw new Error("Erro OSRM");
      return res.json();
    })
    .then(data => {
      if (!data.routes || !data.routes.length) {
        alert("Rota não encontrada");
        return;
      }

      const route = data.routes[0];

      if (routeLayer) {
        window.map.removeLayer(routeLayer);
      }

      routeLayer = L.geoJSON(route.geometry, {
        style: { weight: 5, opacity: 0.9 }
      }).addTo(window.map);

      window.map.fitBounds(routeLayer.getBounds());

      if (info) {
        info.innerText =
          `📏 ${formatDistance(route.distance)} | ` +
          `⏱️ ${formatTimeFromDistance(route.distance, mode)}`;
      }
    })
    .catch(() => {
      alert("Serviço de rotas indisponível");
    });
}

function routeToPlace(lat, lon) {
  if (!window.userMarker) {
    alert("Localização do usuário ainda não disponível");
    return;
  }

  const from = window.userMarker.getLatLng();
  const mode = document.getElementById("mode")?.value || "car";

  traceRoute(
    { lat: from.lat, lng: from.lng },
    { lat, lng: lon },
    mode
  );
}

// 🌐 Exporta
window.traceRoute = traceRoute;
window.routeToPlace = routeToPlace;
