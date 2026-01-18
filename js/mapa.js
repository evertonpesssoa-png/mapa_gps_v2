let map = L.map('map').setView([-23.55, -46.63], 14);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19
}).addTo(map);

let userMarker = null;
let userCircle = null;
let poiLayer = L.layerGroup().addTo(map);

/* ==========================
   ÍCONES
========================== */
function getIcon(category) {
  const icons = {
    hospital: "assets/icons/hospital.png",
    police: "assets/icons/police.png",
    pharmacy: "assets/icons/pharmacy.png"
  };

  return L.icon({
    iconUrl: icons[category] || "assets/icons/default.png",
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28]
  });
}

/* ==========================
   GPS
========================== */
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

      poiLayer.clearLayers();
      loadAutoPOIs(latitude, longitude, 1200);
      loadManualPOIs();
    },
    err => alert("Erro GPS: " + err.message),
    { enableHighAccuracy: true }
  );
}

function centerOnUser() {
  if (userMarker) {
    map.setView(userMarker.getLatLng(), 16);
  }
}

/* ==========================
   POIs AUTOMÁTICOS
========================== */
function loadAutoPOIs(lat, lon, radius) {
  const query = `
  [out:json][timeout:25];
  (
    node(around:${radius},${lat},${lon})[amenity];
  );
  out;
  `;

  fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    body: query
  })
  .then(res => res.json())
  .then(data => {
    data.elements.forEach(p => {
      if (p.lat && p.lon) {
        L.marker([p.lat, p.lon])
          .addTo(poiLayer)
          .bindPopup(p.tags.name || p.tags.amenity);
      }
    });
  })
  .catch(err => console.error(err));
}

/* ==========================
   POIs MANUAIS
========================== */
function loadManualPOIs() {
  fetch("data/manual_pois.json")
    .then(res => res.json())
    .then(pois => {
      pois.forEach(p => {
        L.marker([p.lat, p.lon], {
          icon: getIcon(p.category)
        })
        .addTo(poiLayer)
        .bindPopup(p.name);
      });
    });
}

/* ==========================
   GEOCODING
========================== */
function searchAddress() {
  const addr = document.getElementById("address").value;
  if (!addr) return;

  fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addr)}`)
    .then(res => res.json())
    .then(data => {
      if (!data.length) {
        alert("Endereço não encontrado");
        return;
      }

      const { lat, lon } = data[0];
      map.setView([lat, lon], 16);

      L.marker([lat, lon])
        .addTo(map)
        .bindPopup("Resultado da busca")
        .openPopup();
    });
}

/* ==========================
   START
========================== */
startGPS();
