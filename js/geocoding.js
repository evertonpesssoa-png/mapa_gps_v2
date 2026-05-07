JavaScript
// ======================================
// CONTROLE DE REQUESTS
// ======================================

let currentGeocodeController = null;

// ======================================
// GEOCODING PRINCIPAL
// ======================================

async function geocode(query) {

  // ======================================
  // VALIDAÇÃO
  // ======================================

  if (!query || typeof query !== "string") {
    return [];
  }

  query = query.trim();

  if (query.length < 2) {
    return [];
  }

  // ======================================
  // CANCELA REQUEST ANTERIOR
  // ======================================

  if (currentGeocodeController) {
    currentGeocodeController.abort();
  }

  currentGeocodeController =
    new AbortController();

  // ======================================
  // URL NOMINATIM
  // ======================================

  const url =
    `https://nominatim.openstreetmap.org/search` +
    `?format=json` +
    `&addressdetails=1` +
    `&limit=5` +
    `&countrycodes=br` +
    `&accept-language=pt-BR` +
    `&q=${encodeURIComponent(query)}`;

  try {

    const res = await fetch(url, {

      signal:
        currentGeocodeController.signal,

      headers: {
        "Accept": "application/json"
      }
    });

    // ======================================
    // ERRO HTTP
    // ======================================

    if (!res.ok) {

      console.error(
        "Erro Nominatim:",
        res.status
      );

      return [];
    }

    // ======================================
    // JSON
    // ======================================

    const data =
      await res.json();

    console.log(
      "Resultado geocode:",
      data
    );

    // ======================================
    // VALIDAÇÃO
    // ======================================

    if (
      !Array.isArray(data) ||
      data.length === 0
    ) {

      return [];
    }

    // ======================================
    // FILTRAR TIPOS ÚTEIS
    // ======================================

    const validTypes = [

      "city",
      "town",
      "village",
      "suburb",
      "neighbourhood",
      "road",
      "residential",
      "house",
      "building",
      "amenity"

    ];

    const filtered =
      data.filter(place =>
        validTypes.includes(place.type)
      );

    // se nada passar no filtro,
    // usa os originais
    const finalResults =
      filtered.length > 0
        ? filtered
        : data;

    // ======================================
    // NORMALIZAÇÃO
    // ======================================

    return finalResults.map(place => {

      // nome amigável
      let shortName =
        place.display_name;

      // tenta usar nome mais curto
      if (place.name) {
        shortName = place.name;
      }

      return {

        lat:
          Number(place.lat),

        lng:
          Number(place.lon),

        name:
          shortName,

        fullName:
          place.display_name,

        type:
          place.type,

        importance:
          place.importance || 0
      };
    });

  } catch (err) {

    // request cancelada
    if (err.name === "AbortError") {

      console.log(
        "Request cancelada"
      );

      return [];
    }

    console.error(
      "Geocoding error:",
      err
    );

    return [];
  }
}

// ======================================
// DEBOUNCE
// ======================================

function debounce(func, delay = 400) {

  let timeout;

  return function (...args) {

    clearTimeout(timeout);

    timeout = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}

// ======================================
// EXPORT GLOBAL
// ======================================

window.geocode = geocode;
window.debounce = debounce;