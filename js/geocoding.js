async function geocode(query) {

  if (!query) return null;

  query = query.trim();

  // ======================================
  // URL NOMINATIM
  // ======================================

  const url =
    `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=` +
    encodeURIComponent(query);

  try {

    const res = await fetch(url, {
      headers: {
        "Accept": "application/json"
      }
    });

    if (!res.ok) {

      console.error(
        "Erro Nominatim:",
        res.status
      );

      return null;
    }

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

      return null;
    }

    const place = data[0];

    // ======================================
    // PEGA NOME CURTO
    // ======================================

    let shortName =
      place.display_name;

    // pega só antes da primeira vírgula
    if (
      shortName.includes(",")
    ) {

      shortName =
        shortName.split(",")[0];
    }

    // ======================================
    // RETORNO
    // ======================================

    return {

      lat:
        Number(place.lat),

      lng:
        Number(place.lon),

      name:
        shortName
    };

  } catch (err) {

    console.error(
      "Geocoding error:",
      err
    );

    return null;
  }
}

window.geocode = geocode;