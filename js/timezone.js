// ======================================
// TIMEZONE - TimeZoneDB API (gratuita)
// ======================================

// Chave da API (cadastrada em https://timezonedb.com/register)
const TIMEZONE_API_KEY = 'ONZZKUKS1Y8X';

// Buscar horário por coordenadas
async function fetchTimeByCoords(lat, lng) {
  if (!TIMEZONE_API_KEY || TIMEZONE_API_KEY === 'ONZZKUKS1Y8X') {
    console.warn('⚠️ TIMEZONE_API_KEY configurada. Aguardando ativação...');
  }
  
  const url = `https://api.timezonedb.com/v2.1/get-time-zone?key=${TIMEZONE_API_KEY}&format=json&by=position&lat=${lat}&lng=${lng}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Erro na API');
    const data = await response.json();
    if (data.status === 'OK') {
      console.log(`🕐 Horário obtido: ${data.formatted}`);
      return data;
    } else {
      console.error('Erro TimeZoneDB:', data.message);
      return null;
    }
  } catch (err) {
    console.error('Erro ao buscar timezone:', err);
    return null;
  }
}

// Formatar período do dia (manhã, tarde, etc)
function getPeriodOfDay(hour24) {
  if (hour24 >= 0 && hour24 < 6) return "🌙 Madrugada";
  if (hour24 >= 6 && hour24 < 12) return "🌅 Manhã";
  if (hour24 >= 12 && hour24 < 18) return "☀️ Tarde";
  if (hour24 >= 18 && hour24 < 24) return "🌆 Noite";
  return "🕐 Indefinido";
}

// Atualizar indicador de relógio
async function updateClockIndicator(lat, lng) {
  const clockEl = document.getElementById('clock-indicator');
  if (!clockEl) {
    console.warn('⚠️ Elemento clock-indicator não encontrado');
    return;
  }
  
  const timeData = await fetchTimeByCoords(lat, lng);
  if (timeData && timeData.formatted) {
    const date = new Date(timeData.formatted);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const period = getPeriodOfDay(date.getHours());
    clockEl.innerHTML = `🕐 ${hours}:${minutes}`;
    clockEl.title = period;
    console.log(`🕐 Relógio atualizado: ${hours}:${minutes} - ${period}`);
  } else {
    clockEl.innerHTML = `🕐 --:--`;
    console.warn('⚠️ Não foi possível obter o horário');
  }
}

// Buscar horário detalhado para o menu
async function getDetailedTime(lat, lng, userLat = null, userLng = null) {
  const timeData = await fetchTimeByCoords(lat, lng);
  if (!timeData) return null;
  
  const date = new Date(timeData.formatted);
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const period = getPeriodOfDay(hours);
  const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  
  // Nome da cidade/região a partir do zoneName
  let cityName = 'Localização atual';
  if (timeData.zoneName) {
    cityName = timeData.zoneName.split('/').pop().replace(/_/g, ' ');
    // Corrigir abreviações comuns
    cityName = cityName.replace('Sao Paulo', 'São Paulo').replace('Rio Branco', 'Rio Branco');
  }
  
  let userTimeData = null;
  let timeDiff = null;
  let userTimeString = null;
  let userPeriod = null;
  let userCityName = null;
  
  // Se tiver coordenadas do usuário, calcular diferença
  if (userLat && userLng) {
    userTimeData = await fetchTimeByCoords(userLat, userLng);
    if (userTimeData) {
      const userDate = new Date(userTimeData.formatted);
      const userHours = userDate.getHours();
      const userMinutes = userDate.getMinutes();
      userTimeString = `${userHours.toString().padStart(2, '0')}:${userMinutes.toString().padStart(2, '0')}`;
      userPeriod = getPeriodOfDay(userHours);
      
      if (userTimeData.zoneName) {
        userCityName = userTimeData.zoneName.split('/').pop().replace(/_/g, ' ');
        userCityName = userCityName.replace('Sao Paulo', 'São Paulo');
      }
      
      // Calcular diferença em horas
      const diffHours = Math.round((timeData.gmtOffset - userTimeData.gmtOffset) / 3600);
      if (diffHours !== 0) {
        const sign = diffHours > 0 ? '+' : '';
        timeDiff = `${sign}${diffHours} hora${Math.abs(diffHours) !== 1 ? 's' : ''}`;
      } else {
        timeDiff = 'Mesmo horário';
      }
    }
  }
  
  return {
    time: timeString,
    period: period,
    timezone: timeData.zoneName || timeData.abbreviation,
    timestamp: timeData.timestamp,
    utcOffset: timeData.gmtOffset,
    userTime: userTimeString,
    userPeriod: userPeriod,
    timeDiff: timeDiff,
    city: cityName,
    userCity: userCityName || 'Sua localização'
  };
}

// Função para atualizar tudo no menu (quando aberto)
async function updateTimeInMenu(lat, lng) {
  const timeContainer = document.getElementById('time-details');
  if (!timeContainer) return;
  
  // Mostrar loading
  timeContainer.innerHTML = '<div class="time-loading">🕐 Carregando horário...</div>';
  
  // Obter posição do usuário (GPS)
  let userLat = null, userLng = null;
  if (window.locationEngine && window.locationEngine.getPosition) {
    const pos = window.locationEngine.getPosition();
    if (pos) {
      userLat = pos.lat;
      userLng = pos.lng;
    }
  }
  
  const timeData = await getDetailedTime(lat, lng, userLat, userLng);
  
  if (!timeData) {
    timeContainer.innerHTML = '<div class="time-error">❌ Erro ao carregar horário</div>';
    return;
  }
  
  // Montar HTML
  let html = `
    <div class="time-card">
      <div class="time-current">
        <div class="time-current-city">📍 ${timeData.city}</div>
        <div class="time-current-value">${timeData.time}</div>
        <div class="time-current-period">${timeData.period}</div>
        <div class="time-zone" style="font-size: 12px; color: #888; margin-top: 8px;">🌍 ${timeData.timezone || 'Fuso horário local'}</div>
      </div>
  `;
  
  // Se tiver diferença de horário, mostrar
  if (timeData.userTime && timeData.timeDiff) {
    html += `
      <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e0e0e0;">
        <div style="font-size: 13px; color: #666; margin-bottom: 12px;">🆚 Comparação com sua localização</div>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div style="text-align: center; flex: 1;">
            <div style="font-size: 12px; color: #888;">${timeData.userCity || 'Sua localização'}</div>
            <div style="font-size: 20px; font-weight: bold; margin: 4px 0;">${timeData.userTime}</div>
            <div style="font-size: 11px; color: #888;">${timeData.userPeriod}</div>
          </div>
          <div style="font-size: 20px; margin: 0 8px;">→</div>
          <div style="text-align: center; flex: 1;">
            <div style="font-size: 12px; color: #888;">${timeData.city}</div>
            <div style="font-size: 20px; font-weight: bold; margin: 4px 0;">${timeData.time}</div>
            <div style="font-size: 11px; color: #888;">${timeData.period}</div>
          </div>
        </div>
        <div class="time-diff">
          <div class="time-diff-label">⏰ Diferença de fuso</div>
          <div class="time-diff-value">${timeData.timeDiff}</div>
        </div>
      </div>
    `;
  }
  
  html += `</div>`;
  timeContainer.innerHTML = html;
}

// Exportar funções para uso global
window.fetchTimeByCoords = fetchTimeByCoords;
window.getPeriodOfDay = getPeriodOfDay;
window.updateClockIndicator = updateClockIndicator;
window.getDetailedTime = getDetailedTime;
window.updateTimeInMenu = updateTimeInMenu;

console.log('✅ Sistema de horário carregado com chave TimeZoneDB!');