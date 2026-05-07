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

  // =====================================
  // CONTROLE POIs
  // =====================================

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
  // DISTÂNCIA
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
  // LIMPAR APENAS POIs AUTOMÁTICOS
  // =====================================

  function clearAutoPOIs() {

    if (!window.poiLayer) return;

    window.poiLayer.eachLayer(layer => {

      if (
        layer._autoPOI === true
      ) {

        window.poiLayer.removeLayer(
          layer
        );
      }
    });

    // remove do index
    window.poiIndex =
      window.poiIndex.filter(
        poi => !poi.auto
      );
  }

  // =====================================
  // CARREGAR POIs PRÓXIMOS
  // =====================================

  async function loadNearbyPOIs(
    lat,
    lng
  ) {

    // =====================================
    // EVITA RELOADS PEQUENOS
    // =====================================

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

    // =====================================
    // VALIDAÇÃO
    // =====================================

    if (
      typeof loadAutoPOIs !==
      "function"
    ) {

      console.warn(
        "loadAutoPOIs não encontrado"
      );

      return;
    }

    try {

      console.log(
        "Limpando POIs antigos..."
      );

      clearAutoPOIs();

      console.log(
        "Carregando novos POIs..."
      );

      await loadAutoPOIs(
        lat,
        lng,
        2500,
        window.poiLayer
      );

      console.log(
        "POIs carregados:",
        window.poiIndex.length
      );

    } catch (err) {

      console.error(
        "Erro loadNearbyPOIs:",
        err
      );
    }
  }

  // =====================================
  // HANDLE POSITION
  // =====================================

  function handlePosition(position) {

    const lat =
      Number(position.lat);

    const lng =
      Number(position.lng);

    const accuracy =
      Number(
        position.accuracy || 0
      );

    if (
      isNaN(lat) ||
      isNaN(lng)
    ) {

      console.warn(
        "Posição inválida"
      );

      return;
    }

    console.log(
      "Nova posição:",
      lat,
      lng
    );

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

      // atualiza marker
      userMarker.setLatLng(
        [lat, lng]
      );

      // atualiza círculo
      userCircle.setLatLng(
        [lat, lng]
      );

      userCircle.setRadius(
        accuracy
      );
    }

    // =====================================
    // CARREGA POIs DINÂMICOS
    // =====================================

    loadNearbyPOIs(
      lat,
      lng
    );
  }

  // =====================================
  // LOCATION ENGINE
  // =====================================

  if (
    window.locationEngine
  ) {

    window.locationEngine.subscribe(
      handlePosition
    );

    console.log(
      "Mapa conectado ao LocationEngine"
    );

  } else {

    console.error(
      "locationEngine não encontrado"
    );
  }

  // =====================================
  // CENTRALIZAR USUÁRIO
  // =====================================

  window.centerOnUser =
    function () {

      const pos =
        window.locationEngine?.
          getPosition();

      if (!pos) {

        alert(
          "GPS ainda não disponível"
        );

        return;
      }

      map.setView(
        [pos.lat, pos.lng],
        16
      );
    };

  // =====================================
  // RECARREGAR POIs
  // =====================================

  window.reloadNearbyPOIs =
    async function () {

      const pos =
        window.locationEngine?.
          getPosition();

      if (!pos) {

        alert(
          "GPS indisponível"
        );

        return;
      }

      await loadNearbyPOIs(
        pos.lat,
        pos.lng
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