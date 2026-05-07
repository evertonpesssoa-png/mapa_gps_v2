window.poiIndex =
  window.poiIndex || [];

window.autoPOIsReady =
  false;

// ======================================
// LAYER AUTO POIs
// ======================================

window.autoPOILayer =
  window.autoPOILayer ||
  L.layerGroup();

// ======================================
// CACHE DE ÁREAS
// ======================================

window.loadedPOIAreas =
  window.loadedPOIAreas || {};

// ======================================
// NORMALIZE
// ======================================

function normalizeText(text) {

  return (text || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .trim();
}

// ======================================
// ESCAPE HTML
// ======================================

function escapeHTML(text) {

  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ======================================
// HASH DE ÁREA
// ======================================

function createAreaKey(
  lat,
  lng
) {

  const latKey =
    Math.floor(lat * 100);

  const lngKey =
    Math.floor(lng * 100);

  return `${latKey}:${lngKey}`;
}

// ======================================
// REGISTRO
// ======================================

function registerPOI(poi) {

  if (!poi) return;

  // garante nome
  if (
    !poi.name ||
    !String(poi.name).trim()
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
    window.poiIndex.some(p => {

      const sameName =

        normalizeText(p.name) ===
        normalizeText(poi.name);

      const sameLat =

        Math.abs(
          p.lat - poi.lat
        ) < 0.00001;

      const sameLng =

        Math.abs(
          p.lng - poi.lng
        ) < 0.00001;

      return (
        sameName &&
        sameLat &&
        sameLng
      );
    });

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

function findPlacesByName(
  query
) {

  if (!query) {

    return {
      results: []
    };
  }

  const normalizedQuery =
    normalizeText(query);

  const results =
    window.poiIndex.filter(
      p =>

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

function createPopupContent(
  poi
) {

  const safeName =
    escapeHTML(
      poi.name
    );

  return `
    <div style="
      min-width:160px
    ">

      <b>${safeName}</b>

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

      return getIcon(
        category
      );
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
      createPopupContent(
        poi
      )
    );

    // marca como auto
    if (poi.auto) {

      marker._autoPOI =
        true;
    }

    marker.addTo(layer);

    return marker;

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
// DETECTAR CATEGORIA
// ======================================

function detectCategory(tags) {

  if (!tags) {

    return "generic";
  }

  if (
    tags.amenity ===
    "hospital"
  ) {

    return "hospital";
  }

  if (
    tags.amenity ===
    "pharmacy"
  ) {

    return "pharmacy";
  }

  if (
    tags.amenity ===
    "police"
  ) {

    return "police";
  }

  if (
    tags.shop ===
    "supermarket"
  ) {

    return "supermarket";
  }

  if (
    tags.amenity ===
    "restaurant"
  ) {

    return "restaurant";
  }

  if (
    tags.amenity ===
    "fuel"
  ) {

    return "gas_station";
  }

  return "generic";
}

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

  // ======================================
  // CACHE DE ÁREA
  // ======================================

  const areaKey =
    createAreaKey(
      lat,
      lng
    );

  if (
    window.loadedPOIAreas[
      areaKey
    ]
  ) {

    console.log(
      "Área já carregada:",
      areaKey
    );

    return;
  }

  window.loadedPOIAreas[
    areaKey
  ] = true;

  // ======================================
  // ADICIONA LAYER AO MAPA
  // ======================================

  if (
    layer &&
    !layer.hasLayer(
      window.autoPOILayer
    )
  ) {

    layer.addLayer(
      window.autoPOILayer
    );
  }

  // ======================================
  // LIMITA RADIUS
  // ======================================

  radius =
    Math.min(
      Number(radius) || 3000,
      5000
    );

  const query = `
    [out:json][timeout:12];
    (
      node["amenity"="hospital"](around:${radius},${lat},${lng});
      node["amenity"="pharmacy"](around:${radius},${lat},${lng});
      node["amenity"="police"](around:${radius},${lat},${lng});
      node["shop"="supermarket"](around:${radius},${lat},${lng});
      node["amenity"="restaurant"](around:${radius},${lat},${lng});
      node["amenity"="fuel"](around:${radius},${lat},${lng});
    );
    out body;
  `;

  try {

    const controller =
      new AbortController();

    const timeout =
      setTimeout(() => {

        controller.abort();

      }, 15000);

    console.log(
      "Buscando Overpass..."
    );

    const res =
      await fetch(
        "https://overpass-api.de/api/interpreter",
        {
          method: "POST",
          body: query,
          signal:
            controller.signal
        }
      );

    clearTimeout(timeout);

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

    data.elements.forEach(
      el => {

        const poi = {

          name:
            String(
              el.tags?.name ||
              "Local"
            ),

          lat:
            Number(el.lat),

          lng:
            Number(el.lon),

          category:
            detectCategory(
              el.tags
            ),

          auto: true,

          osmId:
            el.id
        };

        registerPOI(poi);

        createMarker(
          poi,
          window.autoPOILayer
        );
      }
    );

    console.log(
      "INDEX FINAL:",
      window.poiIndex.length
    );

    window.autoPOIsReady =
      true;

  } catch (err) {

    if (
      err.name ===
      "AbortError"
    ) {

      console.warn(
        "Overpass timeout"
      );

      return;
    }

    console.error(
      "Erro Overpass:",
      err
    );
  }
}

window.loadAutoPOIs =
  loadAutoPOIs;