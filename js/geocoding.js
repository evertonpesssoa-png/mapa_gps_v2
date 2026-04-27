async function geocode(query) {

  if (!query) return null;

  query = query.trim();

  // ==========================
  // 🔥 NÃO RESTRINGE MAIS (IMPORTANTE)
  // ==========================

  // só adiciona país se for muito genérico
  const finalQuery = query.includes(",")
    ? query
    : `${query}, Brasil`;

  const url =
    `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=` +
    encodeURIComponent(finalQuery);

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "MapaApp/1.0"
      }
    });

    const data = await res.json();

    if (!data || !data.length) return null;

    const place = data[0];

    return {
      lat: parseFloat(place.lat),
      lng: parseFloat(place.lon),
      name: place.display_name
    };

  } catch (err) {
    console.error("Erro geocoding:", err);
    return null;
  }
}

window.geocode = geocode;