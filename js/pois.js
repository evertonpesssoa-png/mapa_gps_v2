/**
 * Popup HTML com botão de rota
 */
function buildPopupHTML(place) {
  return `
    <div style="min-width:180px">
      <strong>${place.name}</strong><br><br>
      <button
        style="width:100%; padding:6px; cursor:pointer"
        onclick="routeToPlace(${place.lat}, ${place.lon})"
      >
        🧭 Traçar rota até aqui
      </button>
    </div>
  `;
}

/**
 * Evita duplicação de POIs
 */
function placeExists(lat, lon) {
  return window.poiIndex.some(p => p.lat === lat && p.lon === lon);
}

/**
 * Carrega POIs manuais
 */
function loadManualPOIs(poiLayer) {
  fetch("./data/manual_pois.json")
    .then(res => {
      if (!res.ok) throw new Error("Erro ao carregar POIs manuais");
      return res.json();
    })
    .then(pois => {
      pois.forEach(p => {
        if (placeExists(p.lat, p.lon)) return;

        const place = {
          name: p.name,
          lat: p.lat,
          lon: p.lon,
          category: p.category || "generic",
          marker: null
        };

        place.marker = L.marker([p.lat, p.lon], {
          icon: getIcon(place.category)
        })
          .addTo(poiLayer)
          .bindPopup(buildPopupHTML(place));

        window.poiIndex.push(place);
      });
    })
    .catch(err => {
      console.warn("POIs manuais indisponíveis", err);
    });
}

/**
 * Carrega POIs automáticos (Overpass)
 */
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
    .then(res => {
      if (!res.ok) throw new Error("Erro Overpass");
      return res.json();
    })
    .then(data => {
      data.elements.forEach(p => {
        if (!p.lat || !p.lon) return;
        if (placeExists(p.lat, p.lon)) return;

        const place = {
          name: p.tags?.name || p.tags?.amenity || "Lugar sem nome",
          lat: p.lat,
          lon: p.lon,
          category: p.tags?.amenity || "generic",
          marker: null
        };

        place.marker = L.marker([p.lat, p.lon])
          .addTo(poiLayer)
          .bindPopup(buildPopupHTML(place));

        window.poiIndex.push(place);
      });
    })
    .catch(() => {
      console.warn("POIs automáticos indisponíveis");
    });
}

/**
 * Busca por nome (autocomplete)
 */
function findPlacesByName(searchText) {
  if (!window.poiIndex.length) {
    return { results: [] };
  }

  const text = searchText.toLowerCase().trim();
  if (!text) return { results: [] };

  const results = window.poiIndex.filter(p =>
    p.name.toLowerCase().includes(text)
  );

  return { results };
}
