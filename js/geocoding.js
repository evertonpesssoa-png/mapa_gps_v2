<script>
function searchAddress() {
  const addr = document.getElementById("address").value;
  if (!addr) return;

  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addr)}`;

  fetch(url)
    .then(res => res.json())
    .then(data => {
      if (!data.length) {
        alert("Endereço não encontrado");
        return;
      }

      const lat = data[0].lat;
      const lon = data[0].lon;

      map.setView([lat, lon], 16);

      L.marker([lat, lon])
        .addTo(map)
        .bindPopup("Resultado da busca")
        .openPopup();
    });
}
</script>
