window.poiIndex = window.poiIndex || [];
window.autoPOIsReady = false;

// ======================================
// NORMALIZE
// ======================================

function normalizeText(text) {

  return (text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

// ======================================
// REGISTRO
// ======================================

function registerPOI(poi) {

  if (!poi) return;

  // garante nome
  if (
    !poi.name ||
    !poi.name.trim()
  ) {

    poi.name = "Local";
  }

  // compatibilidade
  poi.lng =
    poi.lng ?? poi.lon;

  // converte número
  poi.lat =
    Number(poi.lat);

  poi.lng =
    Number(poi.lng);

  // valida coords
  if (
    isNaN(poi.lat) ||
    isNaN(poi.lng)
  ) {

    console.warn(
      "POI inválido:",
      poi
    );

    return;
  }

  // evita duplicados
  const exists =
    window.poiIndex.some(p =>

      normalizeText(p.name) ===
        normalizeText(poi.name) &&

      p.lat === poi.lat &&
      p.lng === poi.lng
    );

  if (exists) return;

  window.poiIndex.push({

    ...poi,

    lat: poi.lat,
    lng: poi.lng
  });

  console.log(
    "POI registrado:",
    poi.name
  );
}

window.registerPOI =
  registerPOI;

// ======================================
// BUSCA
// ======================================

function findPlacesByName(query) {

  if (!query) {

    return {
      results: []
    };
  }

  const normalizedQuery =
    normalizeText(query);

  const results =
    window.poiIndex.filter(p =>

      normalizeText(
        p.name
      ).includes(
        normalizedQuery
      )
    );

  return { results };
}

window.findPlacesByName =
  findPlacesByName;

// ======================================
// POPUP
// ======================================

function createPopupContent(poi) {

  return `
    <div style="min-width:160px">

      <b>${poi.name}</b>

      <br><br>

      <button onclick="
        routeToPlace(
          ${poi.lat},
          ${poi.lng}
        )
      ">
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

    if (
      typeof getIcon ===
      "function"
    ) {

      return getIcon(category);
    }

  } catch (err) {

    console.warn(
      "Erro ícone:",
      err
    );
  }

  return new L.Icon.Default();
}

// ======================================
// CRIAR MARCADOR
// ======================================

function createMarker(
  poi,
  layer
) {

  if (!layer) return;

  if (
    typeof poi.lat !==
      "number" ||

    typeof poi.lng !==
      "number"
  ) {

    console.warn(
      "POI inválido:",
      poi
    );

    return;
  }

  try {

    const marker =
      L.marker(
        [poi.lat, poi.lng],
        {
          icon: safeIcon(
            poi.category
          )
        }
      );

    marker.bindPopup(
      createPopupContent(poi)
    );

    marker.addTo(layer);

  } catch (err) {

    console.error(
      "Erro marker:",
      err,
      poi
    );
  }
}

// ======================================
// POIs MANUAIS
// ======================================

function loadManualPOIs(
  layer
) {

  if (
    !Array.isArray(
      window.manualPOIs
    )
  ) {

    console.warn(
      "manualPOIs não encontrado"
    );

    return;
  }

  console.log(
    "Carregando POIs manuais:",
    window.manualPOIs.length
  );

  window.manualPOIs.forEach(
    poi => {

      poi.lng =
        poi.lng ??
        poi.lon;

      registerPOI(poi);

      createMarker(
        poi,
        layer
      );
    }
  );

  console.log(
    "INDEX APÓS MANUAIS:",
    window.poiIndex.length
  );
}

window.loadManualPOIs =
  loadManualPOIs;

// ======================================
// POIs AUTOMÁTICOS
// ======================================

async function loadAutoPOIs(
  lat,
  lng,
  radius,
  layer
) {

  window.autoPOIsReady =
    false;

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

    const res =
      await fetch(
        "https://overpass-api.de/api/interpreter",
        {
          method: "POST",
          body: query
        }
      );

    if (!res.ok) {

      console.error(
        "Erro Overpass:",
        res.status
      );

      return;
    }

    const data =
      await res.json();

    if (
      !data ||
      !Array.isArray(
        data.elements
      )
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
          el.tags?.name ||
          "Local",

        lat:
          Number(el.lat),

        lng:
          Number(el.lon),

        category:
          "generic"
      };

      // categoria
      if (
        el.tags?.amenity ===
        "hospital"
      ) {

        poi.category =
          "hospital";
      }

      if (
        el.tags?.amenity ===
        "pharmacy"
      ) {

        poi.category =
          "pharmacy";
      }

      if (
        el.tags?.amenity ===
        "police"
      ) {

        poi.category =
          "police";
      }

      if (
        el.tags?.shop ===
        "supermarket"
      ) {

        poi.category =
          "supermarket";
      }

      registerPOI(poi);

      createMarker(
        poi,
        layer
      );
    });

    console.log(
      "INDEX FINAL:",
      window.poiIndex.length
    );

    window.autoPOIsReady =
      true;

  } catch (err) {

    console.error(
      "Erro Overpass:",
      err
    );
  }
}

window.loadAutoPOIs =
  loadAutoPOIs;