document.addEventListener("DOMContentLoaded", () => {

// ==========================================================
// 🌍 MAPA GLOBAL
// ==========================================================
const map = L.map("map", {
zoomControl: false
}).setView([-23.55, -46.63], 14);

window.map = map;

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
maxZoom: 19,
attribution: "© OpenStreetMap"
}).addTo(map);

// ==========================================================
// 📍 ESTADO GLOBAL
// ==========================================================
let userMarker = null;
let userCircle = null;
let firstFix = true;
let gpsWatchId = null;

window.userMarker = null;

// 🧱 POIs
const poiLayer = L.layerGroup().addTo(map);
let poisLoaded = false;

// 🔎 Índice GLOBAL
window.poiIndex = [];

// ==========================================================
// 📡 GPS
// ==========================================================
function handlePosition(pos) {
const { latitude, longitude, accuracy } = pos.coords;

```
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

// Carrega POIs apenas uma vez
if (!poisLoaded) {
  loadManualPOIs(poiLayer);

  if (navigator.onLine) {
    loadAutoPOIs(latitude, longitude, 1200, poiLayer);
  }

  poisLoaded = true;
}
```

}

function handleError(err) {
console.error("Erro GPS:", err);

```
if (err.code === 1) {
  alert("Permissão de localização negada.");
} else if (err.code === 2) {
  alert("Localização indisponível.");
} else if (err.code === 3) {
  alert("Tempo de localização esgotado.");
} else {
  alert("Não foi possível obter sua localização.");
}
```

}

function startGPS() {
if (!("geolocation" in navigator)) {
alert("GPS não suportado neste navegador");
return;
}

```
if (gpsWatchId) return;

// Primeira leitura rápida (melhor para mobile)
navigator.geolocation.getCurrentPosition(
  handlePosition,
  handleError,
  {
    enableHighAccuracy: true,
    timeout: 8000,
    maximumAge: 0
  }
);

// Monitoramento contínuo
gpsWatchId = navigator.geolocation.watchPosition(
  handlePosition,
  handleError,
  {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 5000
  }
);
```

}

// ==========================================================
// 🎯 CENTRALIZAR USUÁRIO
// ==========================================================
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

window.centerOnUser = centerOnUser;

// ==========================================================
// 🔎 BUSCA LOCAL
// ==========================================================
function focusPOIByName(query) {
const text = query.toLowerCase().trim();
if (!text) return [];

```
return window.poiIndex.filter(p =>
  p.name.toLowerCase().includes(text)
);
```

}

window.focusPOIByName = focusPOIByName;

// ==========================================================
// ➜ BOTÃO DE ROTAS (INTEGRAÇÃO COM INDEX)
// ==========================================================
const routeBtn = document.getElementById("routeToggleBtn");
const panel = document.getElementById("route-panel");

if (routeBtn && panel) {
routeBtn.addEventListener("click", () => {
const isOpen = panel.style.display === "block";

```
  if (isOpen) {
    panel.style.display = "none";
    routeBtn.classList.remove("active");
  } else {
    panel.style.display = "block";
    routeBtn.classList.add("active");

    // Preenche origem automaticamente com localização
    const originInput = document.getElementById("route-origin");
    if (originInput && window.userMarker) {
      originInput.value = "Minha localização";
    }
  }
});
```

}

// ==========================================================
// ▶️ INICIAR GPS
// ==========================================================
startGPS();

});
