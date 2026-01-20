document.addEventListener("DOMContentLoaded", () => {

  const map = L.map('map').setView([-23.55, -46.63], 14);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19
  }).addTo(map);

  let userMarker = null;
  let userCircle = null;
  const poiLayer = L.layerGroup().addTo(map);
  let poisLoaded = false;

  // --------------------
  // GPS
  // --------------------
  function startGPS() {
    if (!navigator.geolocation) {
      showMessage("Seu navegador não suporta localização por GPS.");
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
        showMessage("Não foi possível acessar sua localização.");
        console.error(err);
      },
      { enableHighAccuracy: true }
    );
  }

  // --------------------
  // Centralizar usuário
  // --------------------
  function centerOnUser() {
    if (userMarker) {
      map.setView(userMarker.getLatLng(), 16);
    } else {
      showMessage("Ainda não consegui encontrar sua localização.");
    }
  }

  window.centerOnUser = centerOnUser;

  // --------------------
  // Busca de lugares (Fase 1)
  // --------------------
  function searchPlace() {
    const input = document.getElementById("poi-search-input");
    if (!input) return;

    const text = input.value;
    const result = findPlaceByName(text);

    if (result.error) {
      showMessage(result.error);
      return;
    }

    const { place } = result;

    map.setView([place.lat, place.lon], 17);

    if (place.marker) {
      place.marker.openPopup();
    }
  }

  // Botão 🔍
  const searchBtn = document.getElementById("poi-search-btn");
  if (searchBtn) {
    searchBtn.addEventListener("click", searchPlace);
  }

  // Enter no input
  const searchInput = document.getElementById("poi-search-input");
  if (searchInput) {
    searchInput.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        searchPlace();
      }
    });
  }

  // --------------------
  // Mensagens amigáveis
  // --------------------
  function showMessage(text) {
    alert(text);
  }

  // --------------------
  startGPS();
});
