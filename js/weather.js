// ======================================
// CLIMA - OpenWeatherMap API
// ======================================

const WEATHER_API_KEY = '77806cce3650e9533ba2e648930466eb';

// ======================================
// BUSCAR CLIMA
// ======================================

async function fetchWeather(lat, lng) {
  if (!WEATHER_API_KEY) {
    console.warn('⚠️ WEATHER_API_KEY não configurada');
    return null;
  }
  
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${WEATHER_API_KEY}&units=metric&lang=pt_br`;
  
  console.log(`🌤️ Buscando clima para lat: ${lat}, lng: ${lng}`);
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Erro clima:', response.status, errorData);
      
      if (response.status === 401) {
        console.error('❌ API Key inválida!');
        alert('Erro: Chave da API do clima inválida.');
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

// ======================================
// ATUALIZAR INDICADOR DE TEMPERATURA
// ======================================

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

// ======================================
// BUSCAR CLIMA DETALHADO PARA O MENU
// ======================================

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

// ======================================
// MODO NOTURNO AUTOMÁTICO (BASEADO NO SOL)
// ======================================

// Buscar horários do sol
async function fetchSunTimes(lat, lng) {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${WEATHER_API_KEY}&units=metric`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data && data.sys) {
      const sunrise = data.sys.sunrise * 1000; // converter para ms
      const sunset = data.sys.sunset * 1000;
      const now = Date.now();
      
      return {
        sunrise: sunrise,
        sunset: sunset,
        isDaytime: now > sunrise && now < sunset,
        sunriseHour: new Date(sunrise).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        sunsetHour: new Date(sunset).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      };
    }
    return null;
  } catch (err) {
    console.error('Erro ao buscar horário do sol:', err);
    return null;
  }
}

// Aplicar tema (UI e estilo do mapa)
function aplicarTema(theme) {
  // Aplicar tema na UI
  document.documentElement.setAttribute('data-theme', theme);
  document.body.setAttribute('data-theme', theme);
  
  // TROCAR O ESTILO DO MAPA BASEADO NO TEMA (Mapbox Dark/Light)
  if (typeof window.atualizarEstiloMapaPorTema === 'function') {
    window.atualizarEstiloMapaPorTema(theme);
  }
  
  // Atualizar ícone do botão de tema
  const themeIcon = document.getElementById('theme-icon');
  const themeText = document.getElementById('theme-text');
  
  if (themeIcon) {
    themeIcon.textContent = theme === 'dark' ? '🌙' : '☀️';
  }
  if (themeText) {
    themeText.textContent = theme === 'dark' ? 'Modo Claro' : 'Modo Noturno';
  }
  
  localStorage.setItem('map_theme', theme);
  localStorage.setItem('map_theme_updated', Date.now());
  
  console.log(`🎨 Tema aplicado: ${theme === 'dark' ? '🌙 Noturno' : '☀️ Claro'}`);
}

// Agendar próxima troca automática
function agendarProximaTroca(sunTimes) {
  if (!sunTimes) return;
  
  const now = Date.now();
  const nextChange = sunTimes.isDaytime ? sunTimes.sunset : sunTimes.sunrise;
  const timeUntilChange = nextChange - now;
  
  if (timeUntilChange > 0 && timeUntilChange < 24 * 60 * 60 * 1000) {
    console.log(`⏰ Próxima troca de tema em: ${Math.round(timeUntilChange / 60000)} minutos (${new Date(nextChange).toLocaleTimeString('pt-BR')})`);
    
    if (window.themeTimeout) clearTimeout(window.themeTimeout);
    window.themeTimeout = setTimeout(async () => {
      if (window.map) {
        const center = window.map.getCenter();
        await aplicarTemaPorHorario(center.lat, center.lng);
      }
    }, timeUntilChange);
  }
}

// Aplicar tema baseado no horário do sol
async function aplicarTemaPorHorario(lat, lng) {
  // Verificar se há override manual recente (última 1 hora)
  const manualOverride = localStorage.getItem('manual_theme_override');
  const manualExpires = localStorage.getItem('manual_theme_expires');
  
  if (manualOverride && manualExpires && Date.now() < parseInt(manualExpires)) {
    aplicarTema(manualOverride);
    console.log(`🎨 Tema manual: ${manualOverride} (override ativo por mais ${Math.round((parseInt(manualExpires) - Date.now()) / 60000)} minutos)`);
    return manualOverride;
  }
  
  // Limpar override expirado
  if (manualExpires && Date.now() > parseInt(manualExpires)) {
    localStorage.removeItem('manual_theme_override');
    localStorage.removeItem('manual_theme_expires');
    console.log('🕐 Override manual expirado, voltando ao automático');
  }
  
  const sunTimes = await fetchSunTimes(lat, lng);
  if (!sunTimes) {
    // Fallback: usar horário do sistema (6h-18h = dia)
    const hour = new Date().getHours();
    const isDaytime = hour >= 6 && hour < 18;
    const theme = isDaytime ? 'light' : 'dark';
    aplicarTema(theme);
    console.log(`🌓 Tema por horário padrão: ${theme} (sem dados do sol)`);
    return theme;
  }
  
  const theme = sunTimes.isDaytime ? 'light' : 'dark';
  aplicarTema(theme);
  
  // Programar próxima troca
  agendarProximaTroca(sunTimes);
  
  console.log(`🌓 Tema automático: ${theme === 'light' ? '☀️ Dia' : '🌙 Noite'}`);
  console.log(`   📅 Nascer do sol: ${sunTimes.sunriseHour} | Pôr do sol: ${sunTimes.sunsetHour}`);
  
  return theme;
}

// Alternar tema manualmente (override por 1 hora)
function toggleThemeManually() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  
  aplicarTema(newTheme);
  
  // Salvar override manual por 1 hora
  localStorage.setItem('manual_theme_override', newTheme);
  localStorage.setItem('manual_theme_expires', (Date.now() + 3600000).toString());
  
  // Limpar timeout agendado
  if (window.themeTimeout) {
    clearTimeout(window.themeTimeout);
    window.themeTimeout = null;
  }
  
  console.log(`🎨 Tema alterado MANUALMENTE para: ${newTheme === 'dark' ? '🌙 Noturno' : '☀️ Claro'} (válido por 1 hora)`);
  
  // Opcional: mostrar toast
  if (typeof window.mostrarToast === 'function') {
    window.mostrarToast(`Tema alterado para ${newTheme === 'dark' ? '🌙 Noturno' : '☀️ Claro'}`, 2000);
  }
}

// Inicializar tema ao carregar (baseado na última preferência)
function inicializarTema() {
  const savedTheme = localStorage.getItem('map_theme');
  const manualOverride = localStorage.getItem('manual_theme_override');
  const manualExpires = localStorage.getItem('manual_theme_expires');
  
  if (manualOverride && manualExpires && Date.now() < parseInt(manualExpires)) {
    aplicarTema(manualOverride);
    console.log(`🎨 Tema inicial (manual override): ${manualOverride}`);
  } else if (savedTheme) {
    aplicarTema(savedTheme);
    console.log(`🎨 Tema inicial (salvo): ${savedTheme}`);
  } else {
    // Fallback: tema claro
    aplicarTema('light');
    console.log(`🎨 Tema inicial (padrão): claro`);
  }
}

// ======================================
// EXPORTAR FUNÇÕES
// ======================================

window.fetchWeather = fetchWeather;
window.updateTemperatureIndicator = updateTemperatureIndicator;
window.getDetailedWeather = getDetailedWeather;
window.fetchSunTimes = fetchSunTimes;
window.aplicarTemaPorHorario = aplicarTemaPorHorario;
window.toggleThemeManually = toggleThemeManually;
window.inicializarTema = inicializarTema;

console.log('✅ Sistema de clima carregado com nova chave API!');
console.log('🌙 Modo noturno automático baseado no nascer/pôr do sol ativado!');
console.log('🗺️ Troca automática do estilo do mapa (Dark/Light) integrada!');