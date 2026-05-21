// ======================================
// CLIMA - UI DO MENU
// ======================================

// Atualizar clima detalhado no menu
async function updateWeatherInMenu(lat, lng) {
  const weatherContainer = document.getElementById('weather-details');
  if (!weatherContainer) return;
  
  // Mostrar loading
  weatherContainer.innerHTML = '<div class="weather-loading">🌤️ Carregando clima...</div>';
  
  const weather = await getDetailedWeather(lat, lng);
  
  if (!weather) {
    weatherContainer.innerHTML = '<div class="weather-error">❌ Erro ao carregar clima</div>';
    return;
  }
  
  // Ícone do clima
  const iconUrl = `https://openweathermap.org/img/wn/${weather.icon}@2x.png`;
  
  weatherContainer.innerHTML = `
    <div class="weather-card">
      <div class="weather-header">
        <span class="weather-city">📍 ${weather.city}</span>
      </div>
      <div class="weather-main">
        <img src="${iconUrl}" alt="${weather.condition}" class="weather-icon">
        <div class="weather-temp">${weather.temp}°C</div>
        <div class="weather-condition">${weather.condition}</div>
      </div>
      <div class="weather-details-grid">
        <div class="weather-detail">
          <span class="detail-label">🌡️ Sensação</span>
          <span class="detail-value">${weather.feelsLike}°C</span>
        </div>
        <div class="weather-detail">
          <span class="detail-label">💧 Umidade</span>
          <span class="detail-value">${weather.humidity}%</span>
        </div>
        <div class="weather-detail">
          <span class="detail-label">💨 Vento</span>
          <span class="detail-value">${weather.windSpeed} m/s</span>
        </div>
      </div>
    </div>
  `;
}

// Atualizar tudo (indicador + menu)
async function updateWeatherAtCenter() {
  if (!window.map) return;
  
  const center = window.map.getCenter();
  const lat = center.lat;
  const lng = center.lng;
  
  // Atualizar indicador pequeno
  await updateTemperatureIndicator(lat, lng);
  
  // Se o menu estiver aberto, atualizar clima detalhado
  const menu = document.getElementById('side-menu');
  if (menu && menu.classList.contains('open')) {
    await updateWeatherInMenu(lat, lng);
  }
}

window.updateWeatherInMenu = updateWeatherInMenu;
window.updateWeatherAtCenter = updateWeatherAtCenter;