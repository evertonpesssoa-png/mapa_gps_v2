let routeLayer = null;

// ==========================
// CONFIG
// ==========================

// Velocidades médias (km/h)
const SPEEDS = {
foot: 5,
bike: 35, // moto
car: 50
};

// ==========================
// UTIL
// ==========================

function formatDistance(m) {
return m < 1000
? `${m.toFixed(0)} m`
: `${(m / 1000).toFixed(2)} km`;
}

function formatTimeFromDistance(distanceMeters, mode) {
const speed = SPEEDS[mode] || SPEEDS.car;
const distanceKm = distanceMeters / 1000;
const hours = distanceKm / speed;
const minutes = Math.round(hours * 60);

return minutes < 60
? `${minutes} min`
: `${Math.floor(minutes / 60)}h ${minutes % 60}min`;
}

// ==========================
// LIMPAR ROTA
// ==========================

function clearRoute() {
if (routeLayer && window.map) {
window.map.removeLayer(routeLayer);
routeLayer = null;
}

const info = document.getElementById("route-info");
if (info) info.innerText = "";
}

window.clearRoute = clearRoute;

// ==========================
// OSRM ROUTE
// ==========================

function traceRoute(from, to, mode) {
const url =
`https://router.project-osrm.org/route/v1/driving/` +
`${from.lng},${from.lat};${to.lng},${to.lat}` +
`?overview=full&geometries=geojson`;

const info = document.getElementById("route-info");
if (info) info.innerText = "🧭 Calculando rota...";

fetch(url)
.then(res => {
if (!res.ok) throw new Error("Erro OSRM");
return res.json();
})
.then(data => {
if (!data.routes || !data.routes.length) {
alert("Rota não encontrada");
return;
}

```
  const route = data.routes[0];

  clearRoute();

  routeLayer = L.geoJSON(route.geometry, {
    style: { weight: 5, opacity: 0.9 }
  }).addTo(window.map);

  window.map.fitBounds(routeLayer.getBounds());

  if (info) {
    info.innerText =
      `📏 ${formatDistance(route.distance)} | ` +
      `⏱️ ${formatTimeFromDistance(route.distance, mode)}`;
  }
})
.catch(() => {
  alert("Serviço de rotas indisponível");
});
```

}

window.traceRoute = traceRoute;

// ==========================
// RESOLVER TEXTO -> COORD
// (sem geocoding ainda)
// ==========================

function resolveTextToCoords(text) {
if (!text) return null;

text = text.trim().toLowerCase();

// 1) Coordenadas digitadas: -8.12,-34.90
if (text.includes(",")) {
const parts = text.split(",");
const lat = parseFloat(parts[0]);
const lng = parseFloat(parts[1]);
if (!isNaN(lat) && !isNaN(lng)) {
return { lat, lng };
}
}

// 2) Buscar nos POIs existentes
if (window.findPlacesByName) {
const result = window.findPlacesByName(text);
if (result?.results?.length) {
const place = result.results[0];
return { lat: place.lat, lng: place.lon };
}
}

return null;
}

// ==========================
// FUNÇÃO PRINCIPAL DO PAINEL
// ==========================

function createRoute(originText, destinationText, mode) {
if (!window.map) return;

let fromCoords = null;
let toCoords = null;

// ORIGEM
if (!originText || originText.toLowerCase().includes("minha")) {
if (!window.userMarker) {
alert("Localização do usuário ainda não disponível");
return;
}
const pos = window.userMarker.getLatLng();
fromCoords = { lat: pos.lat, lng: pos.lng };
} else {
fromCoords = resolveTextToCoords(originText);
}

// DESTINO
toCoords = resolveTextToCoords(destinationText);

if (!fromCoords) {
alert("Origem não encontrada");
return;
}

if (!toCoords) {
alert("Destino não encontrado");
return;
}

traceRoute(fromCoords, toCoords, mode);
}

window.createRoute = createRoute;

// ==========================
// ROTA DIRETA PARA POI
// ==========================

function routeToPlace(lat, lon) {
if (!window.userMarker) {
alert("Localização do usuário ainda não disponível");
return;
}

const from = window.userMarker.getLatLng();

traceRoute(
{ lat: from.lat, lng: from.lng },
{ lat, lng: lon },
"car"
);
}

window.routeToPlace = routeToPlace;
