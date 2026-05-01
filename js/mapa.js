window.poiIndex = window.poiIndex || [];

document.addEventListener("DOMContentLoaded", () => {

  const map = L.map("map", {
    zoomControl: false
  }).setView([-23.55052, -46.633308], 13);

  window.map = map;

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap",
    maxZoom: 19
  }).addTo(map);

  window.poiLayer = L.layerGroup().addTo(map);
  window.routeLayer = L.layerGroup().addTo(map);

  let userMarker = null;
  let userCircle = null;
  let firstFix = true;

  function handlePosition(pos) {

    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    const accuracy = pos.coords.accuracy;

    window.lastGPS = { lat, lng };

    if (!userMarker) {

      userMarker = L.marker([lat, lng]).addTo(map);

      userCircle = L.circle([lat, lng], {
        radius: accuracy,
        fillOpacity: 0.2,
        weight: 0
      }).addTo(map);

      window.userMarker = userMarker;

      if (firstFix) {
        map.setView([lat, lng], 16);
        firstFix = false;
      }

      if (typeof loadManualPOIs === "function") {
        loadManualPOIs(window.poiLayer);
      }

      if (typeof loadAutoPOIs === "function") {
        loadAutoPOIs(lat, lng, 1200, window.poiLayer);
      }

    } else {

      userMarker.setLatLng([lat, lng]);

      userCircle.setLatLng([lat, lng]);
      userCircle.setRadius(accuracy);
    }
  }

  function handleError(err) {
    console.error("GPS error:", err);
  }

  if (navigator.geolocation) {

    navigator.geolocation.getCurrentPosition(
      handlePosition,
      handleError,
      { enableHighAccuracy: true }
    );

    navigator.geolocation.watchPosition(
      handlePosition,
      handleError,
      { enableHighAccuracy: true }
    );
  }

  window.centerOnUser = function () {
    if (!window.userMarker) return;

    map.setView(window.userMarker.getLatLng(), 16);
  };

});