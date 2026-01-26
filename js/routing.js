let routeLayer = null;

/**
 * Define o profile correto do OSRM
 */
function getOSRMProfile(mode) {
  if (mode === "foot") return "foot";
  if (mode === "bike") return "bike";
  return "car";
}

/**
 * Distância:
 * - metros abaixo de 1km
 * - km acima de 1km
 */
function formatDistance(meters) {
  return meters < 1000
    ? `${meters.toFixed(0)} m`
    : `${(meters / 1000).toFixed(2)} km`;
}

/**
 * Tempo REAL (baseado no OSRM)
 */
function formatTime(seconds) {
  const totalMin = Math.round(seconds / 60);

  if (totalMin < 60) {
    return `${totalMin} min`;
  }

  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}h ${m}min`;
}

/**
 * Traça rota usando OSRM
 * Tempo e distância vêm DIRETAMENTE do motor de rotas
 */
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
      if (!res.ok) throw new Error("Erro no OSRM");
      return res.json();
    })
    .then(data => {
      if (!data.routes || !data.routes.length) {
        alert("Rota não encontrada");
        return;
      }

      const route = data.routes[0];

      // Remove rota anterior
      if (routeLayer) {
        window.map.removeLayer(routeLayer);
      }

      // Desenha nova rota
      routeLayer = L.geoJSON(route.geometry, {
        style: {
          weight: 5,
          opacity: 0.9
        }
      }).addTo(window.map);

      window.map.fitBounds(routeLayer.getBounds(), {
        padding: [40, 40]
      });

      // Info REAL
      if (info) {
        info.innerText =
          `📏 ${formatDistance(route.distance)} | ⏱️ ${formatTime(route.duration)}`;
      }
    })
    .catch(err => {
      console.error(err);
      alert("Serviço de rotas indisponível no momento");
    });
}

/**
 * Ponte chamada pelo popup do POI
 */
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

// 🌐 Exporta para uso global
window.traceRoute = traceRoute;
window.routeToPlace = routeToPlace;
