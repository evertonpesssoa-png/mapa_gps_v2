document.addEventListener("DOMContentLoaded", () => {

  const map = L.map('map').setView([-23.55, -46.63], 14);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19
  }).addTo(map);

  let userMarker = null;
  let userCircle = null;
  const poiLayer = L.layerGroup().addTo(map);
  let poisLoaded = false;

  function startGPS() {
    if (!navigator.geolocation) {
      alert("Geolocalização não suportada");
      return;
    }

    navigator.geolocation.watchPosition(
      pos => {
        const { latitude, longitude, accuracy } = pos.coords;

        if (!userMarker) {
          userMarker = L.marker([latitude, longitude]).addTo(map);
          userCircle = L.circle([latitude, longitude], {
            radius: accuracy,
            color: '#0096ff',
            fillOpacity: 0.3
          }).addTo(map);

          map.setView([latitude, longitude], 16);
        } else {
          userMarker.setLatLng([latitude, longitude]);
          userCircle.setLatLng([latitude, longitude]);
        }

        if (!poisLoaded) {
          loadManualPOIs(poiLayer);
          if (navigator.onLine) {
            loadAutoPOIs(latitude, longitude, 1200, poiLayer);
          }
          poisLoaded = true;
        }
      },
      err => {
        alert("Erro GPS: " + err.message);
        console.error(err);
      },
      { enableHighAccuracy: true }
    );
  }

  function centerOnUser() {
    if (userMarker) {
      map.setView(userMarker.getLatLng(), 16);
    }
  }

  // expõe globalmente (botão + compatibilidade total)
  window.centerOnUser = centerOnUser;

  startGPS();
});
