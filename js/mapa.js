window.poiIndex = window.poiIndex || [];

document.addEventListener("DOMContentLoaded", () => {

  // =====================================
  // MAPA
  // =====================================

  const map = L.map("map", {
    zoomControl: false
  }).setView([-8.0400, -34.8761], 13);

  window.map = map;

  // =====================================
  // CAMADAS BASE
  // =====================================

  const lightLayer = L.tileLayer(
    "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      attribution:
        "&copy; OpenStreetMap contributors",
      maxZoom: 19
    }
  );

  const satelliteLayer = L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    {
      attribution:
        "Tiles © Esri",
      maxZoom: 19
    }
  );

  lightLayer.addTo(map);

  // =====================================
  // CONTROLE CAMADAS
  // =====================================

  L.control.layers(
    {
      "🌎 Mapa": lightLayer,
      "🛰 Satélite": satelliteLayer
    },
    {},
    {
      position: "topright"
    }
  ).addTo(map);

  // =====================================
  // LAYERS
  // =====================================

  window.poiLayer =
    L.layerGroup().addTo(map);

  window.routeLayer =
    L.layerGroup().addTo(map);

  // =====================================
  // USER
  // =====================================

  let userMarker = null;
  let userCircle = null;

  let firstFix = true;

  // controle de reload POIs
  let lastPOILoad = null;

  // =====================================
  // POIs MANUAIS
  // =====================================

  if (
    typeof loadManualPOIs ===
    "function"
  ) {

    try {

      loadManualPOIs(
        window.poiLayer
      );

      console.log(
        "POIs manuais carregados"
      );

    } catch (err) {

      console.error(
        "Erro POIs manuais:",
        err
      );
    }
  }

  // =====================================
  // DISTÂNCIA ENTRE PONTOS
  // =====================================

  function distanceInMeters(
    lat1,
    lng1,
    lat2,
    lng2
  ) {

    const R = 6371000;

    const dLat =
      (lat2 - lat1) *
      Math.PI / 180;

    const dLng =
      (lng2 - lng1) *
      Math.PI / 180;

    const a =
      Math.sin(dLat / 2) *
      Math.sin(dLat / 2) +

      Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *

      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

    const c =
      2 *
      Math.atan2(
        Math.sqrt(a),
        Math.sqrt(1 - a)
      );

    return R * c;
  }

  // =====================================
  // CARREGAR POIs DINÂMICOS
  // =====================================

  async function loadNearbyPOIs(
    lat,
    lng
  ) {

    // evita reload excessivo

    if (lastPOILoad) {

      const dist =
        distanceInMeters(
          lat,
          lng,
          lastPOILoad.lat,
          lastPOILoad.lng
        );

      // só recarrega se mover > 800m
      if (dist < 800) {

        return;
      }
    }

    lastPOILoad = {
      lat,
      lng
    };

    if (
      typeof loadAutoPOIs !==
      "function"
    ) {

      return;
    }

    try {

      console.log(
        "Carregando POIs próximos..."
      );

      await loadAutoPOIs(
        lat,
        lng,
        2500,
        window.poiLayer
      );

      console.log(
        "POIs dinâmicos carregados"
      );

    } catch (err) {

      console.error(
        "Erro loadAutoPOIs:",
        err
      );
    }
  }

  // =====================================
  // GPS SUCCESS
  // =====================================

  function handlePosition(pos) {

    const lat =
      Number(
        pos.coords.latitude
      );

    const lng =
      Number(
        pos.coords.longitude
      );

    const accuracy =
      Number(
        pos.coords.accuracy
      );

    if (
      isNaN(lat) ||
      isNaN(lng)
    ) {

      console.warn(
        "GPS inválido"
      );

      return;
    }

    window.lastGPS = {
      lat,
      lng,
      accuracy
    };

    // =====================================
    // PRIMEIRA POSIÇÃO
    // =====================================

    if (!userMarker) {

      userMarker =
        L.marker(
          [lat, lng]
        ).addTo(map);

      userCircle =
        L.circle(
          [lat, lng],
          {
            radius: accuracy,
            fillOpacity: 0.15,
            weight: 1
          }
        ).addTo(map);

      window.userMarker =
        userMarker;

      if (firstFix) {

        map.setView(
          [lat, lng],
          16
        );

        firstFix = false;
      }

    } else {

      userMarker.setLatLng(
        [lat, lng]
      );

      userCircle.setLatLng(
        [lat, lng]
      );

      userCircle.setRadius(
        accuracy
      );
    }

    // =====================================
    // CARREGA POIs
    // =====================================

    loadNearbyPOIs(
      lat,
      lng
    );
  }

  // =====================================
  // GPS ERROR
  // =====================================

  function handleError(err) {

    console.error(
      "GPS error:",
      err
    );

    let message =
      "Erro GPS";

    switch (err.code) {

      case 1:
        message =
          "Permissão de localização negada";
        break;

      case 2:
        message =
          "Localização indisponível";
        break;

      case 3:
        message =
          "Tempo de GPS esgotado";
        break;
    }

    console.warn(message);
  }

  // =====================================
  // START GPS
  // =====================================

  if (navigator.geolocation) {

    navigator.geolocation.getCurrentPosition(
      handlePosition,
      handleError,
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );

    navigator.geolocation.watchPosition(
      handlePosition,
      handleError,
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 5000
      }
    );

  } else {

    console.warn(
      "Geolocalização não suportada"
    );
  }

  // =====================================
  // CENTRALIZAR USUÁRIO
  // =====================================

  window.centerOnUser =
    function () {

      if (
        !window.userMarker
      ) {

        alert(
          "GPS ainda não disponível"
        );

        return;
      }

      map.setView(
        window.userMarker.getLatLng(),
        16
      );
    };

  // =====================================
  // FIX LEAFLET
  // =====================================

  setTimeout(() => {

    map.invalidateSize();

  }, 500);

  // =====================================
  // DEBUG
  // =====================================

  console.log(
    "Mapa inicializado"
  );

});