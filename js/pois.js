function loadManualPOIs(poiLayer) {
  fetch("./data/manual_pois.json")
    .then(res => res.json())
    .then(pois => {
      pois.forEach(p => {
        L.marker([p.lat, p.lon], {
          icon: getIcon(p.category)
        })
        .addTo(poiLayer)
        .bindPopup(p.name);
      });
    })
    .catch(err => {
      console.warn("POIs manuais indisponíveis", err);
    });
}

function loadAutoPOIs(lat, lon, radius, poiLayer) {
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
  .catch(() => {
    console.warn("POIs automáticos indisponíveis (offline)");
  });
}
