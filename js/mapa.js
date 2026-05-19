window.poiIndex = window.poiIndex || [];

document.addEventListener("DOMContentLoaded", () => {

  // =====================================
  // MAPA
  // =====================================

  const map = L.map("map", {
    zoomControl: false,
    preferCanvas: true
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
  // ZOOM
  // =====================================

  L.control.zoom({
    position: "bottomright"
  }).addTo(map);

  // =====================================
  // LAYERS
  // =====================================

  window.poiLayer =
    L.layerGroup().addTo(map);

  window.routeLayer =
    L.layerGroup().addTo(map);

  window.userLayer =
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
  // UX CONTROLE CAMERA
  // =====================================

  let autoFollowUser = true;

  let isAnimatingMap = false;

  // =====================================
  // ÍCONE USUÁRIO
  // =====================================

  const userIcon = L.divIcon({
    className: "user-marker",
    html: `
      <div style="
        width:18px;
        height:18px;
        background:#2196f3;
        border:3px solid white;
        border-radius:50%;
        box-shadow:0 0 10px rgba(0,0,0,0.35);
      "></div>
    `,
    iconSize: [18, 18],
    iconAnchor: [9, 9]
  });

  // =====================================
  // EVENTOS MAPA
  // =====================================

  map.on("dragstart zoomstart", () => {

    if (!isAnimatingMap) {

      autoFollowUser = false;
    }
  });

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
  // ANIMAÇÃO SAFE
  // =====================================

  function animatedSetView(
    coords,
    zoom = null
  ) {

    if (!coords) return;

    isAnimatingMap = true;

    if (zoom !== null) {

      map.flyTo(coords, zoom, {
        duration: 1.2,
        easeLinearity: 0.25
      });

    } else {

      map.flyTo(coords, map.getZoom(), {
        duration: 1.2,
        easeLinearity: 0.25
      });
    }

    setTimeout(() => {

      isAnimatingMap = false;

    }, 1500);
  }

  // =====================================
  // FIT BOUNDS UX
  // =====================================

  window.smartFitBounds =
    function (
      bounds,
      options = {}
    ) {

      if (!bounds) return;

      isAnimatingMap = true;

      map.flyToBounds(bounds, {
        padding: options.padding || [60, 60],
        maxZoom: options.maxZoom || 17,
        duration: 1.3,
        easeLinearity: 0.2
      });

      setTimeout(() => {

        isAnimatingMap = false;

      }, 1800);
    };

  // =====================================
  // LIMPAR APENAS POIs AUTOMÁTICOS
  // =====================================

  function clearAutoPOIs() {

    if (!window.autoPOILayer) return;

    window.autoPOILayer.clearLayers();

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

      // recarrega só se mover > 700m
      if (dist < 700) {

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
        "Atualizando POIs..."
      );

      clearAutoPOIs();

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

    const heading =
      Number(
        position.heading || 0
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
          [lat, lng],
          {
            icon: userIcon,
            zIndexOffset: 9999
          }
        ).addTo(
          window.userLayer
        );

      userCircle =
        L.circle(
          [lat, lng],
          {
            radius: accuracy,
            color: "#2196f3",
            fillColor: "#2196f3",
            fillOpacity: 0.12,
            weight: 1
          }
        ).addTo(
          window.userLayer
        );

      window.userMarker =
        userMarker;

      if (firstFix) {

        animatedSetView(
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

      // =====================================
      // AUTO FOLLOW SUAVE
      // =====================================

      if (
        autoFollowUser
      ) {

        animatedSetView(
          [lat, lng]
        );
      }
    }

    // =====================================
    // ROTAÇÃO USER
    // =====================================

    const el =
      userMarker.getElement();

    if (
      el &&
      !isNaN(heading)
    ) {

      el.style.transform +=
        ` rotate(${heading}deg)`;
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

      autoFollowUser = true;

      animatedSetView(
        [pos.lat, pos.lng],
        17
      );
    };

  // =====================================
  // PARAR FOLLOW
  // =====================================

  window.stopFollowingUser =
    function () {

      autoFollowUser = false;
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

      lastPOILoad = null;

      await loadNearbyPOIs(
        pos.lat,
        pos.lng
      );
    };

  // =====================================
  // VIEW ON MAP GLOBAL
  // =====================================

  window.viewOnMap =
    function (
      lat,
      lng,
      zoom = 16
    ) {

      if (
        isNaN(lat) ||
        isNaN(lng)
      ) {

        return;
      }

      animatedSetView(
        [lat, lng],
        zoom
      );
    };

  // =====================================
  // FOCUS POI
  // =====================================

  window.focusPOI =
    function (
      poi,
      zoom = 17
    ) {

      if (!poi) return;

      const lat =
        Number(poi.lat);

      const lng =
        Number(
          poi.lng ??
          poi.lon
        );

      if (
        isNaN(lat) ||
        isNaN(lng)
      ) {

        return;
      }

      animatedSetView(
        [lat, lng],
        zoom
      );

      // tenta abrir popup
      setTimeout(() => {

        window.poiLayer.eachLayer(layer => {

          if (
            layer.getLatLng
          ) {

            const p =
              layer.getLatLng();

            const sameLat =
              Math.abs(
                p.lat - lat
              ) < 0.00001;

            const sameLng =
              Math.abs(
                p.lng - lng
              ) < 0.00001;

            if (
              sameLat &&
              sameLng &&
              layer.openPopup
            ) {

              layer.openPopup();
            }
          }
        });

      }, 800);
    };

  // =====================================
  // FIX LEAFLET
  // =====================================

  setTimeout(() => {

    map.invalidateSize();

  }, 500);

  // =====================================
  // RESIZE
  // =====================================

  window.addEventListener(
    "resize",
    () => {

      map.invalidateSize();
    }
  );

  // =====================================
  // DEBUG
  // =====================================

  console.log(
    "Mapa inicializado"
  );

});