document.addEventListener("DOMContentLoaded", () => {

  const map = L.map("map", { zoomControl: false })
    .setView([-23.55, -46.63], 14);

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

  // ==========================
  // CAMADAS
  // ==========================

  const poiLayer = L.layerGroup().addTo(map);
  const routeLayer = L.layerGroup().addTo(map);

  window.poiLayer = poiLayer;
  window.routeLayer = routeLayer;

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

  window.registerPOI = function (poi) {
    window.poiIndex.push({
      ...poi,
      searchName: normalize(poi.name),
      searchCategory: normalize(poi.category || "")
    });
  };

  window.findPlacesByName = function (query) {
    const text = normalize(query);
    if (!text) return { results: [] };

    const results = window.poiIndex.filter(p =>
      p.searchName.includes(text) ||
      p.searchCategory.includes(text)
    );

    return { results };
  };

  // ==========================
  // 🔎 SEARCH PANEL CONTROL (NOVO)
  // ==========================

  function openSearchPanel() {
    const panel = document.getElementById("search-panel");

    if (!panel) {
      console.warn("search-panel não encontrado no HTML");
      return;
    }

    panel.style.display = "block";

    // fecha rota se estiver aberta
    const routePanel = document.getElementById("route-panel");
    if (routePanel) routePanel.style.display = "none";
  }

  window.openSearchPanel = openSearchPanel;

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

    // CARREGAR POIs
    if (!poisLoaded) {

      console.log("Carregando POIs...");

      if (typeof loadManualPOIs === "function") {
        loadManualPOIs(window.poiLayer);
      }

      if (navigator.onLine && typeof loadAutoPOIs === "function") {
        loadAutoPOIs(latitude, longitude, 1200, window.poiLayer);
      }

      poisLoaded = true;
    }
  }

  function handleError(err) {
    console.error("Erro GPS:", err);
    alert("Erro ao obter localização.");
  }

  function startGPS() {
    if (!("geolocation" in navigator)) return;

    if (gpsWatchId) return;

    navigator.geolocation.getCurrentPosition(handlePosition, handleError, {
      enableHighAccuracy: true
    });

    gpsWatchId = navigator.geolocation.watchPosition(
      handlePosition,
      handleError,
      { enableHighAccuracy: true }
    );
  }

  // ==========================
  // CONTROLES
  // ==========================

  function centerOnUser() {
    if (!userMarker) return;

    map.setView(userMarker.getLatLng(), 16);
  }

  window.centerOnUser = centerOnUser;

  // ==========================
  // ROTA PANEL
  // ==========================

  const routeBtn = document.getElementById("routeToggleBtn");
  const panel = document.getElementById("route-panel");

  if (routeBtn && panel) {
    routeBtn.addEventListener("click", () => {

      const isOpen = panel.style.display === "flex";

      panel.style.display = isOpen ? "none" : "flex";
      routeBtn.classList.toggle("active");

      const originInput = document.getElementById("route-origin");

      if (!isOpen && originInput && window.userMarker) {
        originInput.value = "Minha localização";
      }

      // fecha search ao abrir rota
      const searchPanel = document.getElementById("search-panel");
      if (searchPanel) searchPanel.style.display = "none";
    });
  }

  // ==========================
  // START
  // ==========================

  startGPS();

});