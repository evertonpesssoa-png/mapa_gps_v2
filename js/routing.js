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
  if (!window.map) {
    console.error("Mapa não existe ainda");
    return null;
  }

  if (!window.routeLayer) {
    console.warn("Criando routeLayer automaticamente");
    window.routeLayer = L.layerGroup().addTo(window.map);
  }

  return window.routeLayer;
}

// ==========================
// ROTA
// ==========================

function traceRoute(from, to, mode) {

  console.log("TRACE ROUTE:", from, to, mode);

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
      if (!res.ok) throw new Error("Erro na API OSRM");
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

      if (window.poiLayer?.bringToFront) {
        window.poiLayer.bringToFront();
      }

      if (info) {
        info.innerText =
          `📏 ${formatDistance(route.distance)} | ` +
          `⏱️ ${formatTimeFromDistance(route.distance, mode)}`;
      }
    })
    .catch(err => {
      console.error("Erro rota:", err);
      alert("Erro ao calcular rota");
    });
}

// ==========================
// RESOLVER TEXTO (NOVO + GEOCODING)
// ==========================

async function resolveTextToCoords(text) {
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

  // POIs locais
  if (window.poiIndex && window.poiIndex.length) {
    const found = window.poiIndex.find(p =>
      p.name.toLowerCase() === text
    );

    if (found) {
      return { lat: found.lat, lng: found.lon };
    }
  }

  // 🌍 GEOCODING (NOVO)
  if (window.geocode) {
    try {
      const geo = await window.geocode(text);
      if (geo) return geo;
    } catch (e) {
      console.warn("Erro geocoding:", e);
    }
  }

  return null;
}

// ==========================
// CRIAR ROTA (AGORA ASYNC)
// ==========================

async function createRoute(originText, destinationText, mode) {

  console.log("CREATE ROUTE:", originText, destinationText, mode);

  if (!window.map) {
    alert("Mapa não carregado");
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
    fromCoords = await resolveTextToCoords(originText);
  }

  // destino
  toCoords = await resolveTextToCoords(destinationText);

  if (!fromCoords) {
    alert("Origem inválida");
    return;
  }

  if (!toCoords) {
    alert("Destino inválido");
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
// EVENTOS DO PAINEL
// ==========================

document.addEventListener("DOMContentLoaded", () => {

  const createBtn = document.getElementById("createRouteBtn");
  const originInput = document.getElementById("route-origin");
  const destinationInput = document.getElementById("route-destination");
  const modeButtons = document.querySelectorAll(".mode-btn");

  let selectedMode = "foot";

  modeButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      modeButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      selectedMode = btn.dataset.mode;

      console.log("Modo selecionado:", selectedMode);
    });
  });

  if (createBtn) {
    createBtn.addEventListener("click", async () => {

      const origin = originInput ? originInput.value : "";
      const destination = destinationInput ? destinationInput.value : "";

      if (!destination) {
        alert("Digite um destino");
        return;
      }

      await createRoute(origin, destination, selectedMode);
    });
  }

});