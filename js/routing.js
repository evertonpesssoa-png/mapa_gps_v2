// ======================================
// SISTEMA DE ROTAS COM MAPBOX (TRÂNSITO REAL)
// ======================================

// 🔑 COLOQUE SEU TOKEN DO MAPBOX AQUI:
const MAPBOX_TOKEN = 'pk.eyJ1IjoiZXZlcnRvbnBlc3NvYTg4IiwiYSI6ImNtcGRmMTk5czBiYWEycG9sd2NlZ3RxdWsifQ.W7ayNU1STdXgV-cqNJ1AKA';

const TRANSPORT_MODES = {
  car: { name: 'Carro', icon: '🚗', color: '#ef4444', profile: 'driving-traffic' },
  foot: { name: 'A pé', icon: '🚶', color: '#10b981', profile: 'walking' },
  bike: { name: 'Bicicleta', icon: '🚴', color: '#3b82f6', profile: 'cycling' }
};

let currentRoutes = [];
let selectedRouteIndex = 0;
let routeLayer = null;
let startMarker = null;
let endMarker = null;
let currentDestination = null;
let currentOrigin = null;

// ======================================
// FUNÇÃO DE DISTÂNCIA
// ======================================
function distanceInMeters(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// ======================================
// CALCULAR ROTA COM MAPBOX (TRÂNSITO)
// ======================================
async function calculateRouteMapbox(origin, destination, mode = 'car') {
  if (!MAPBOX_TOKEN || MAPBOX_TOKEN === 'SEU_TOKEN_AQUI') {
    console.error('❌ MAPBOX_TOKEN não configurado!');
    return null;
  }

  const config = TRANSPORT_MODES[mode];
  const url = `https://api.mapbox.com/directions/v5/mapbox/${config.profile}/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?alternatives=true&geometries=geojson&steps=true&access_token=${MAPBOX_TOKEN}`;

  try {
    console.log(`🔄 Calculando rota de ${config.name}...`);
    const response = await fetch(url);
    const data = await response.json();

    if (!data.routes || data.routes.length === 0) return null;

    return data.routes.map((route, idx) => ({
      mode: mode,
      name: config.name,
      icon: config.icon,
      color: idx === 0 ? config.color : '#888888',
      distance: (route.distance / 1000).toFixed(1),
      duration: Math.round(route.duration / 60),
      durationInTraffic: route.duration_in_traffic ? Math.round(route.duration_in_traffic / 60) : Math.round(route.duration / 60),
      geometry: route.geometry,
      steps: route.legs[0]?.steps || [],
      isAlternative: idx > 0
    }));
  } catch (error) {
    console.error(`Erro na rota ${mode}:`, error);
    return null;
  }
}

// ======================================
// CALCULAR TODOS OS MODOS
// ======================================
async function calculateAllRoutes(origin, destination) {
  const modes = ['car', 'foot', 'bike'];
  let allRoutes = [];

  for (const mode of modes) {
    const routes = await calculateRouteMapbox(origin, destination, mode);
    if (routes && routes.length) {
      allRoutes = allRoutes.concat(routes);
    }
  }

  allRoutes.sort((a, b) => a.duration - b.duration);
  return allRoutes;
}

// ======================================
// DESENHAR ROTAS NO MAPA
// ======================================
function drawRoutes(routes, selectedIndex = 0) {
  if (!window.map) return;
  if (routeLayer) window.map.removeLayer(routeLayer);
  routeLayer = L.layerGroup().addTo(window.map);

  routes.forEach((route, idx) => {
    const isSelected = idx === selectedIndex;
    const weight = isSelected ? 6 : 3;
    const opacity = isSelected ? 0.9 : 0.4;
    const dashArray = route.isAlternative ? '5, 10' : null;

    L.geoJSON(route.geometry, {
      color: route.color,
      weight: weight,
      opacity: opacity,
      lineCap: 'round',
      lineJoin: 'round',
      dashArray: dashArray
    }).addTo(routeLayer);
  });

  selectedRouteIndex = selectedIndex;
}

// ======================================
// MOSTRAR PAINEL DE ROTAS
// ======================================
function showRoutesPanel(routes, origin, destination) {
  let panel = document.getElementById('routes-panel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'routes-panel';
    panel.className = 'routes-panel';
    document.body.appendChild(panel);
  }

  if (!routes || routes.length === 0) {
    panel.style.display = 'none';
    return;
  }

  let html = `
    <div class="routes-panel-header">
      <span>🗺️ ${routes.length} rotas disponíveis</span>
      <button onclick="closeRoutesPanel()" class="close-panel">✕</button>
    </div>
    <div class="routes-list">
  `;

  routes.forEach((route, idx) => {
    const isSelected = idx === selectedRouteIndex;
    const trafficInfo = route.durationInTraffic !== route.duration ? ` (🚦 com trânsito: ${route.durationInTraffic}min)` : '';
    
    html += `
      <div class="route-item ${isSelected ? 'selected' : ''}" onclick="selectRoute(${idx})" style="border-left-color: ${route.color}">
        <div class="route-icon">${route.icon}</div>
        <div class="route-details">
          <div class="route-name">${route.name} ${route.isAlternative ? '(alternativa)' : '⭐'}</div>
          <div class="route-stats">📏 ${route.distance} km • ⏱️ ${route.duration} min${trafficInfo}</div>
        </div>
        <div class="route-select-indicator">${isSelected ? '✓' : ''}</div>
      </div>
    `;
  });

  html += `</div>`;
  
  if (origin && destination) {
    html += `
      <div class="routes-summary">
        <div class="summary-origin">📍 ${origin.name || 'Origem'}</div>
        <div class="summary-destination">🏁 ${destination.name || 'Destino'}</div>
      </div>
      <button class="clear-routes-btn" onclick="clearAllRoutes()">🗑️ Limpar rotas</button>
    `;
  }

  panel.innerHTML = html;
  panel.style.display = 'block';
}

// ======================================
// FECHAR PAINEL
// ======================================
window.closeRoutesPanel = function() {
  const panel = document.getElementById('routes-panel');
  if (panel) panel.style.display = 'none';
};

// ======================================
// SELECIONAR ROTA
// ======================================
window.selectRoute = function(index) {
  if (currentRoutes && currentRoutes[index]) {
    selectedRouteIndex = index;
    drawRoutes(currentRoutes, selectedRouteIndex);
    showRoutesPanel(currentRoutes, currentOrigin, currentDestination);
    
    const coords = currentRoutes[index].geometry.coordinates;
    const bounds = L.latLngBounds(coords.map(c => [c[1], c[0]]));
    window.map.fitBounds(bounds, { padding: [50, 50] });
  }
};

// ======================================
// LIMPAR ROTAS
// ======================================
window.clearAllRoutes = function() {
  if (routeLayer) { window.map.removeLayer(routeLayer); routeLayer = null; }
  if (startMarker) { window.map.removeLayer(startMarker); startMarker = null; }
  if (endMarker) { window.map.removeLayer(endMarker); endMarker = null; }
  closeRoutesPanel();
  currentRoutes = [];
  currentDestination = null;
  currentOrigin = null;
  selectedRouteIndex = 0;
  
  const destInput = document.getElementById('route-destination');
  if (destInput) destInput.value = '';
  
  const routeInfo = document.getElementById('route-info');
  if (routeInfo) routeInfo.style.display = 'none';
  
  console.log('🗑️ Todas as rotas limpas');
};

// ======================================
// FUNÇÃO PRINCIPAL - CRIAR ROTA
// ======================================
window.createSmartRoute = async function(originText, destinationText) {
  console.log("🚀 Criando rota para:", destinationText);
  
  // Resolver destino
  let destination = null;
  if (typeof window.geocode === 'function') {
    const results = await window.geocode(destinationText);
    if (results && results.length > 0) {
      destination = { lat: results[0].lat, lng: results[0].lng, name: results[0].name };
    }
  }
  
  if (!destination) {
    alert(`❌ Não encontrei: "${destinationText}"`);
    return null;
  }
  
  // Usar GPS como origem
  const pos = window.locationEngine?.getPosition();
  if (!pos) {
    alert('📍 Ative o GPS para calcular rotas');
    return null;
  }
  
  const origin = { lat: pos.lat, lng: pos.lng, name: 'Sua localização' };
  currentDestination = destination;
  currentOrigin = origin;
  
  // Mostrar loading
  const loading = document.createElement('div');
  loading.className = 'routes-loading';
  loading.innerHTML = '🔄 Calculando rotas com trânsito...';
  document.body.appendChild(loading);
  
  // Calcular rotas
  const routes = await calculateAllRoutes(origin, destination);
  currentRoutes = routes;
  
  loading.remove();
  
  if (!routes || routes.length === 0) {
    alert('❌ Nenhuma rota encontrada');
    return null;
  }
  
  drawRoutes(routes, 0);
  showRoutesPanel(routes, origin, destination);
  
  const bounds = L.latLngBounds(routes[0].geometry.coordinates.map(c => [c[1], c[0]]));
  window.map.fitBounds(bounds, { padding: [50, 50] });
  
  if (startMarker) window.map.removeLayer(startMarker);
  if (endMarker) window.map.removeLayer(endMarker);
  
  startMarker = L.marker([origin.lat, origin.lng], {
    icon: L.divIcon({ html: '📍', className: 'custom-marker', iconSize: [24, 24] })
  }).addTo(window.map).bindPopup(`<b>📍 Origem</b><br>${origin.name}`);
  
  endMarker = L.marker([destination.lat, destination.lng], {
    icon: L.divIcon({ html: '🏁', className: 'custom-marker', iconSize: [24, 24] })
  }).addTo(window.map).bindPopup(`<b>🏁 Destino</b><br>${destination.name}`);
  
  console.log(`✅ ${routes.length} rotas calculadas! Melhor: ${routes[0].duration}min`);
  return routes;
};

// ======================================
// ROTA RÁPIDA (DO BOTÃO DO POI)
// ======================================
window.routeToPlace = function(destLat, destLng, mode = 'car') {
  const pos = window.locationEngine?.getPosition();
  if (!pos) {
    alert('📍 Ative o GPS para traçar rota');
    return;
  }
  createSmartRoute('', `${destLat},${destLng}`);
};

// ======================================
// EVENTOS
// ======================================
document.addEventListener('DOMContentLoaded', () => {
  console.log("🔄 Inicializando eventos de rota...");
  
  // Botão criar rota
  const createRouteBtn = document.getElementById('createRouteBtn');
  if (createRouteBtn) {
    createRouteBtn.addEventListener('click', () => {
      const destInput = document.getElementById('route-destination');
      const destination = destInput?.value.trim();
      if (destination) {
        window.createSmartRoute('', destination);
      } else {
        alert('📍 Digite um destino');
      }
    });
  }
  
  // Enter no campo destino
  const destInput = document.getElementById('route-destination');
  if (destInput) {
    destInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        window.createSmartRoute('', destInput.value.trim());
      }
    });
  }
  
  // Botão limpar rotas
  const clearRouteBtn = document.getElementById('clearRouteBtn');
  if (clearRouteBtn) {
    clearRouteBtn.addEventListener('click', () => {
      window.clearAllRoutes();
    });
  }
  
  console.log("✅ Sistema de rotas Mapbox carregado!");
});