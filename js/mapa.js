// ======================================
// MAPA.JS - INICIALIZAÇÃO DO MAPA (CORRIGIDO - SEM TREMOR)
// ======================================

document.addEventListener("DOMContentLoaded", () => {
  const map = L.map("map", { zoomControl: false, preferCanvas: true }).setView([-8.0400, -34.8761], 13);
  window.map = map;

  // ======================================
  // ESTILOS DE MAPA DO MAPBOX (CLARO/ESCURO)
  // ======================================
  
  let currentMapLayer = null;
  let darkMapLayer = null;
  let lightMapLayer = null;
  let satelliteLayer = null;
  
  // Estilo claro do Mapbox (Streets)
  function criarMapaLight() {
    if (!window.MAPBOX_TOKEN) return null;
    return L.tileLayer(`https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/{z}/{x}/{y}?access_token=${window.MAPBOX_TOKEN}`, {
      attribution: '© <a href="https://www.mapbox.com/about/maps/">Mapbox</a>',
      maxZoom: 19,
      tileSize: 512,
      zoomOffset: -1
    });
  }
  
  // Estilo escuro do Mapbox (Dark)
  function criarMapaDark() {
    if (!window.MAPBOX_TOKEN) return null;
    return L.tileLayer(`https://api.mapbox.com/styles/v1/mapbox/dark-v11/tiles/{z}/{x}/{y}?access_token=${window.MAPBOX_TOKEN}`, {
      attribution: '© <a href="https://www.mapbox.com/about/maps/">Mapbox</a>',
      maxZoom: 19,
      tileSize: 512,
      zoomOffset: -1
    });
  }
  
  // Camada de satélite (Esri)
  function criarSatellite() {
    return L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { 
      attribution: "Tiles © Esri",
      maxZoom: 19 
    });
  }
  
  // Função para trocar o estilo do mapa base
  function trocarEstiloMapa(theme) {
    const isDark = theme === 'dark';
    const novoLayer = isDark ? darkMapLayer : lightMapLayer;
    const oldLayer = isDark ? lightMapLayer : darkMapLayer;
    
    if (!novoLayer) return;
    
    // Remover a camada antiga
    if (oldLayer && window.map.hasLayer(oldLayer)) {
      window.map.removeLayer(oldLayer);
    }
    
    // Adicionar a nova camada
    if (!window.map.hasLayer(novoLayer)) {
      novoLayer.addTo(window.map);
    }
    
    currentMapLayer = novoLayer;
    console.log(`🗺️ Estilo do mapa alterado para: ${isDark ? '🌙 Noturno (Dark)' : '☀️ Claro (Light)'}`);
  }
  
  // Inicializar os estilos de mapa
  function inicializarEstilosMapa() {
    lightMapLayer = criarMapaLight();
    darkMapLayer = criarMapaDark();
    satelliteLayer = criarSatellite();
    
    // Começar com o estilo claro
    if (lightMapLayer) {
      lightMapLayer.addTo(map);
      currentMapLayer = lightMapLayer;
    }
    
    console.log('✅ Estilos de mapa (Claro/Escuro/Satélite) inicializados');
  }
  
  // Trocar para modo satélite
  function trocarParaSatelite() {
    if (!satelliteLayer) return;
    
    if (currentMapLayer && map.hasLayer(currentMapLayer)) {
      map.removeLayer(currentMapLayer);
    }
    if (!map.hasLayer(satelliteLayer)) {
      satelliteLayer.addTo(map);
    }
    currentMapLayer = satelliteLayer;
    console.log('🛰️ Modo Satélite ativado');
  }
  
  // Trocar para modo mapa (claro/escuro baseado no tema)
  function trocarParaMapa() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const isDark = currentTheme === 'dark';
    const mapaLayer = isDark ? darkMapLayer : lightMapLayer;
    
    if (!mapaLayer) return;
    
    if (currentMapLayer && map.hasLayer(currentMapLayer)) {
      map.removeLayer(currentMapLayer);
    }
    if (!map.hasLayer(mapaLayer)) {
      mapaLayer.addTo(map);
    }
    currentMapLayer = mapaLayer;
    console.log(`🗺️ Modo Mapa ativado (${isDark ? 'Dark' : 'Light'})`);
  }
  
  // Atualizar estilo do mapa baseado no tema (chamado pelo weather.js)
  function atualizarEstiloMapaPorTema(theme) {
    // Só troca se o modo atual for mapa (não satélite)
    const isSatelliteMode = currentMapLayer === satelliteLayer;
    if (!isSatelliteMode) {
      trocarEstiloMapa(theme);
    }
  }
  
  // Configurar controles de camada personalizados
  function configurarControlesCamada() {
    const satelliteBtn = document.getElementById('satellite-btn');
    const mapBtn = document.getElementById('map-btn');
    
    if (satelliteBtn) {
      satelliteBtn.onclick = () => {
        trocarParaSatelite();
        satelliteBtn.classList.add('active');
        if (mapBtn) mapBtn.classList.remove('active');
      };
    }
    if (mapBtn) {
      mapBtn.onclick = () => {
        trocarParaMapa();
        mapBtn.classList.add('active');
        if (satelliteBtn) satelliteBtn.classList.remove('active');
      };
    }
  }

  window.poiLayer = L.layerGroup().addTo(map);
  window.routeLayer = L.layerGroup().addTo(map);
  window.userLayer = L.layerGroup().addTo(map);

  let userMarker = null, userCircle = null, firstFix = true, autoFollowUser = true, isAnimatingMap = false, animationTimeout = null, lastPOILoad = null;
  let poisLoadingTimeout = null;

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
    let iconChar = '📍';
    let bgColor = 'white';
    let borderColor = '#ff4db8';
    
    if (poi.source === 'manual') {
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
        <span style="color: var(--text-secondary, #666);">📌 ${poi.friendlyCategory || poi.category || 'Ponto de interesse'}</span><br>
        <span style="color: var(--text-tertiary, #888); font-size: 11px;">📡 ${fonteText[poi.source] || poi.source}</span>
        ${distancia ? `<br><span style="color: var(--text-tertiary, #888); font-size: 11px;">📏 ${distancia}</span>` : ''}
        ${poi.address ? `<br><span style="color: var(--text-tertiary, #888); font-size: 11px;">📍 ${poi.address}</span>` : ''}
        ${poi.phone ? `<br><span style="color: var(--text-tertiary, #888); font-size: 11px;">📞 ${poi.phone}</span>` : ''}
        ${poi.rating ? `<br><span style="color: #f59e0b; font-size: 11px;">⭐ ${poi.rating} (${poi.userRatingsTotal || 0} avaliações)</span>` : ''}
      </div>
    `);
    
    return marker;
  }

  // ======================================
  // FUNÇÃO PARA CARREGAR POIs COM SISTEMA DE 4 CAMADAS
  // ======================================
  async function loadNearbyPOIs(lat, lng) {
    if (poisLoadingTimeout) clearTimeout(poisLoadingTimeout);
    
    poisLoadingTimeout = setTimeout(async () => {
      try {
        console.log(`🔄 Carregando POIs próximos a ${lat}, ${lng}...`);
        
        if (typeof window.searchPOIs === 'function') {
          const pois = await window.searchPOIs(lat, lng, 'all', 2000);
          
          if (window.poiLayer) {
            window.poiLayer.clearLayers();
          }
          
          pois.forEach(poi => {
            const marker = criarMarcadorPOI(poi);
            marker.addTo(window.poiLayer);
          });
          
          console.log(`🗺️ ${pois.length} POIs carregados no mapa (sistema de 4 camadas)`);
        } 
        else if (typeof loadAutoPOIs === 'function') {
          if (window.autoPOILayer) window.autoPOILayer.clearLayers();
          await loadAutoPOIs(lat, lng, 2000, window.poiLayer);
        }
        
        lastPOILoad = { lat, lng };
        
      } catch (err) {
        console.error("Erro loadNearbyPOIs:", err);
      }
      
      poisLoadingTimeout = null;
    }, 500);
  }

  // ======================================
  // ATUALIZAÇÃO DO CLIMA
  // ======================================
  async function updateWeatherFromMap() {
    const center = map.getCenter();
    const lat = center.lat;
    const lng = center.lng;
    
    if (typeof window.updateTemperatureIndicator === 'function') {
      await window.updateTemperatureIndicator(lat, lng);
    }
    
    if (typeof window.updateClockIndicator === 'function') {
      await window.updateClockIndicator(lat, lng);
    }
    
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
  // EVENTO DE MOVIMENTAÇÃO DO MAPA (COM TEMA AUTOMÁTICO)
  // ======================================
  map.on('moveend', async function() {
    const center = map.getCenter();
    const lat = center.lat;
    const lng = center.lng;
    
    await updateWeatherFromMap();
    await loadNearbyPOIs(lat, lng);
    
    if (typeof window.aplicarTemaPorHorario === 'function') {
      await window.aplicarTemaPorHorario(lat, lng);
    }
  });

  // ======================================
  // TROCA DE CAMADA (MAPA/SATÉLITE) - VERSÃO ATUALIZADA
  // ======================================
  function switchMapLayer(layerType) {
    if (!map) return;
    
    if (layerType === 'satellite') {
      trocarParaSatelite();
    } else {
      trocarParaMapa();
    }
  }
  window.switchMapLayer = switchMapLayer;

  // ======================================
  // CAMADA DE TRÂNSITO
  // ======================================

  let trafficLayer = null;

  function adicionarCamadaTransito() {
    if (!window.map || !window.MAPBOX_TOKEN) {
      console.warn('⚠️ Mapa ou token Mapbox não disponível');
      return;
    }
    
    const trafficUrl = `https://api.mapbox.com/v4/mapbox.mapbox-traffic-v1/{z}/{x}/{y}.png?access_token=${window.MAPBOX_TOKEN}`;
    
    trafficLayer = L.tileLayer(trafficUrl, {
      opacity: 0.7,
      attribution: '© <a href="https://www.mapbox.com/about/maps/">Mapbox</a>',
      maxZoom: 19
    });
    
    console.log('✅ Camada de trânsito pronta');
  }

  function ativarTransito() {
    if (!trafficLayer) {
      adicionarCamadaTransito();
    }
    if (trafficLayer && !map.hasLayer(trafficLayer)) {
      trafficLayer.addTo(map);
      const btn = document.getElementById('btn-transito');
      if (btn) btn.classList.add('active');
      console.log('🚦 Trânsito ativado');
      return true;
    }
    return false;
  }

  function desativarTransito() {
    if (trafficLayer && map.hasLayer(trafficLayer)) {
      map.removeLayer(trafficLayer);
      const btn = document.getElementById('btn-transito');
      if (btn) btn.classList.remove('active');
      console.log('🚦 Trânsito desativado');
      return true;
    }
    return false;
  }

  function toggleTransito() {
    if (trafficLayer && map.hasLayer(trafficLayer)) {
      return desativarTransito();
    } else {
      return ativarTransito();
    }
  }

  window.ativarTransito = ativarTransito;
  window.desativarTransito = desativarTransito;
  window.toggleTransito = toggleTransito;

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
        setTimeout(() => {
          updateWeatherFromMap();
          loadNearbyPOIs(lat, lng);
          if (typeof window.aplicarTemaPorHorario === 'function') {
            window.aplicarTemaPorHorario(lat, lng);
          }
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
  // ADICIONAR BOTÃO DE TRÂNSITO
  // ======================================
  function adicionarBotaoTransito() {
    const mapControls = document.querySelector('.map-controls');
    if (!mapControls || document.getElementById('btn-transito')) return;
    
    const btn = document.createElement('button');
    btn.id = 'btn-transito';
    btn.className = 'control-btn';
    btn.innerHTML = '🚦';
    btn.title = 'Ativar/Desativar trânsito';
    btn.onclick = () => toggleTransito();
    mapControls.appendChild(btn);
    console.log('✅ Botão de trânsito adicionado');
  }

  // ======================================
  // ADICIONAR EVENTOS AOS BOTÕES DE CAMADA
  // ======================================
  setTimeout(() => {
    configurarControlesCamada();
    adicionarBotaoTransito();
  }, 500);

  // ======================================
  // INICIALIZAR ESTILOS DE MAPA E TEMA
  // ======================================
  
  // Inicializar estilos de mapa (Mapbox Light/Dark e Satélite)
  inicializarEstilosMapa();
  
  // Inicializar tema automático (chamado pelo weather.js)
  if (typeof window.inicializarTema === 'function') {
    window.inicializarTema();
  }
  
  // Exportar função para troca de estilo do mapa
  window.atualizarEstiloMapaPorTema = atualizarEstiloMapaPorTema;

  // Inicializar camada de trânsito (sem ativar)
  adicionarCamadaTransito();

  console.log("🗺️ Mapa inicializado com sucesso (tremedeira corrigida)!");
  console.log("🌤️ Sistema de clima integrado ao movimento do mapa!");
  console.log("📍 Sistema de POIs com 4 camadas integrado!");
  console.log("🚦 Botão de trânsito disponível!");
  console.log("🌙 Modo noturno automático ativado (Mapbox Dark/Light)!");
});