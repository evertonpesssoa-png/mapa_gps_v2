let routeLayer = null;

function getOSRMProfile(mode) {
  // 🔧 CORREÇÃO CRÍTICA: profiles reais do OSRM
  if (mode === "foot") return "walking";
  if (mode === "bike") return "cycling";
  return "driving";
}

function formatDistance(m) {
  return m < 1000
    ? `${m.toFixed(0)} m`
    : `${(m / 1000).toFixed(2)} km`;
}

function formatTime(sec) {
  const min = Math.round(sec / 60);
  return min < 60
    ? `${min} min`
    : `${Math.floor(min / 60)}h ${min % 60}min`;
}

function traceRoute(from, to, mode) {
  const profile = getOSRMProfile(mode);

  const url =
    `https://router.project-osrm.org/route/v1/${profile}/` +
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
          `📏 ${formatDistance(route.distance)} | ⏱️ ${formatTime(route.duration)}`;
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

// 🌐 Exporta (inalterado)
window.traceRoute = traceRoute;
window.routeToPlace = routeToPlace;
