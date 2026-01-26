const CACHE_NAME = "mapa-offline-v2";
const TILE_CACHE = "mapa-tiles-v1";

// 📦 Arquivos locais essenciais
const LOCAL_ASSETS = [
  "./",
  "./index.html",

  "./js/mapa.js",
  "./js/pois.js",
  "./js/icons.js",
  "./js/routing.js",

  "./data/manual_pois.json",

  "./assets/icons/hospital.png",
  "./assets/icons/pharmacy.png",
  "./assets/icons/police-station.png",
  "./assets/icons/supermarket.png",
  "./assets/icons/gas-pump.png",
  "./assets/icons/mechanic.png",
  "./assets/icons/house.png",
  "./assets/icons/marker.png",
  "./assets/icons/warning.png"
];

// 🌐 Bibliotecas externas (best-effort)
const CDN_ASSETS = [
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
];

// 📥 INSTALL
self.addEventListener("install", event => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      // assets locais → obrigatórios
      await cache.addAll(LOCAL_ASSETS);

      // CDN → tenta, mas não falha o install
      for (const url of CDN_ASSETS) {
        try {
          await cache.add(url);
        } catch (e) {
          console.warn("CDN não cacheado:", url);
        }
      }

      self.skipWaiting();
    })()
  );
});

// ♻️ ACTIVATE (limpa versões antigas)
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => ![CACHE_NAME, TILE_CACHE].includes(k))
          .map(k => caches.delete(k))
      )
    )
  );

  self.clients.claim();
});

// 🌐 FETCH
self.addEventListener("fetch", event => {
  const url = event.request.url;

  // 🗺️ Tiles do OpenStreetMap (cache-first)
  if (url.includes("tile.openstreetmap.org")) {
    event.respondWith(
      caches.open(TILE_CACHE).then(cache =>
        cache.match(event.request).then(res =>
          res ||
          fetch(event.request).then(net => {
            cache.put(event.request, net.clone());
            return net;
          })
        )
      )
    );
    return;
  }

  // 🚫 APIs externas dinâmicas (sempre network)
  if (
    url.includes("overpass-api.de") ||
    url.includes("router.project-osrm.org")
  ) {
    return;
  }

  // 📦 Cache padrão
  event.respondWith(
    caches.match(event.request).then(res => res || fetch(event.request))
  );
});
