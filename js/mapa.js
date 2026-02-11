document.addEventListener("DOMContentLoaded", () => {

  const map = L.map("map", { zoomControl: false }).setView([-23.55, -46.63], 14);
  window.map = map;

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "© OpenStreetMap"
  }).addTo(map);

  let userMarker = null;
  let userCircle = null;
  let firstFix = true;
  let gpsWatchId = null;
  window.userMarker = null;

  const poiLayer = L.layerGroup().addTo(map);
  let poisLoaded = false;

  // ==========================
  // ÍNDICE DE POIs
  // ==========================

  window.poiIndex = [];

  function normalize(text) {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  }

  // Função chamada pelo pois.js
  window.registerPOI = function (poi) {
    window.poiIndex.push({
      ...poi,
      searchName: normalize(poi.name),
      searchCategory: normalize(poi.category || "")
    });
  };

  // Busca usada pelo routing.js
  function findPlacesByName(query) {
    const text = normalize(query);
    if (!text) return { results: [] };

    const results = window.poiIndex.filter(p =>
      p.searchName.includes(text) ||
      p.searchCategory.includes(text)
    );

    return { results };
  }

  window.findPlacesByName = findPlacesByName;

  // ==========================
  // GPS
  // ==========================

  function handlePosition(pos) {
    const { latitude, longitude, accuracy } = pos.coords;

    if (!userMarker) {
      userMarker = L.marker([latitude, longitude]).addTo(map);
      userCircle = L.circle([latitude, longitude], {
        radius: accuracy,
        fillOpacity: 0.25,
        weight: 0
      }).addTo(map);

      window.userMarker = userMarker;

      if (firstFix) {
        map.setView([latitude, longitude], 16);
        firstFix = false;
      }
    } else {
      userMarker.setLatLng([latitude, longitude]);
      userCircle.setLatLng([latitude, longitude]);
      userCircle.setRadius(accuracy);
    }

    // Carregar POIs uma vez
    if (!poisLoaded) {
      if (typeof loadManualPOIs === "function") {
        loadManualPOIs(poiLayer);
      }

      if (navigator.onLine && typeof loadAutoPOIs === "function") {
        loadAutoPOIs(latitude, longitude, 1200, poiLayer);
      }

      poisLoaded = true;
    }
  }

  function handleError(err) {
    console.error("Erro GPS:", err);
    if (err.code === 1) alert("Permissão de localização negada.");
    else if (err.code === 2) alert("Localização indisponível.");
    else if (err.code === 3) alert("Tempo de localização esgotado.");
    else alert("Não foi possível obter sua localização.");
  }

  function startGPS() {
    if (!("geolocation" in navigator)) {
      alert("GPS não suportado neste navegador");
      return;
    }

    if (gpsWatchId) return;

    navigator.geolocation.getCurrentPosition(
      handlePosition,
      handleError,
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );

    gpsWatchId = navigator.geolocation.watchPosition(
      handlePosition,
      handleError,
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );
  }

  // ==========================
  // CONTROLES
  // ==========================

  function centerOnUser() {
    if (!userMarker) {
      alert("Localização ainda não disponível");
      return;
    }

    map.setView(userMarker.getLatLng(), 16, {
      animate: true,
      duration: 0.5
    });
  }

  window.centerOnUser = centerOnUser;

  // ==========================
  // PAINEL DE ROTA
  // ==========================

  const routeBtn = document.getElementById("routeToggleBtn");
  const panel = document.getElementById("route-panel");

  if (routeBtn && panel) {
    routeBtn.addEventListener("click", () => {
      const isOpen = panel.style.display === "block" || panel.style.display === "flex";

      if (isOpen) {
        panel.style.display = "none";
        routeBtn.classList.remove("active");
      } else {
        panel.style.display = "flex";
        routeBtn.classList.add("active");

        const originInput = document.getElementById("route-origin");
        if (originInput && window.userMarker) {
          originInput.value = "Minha localização";
        }
      }
    });
  }

  startGPS();
});
