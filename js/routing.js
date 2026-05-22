const SPEEDS = {
  foot: 5,
  bike: 18,
  car: 50
};

// ======================================
// CONTROLE REQUESTS
// ======================================

let currentRouteController = null;

// ======================================
// ESTADO DAS MÚLTIPLAS ROTAS
// ======================================

let currentRoutes = [];
let activeRouteIndex = 0;
let currentMode = "car";
let currentFrom = null;
let currentTo = null;
let currentRouteLayers = [];

// ======================================
// ESTADO DA NAVEGAÇÃO
// ======================================

let isNavigating = false;
let carMarker = null;
let currentStepIndex = 0;
let navigationSteps = [];
let soundEnabled = true;
let currentRouteLine = null;
let watchId = null;
let lastToastTime = 0;

// ======================================
// TOGGLE ROUTE PANEL
// ======================================

function toggleRoute() {
  const panel = document.getElementById("route-panel");
  if (!panel) return;
  if (typeof window.closePanels === "function") {
    window.closePanels("route-panel");
  }
  const isOpen = panel.style.display === "flex";
  panel.style.display = isOpen ? "none" : "flex";
}
window.toggleRoute = toggleRoute;

function closeRouteCard() {
  const panel = document.getElementById("route-panel");
  if (panel) panel.style.display = "none";
}
window.closeRouteCard = closeRouteCard;

function exitRouteMode() {
  clearAllRoutes();
  pararNavegacao();
  
  const originInput = document.getElementById("route-origin");
  const destInput = document.getElementById("route-destination");
  if (originInput) originInput.value = "";
  if (destInput) destInput.value = "";
  
  currentRoutes = [];
  activeRouteIndex = 0;
  currentFrom = null;
  currentTo = null;
  
  if (window.locationEngine && window.locationEngine.getPosition) {
    const pos = window.locationEngine.getPosition();
    if (pos && window.map) {
      window.map.setView([pos.lat, pos.lng], 15);
    }
  }
  console.log("🚫 Modo rota encerrado");
}
window.exitRouteMode = exitRouteMode;

function clearAllRoutes() {
  if (window.routeLayer) window.routeLayer.clearLayers();
  currentRouteLayers.forEach(layer => {
    if (layer && window.routeLayer) {
      try { window.routeLayer.removeLayer(layer); } catch(e) {}
    }
  });
  currentRouteLayers = [];
  const info = document.getElementById("route-info");
  if (info) {
    info.innerHTML = "";
    info.style.display = "none";
  }
}
window.clearAllRoutes = clearAllRoutes;

function formatDistance(meters) {
  meters = Number(meters);
  if (isNaN(meters) || meters <= 0) return "0 m";
  if (meters < 1000) return `${meters.toFixed(0)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatTime(distance, mode) {
  distance = Number(distance);
  if (isNaN(distance) || distance <= 0) return "0 min";
  const speed = SPEEDS[mode] || SPEEDS.car;
  const km = distance / 1000;
  const minutes = Math.max(1, Math.round((km / speed) * 60));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours}h ${rest}min`;
}

function getRouteStyle(mode, isAlternative = false) {
  let baseColor, lighterColor;
  switch (mode) {
    case "foot":
      baseColor = "#16a34a";
      lighterColor = "#4ade80";
      break;
    case "bike":
      baseColor = "#2563eb";
      lighterColor = "#60a5fa";
      break;
    default:
      baseColor = "#ef4444";
      lighterColor = "#e57373";
  }
  if (isAlternative) {
    return { color: lighterColor, weight: 8, opacity: 0.7, interactive: true };
  }
  return { color: baseColor, weight: 12, opacity: 0.9, interactive: true };
}

function mostrarToast(mensagem, duracao = 4000) {
  const now = Date.now();
  if (now - lastToastTime < 3000) return;
  lastToastTime = now;
  
  let toast = document.getElementById('nav-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'nav-toast';
    toast.style.cssText = `
      position: fixed;
      bottom: 120px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0,0,0,0.85);
      backdrop-filter: blur(8px);
      color: white;
      padding: 12px 20px;
      border-radius: 40px;
      font-size: 14px;
      z-index: 20001;
      text-align: center;
      white-space: nowrap;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    `;
    document.body.appendChild(toast);
  }
  toast.innerHTML = mensagem;
  toast.style.display = 'block';
  setTimeout(() => { toast.style.display = 'none'; }, duracao);
}

function falarInstrucao(texto) {
  if (!soundEnabled) return;
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(texto);
    utterance.lang = 'pt-BR';
    utterance.rate = 0.9;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }
}

function criarCarroIcon(rotacao = 0) {
  return L.divIcon({
    html: `<div style="
      background: #2563eb;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.3);
      border: 3px solid white;
      transform: rotate(${rotacao}deg);
      transition: transform 0.3s ease;
    ">🚗</div>`,
    className: 'car-marker',
    iconSize: [40, 40],
    iconAnchor: [20, 20]
  });
}

function extrairSteps(route) {
  if (!route || !route.legs || !route.legs[0]) return [];
  
  const steps = [];
  route.legs[0].steps.forEach((step, idx) => {
    let instrucao = step.maneuver.instruction;
    const action = step.maneuver.type;
    const modifier = step.maneuver.modifier;
    const rua = step.name;
    const distance = step.distance;
    
    if (action === 'arrive') {
      instrucao = '🏁 Você chegou ao destino!';
    } else if (action === 'depart') {
      instrucao = `🚗 Sair de ${rua || 'sua localização'}`;
    } else if (rua) {
      const direcao = { left: 'à esquerda', right: 'à direita', straight: 'em frente' }[modifier] || '';
      instrucao = `🔀 ${direcao} na ${rua}`;
    }
    
    steps.push({
      id: idx,
      instrucao: instrucao,
      distancia: distance,
      distanciaTexto: formatDistance(distance),
      lat: step.maneuver.location[1],
      lng: step.maneuver.location[0],
      rua: rua
    });
  });
  
  return steps;
}

function calcularRotacao(lat1, lng1, lat2, lng2) {
  const angle = Math.atan2(lng2 - lng1, lat2 - lat1) * 180 / Math.PI;
  return angle + 90;
}

function moverCarro(posicao, rotacao) {
  if (!carMarker) return;
  carMarker.setLatLng([posicao.lat, posicao.lng]);
  carMarker.setIcon(criarCarroIcon(rotacao));
}

function verificarProximaInstrucao(posicaoAtual) {
  if (!navigationSteps.length) return;
  
  for (let i = currentStepIndex; i < navigationSteps.length; i++) {
    const step = navigationSteps[i];
    const stepPoint = L.latLng(step.lat, step.lng);
    const distance = stepPoint.distanceTo(L.latLng(posicaoAtual.lat, posicaoAtual.lng));
    
    if (distance < 80 && i >= currentStepIndex) {
      if (i > currentStepIndex || distance < 50) {
        currentStepIndex = i + 1;
        mostrarToast(step.instrucao);
        falarInstrucao(step.instrucao);
      }
      break;
    }
  }
}

function iniciarNavegacaoGPS() {
  if (!navigator.geolocation) {
    console.warn("GPS não suportado");
    return;
  }
  
  const startPoint = currentFrom;
  carMarker = L.marker([startPoint.lat, startPoint.lng], { 
    icon: criarCarroIcon(0)
  }).addTo(window.map);
  
  const bounds = L.latLngBounds([currentFrom.lat, currentFrom.lng], [currentTo.lat, currentTo.lng]);
  window.map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
  
  let lastPosition = null;
  
  watchId = navigator.geolocation.watchPosition(
    (position) => {
      const { latitude, longitude, heading, speed } = position.coords;
      const novaPosicao = { lat: latitude, lng: longitude };
      
      if (lastPosition) {
        let rotacao = heading;
        if (!rotacao || rotacao === 0) {
          rotacao = calcularRotacao(lastPosition.lat, lastPosition.lng, latitude, longitude);
        }
        
        moverCarro(novaPosicao, rotacao);
        verificarProximaInstrucao(novaPosicao);
        
        if (window.map) {
          window.map.setView([latitude, longitude], Math.max(15, window.map.getZoom()));
        }
      }
      
      lastPosition = novaPosicao;
    },
    (error) => {
      console.warn("Erro GPS:", error);
      mostrarToast("⚠️ GPS indisponível. Usando simulação.", 3000);
      simularMovimentoRota();
    },
    { enableHighAccuracy: true, maximumAge: 1000 }
  );
}

function simularMovimentoRota() {
  if (!currentRouteLine) return;
  
  const points = [];
  currentRouteLine.eachLayer(layer => {
    if (layer.feature && layer.feature.geometry) {
      layer.feature.geometry.coordinates.forEach(coord => {
        points.push([coord[1], coord[0]]);
      });
    }
  });
  
  if (points.length === 0) return;
  
  let pointIndex = 0;
  carMarker = L.marker(points[0], { icon: criarCarroIcon(0) }).addTo(window.map);
  
  const bounds = L.latLngBounds(points);
  window.map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
  
  function moverProximo() {
    if (!isNavigating || !carMarker) return;
    
    if (pointIndex < points.length) {
      const ponto = points[pointIndex];
      const nextPoint = points[pointIndex + 1];
      
      let rotacao = 0;
      if (nextPoint) {
        rotacao = calcularRotacao(ponto[0], ponto[1], nextPoint[0], nextPoint[1]);
      }
      
      carMarker.setLatLng(ponto);
      carMarker.setIcon(criarCarroIcon(rotacao));
      verificarProximaInstrucao({ lat: ponto[0], lng: ponto[1] });
      
      if (window.map) {
        window.map.setView(ponto, Math.max(15, window.map.getZoom()));
      }
      
      pointIndex++;
      setTimeout(moverProximo, 1800);
    } else {
      finalizarNavegacao();
    }
  }
  
  moverProximo();
}

function adicionarCardNavegacao() {
  removerCardNavegacao();
  
  const card = document.createElement('div');
  card.id = 'navigation-card';
  card.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: white;
    border-radius: 30px;
    padding: 10px 20px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.25);
    z-index: 20001;
    display: flex;
    gap: 15px;
    align-items: center;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  `;
  
  card.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px;">
      <span style="font-size: 18px;">🧭</span>
      <span style="font-weight: 500; font-size: 13px;">Navegando...</span>
    </div>
    <button id="stop-nav-card-btn" style="
      background: #ef4444;
      color: white;
      border: none;
      border-radius: 30px;
      padding: 6px 16px;
      font-size: 12px;
      font-weight: bold;
      cursor: pointer;
    ">Parar</button>
  `;
  
  document.body.appendChild(card);
  document.getElementById('stop-nav-card-btn').onclick = () => pararNavegacao();
}

function removerCardNavegacao() {
  const card = document.getElementById('navigation-card');
  if (card) card.remove();
}

function finalizarNavegacao() {
  mostrarToast('🏁 Você chegou ao destino!', 5000);
  falarInstrucao('Você chegou ao seu destino!');
  
  if (carMarker && window.map) {
    window.map.removeLayer(carMarker);
    carMarker = null;
  }
  
  isNavigating = false;
  navigationSteps = [];
  removerCardNavegacao();
  console.log('🧭 Navegação finalizada');
}

function pararNavegacao() {
  if (watchId) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
  
  if (carMarker && window.map) {
    window.map.removeLayer(carMarker);
    carMarker = null;
  }
  
  isNavigating = false;
  navigationSteps = [];
  removerCardNavegacao();
  console.log('🧭 Navegação parada');
}

function iniciarNavegacao(route, mode, fromLat, fromLng, toLat, toLng) {
  pararNavegacao();
  
  navigationSteps = extrairSteps(route);
  currentStepIndex = 0;
  isNavigating = true;
  
  currentRouteLine = window.routeLayer;
  adicionarCardNavegacao();
  
  if (navigationSteps.length > 0) {
    setTimeout(() => {
      mostrarToast(navigationSteps[0].instrucao);
      falarInstrucao(navigationSteps[0].instrucao);
    }, 1000);
  }
  
  iniciarNavegacaoGPS();
  console.log('🧭 Navegação iniciada');
}

function updateRouteInfo(route, mode) {
  const info = document.getElementById("route-info");
  if (!info) return;
  
  info.style.display = "block";
  info.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:6px;">
      <div>📏 ${formatDistance(route.distance)}</div>
      <div>⏱ ${formatTime(route.distance, mode)}</div>
      <button id="btn-iniciar-navegacao" style="margin-top: 8px; padding: 8px 16px; background: linear-gradient(135deg, #667eea, #764ba2); border: none; border-radius: 10px; color: white; font-weight: bold; cursor: pointer;">
        🧭 Iniciar Navegação
      </button>
    </div>
  `;
  
  const btnNav = document.getElementById('btn-iniciar-navegacao');
  if (btnNav) {
    btnNav.onclick = () => {
      if (currentRoutes && currentRoutes[activeRouteIndex] && currentFrom && currentTo) {
        iniciarNavegacao(currentRoutes[activeRouteIndex], mode, currentFrom.lat, currentFrom.lng, currentTo.lat, currentTo.lng);
      }
    };
  }
}

function fitAllRoutesBounds(fromLat, fromLng, toLat, toLng) {
  if (!window.map) return;
  const allBounds = L.latLngBounds();
  allBounds.extend([fromLat, fromLng]);
  allBounds.extend([toLat, toLng]);
  
  currentRoutes.forEach(route => {
    if (route.geometry) {
      try {
        const geo = L.geoJSON(route.geometry);
        const bounds = geo.getBounds();
        if (bounds && bounds.isValid()) allBounds.extend(bounds);
      } catch(e) {}
    }
  });
  
  if (allBounds.isValid()) {
    window.map.fitBounds(allBounds, { padding: [50, 50] });
  }
}

function switchToRoute(index, mode, fromLat, fromLng, toLat, toLng) {
  if (index === activeRouteIndex) return;
  if (!currentRoutes[index]) return;
  activeRouteIndex = index;
  redrawAllRoutes(mode, fromLat, fromLng, toLat, toLng);
  updateRouteInfo(currentRoutes[index], mode);
}

function redrawAllRoutes(mode, fromLat, fromLng, toLat, toLng) {
  if (!window.routeLayer) return;
  window.routeLayer.clearLayers();
  currentRouteLayers = [];
  
  currentRoutes.forEach((route, idx) => {
    const isAlternative = (idx !== activeRouteIndex);
    const style = getRouteStyle(mode, isAlternative);
    const geo = L.geoJSON(route.geometry, { style, interactive: true });
    geo.addTo(window.routeLayer);
    currentRouteLayers.push(geo);
    
    geo.eachLayer(layer => {
      if (layer.feature) {
        layer.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          if (idx !== activeRouteIndex) switchToRoute(idx, mode, fromLat, fromLng, toLat, toLng);
        });
      }
    });
  });
  
  L.marker([fromLat, fromLng]).addTo(window.routeLayer);
  L.marker([toLat, toLng]).addTo(window.routeLayer);
  fitAllRoutesBounds(fromLat, fromLng, toLat, toLng);
}

function normalizeText(text) {
  return (text || "").toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function isValidCoordinate(lat, lng) {
  return !isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

window.encontrarPOIManualPorNome = function(texto) {
  if (window.manualPOIs && Array.isArray(window.manualPOIs)) {
    const termo = normalizeText(texto);
    for (const poi of window.manualPOIs) {
      if (normalizeText(poi.name).includes(termo)) {
        return { lat: poi.lat, lng: poi.lon, name: poi.name };
      }
    }
  }
  return null;
};

async function resolveText(text) {
  if (!text || typeof text !== "string") return null;
  text = text.trim();
  if (!text) return null;
  const normalized = normalizeText(text);
  
  if (window.selectedDestination && normalizeText(window.selectedDestination.name) === normalized) {
    return { lat: Number(window.selectedDestination.lat), lng: Number(window.selectedDestination.lng), name: window.selectedDestination.name };
  }
  
  const poiManual = window.encontrarPOIManualPorNome(text);
  if (poiManual) return poiManual;
  
  if (typeof window.geocode === "function") {
    try {
      const results = await window.geocode(text);
      if (Array.isArray(results) && results.length > 0) {
        const best = results[0];
        const lat = Number(best.lat);
        const lng = Number(best.lng ?? best.lon);
        if (isValidCoordinate(lat, lng)) return { lat, lng, name: best.name || text };
      }
    } catch (err) {}
  }
  return null;
}
window.resolveText = resolveText;

async function traceRoute(from, to, mode = "car") {
  if (!window.map || !window.routeLayer) {
    console.error("Mapa ou routeLayer não encontrado");
    return false;
  }
  
  const fromLat = Number(from?.lat);
  const fromLng = Number(from?.lng);
  const toLat = Number(to?.lat);
  const toLng = Number(to?.lng);
  
  if (!isValidCoordinate(fromLat, fromLng) || !isValidCoordinate(toLat, toLng)) {
    alert("Coordenadas inválidas");
    return false;
  }
  
  currentFrom = { lat: fromLat, lng: fromLng };
  currentTo = { lat: toLat, lng: toLng };
  currentMode = mode;
  
  if (currentRouteController) currentRouteController.abort();
  currentRouteController = new AbortController();
  
  const profile = mode === "foot" ? "walking" : mode === "bike" ? "cycling" : "driving";
  const url = `https://router.project-osrm.org/route/v1/${profile}/${fromLng},${fromLat};${toLng},${toLat}?alternatives=true&overview=full&geometries=geojson&steps=true`;
  
  try {
    const timeout = setTimeout(() => currentRouteController.abort(), 15000);
    const response = await fetch(url, { signal: currentRouteController.signal });
    clearTimeout(timeout);
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!data.routes || !data.routes.length) throw new Error("Sem rotas");
    
    clearAllRoutes();
    currentRoutes = data.routes;
    activeRouteIndex = 0;
    
    console.log(`✅ ${currentRoutes.length} rotas encontradas`);
    redrawAllRoutes(mode, fromLat, fromLng, toLat, toLng);
    updateRouteInfo(currentRoutes[0], mode);
    return true;
  } catch (err) {
    console.error("Erro rota:", err);
    alert("Erro ao criar rota");
    return false;
  }
}
window.traceRoute = traceRoute;

async function createRoute(originText, destinationText, mode = "car") {
  let from = null, to = null;
  
  if (!originText || originText.trim() === "") {
    const pos = window.locationEngine?.getPosition?.();
    if (!pos) { alert("GPS indisponível"); return false; }
    from = { lat: Number(pos.lat), lng: Number(pos.lng), name: "Minha localização" };
  } else {
    from = await resolveText(originText);
  }
  
  to = await resolveText(destinationText);
  if (!from || !to) { alert("Local não encontrado"); return false; }
  
  const result = await traceRoute(from, to, mode);
  
  // SALVAR ROTA NO HISTÓRICO
  if (result && currentRoutes && currentRoutes[0] && window.adicionarRotaHistorico) {
    const distancia = formatDistance(currentRoutes[0].distance);
    const tempo = formatTime(currentRoutes[0].distance, mode);
    window.adicionarRotaHistorico(from, to, distancia, tempo, mode);
  }
  
  return result;
}
window.createRoute = createRoute;

async function routeToPlace(lat, lng, mode = "car") {
  const pos = window.locationEngine?.getPosition?.();
  if (!pos) { alert("GPS indisponível"); return; }
  if (typeof window.closePanels === "function") window.closePanels("route-panel");
  const panel = document.getElementById("route-panel");
  if (panel) panel.style.display = "flex";
  const destinationInput = document.getElementById("route-destination");
  if (destinationInput) destinationInput.value = `${lat}, ${lng}`;
  await traceRoute({ lat: pos.lat, lng: pos.lng }, { lat, lng }, mode);
}
window.routeToPlace = routeToPlace;
window.clearRoute = clearAllRoutes;

window.pararNavegacao = pararNavegacao;
window.toggleSound = function() { soundEnabled = !soundEnabled; console.log(`🔊 Som ${soundEnabled ? 'ativado' : 'desativado'}`); };

// ======================================
// EVENTS
// ======================================

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("createRouteBtn");
  const modeButtons = document.querySelectorAll(".mode-btn");
  let selectedMode = "car";
  
  modeButtons.forEach(button => {
    button.addEventListener("click", () => {
      modeButtons.forEach(b => b.classList.remove("active"));
      button.classList.add("active");
      selectedMode = button.dataset.mode;
      console.log(`🚗 Modo: ${selectedMode}`);
    });
  });
  
  const defaultButton = document.querySelector('.mode-btn[data-mode="car"]');
  if (defaultButton) defaultButton.classList.add("active");
  
  btn?.addEventListener("click", async () => {
    const origin = document.getElementById("route-origin")?.value || "";
    const destination = document.getElementById("route-destination")?.value || "";
    if (!destination?.trim()) { alert("Digite um destino"); return; }
    btn.disabled = true;
    btn.innerHTML = "Calculando...";
    try {
      await createRoute(origin, destination, selectedMode);
    } finally {
      btn.disabled = false;
      btn.innerHTML = "Criar rota";
    }
  });
  
  console.log("✅ Sistema de rotas OSRM com navegação nível Google Maps carregado!");
  console.log("📍 Use GPS real para seguir sua localização!");
  console.log("📜 Rotas são salvas automaticamente no histórico!");
});