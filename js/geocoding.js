// ======================================
// GEOCODING ENGINE
// ======================================

window.geoCache =
  window.geoCache || {};

window.lastGeocodeResults =
  window.lastGeocodeResults || [];

let currentGeocodeController = null;

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
// DISTÂNCIA
// ======================================

function distanceInMeters(
  lat1,
  lng1,
  lat2,
  lng2
) {

  const R = 6371000;

  const dLat =
    (lat2 - lat1) *
    Math.PI / 180;

  const dLng =
    (lng2 - lng1) *
    Math.PI / 180;

  const a =

    Math.sin(dLat / 2) *
    Math.sin(dLat / 2) +

    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *

    Math.sin(dLng / 2) *
    Math.sin(dLng / 2);

  const c =

    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );

  return R * c;
}

// ======================================
// BUSCA LOCAL
// ======================================

function searchLocalPOIs(query) {

  if (
    !Array.isArray(
      window.poiIndex
    )
  ) {

    return [];
  }

  const normalized =
    normalizeText(query);

  return window.poiIndex.filter(
    poi => {

      const name =
        normalizeText(
          poi.name
        );

      return name.includes(
        normalized
      );
    }
  );
}

// ======================================
// SCORE RESULTADOS
// ======================================

function scorePlace(
  place,
  query
) {

  const normalizedQuery =
    normalizeText(query);

  const name =
    normalizeText(
      place.name
    );

  let score = 0;

  // match exato
  if (name === normalizedQuery) {
    score += 100;
  }

  // começa igual
  if (
    name.startsWith(
      normalizedQuery
    )
  ) {

    score += 40;
  }

  // contém
  if (
    name.includes(
      normalizedQuery
    )
  ) {

    score += 20;
  }

  // importância nominatim
  score +=
    (place.importance || 0) *
    10;

  // boost proximidade usuário
  if (
    window.lastGPS
  ) {

    const dist =
      distanceInMeters(
        window.lastGPS.lat,
        window.lastGPS.lng,
        Number(place.lat),
        Number(
          place.lng ??
          place.lon
        )
      );

    if (dist < 3000) {
      score += 30;
    }

    else if (dist < 10000) {
      score += 15;
    }
  }

  return score;
}

// ======================================
// NORMALIZA RESULTADO
// ======================================

function normalizePlace(place) {

  return {

    name:
      String(
        place.name ||
        place.display_name ||
        "Local"
      ),

    fullName:
      String(
        place.fullName ||
        place.display_name ||
        ""
      ),

    lat:
      Number(place.lat),

    lng:
      Number(
        place.lng ??
        place.lon
      ),

    type:
      place.type || "place",

    importance:
      Number(
        place.importance || 0
      ),

    source:
      place.source || "global"
  };
}

// ======================================
// NOMINATIM
// ======================================

async function fetchNominatim(
  query
) {

  // cancela anterior
  if (
    currentGeocodeController
  ) {

    currentGeocodeController.abort();
  }

  currentGeocodeController =
    new AbortController();

  const url =
    `https://nominatim.openstreetmap.org/search` +
    `?format=jsonv2` +
    `&addressdetails=1` +
    `&limit=10` +
    `&countrycodes=br` +
    `&accept-language=pt-BR` +
    `&q=${encodeURIComponent(query)}`;

  try {

    const res =
      await fetch(url, {

        signal:
          currentGeocodeController.signal,

        headers: {

          "Accept":
            "application/json"
        }
      });

    if (!res.ok) {

      console.error(
        "Erro Nominatim:",
        res.status
      );

      return [];
    }

    const data =
      await res.json();

    if (
      !Array.isArray(data)
    ) {

      return [];
    }

    return data.map(place => {

      const shortName =

        place.name ||
        place.display_name ||
        "Local";

      return normalizePlace({

        name: shortName,

        fullName:
          place.display_name,

        lat:
          Number(place.lat),

        lng:
          Number(place.lon),

        type:
          place.type,

        importance:
          place.importance,

        source:
          "nominatim"
      });
    });

  } catch (err) {

    if (
      err.name ===
      "AbortError"
    ) {

      console.log(
        "Geocode cancelado"
      );

      return [];
    }

    console.error(
      "Erro geocoding:",
      err
    );

    return [];
  }
}

// ======================================
// GEOCODING PRINCIPAL
// ======================================

async function geocode(query) {

  // ======================================
  // VALIDAÇÃO
  // ======================================

  if (
    !query ||
    typeof query !==
      "string"
  ) {

    return [];
  }

  query = query.trim();

  if (
    query.length < 2
  ) {

    return [];
  }

  const normalizedQuery =
    normalizeText(query);

  // ======================================
  // CACHE
  // ======================================

  if (
    window.geoCache[
      normalizedQuery
    ]
  ) {

    return window.geoCache[
      normalizedQuery
    ];
  }

  // ======================================
  // BUSCA LOCAL
  // ======================================

  const localResults =
    searchLocalPOIs(query)
      .map(poi =>

        normalizePlace({

          ...poi,

          source: "local"
        })
      );

  // ======================================
  // NOMINATIM
  // ======================================

  const globalResults =
    await fetchNominatim(
      query
    );

  // ======================================
  // MERGE
  // ======================================

  const merged = [

    ...localResults,
    ...globalResults

  ];

  // ======================================
  // REMOVE DUPLICADOS
  // ======================================

  const unique = [];

  merged.forEach(place => {

    const exists =
      unique.some(p => {

        const sameName =

          normalizeText(
            p.name
          ) ===

          normalizeText(
            place.name
          );

        const sameLat =

          Math.abs(
            p.lat - place.lat
          ) < 0.00001;

        const sameLng =

          Math.abs(
            p.lng - place.lng
          ) < 0.00001;

        return (
          sameName &&
          sameLat &&
          sameLng
        );
      });

    if (!exists) {

      unique.push(place);
    }
  });

  // ======================================
  // SCORE + SORT
  // ======================================

  unique.forEach(place => {

    place.score =
      scorePlace(
        place,
        query
      );
  });

  unique.sort(
    (a, b) =>
      b.score - a.score
  );

  // ======================================
  // CACHE
  // ======================================

  window.geoCache[
    normalizedQuery
  ] = unique;

  window.lastGeocodeResults =
    unique;

  console.log(
    "Geocode final:",
    unique
  );

  return unique;
}

// ======================================
// REVERSE GEOCODE
// ======================================

async function reverseGeocode(
  lat,
  lng
) {

  try {

    const url =
      `https://nominatim.openstreetmap.org/reverse` +
      `?format=jsonv2` +
      `&lat=${lat}` +
      `&lon=${lng}` +
      `&accept-language=pt-BR`;

    const res =
      await fetch(url);

    if (!res.ok) {

      return null;
    }

    const data =
      await res.json();

    return {

      name:
        data.name ||
        data.display_name,

      fullName:
        data.display_name,

      lat:
        Number(lat),

      lng:
        Number(lng)
    };

  } catch (err) {

    console.error(
      "Reverse geocode error:",
      err
    );

    return null;
  }
}

// ======================================
// LOCATION ENGINE HELPERS
// ======================================

window.locationEngine =
  window.locationEngine || {};

window.locationEngine.resolve =
  geocode;

window.locationEngine.reverse =
  reverseGeocode;

// ======================================
// DEBOUNCE
// ======================================

function debounce(
  func,
  delay = 400
) {

  let timeout;

  return function (...args) {

    clearTimeout(timeout);

    timeout =
      setTimeout(() => {

        func.apply(
          this,
          args
        );

      }, delay);
  };
}

// ======================================
// EXPORTS
// ======================================

window.geocode =
  geocode;

window.reverseGeocode =
  reverseGeocode;

window.debounce =
  debounce;