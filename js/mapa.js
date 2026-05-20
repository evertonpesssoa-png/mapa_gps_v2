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

  const userIcon = L.divIcon({ className: "user-marker", html: `<div style="width:18px;height:18px;background:#2196f3;border:3px solid white;border-radius:50%;box-shadow:0 0 10px rgba(0,0,0,0.35);"></div>`, iconSize: [18, 18], iconAnchor: [9, 9] });

  map.on("dragstart", () => { if (!isAnimatingMap) autoFollowUser = false; });
  map.on("zoomstart", () => { if (!isAnimatingMap) autoFollowUser = false; });

  // ======================================
  // ANIMAÇÃO CORRIGIDA (SEM TREMOR)
  // ======================================
  function animatedSetView(coords, zoom = null) {
    if (!coords) return;
    if (isAnimatingMap) return; // ← IMPEDE animação duplicada
    
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
    if (isAnimatingMap) return; // ← IMPEDE animação duplicada
    
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

  async function loadNearbyPOIs(lat, lng) {
    if (lastPOILoad) {
      const dist = distanceInMeters(lat, lng, lastPOILoad.lat, lastPOILoad.lng);
      if (dist < 500) return;
    }
    lastPOILoad = { lat, lng };
    if (typeof loadAutoPOIs !== "function") return;
    try {
      console.log("🔄 Atualizando POIs...");
      if (window.autoPOILayer) window.autoPOILayer.clearLayers();
      await loadAutoPOIs(lat, lng, 2000, window.poiLayer);
    } catch (err) { console.error("Erro loadNearbyPOIs:", err); }
  }

  function handlePosition(position) {
    const lat = Number(position.lat), lng = Number(position.lng), accuracy = Number(position.accuracy || 0), heading = Number(position.heading || 0);
    if (isNaN(lat) || isNaN(lng)) return;
    
    if (!userMarker) {
      userMarker = L.marker([lat, lng], { icon: userIcon, zIndexOffset: 9999 }).addTo(window.userLayer);
      userCircle = L.circle([lat, lng], { radius: accuracy, color: "#2196f3", fillColor: "#2196f3", fillOpacity: 0.12, weight: 1 }).addTo(window.userLayer);
      window.userMarker = userMarker;
      if (firstFix) { animatedSetView([lat, lng], 16); firstFix = false; }
    } else {
      userMarker.setLatLng([lat, lng]);
      userCircle.setLatLng([lat, lng]);
      userCircle.setRadius(accuracy);
      if (autoFollowUser && !isAnimatingMap) animatedSetView([lat, lng]);
    }
    loadNearbyPOIs(lat, lng);
  }

  if (window.locationEngine) window.locationEngine.subscribe(handlePosition);
  else console.error("❌ locationEngine não encontrado");

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

  setTimeout(() => {
    if (typeof loadManualPOIs === "function") loadManualPOIs(window.poiLayer);
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

  console.log("🗺️ Mapa inicializado com sucesso (tremedeira corrigida)!");
});