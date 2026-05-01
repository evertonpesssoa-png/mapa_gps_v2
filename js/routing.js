const SPEEDS = {
  foot: 5,
  bike: 35,
  car: 50
};

function toggleRoute() {

  const panel = document.getElementById("route-panel");
  const search = document.getElementById("search-panel");

  if (!panel) return;

  const open = panel.style.display === "flex";

  panel.style.display = open ? "none" : "flex";

  if (search) {
    search.style.display = "none";
  }
}

window.toggleRoute = toggleRoute;

function formatDistance(m) {
  return m < 1000
    ? `${m.toFixed(0)} m`
    : `${(m / 1000).toFixed(2)} km`;
}

function formatTime(distance, mode) {

  const speed = SPEEDS[mode] || SPEEDS.car;

  const km = distance / 1000;

  const minutes = Math.round((km / speed) * 60);

  return `${minutes} min`;
}

function clearRoute() {

  if (window.routeLayer) {
    window.routeLayer.clearLayers();
  }
}

window.clearRoute = clearRoute;

function traceRoute(from, to, mode) {

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

  fetch(url)
    .then(r => r.json())
    .then(data => {

      if (!data.routes || !data.routes.length) {
        alert("Rota não encontrada");
        return;
      }

      clearRoute();

      const route = data.routes[0];

      const geo = L.geoJSON(route.geometry, {
        style: {
          weight: 5
        }
      });

      geo.addTo(window.routeLayer);

      window.map.fitBounds(geo.getBounds());

      const info = document.getElementById("route-info");

      if (info) {
        info.innerText =
          `📏 ${formatDistance(route.distance)} | ` +
          `⏱ ${formatTime(route.distance, mode)}`;
      }
    })
    .catch(err => {
      console.error(err);
      alert("Erro ao criar rota");
    });
}

async function resolveText(text) {

  if (!text) return null;

  const local = window.poiIndex.find(p =>
    p.name.toLowerCase() === text.toLowerCase()
  );

  if (local) {
    return {
      lat: local.lat,
      lng: local.lng
    };
  }

  if (window.geocode) {
    return await window.geocode(text);
  }

  return null;
}

async function createRoute(originText, destinationText, mode) {

  let from;
  let to;

  if (!originText) {

    if (!window.userMarker) {
      alert("GPS indisponível");
      return;
    }

    const pos = window.userMarker.getLatLng();

    from = {
      lat: pos.lat,
      lng: pos.lng
    };

  } else {

    from = await resolveText(originText);
  }

  to = await resolveText(destinationText);

  if (!from || !to) {
    alert("Origem ou destino inválido");
    return;
  }

  traceRoute(from, to, mode);
}

window.createRoute = createRoute;

function routeToPlace(lat, lng) {

  if (!window.userMarker) {
    alert("GPS indisponível");
    return;
  }

  const pos = window.userMarker.getLatLng();

  traceRoute(
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
}

window.routeToPlace = routeToPlace;

document.addEventListener("DOMContentLoaded", () => {

  const btn = document.getElementById("createRouteBtn");

  const modeButtons = document.querySelectorAll(".mode-btn");

  let selectedMode = "foot";

  modeButtons.forEach(button => {

    button.addEventListener("click", () => {

      modeButtons.forEach(b => b.classList.remove("active"));

      button.classList.add("active");

      selectedMode = button.dataset.mode;
    });
  });

  btn?.addEventListener("click", async () => {

    const origin = document.getElementById("route-origin")?.value || "";

    const destination = document.getElementById("route-destination")?.value || "";

    if (!destination) {
      alert("Digite um destino");
      return;
    }

    await createRoute(origin, destination, selectedMode);
  });
});