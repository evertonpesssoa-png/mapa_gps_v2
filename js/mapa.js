// ======================================
// MAPA.JS - INICIALIZAÇÃO DO MAPA (CORRIGIDO - SEM TREMOR)
// ======================================

document.addEventListener("DOMContentLoaded", () => {
  const map = L.map("map", { zoomControl: false, preferCanvas: true }).setView([-8.0400, -34.8761], 13);
  window.map = map;

  const lightLayer = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "&copy; OpenStreetMap contributors", maxZoom: 19 });
  const satelliteLayer = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { attribution: "Tiles © Esri", maxZoom: 19 });
  lightLayer.addTo(map);
  L.control.layers({ "🌎 Mapa": lightLayer, "🛰 Satélite": satelliteLayer }, {}, { position: "topright" }).addTo(map);
  L.control.zoom({ position: "bottomright" }).addTo(map);

  window.poiLayer = L.layerGroup().addTo(map);
  window.routeLayer = L.layerGroup().addTo(map);
  window.userLayer = L.layerGroup().addTo(map);

  let userMarker = null, userCircle = null, firstFix = true, autoFollowUser = true, isAnimatingMap = false, animationTimeout = null, lastPOILoad = null;
  let poisLoadingTimeout = null; // Para debounce dos POIs

  const userIcon = L.divIcon({ className: "user-marker", html: `<div style="width:18px;height:18px;background:#2196f3;border:3px solid white;border-radius:50%;box-shadow:0 0 10px rgba(0,0,0,0.35);"></div>`, iconSize: [18, 18], iconAnchor: [9, 9] });

  map.on("dragstart", () => { if (!isAnimatingMap) autoFollowUser = false; });
  map.on("zoomstart", () => { if (!isAnimatingMap) autoFollowUser = false; });

  // ======================================
  // ANIMAÇÃO CORRIGIDA (SEM TREMOR)
  // ======================================
  function animatedSetView(coords, zoom = null) {
    if (!coords) return;
    if (isAnimatingMap) return;
    
    if (animationTimeout) clearTimeout(animationTimeout);
    isAnimatingMap = true;
    
    const targetZoom = zoom !== null ? zoom : map.getZoom();
    map.flyTo(coords, targetZoom, { duration: 0.6 });
    
    animationTimeout = setTimeout(() => { 
      isAnimatingMap = false; 
    }, 800);
  }
  window.animatedSetView = animatedSetView;

  window.smartFitBounds = function(bounds, options = {}) {
    if (!bounds) return;
    if (isAnimatingMap) return;
    
    isAnimatingMap = true;
    map.flyToBounds(bounds, { padding: options.padding || [60, 60], maxZoom: options.maxZoom || 17, duration: 0.8 });
    setTimeout(() => { isAnimatingMap = false; }, 1000);
  };

  function distanceInMeters(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // ======================================
  // FUNÇÃO PARA CRIAR MARCADOR DE POI GENÉRICO
  // ======================================
  function criarMarcadorPOI(poi) {
    // Definir ícone baseado na fonte e categoria
    let iconChar = '📍';
    let bgColor = 'white';
    let borderColor = '#ff4db8';
    
    if (poi.source === 'manual') {
      // POIs manuais têm destaque especial
      borderColor = '#ff4db8';
      bgColor = 'white';
      const iconMap = {
        'hospital': '🏥', 'police': '👮', 'policeman': '🚓',
        'pharmacy': '💊', 'gas': '⛽', 'supermarket': '🛒',
        'home': '🏠', 'mechanic': '🔧', 'medical': '🏥'
      };
      iconChar = poi.icon || iconMap[poi.category] || '📌';
    } else if (poi.source === 'google') {
      borderColor = '#4285f4';
      bgColor = '#e8f0fe';
      iconChar = '🌎';
    } else if (poi.source === 'mapbox') {
      borderColor = '#3b82f6';
      bgColor = '#dbeafe';
      iconChar = '🗺️';
    } else if (poi.source === 'openstreetmap') {
      borderColor = '#22c55e';
      bgColor = '#dcfce7';
      iconChar = poi.icon || '🌿';
    }
    
    const customIcon = L.divIcon({
      className: 'poi-marker',
      html: `<div style="background: ${bgColor}; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.2); border: 2px solid ${borderColor}; font-size: 16px;">${iconChar}</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -16]
    });
    
    const marker = L.marker([poi.lat, poi.lng || poi.lon], { icon: customIcon });
    
    // Criar popup com informações
    const distancia = poi.distance ? `${(poi.distance / 1000).toFixed(1)}km de distância` : '';
    const fonteText = {
      'manual': '📌 Manual (permanente)',
      'google': '🌎 Google Places',
      'mapbox': '🗺️ Mapbox',
      'openstreetmap': '🌿 OpenStreetMap'
    };
    
    marker.bindPopup(`
      <div style="min-width: 180px; max-width: 250px;">
        <strong>${poi.name}</strong><br>
        <span style="color: #666;">📌 ${poi.friendlyCategory || poi.category || 'Ponto de interesse'}</span><br>
        <span style="color: #888; font-size: 11px;">📡 ${fonteText[poi.source] || poi.source}</span>
        ${distancia ? `<br><span style="color: #888; font-size: 11px;">📏 ${distancia}</span>` : ''}
        ${poi.address ? `<br><span style="color: #888; font-size: 11px;">📍 ${poi.address}</span>` : ''}
        ${poi.phone ? `<br><span style="color: #888; font-size: 11px;">📞 ${poi.phone}</span>` : ''}
        ${poi.rating ? `<br><span style="color: #f59e0b; font-size: 11px;">⭐ ${poi.rating} (${poi.userRatingsTotal || 0} avaliações)</span>` : ''}
      </div>
    `);
    
    return marker;
  }

  // ======================================
  // FUNÇÃO PARA CARREGAR POIs COM SISTEMA DE 4 CAMADAS
  // ======================================
  async function loadNearbyPOIs(lat, lng) {
    // Debounce para não chamar muitas vezes
    if (poisLoadingTimeout) clearTimeout(poisLoadingTimeout);
    
    poisLoadingTimeout = setTimeout(async () => {
      try {
        console.log(`🔄 Carregando POIs próximos a ${lat}, ${lng}...`);
        
        // Usar o sistema de 4 camadas se disponível
        if (typeof window.searchPOIs === 'function') {
          const pois = await window.searchPOIs(lat, lng, 'all', 2000);
          
          // Limpar POIs existentes
          if (window.poiLayer) {
            window.poiLayer.clearLayers();
          }
          
          // Adicionar POIs ao mapa
          pois.forEach(poi => {
            const marker = criarMarcadorPOI(poi);
            marker.addTo(window.poiLayer);
          });
          
          console.log(`🗺️ ${pois.length} POIs carregados no mapa (sistema de 4 camadas)`);
        } 
        // Fallback para sistema antigo
        else if (typeof loadAutoPOIs === 'function') {
          if (window.autoPOILayer) window.autoPOILayer.clearLayers();
          await loadAutoPOIs(lat, lng, 2000, window.poiLayer);
        }
        
        lastPOILoad = { lat, lng };
        
      } catch (err) {
        console.error("Erro loadNearbyPOIs:", err);
      }
      
      poisLoadingTimeout = null;
    }, 500); // Aguarda 500ms após última movimentação
  }

  // ======================================
  // ATUALIZAÇÃO DO CLIMA
  // ======================================
  async function updateWeatherFromMap() {
    const center = map.getCenter();
    const lat = center.lat;
    const lng = center.lng;
    
    // Atualizar indicador de temperatura
    if (typeof window.updateTemperatureIndicator === 'function') {
      await window.updateTemperatureIndicator(lat, lng);
    }
    
    // Atualizar indicador de relógio
    if (typeof window.updateClockIndicator === 'function') {
      await window.updateClockIndicator(lat, lng);
    }
    
    // Se o menu estiver aberto, atualizar clima e horário
    const menu = document.getElementById('side-menu');
    if (menu && menu.classList.contains('open')) {
      if (typeof window.updateWeatherInMenu === 'function') {
        await window.updateWeatherInMenu(lat, lng);
      }
      if (typeof window.updateTimeInMenu === 'function') {
        await window.updateTimeInMenu(lat, lng);
      }
    }
  }

  // ======================================
  // EVENTO DE MOVIMENTAÇÃO DO MAPA
  // ======================================
  map.on('moveend', async function() {
    const center = map.getCenter();
    // Atualizar clima e horário
    await updateWeatherFromMap();
    // Atualizar POIs
    await loadNearbyPOIs(center.lat, center.lng);
  });

  // ======================================
  // TROCA DE CAMADA (MAPA/SATÉLITE)
  // ======================================
  function switchMapLayer(layerType) {
    if (!map) return;
    
    const satelliteBtn = document.getElementById('satellite-btn');
    const mapBtn = document.getElementById('map-btn');
    
    if (layerType === 'satellite') {
      map.eachLayer(layer => {
        if (layer instanceof L.TileLayer && layer._url && layer._url.includes('openstreetmap')) {
          map.removeLayer(layer);
        }
        if (layer instanceof L.TileLayer && layer._url && layer._url.includes('World_Imagery')) {
          map.addLayer(layer);
        }
      });
      satelliteBtn?.classList.add('active');
      mapBtn?.classList.remove('active');
      console.log('🛰️ Modo Satélite ativado');
    } else {
      map.eachLayer(layer => {
        if (layer instanceof L.TileLayer && layer._url && layer._url.includes('World_Imagery')) {
          map.removeLayer(layer);
        }
        if (layer instanceof L.TileLayer && layer._url && layer._url.includes('openstreetmap')) {
          map.addLayer(layer);
        }
      });
      mapBtn?.classList.add('active');
      satelliteBtn?.classList.remove('active');
      console.log('🗺️ Modo Mapa ativado');
    }
  }
  window.switchMapLayer = switchMapLayer;

  // ======================================
  // HANDLE POSITION (GPS)
  // ======================================
  function handlePosition(position) {
    const lat = Number(position.lat), lng = Number(position.lng), accuracy = Number(position.accuracy || 0);
    if (isNaN(lat) || isNaN(lng)) return;
    
    if (!userMarker) {
      userMarker = L.marker([lat, lng], { icon: userIcon, zIndexOffset: 9999 }).addTo(window.userLayer);
      userCircle = L.circle([lat, lng], { radius: accuracy, color: "#2196f3", fillColor: "#2196f3", fillOpacity: 0.12, weight: 1 }).addTo(window.userLayer);
      window.userMarker = userMarker;
      if (firstFix) { 
        animatedSetView([lat, lng], 16); 
        firstFix = false;
        // Atualizar clima e POIs na posição inicial
        setTimeout(() => {
          updateWeatherFromMap();
          loadNearbyPOIs(lat, lng);
        }, 500);
      }
    } else {
      userMarker.setLatLng([lat, lng]);
      userCircle.setLatLng([lat, lng]);
      userCircle.setRadius(accuracy);
      if (autoFollowUser && !isAnimatingMap) animatedSetView([lat, lng]);
    }
  }

  if (window.locationEngine) window.locationEngine.subscribe(handlePosition);
  else console.error("❌ locationEngine não encontrado");

  // ======================================
  // FUNÇÕES GLOBAIS
  // ======================================
  window.centerOnUser = function() {
    const pos = window.locationEngine?.getPosition();
    if (!pos) { alert("GPS ainda não disponível"); return; }
    autoFollowUser = true;
    animatedSetView([pos.lat, pos.lng], 17);
  };

  window.reloadNearbyPOIs = async function() {
    const pos = window.locationEngine?.getPosition();
    if (!pos) { alert("GPS indisponível"); return; }
    lastPOILoad = null;
    await loadNearbyPOIs(pos.lat, pos.lng);
  };

  window.viewOnMap = function(lat, lng, zoom = 16) {
    if (isNaN(lat) || isNaN(lng)) return;
    animatedSetView([lat, lng], zoom);
  };

  window.focusPOI = function(poi, zoom = 17) {
    if (!poi) return;
    const lat = Number(poi.lat), lng = Number(poi.lng ?? poi.lon);
    if (isNaN(lat) || isNaN(lng)) return;
    animatedSetView([lat, lng], zoom);
    setTimeout(() => {
      window.poiLayer.eachLayer(layer => {
        if (layer.getLatLng) {
          const p = layer.getLatLng();
          if (Math.abs(p.lat - lat) < 0.00001 && Math.abs(p.lng - lng) < 0.00001 && layer.openPopup) layer.openPopup();
        }
      });
    }, 800);
  };

  // ======================================
  // CARREGAR POIs MANUAIS INICIAIS
  // ======================================
  setTimeout(() => {
    // Se houver POIs manuais, carregar no mapa
    if (typeof window.carregarPOIsManuaisNoMapa === 'function') {
      const center = map.getCenter();
      window.carregarPOIsManuaisNoMapa(center.lat, center.lng, 5000, window.poiLayer);
    } else if (typeof loadManualPOIs === "function") {
      loadManualPOIs(window.poiLayer);
    }
  }, 500);

  // ======================================
  // RESIZE CORRIGIDO (SEM TREMOR)
  // ======================================
  let resizeTimeout = null;
  window.addEventListener("resize", () => {
    if (resizeTimeout) clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => { 
      map.invalidateSize(); 
      resizeTimeout = null; 
    }, 300);
  });

  // ======================================
  // PANELS
  // ======================================
  function closePanels(except = null) {
    ['search-panel', 'action-panel', 'route-panel'].forEach(id => {
      if (id === except) return;
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
  }
  window.closePanels = closePanels;

  window.toggleSearch = function() {
    const panel = document.getElementById('search-panel');
    if (!panel) return;
    if (panel.style.display === 'block') { panel.style.display = 'none'; }
    else { closePanels('search-panel'); panel.style.display = 'block'; document.getElementById('search-input')?.focus(); }
  };

  // ======================================
  // ADICIONAR EVENTOS AOS BOTÕES DE CAMADA
  // ======================================
  setTimeout(() => {
    const satelliteBtn = document.getElementById('satellite-btn');
    const mapBtn = document.getElementById('map-btn');
    
    if (satelliteBtn) {
      satelliteBtn.onclick = () => switchMapLayer('satellite');
    }
    if (mapBtn) {
      mapBtn.onclick = () => switchMapLayer('map');
    }
  }, 500);

  console.log("🗺️ Mapa inicializado com sucesso (tremedeira corrigida)!");
  console.log("🌤️ Sistema de clima integrado ao movimento do mapa!");
  console.log("📍 Sistema de POIs com 4 camadas integrado!");
});