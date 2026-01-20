const CACHE_NAME = "mapa-offline-v1";

const FILES = [
  "./",
  "./index.html",
  "./js/mapa.js",
  "./js/pois.js",
  "./js/icons.js",
  "./data/manual_pois.json",
  "./assets/icons/hospital.png",
  "./assets/icons/pharmacy.png",
  "./assets/icons/police-station.png",
  "./assets/icons/supermarket.png",
  "./assets/icons/gas-pump.png",
  "./assets/icons/mechanic.png",
  "./assets/icons/house.png",
  "./assets/icons/warning.png",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(FILES))
  );
});

self.addEventListener("fetch", e => {
  if (e.request.url.includes("tile.openstreetmap.org")) {
    e.respondWith(
      caches.open("tiles").then(cache =>
        cache.match(e.request).then(res =>
          res || fetch(e.request).then(net => {
            cache.put(e.request, net.clone());
            return net;
          })
        )
      )
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(res => res || fetch(e.request))
  );
});
