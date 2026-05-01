window.poiIndex = window.poiIndex || [];

document.addEventListener("DOMContentLoaded", () => {

  // =====================================
  // MAPA
  // =====================================

  const map = L.map("map", {
    zoomControl: false
  }).setView([-23.55052, -46.633308], 13);

  window.map = map;

  // =====================================
  // TILE MODERNO (ESTILO GOOGLE/UBER)
  // =====================================

  const lightLayer = L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    {
      attribution:
        "&copy; OpenStreetMap &copy; CARTO",
      subdomains: "abcd",
      maxZoom: 20
    }
  );

  // =====================================
  // SATÉLITE
  // =====================================

  const satelliteLayer = L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    {
      attribution: "Tiles © Esri",
      maxZoom: 20
    }
  );

  // mapa inicial
  lightLayer.addTo(map);

  // =====================================
  // CONTROLE DE CAMADAS
  // =====================================

  L.control.layers(
    {
      "🌎 Moderno": lightLayer,
      "🛰 Satélite": satelliteLayer
    },
    {},
    {
      position: "topright"
    }
  ).addTo(map);

  // =====================================
  // CAMADAS
  // =====================================

  window.poiLayer = L.layerGroup().addTo(map);
  window.routeLayer = L.layerGroup().addTo(map);

  // =====================================
  // USER
  // =====================================

  let userMarker = null;
  let userCircle = null;

  let firstFix = true;

  let autoPOIsLoaded = false;

  // =====================================
  // CARREGA POIs MANUAIS IMEDIATAMENTE
  // =====================================

  if (typeof loadManualPOIs === "function") {

    loadManualPOIs(window.poiLayer);

    console.log("POIs manuais carregados");
  }

  // =====================================
  // GPS
  // =====================================

  function handlePosition(pos) {

    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    const accuracy = pos.coords.accuracy;

    window.lastGPS = { lat, lng };

    // =====================================
    // PRIMEIRO FIX
    // =====================================

    if (!userMarker) {

      // marcador usuário
      userMarker = L.marker(
        [lat, lng]
      ).addTo(map);

      // círculo precisão
      userCircle = L.circle(
        [lat, lng],
        {
          radius: accuracy,
          fillOpacity: 0.18,
          weight: 0
        }
      ).addTo(map);

      window.userMarker = userMarker;

      if (firstFix) {

        map.setView(
          [lat, lng],
          16
        );

        firstFix = false;
      }

    } else {

      // atualiza posição
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
    // POIs DINÂMICOS
    // =====================================

    if (
      !autoPOIsLoaded &&
      typeof loadAutoPOIs === "function"
    ) {

      autoPOIsLoaded = true;

      loadAutoPOIs(
        lat,
        lng,
        1200,
        window.poiLayer
      );

      console.log(
        "POIs dinâmicos carregados"
      );
    }
  }

  // =====================================
  // GPS ERROR
  // =====================================

  function handleError(err) {

    console.error(
      "GPS error:",
      err
    );
  }

  // =====================================
  // START GPS
  // =====================================

  if (navigator.geolocation) {

    navigator.geolocation.getCurrentPosition(
      handlePosition,
      handleError,
      {
        enableHighAccuracy: true
      }
    );

    navigator.geolocation.watchPosition(
      handlePosition,
      handleError,
      {
        enableHighAccuracy: true
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

  window.centerOnUser = function () {

    if (!window.userMarker) return;

    map.setView(
      window.userMarker.getLatLng(),
      16
    );
  };

  // =====================================
  // INVALIDATE SIZE
  // =====================================

  setTimeout(() => {

    map.invalidateSize();

  }, 500);

});