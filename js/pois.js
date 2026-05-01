window.poiIndex = window.poiIndex || [];

// ======================================
// REGISTRO
// ======================================

function registerPOI(poi) {

  if (!poi || !poi.name) return;

  window.poiIndex.push(poi);
}

window.registerPOI = registerPOI;

// ======================================
// BUSCA
// ======================================

function findPlacesByName(query) {

  if (!query) {
    return { results: [] };
  }

  query = query.toLowerCase().trim();

  return {
    results: window.poiIndex.filter(p =>
      p.name.toLowerCase().includes(query)
    )
  };
}

window.findPlacesByName = findPlacesByName;

// ======================================
// POPUP
// ======================================

function createPopupContent(poi) {

  return `
    <div style="min-width:160px">

      <b>${poi.name}</b>

      <br><br>

      <button onclick="routeToPlace(${poi.lat}, ${poi.lng})">
        ➜ Rota direta
      </button>

    </div>
  `;
}

// ======================================
// ICON SAFE
// ======================================

function safeIcon(category) {

  try {

    if (typeof getIcon === "function") {
      return getIcon(category);
    }

  } catch (err) {

    console.warn("Erro ícone:", err);
  }

  // fallback Leaflet padrão
  return new L.Icon.Default();
}

// ======================================
// CRIAR MARCADOR
// ======================================

function createMarker(poi, layer) {

  if (!layer) return;

  // valida coords
  if (
    typeof poi.lat !== "number" ||
    typeof poi.lng !== "number"
  ) {
    console.warn("POI inválido:", poi);
    return;
  }

  try {

    const marker = L.marker(
      [poi.lat, poi.lng],
      {
        icon: safeIcon(poi.category)
      }
    );

    marker.bindPopup(
      createPopupContent(poi)
    );

    marker.addTo(layer);

  } catch (err) {

    console.error("Erro criando marker:", err, poi);
  }
}

// ======================================
// POIs MANUAIS
// ======================================

function loadManualPOIs(layer) {

  if (!window.manualPOIs) {

    console.warn("manualPOIs não encontrado");
    return;
  }

  console.log(
    "Carregando POIs manuais:",
    window.manualPOIs.length
  );

  window.manualPOIs.forEach(poi => {

    // garante compatibilidade antiga
    if (poi.lon && !poi.lng) {
      poi.lng = poi.lon;
    }

    registerPOI(poi);

    createMarker(poi, layer);
  });
}

window.loadManualPOIs = loadManualPOIs;

// ======================================
// POIs AUTOMÁTICOS
// ======================================

async function loadAutoPOIs(
  lat,
  lng,
  radius,
  layer
) {

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

    if (
      !data ||
      !Array.isArray(data.elements)
    ) {

      console.error(
        "Resposta inválida da API"
      );

      return;
    }

    console.log(
      "POIs dinâmicos:",
      data.elements.length
    );

    data.elements.forEach(el => {

      const poi = {

        name:
          el.tags?.name || "Local",

        lat: Number(el.lat),

        lng: Number(el.lon),

        category: "generic"
      };

      if (
        el.tags?.amenity === "hospital"
      ) {
        poi.category = "hospital";
      }

      if (
        el.tags?.amenity === "pharmacy"
      ) {
        poi.category = "pharmacy";
      }

      if (
        el.tags?.amenity === "police"
      ) {
        poi.category = "police";
      }

      if (
        el.tags?.shop === "supermarket"
      ) {
        poi.category = "supermarket";
      }

      registerPOI(poi);

      createMarker(poi, layer);
    });

  } catch (err) {

    console.error(
      "Erro Overpass:",
      err
    );
  }
}

window.loadAutoPOIs = loadAutoPOIs;