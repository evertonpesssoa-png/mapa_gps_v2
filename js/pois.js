window.poiIndex = window.poiIndex || [];

function registerPOI(poi) {

  if (!poi || !poi.name) return;

  window.poiIndex.push(poi);
}

window.registerPOI = registerPOI;

function findPlacesByName(query) {

  if (!query) return { results: [] };

  query = query.toLowerCase().trim();

  return {
    results: window.poiIndex.filter(p =>
      p.name.toLowerCase().includes(query)
    )
  };
}

window.findPlacesByName = findPlacesByName;

function createPopupContent(poi) {
  return `
    <div>
      <b>${poi.name}</b><br><br>

      <button onclick="routeToPlace(${poi.lat}, ${poi.lng})">
        ➜ Rota direta
      </button>
    </div>
  `;
}

function loadManualPOIs(layer) {

  if (!window.manualPOIs) return;

  window.manualPOIs.forEach(poi => {

    registerPOI(poi);

    const marker = L.marker([poi.lat, poi.lng], {
      icon: getIcon(poi.category)
    });

    marker.bindPopup(createPopupContent(poi));

    marker.addTo(layer);
  });
}

window.loadManualPOIs = loadManualPOIs;

async function loadAutoPOIs(lat, lng, radius, layer) {

  const query = `
    [out:json];
    (
      node["amenity"="hospital"](around:${radius},${lat},${lng});
      node["amenity"="pharmacy"](around:${radius},${lat},${lng});
      node["amenity"="police"](around:${radius},${lat},${lng});
      node["shop"="supermarket"](around:${radius},${lat},${lng});
    );
    out;
  `;

  try {

    const res = await fetch(
      "https://overpass-api.de/api/interpreter",
      {
        method: "POST",
        body: query
      }
    );

    const data = await res.json();

    if (!data || !Array.isArray(data.elements)) {
      console.error("Resposta inválida da API");
      return;
    }

    data.elements.forEach(el => {

      const poi = {
        name: el.tags?.name || "Local",
        lat: el.lat,
        lng: el.lon,
        category: "generic"
      };

      if (el.tags?.amenity === "hospital") {
        poi.category = "hospital";
      }

      if (el.tags?.amenity === "pharmacy") {
        poi.category = "pharmacy";
      }

      if (el.tags?.amenity === "police") {
        poi.category = "police";
      }

      if (el.tags?.shop === "supermarket") {
        poi.category = "supermarket";
      }

      registerPOI(poi);

      const marker = L.marker([poi.lat, poi.lng], {
        icon: getIcon(poi.category)
      });

      marker.bindPopup(createPopupContent(poi));

      marker.addTo(layer);
    });

  } catch (err) {
    console.error("Erro Overpass:", err);
  }
}

window.loadAutoPOIs = loadAutoPOIs;