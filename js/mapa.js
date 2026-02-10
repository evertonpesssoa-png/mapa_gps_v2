document.addEventListener("DOMContentLoaded", () => {

// 🌍 MAPA GLOBAL
const map = L.map("map", {
zoomControl: false   // ❌ Remove botões + -
}).setView([-23.55, -46.63], 14);

window.map = map;

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
maxZoom: 19,
attribution: "© OpenStreetMap"
}).addTo(map);

// 📍 ESTADO GLOBAL
let userMarker = null;
let userCircle = null;
let firstFix = true;
let gpsWatchId = null;

window.userMarker = null;

// 🧱 POIs
const poiLayer = L.layerGroup().addTo(map);
let poisLoaded = false;

// 🔎 Índice GLOBAL ÚNICO
window.poiIndex = [];

// 📡 GPS
function startGPS() {
if (!("geolocation" in navigator)) {
alert("GPS não suportado neste navegador");
return;
}

```
if (gpsWatchId) return;

gpsWatchId = navigator.geolocation.watchPosition(
  pos => {
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

    // 📍 Carrega POIs apenas uma vez
    if (!poisLoaded) {
      loadManualPOIs(poiLayer);

      if (navigator.onLine) {
        loadAutoPOIs(latitude, longitude, 1200, poiLayer);
      }

      poisLoaded = true;
    }
  },
  err => {
    console.error("Erro GPS:", err.message);
    alert("Não foi possível obter sua localização.");
  },
  {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 5000
  }
);
```

}

// 🎯 Centralizar usuário (usado pelo botão novo)
function centerOnUser() {
if (!userMarker) {
alert("Localização ainda não disponível");
return;
}

```
map.setView(userMarker.getLatLng(), 16, {
  animate: true,
  duration: 0.5
});
```

}

// 🔎 Busca direta (opcional)
function focusPOIByName(query) {
const text = query.toLowerCase().trim();
if (!text) return [];

```
return window.poiIndex.filter(p =>
  p.name.toLowerCase().includes(text)
);
```

}

// 🌐 Exporta globais
window.centerOnUser = centerOnUser;
window.focusPOIByName = focusPOIByName;

// ▶️ Inicializa GPS automaticamente
startGPS();
});
