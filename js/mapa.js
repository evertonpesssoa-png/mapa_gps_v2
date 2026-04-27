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

    return {
      results: window.poiIndex.filter(p =>
        p.searchName.includes(text) ||
        p.searchCategory.includes(text)
      )
    };
  };

  // ==========================
  // 🔎 SEARCH UX CONTROL (ROBUSTO)
  // ==========================

  function openSearchPanel() {

    const panel = document.getElementById("search-panel");
    const routePanel = document.getElementById("route-panel");

    if (!panel) return;

    panel.style.display = "block";

    // fecha rota
    if (routePanel) routePanel.style.display = "none";

    // foco no input (UX melhor)
    setTimeout(() => {
      document.getElementById("search-input")?.focus();
    }, 50);
  }

  function closeSearchPanel() {
    const panel = document.getElementById("search-panel");
    if (panel) panel.style.display = "none";
  }

  function toggleSearchPanel() {
    const panel = document.getElementById("search-panel");

    if (!panel) return;

    const isOpen = panel.style.display === "block";

    if (isOpen) closeSearchPanel();
    else openSearchPanel();
  }

  window.openSearchPanel = openSearchPanel;
  window.closeSearchPanel = closeSearchPanel;
  window.toggleSearchPanel = toggleSearchPanel;

  // ==========================
  // GPS (CORRIGIDO ESTADO)
  // ==========================

  function handlePosition(pos) {
    const { latitude, longitude, accuracy } = pos.coords;

    // 🔥 sempre atualiza referência global
    window.lastGPS = { lat: latitude, lng: longitude };

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

    // ==========================
    // POIs (UMA VEZ)
    // ==========================
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
  }

  function startGPS() {

    if (!navigator.geolocation) return;

    if (gpsWatchId) return;

    navigator.geolocation.getCurrentPosition(
      handlePosition,
      handleError,
      { enableHighAccuracy: true }
    );

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
    if (!window.userMarker) return;

    map.setView(window.userMarker.getLatLng(), 16);
  }

  window.centerOnUser = centerOnUser;

  // ==========================
  // ROTA PANEL UX FIX
  // ==========================

  const routeBtn = document.getElementById("routeToggleBtn");
  const routePanel = document.getElementById("route-panel");

  if (routeBtn && routePanel) {

    routeBtn.addEventListener("click", () => {

      const isOpen = routePanel.style.display === "flex";

      routePanel.style.display = isOpen ? "none" : "flex";
      routeBtn.classList.toggle("active");

      // fecha search automaticamente
      closeSearchPanel();

      // preenche origem sempre atualizada
      if (!isOpen && window.userMarker) {
        const originInput = document.getElementById("route-origin");
        if (originInput) originInput.value = "Minha localização";
      }
    });
  }

  // ==========================
  // START
  // ==========================

  startGPS();

});