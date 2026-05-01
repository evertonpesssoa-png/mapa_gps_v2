async function geocode(query) {

  if (!query) return null;

  const url =
    `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=` +
    encodeURIComponent(query);

  try {

    const res = await fetch(url, {
      headers: {
        "Accept": "application/json"
      }
    });

    const data =
      await res.json();

    if (
      !data ||
      !data.length
    ) {
      return null;
    }

    const place = data[0];

    return {

      lat:
        parseFloat(place.lat),

      lng:
        parseFloat(place.lon),

      name:
        place.display_name
          .split(",")[0]
    };

  } catch (err) {

    console.error(err);

    return null;
  }
}

window.geocode = geocode;