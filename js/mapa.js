async function geocode(query) {

  if (!query) return null;

  query = query.trim();

  const url =
    `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&q=` +
    encodeURIComponent(query);

  try {

    const res = await fetch(url);

    if (!res.ok) {

      console.error(
        "Erro Nominatim:",
        res.status
      );

      return null;
    }

    const data = await res.json();

    console.log(
      "Geocode:",
      data
    );

    if (
      !Array.isArray(data) ||
      data.length === 0
    ) {

      return null;
    }

    // prioriza cidades/estados
    const preferred =
      data.find(place => {

        const type =
          place.type || "";

        return [

          "city",
          "state",
          "administrative",
          "town",
          "municipality"

        ].includes(type);

      }) || data[0];

    return {

      lat:
        parseFloat(
          preferred.lat
        ),

      lng:
        parseFloat(
          preferred.lon
        ),

      name:
        preferred.display_name
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