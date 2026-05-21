// ======================================
// CLIMA - OpenWeatherMap API
// ======================================

const WEATHER_API_KEY = '0e2d4d8bce061df397bf00aa0e007be8';

// Buscar clima por coordenadas
async function fetchWeather(lat, lng) {
  if (!WEATHER_API_KEY || WEATHER_API_KEY === '0e2d4d8bce061df397bf00aa0e007be8') {
    console.warn('⚠️ WEATHER_API_KEY configurada, testando...');
  }
  
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${WEATHER_API_KEY}&units=metric&lang=pt_br`;
  
  console.log(`🌤️ Buscando clima para lat: ${lat}, lng: ${lng}`);
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Erro clima:', response.status, errorData);
      
      if (response.status === 401) {
        console.error('❌ API Key inválida! Verifique no site do OpenWeatherMap');
        alert('Erro: Chave da API do clima inválida. Verifique sua chave no OpenWeatherMap.');
      } else if (response.status === 404) {
        console.error('❌ Localização não encontrada');
      }
      return null;
    }
    
    const data = await response.json();
    console.log('✅ Clima obtido:', data.name, data.main.temp + '°C');
    return data;
    
  } catch (err) {
    console.error('Erro ao buscar clima:', err);
    return null;
  }
}

// Atualizar indicador de temperatura
async function updateTemperatureIndicator(lat, lng) {
  const indicator = document.getElementById('temp-indicator');
  if (!indicator) return;
  
  const weather = await fetchWeather(lat, lng);
  if (weather && weather.main) {
    const temp = Math.round(weather.main.temp);
    indicator.innerHTML = `🌡️ ${temp}°C`;
    indicator.title = weather.weather[0].description;
    console.log(`🌡️ Temperatura atualizada: ${temp}°C`);
  } else {
    indicator.innerHTML = `🌡️ --°C`;
    console.warn('⚠️ Não foi possível obter a temperatura');
  }
}

// Buscar clima detalhado para o menu
async function getDetailedWeather(lat, lng) {
  const weather = await fetchWeather(lat, lng);
  if (!weather) return null;
  
  return {
    temp: Math.round(weather.main.temp),
    feelsLike: Math.round(weather.main.feels_like),
    humidity: weather.main.humidity,
    windSpeed: weather.wind.speed,
    condition: weather.weather[0].description,
    icon: weather.weather[0].icon,
    city: weather.name || 'Localização atual'
  };
}

window.fetchWeather = fetchWeather;
window.updateTemperatureIndicator = updateTemperatureIndicator;
window.getDetailedWeather = getDetailedWeather;

console.log('✅ Sistema de clima carregado. Aguardando mapa...');