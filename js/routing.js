// ======================================
// SISTEMA DE ROTAS COM MAPBOX (TRÂNSITO REAL)
// ======================================

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
let rerouteInterval = null;
let currentDestination = null;
let currentOrigin = null;

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
    console.log(`🔄 Calculando rota de ${config.name} com trânsito...`);
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

  // Ordenar por duração (menor primeiro)
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
    const opacity = isSelected ? 0.9 : 0.5;
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
    const trafficInfo = route.durationInTraffic !== route.duration ? ` (com trânsito: ${route.durationInTraffic}min)` : '';
    
    html += `
      <div class="route-item ${isSelected ? 'selected' : ''}" onclick="selectRoute(${idx})" style="border-left-color: ${route.color}">
        <div class="route-icon">${route.icon}</div>
        <div class="route-details">
          <div class="route-name">${route.name} ${route.isAlternative ? '(alternativa)' : ''}</div>
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

window.closeRoutesPanel = function() {
  const panel = document.getElementById('routes-panel');
  if (panel) panel.style.display = 'none';
};

window.selectRoute = function(index) {
  if (currentRoutes && currentRoutes[index]) {
    selectedRouteIndex = index;
    drawRoutes(currentRoutes, selectedRouteIndex);
    showRoutesPanel(currentRoutes, currentOrigin, currentDestination);
    
    // Ajustar zoom
    const coords = currentRoutes[index].geometry.coordinates;
    const bounds = L.latLngBounds(coords.map(c => [c[1], c[0]]));
    window.map.fitBounds(bounds, { padding: [50, 50] });
    
    // Mostrar POIs na rota
    showPOIsNearRoute(coords);
  }
};

// ======================================
// POIs PRÓXIMOS À ROTA
// ======================================
function showPOIsNearRoute(routeCoordinates) {
  if (!window.poiIndex || !routeCoordinates) return;
  
  const maxDistance = 300; // metros
  const nearbyPOIs = [];
  
  // Amostrar pontos da rota
  for (let i = 0; i < routeCoordinates.length; i += 15) {
    const coord = routeCoordinates[i];
    const routeLat = coord[1];
    const routeLng = coord[0];
    
    window.poiIndex.forEach(poi => {
      const poiLat = Number(poi.lat);
      const poiLng = Number(poi.lng ?? poi.lon);
      if (isNaN(poiLat) || isNaN(poiLng)) return;
      
      const dist = window.locationEngine.distance(
        { lat: routeLat, lng: routeLng },
        { lat: poiLat, lng: poiLng }
      );
      
      if (dist <= maxDistance && !nearbyPOIs.some(p => p.name === poi.name)) {
        nearbyPOIs.push({ ...poi, distanceToRoute: Math.round(dist) });
      }
    });
  }
  
  if (nearbyPOIs.length > 0) {
    nearbyPOIs.sort((a,b) => a.distanceToRoute - b.distanceToRoute);
    console.log(`📍 ${nearbyPOIs.length} POIs próximos à rota:`, nearbyPOIs.slice(0, 5));
    
    // Opcional: mostrar no painel de rota
    const routeInfo = document.getElementById('route-info');
    if (routeInfo) {
      const topPOIs = nearbyPOIs.slice(0, 3);
      let poiHtml = `<div style="font-size: 11px; margin-top: 8px; border-top: 1px solid #ddd; padding-top: 6px;">📍 No caminho: ${topPOIs.map(p => p.name).join(', ')}</div>`;
      routeInfo.innerHTML += poiHtml;
    }
  }
}

// ======================================
// RE-ROTEAMENTO AUTOMÁTICO
// ======================================
function startRerouteWatcher() {
  if (rerouteInterval) clearInterval(rerouteInterval);
  
  let lastPos = window.locationEngine.getPosition();
  
  rerouteInterval = setInterval(async () => {
    const currentPos = window.locationEngine.getPosition();
    if (!currentPos || !currentDestination || !currentRoutes.length) return;
    
    // Verificar se desviou da rota atual
    const selectedRoute = currentRoutes[selectedRouteIndex];
    if (!selectedRoute) return;
    
    const routeCoords = selectedRoute.geometry.coordinates;
    let minDistance = Infinity;
    
    // Amostrar pontos da rota
    for (let i = 0; i < routeCoords.length; i += 20) {
      const coord = routeCoords[i];
      const dist = window.locationEngine.distance(
        currentPos,
        { lat: coord[1], lng: coord[0] }
      );
      if (dist < minDistance) minDistance = dist;
    }
    
    // Se desviou mais de 150m, recalcular
    if (minDistance > 150) {
      console.log(`🔄 Desvio detectado (${Math.round(minDistance)}m). Recalculando rota...`);
      
      const newRoutes = await calculateAllRoutes(currentPos, currentDestination);
      if (newRoutes && newRoutes.length) {
        currentRoutes = newRoutes;
        drawRoutes(currentRoutes, 0);
        showRoutesPanel(currentRoutes, { name: 'Sua localização', lat: currentPos.lat, lng: currentPos.lng }, currentDestination);
        showPOIsNearRoute(currentRoutes[0].geometry.coordinates);
        
        // Atualizar marcadores
        if (startMarker) startMarker.setLatLng([currentPos.lat, currentPos.lng]);
      }
    }
    
    lastPos = currentPos;
  }, 8000); // Verificar a cada 8 segundos
}

// ======================================
// FUNÇÃO PRINCIPAL - CRIAR ROTA
// ======================================
window.createSmartRoute = async function(originText, destinationText) {
  console.log("🚀 Criando rota inteligente para:", destinationText);
  
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
  
  const pos = window.locationEngine?.getPosition();
  if (!pos) {
    alert('📍 Ative o GPS para calcular rotas');
    return null;
  }
  
  const origin = { lat: pos.lat, lng: pos.lng, name: 'Sua localização' };
  currentDestination = destination;
  currentOrigin = origin;
  
  const loading = document.createElement('div');
  loading.className = 'routes-loading';
  loading.innerHTML = '🔄 Calculando rotas com trânsito em tempo real...';
  document.body.appendChild(loading);
  
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
  
  // Iniciar re-roteamento automático
  startRerouteWatcher();
  
  // Mostrar POIs na rota
  showPOIsNearRoute(routes[0].geometry.coordinates);
  
  console.log(`✅ ${routes.length} rotas calculadas! Melhor: ${routes[0].duration}min (${routes[0].durationInTraffic}min com trânsito)`);
  return routes;
};

window.clearAllRoutes = function() {
  if (routeLayer) { window.map.removeLayer(routeLayer); routeLayer = null; }
  if (startMarker) { window.map.removeLayer(startMarker); startMarker = null; }
  if (endMarker) { window.map.removeLayer(endMarker); endMarker = null; }
  if (rerouteInterval) { clearInterval(rerouteInterval); rerouteInterval = null; }
  closeRoutesPanel();
  currentRoutes = [];
  currentDestination = null;
  currentOrigin = null;
  selectedRouteIndex = 0;
  console.log('🗑️ Todas as rotas foram limpas');
};

window.routeToPlace = function(destLat, destLng, mode = 'car') {
  const pos = window.locationEngine?.getPosition();
  if (!pos) {
    alert('📍 Ative o GPS para traçar rota');
    return;
  }
  createSmartRoute('', `${destLat},${destLng}`);
};

// Estilos CSS
const routesStyles = `
<style>
.routes-panel {
  position: fixed;
  bottom: 20px;
  left: 20px;
  right: 20px;
  max-width: 360px;
  background: rgba(0, 0, 0, 0.95);
  backdrop-filter: blur(15px);
  border-radius: 20px;
  padding: 15px;
  z-index: 10001;
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: white;
  pointer-events: auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
}
.routes-panel-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
  font-weight: bold;
  font-size: 0.85rem;
  color: #aaa;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  padding-bottom: 8px;
}
.close-panel {
  background: none;
  border: none;
  color: #fff;
  font-size: 1.2rem;
  cursor: pointer;
  opacity: 0.7;
}
.routes-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
  max-height: 250px;
  overflow-y: auto;
}
.route-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  cursor: pointer;
  border-left: 3px solid;
}
.route-item:hover {
  background: rgba(255, 255, 255, 0.15);
  transform: translateX(5px);
}
.route-item.selected {
  background: rgba(255, 255, 255, 0.2);
}
.route-icon { font-size: 1.5rem; min-width: 40px; text-align: center; }
.route-details { flex: 1; }
.route-name { font-weight: bold; font-size: 0.85rem; }
.route-stats { font-size: 0.7rem; opacity: 0.7; }
.route-select-indicator { width: 24px; text-align: center; font-size: 1rem; color: #4caf50; }
.routes-summary { font-size: 0.7rem; padding: 8px; background: rgba(255,255,255,0.05); border-radius: 12px; margin: 8px 0; }
.summary-origin { color: #4caf50; margin-bottom: 4px; }
.summary-destination { color: #ff9800; }
.clear-routes-btn {
  width: 100%;
  padding: 10px;
  background: rgba(255, 68, 68, 0.2);
  border: 1px solid #ff4444;
  border-radius: 30px;
  color: #ff4444;
  font-weight: bold;
  cursor: pointer;
}
.routes-loading {
  position: fixed;
  bottom: 100px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0,0,0,0.85);
  backdrop-filter: blur(10px);
  padding: 10px 20px;
  border-radius: 30px;
  color: white;
  z-index: 10002;
}
.custom-marker {
  background: transparent;
  font-size: 24px;
  text-shadow: 0 0 3px rgba(0,0,0,0.5);
}
@media (max-width: 600px) {
  .routes-panel { bottom: 80px; left: 10px; right: 10px; max-width: none; }
}
</style>
`;

if (!document.querySelector('#routes-styles')) {
  const styleTag = document.createElement('style');
  styleTag.id = 'routes-styles';
  styleTag.textContent = routesStyles;
  document.head.appendChild(styleTag);
}

console.log('✅ Sistema de Rotas com Mapbox (trânsito real) carregado!');