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

let currentRoutes = [];        // Array com todas as rotas
let activeRouteIndex = 0;      // Índice da rota selecionada
let currentMode = "car";        // Modo atual (car/foot/bike)
let currentFrom = null;         // Origem da rota
let currentTo = null;           // Destino da rota
let currentRouteLayers = [];    // Layers das rotas (para controle)

// ======================================
// ESTADO DA NAVEGAÇÃO
// ======================================

let currentNavigation = null;
let navigationInterval = null;
let soundEnabled = true;

// ======================================
// TOGGLE ROUTE PANEL
// ======================================

function toggleRoute() {

  const panel =
    document.getElementById(
      "route-panel"
    );

  if (!panel) return;

  // sincroniza com search.js
  if (
    typeof window.closePanels ===
    "function"
  ) {

    window.closePanels(
      "route-panel"
    );
  }

  const isOpen =
    panel.style.display ===
    "flex";

  panel.style.display =
    isOpen
      ? "none"
      : "flex";
}

window.toggleRoute =
  toggleRoute;

// ======================================
// FECHAR CARD DE ROTA
// ======================================

function closeRouteCard() {
  const panel = document.getElementById("route-panel");
  if (panel) {
    panel.style.display = "none";
  }
}

window.closeRouteCard = closeRouteCard;

// ======================================
// SAIR DO MODO ROTA
// ======================================

function exitRouteMode() {
  // Limpa todas as rotas
  clearAllRoutes();
  
  // Limpa os campos de origem e destino
  const originInput = document.getElementById("route-origin");
  const destInput = document.getElementById("route-destination");
  
  if (originInput) {
    originInput.value = "";
  }
  if (destInput) {
    destInput.value = "";
  }
  
  // Limpa estado
  currentRoutes = [];
  activeRouteIndex = 0;
  currentFrom = null;
  currentTo = null;
  
  // Para navegação se estiver ativa
  if (navigationInterval) {
    clearInterval(navigationInterval);
    navigationInterval = null;
  }
  currentNavigation = null;
  
  // Volta o zoom para a posição atual do usuário
  if (window.locationEngine && window.locationEngine.getPosition) {
    const pos = window.locationEngine.getPosition();
    if (pos && window.map) {
      window.map.setView([pos.lat, pos.lng], 15);
    }
  }
  
  console.log("🚫 Modo rota encerrado - rota limpa");
}

window.exitRouteMode = exitRouteMode;

// ======================================
// LIMPAR TODAS AS ROTAS
// ======================================

function clearAllRoutes() {
  if (window.routeLayer) {
    window.routeLayer.clearLayers();
  }
  
  // Limpar layers salvos
  currentRouteLayers.forEach(layer => {
    if (layer && window.routeLayer) {
      try {
        window.routeLayer.removeLayer(layer);
      } catch(e) {}
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

// ======================================
// FORMATADORES
// ======================================

function formatDistance(meters) {
  meters = Number(meters);
  if (isNaN(meters) || meters <= 0) {
    return "0 m";
  }
  if (meters < 1000) {
    return `${meters.toFixed(0)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatTime(distance, mode) {
  distance = Number(distance);
  if (isNaN(distance) || distance <= 0) {
    return "0 min";
  }
  const speed = SPEEDS[mode] || SPEEDS.car;
  const km = distance / 1000;
  const minutes = Math.max(1, Math.round((km / speed) * 60));
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours}h ${rest}min`;
}

// ======================================
// ESTILO DA ROTA (PRINCIPAL vs ALTERNATIVA) - WEIGHT 9
// ======================================

function getRouteStyle(mode, isAlternative = false) {
  let baseColor, lighterColor;
  
  switch (mode) {
    case "foot":
      baseColor = "#16a34a";      // Verde forte
      lighterColor = "#4ade80";    // Verde médio (mais visível)
      break;
    case "bike":
      baseColor = "#2563eb";      // Azul forte
      lighterColor = "#60a5fa";    // Azul médio (mais visível)
      break;
    default: // car
      baseColor = "#ef4444";      // Vermelho forte
      lighterColor = "#e57373";    // Vermelho médio (mais visível)
  }
  
  if (isAlternative) {
    return {
      color: lighterColor,
      weight: 9,
      opacity: 0.85,
      interactive: true,
      bubblingMouseEvents: true
    };
  }
  
  return {
    color: baseColor,
    weight: 9,
    opacity: 0.9,
    interactive: true,
    bubblingMouseEvents: true
  };
}

// ======================================
// EXTRAIR STEPS DA ROTA (NAVEGAÇÃO)
// ======================================

function extractStepsFromRoute(route, mode) {
  if (!route || !route.legs || !route.legs[0]) return [];
  
  const steps = [];
  let accumulatedDistance = 0;
  
  route.legs[0].steps.forEach((step, idx) => {
    const distance = step.distance;
    accumulatedDistance += distance;
    
    const instrucaoTraduzida = traduzirInstrucao(step);
    
    steps.push({
      id: idx,
      instrucao: instrucaoTraduzida,
      instrucaoOriginal: step.maneuver.instruction,
      distancia: distance,
      distanciaAcumulada: accumulatedDistance,
      distanciaTexto: formatDistance(distance),
      rua: step.name || '',
      action: step.maneuver.type,
      modifier: step.maneuver.modifier,
      location: step.maneuver.location,
      duration: step.duration,
      startLat: step.maneuver.location[1],
      startLng: step.maneuver.location[0]
    });
  });
  
  return steps;
}

function traduzirInstrucao(step) {
  const action = step.maneuver.type;
  const modifier = step.maneuver.modifier;
  const rua = step.name;
  const distance = formatDistance(step.distance);
  
  const traducoes = {
    'depart': '🚗 Sair',
    'turn': '🔀 Virar',
    'continue': '⬆️ Continuar',
    'arrive': '🏁 Chegar',
    'merge': '🔄 Entrar',
    'fork': '🔀 Na bifurcação',
    'roundabout': '🔄 Rotatória',
    'straight': '⬆️ Em frente',
    'end of road': '⬆️ Final da rua'
  };
  
  const modificadores = {
    'left': 'à esquerda',
    'right': 'à direita',
    'slight left': 'levemente à esquerda',
    'slight right': 'levemente à direita',
    'sharp left': 'fechado à esquerda',
    'sharp right': 'fechado à direita',
    'straight': 'em frente'
  };
  
  let acao = traducoes[action] || action;
  let direcao = modificadores[modifier] || '';
  
  if (action === 'arrive') {
    return '🏁 Você chegou ao destino!';
  }
  
  if (action === 'depart') {
    return `🚗 Sair de ${rua || 'sua localização'}`;
  }
  
  if (rua && direcao) {
    return `${acao} ${direcao} na ${rua} (${distance})`;
  }
  
  if (rua) {
    return `${acao} na ${rua} (${distance})`;
  }
  
  return `${acao} ${direcao} (${distance})`;
}

// ======================================
// FUNÇÕES DE NAVEGAÇÃO
// ======================================

function iniciarNavegacao(route, mode, fromLat, fromLng, toLat, toLng) {
  if (currentNavigation) {
    pararNavegacao();
  }
  
  const steps = extractStepsFromRoute(route, mode);
  
  currentNavigation = {
    active: true,
    steps: steps,
    currentStepIndex: 0,
    totalDistance: route.distance,
    totalDuration: route.duration,
    mode: mode,
    origem: { lat: fromLat, lng: fromLng },
    destino: { lat: toLat, lng: toLng },
    inicioTimestamp: Date.now()
  };
  
  // Abrir modal de navegação
  if (typeof window.abrirModalNavegacao === 'function') {
    window.abrirModalNavegacao();
  }
  atualizarModalNavegacao();
  
  // Falar primeira instrução
  if (soundEnabled) {
    falarInstrucao(steps[0]?.instrucao || 'Navegação iniciada');
  }
  
  // Simular progresso (em produção usaria GPS real)
  if (navigationInterval) clearInterval(navigationInterval);
  navigationInterval = setInterval(() => {
    if (!currentNavigation || !currentNavigation.active) return;
    simularProgressoNavegacao();
  }, 5000);
  
  console.log('🧭 Navegação iniciada');
  return currentNavigation;
}

function simularProgressoNavegacao() {
  if (!currentNavigation) return;
  
  if (currentNavigation.currentStepIndex >= currentNavigation.steps.length - 1) {
    finalizarNavegacao();
  } else {
    currentNavigation.currentStepIndex++;
    atualizarModalNavegacao();
    
    const step = currentNavigation.steps[currentNavigation.currentStepIndex];
    if (soundEnabled && step) {
      falarInstrucao(step.instrucao);
    }
  }
}

function pararNavegacao() {
  if (navigationInterval) {
    clearInterval(navigationInterval);
    navigationInterval = null;
  }
  currentNavigation = null;
  if (typeof window.fecharModalNavegacao === 'function') {
    window.fecharModalNavegacao();
  }
  console.log('🧭 Navegação encerrada');
}

function finalizarNavegacao() {
  if (navigationInterval) {
    clearInterval(navigationInterval);
    navigationInterval = null;
  }
  
  if (soundEnabled) {
    falarInstrucao('Você chegou ao seu destino!');
  }
  
  if (typeof window.finalizarModalNavegacao === 'function') {
    window.finalizarModalNavegacao();
  }
  
  currentNavigation = null;
  console.log('🧭 Navegação finalizada - destino alcançado!');
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

function atualizarModalNavegacao() {
  if (!currentNavigation) return;
  
  const nav = currentNavigation;
  const step = nav.steps[nav.currentStepIndex];
  const distanciaRestante = nav.totalDistance - (step?.distanciaAcumulada || 0);
  const progresso = ((nav.currentStepIndex + 1) / nav.steps.length) * 100;
  
  // Atualizar via evento customizado para o modal
  const event = new CustomEvent('navigation-update', {
    detail: {
      step: step,
      distanciaRestante: distanciaRestante,
      distanciaRestanteTexto: formatDistance(distanciaRestante),
      tempoRestante: formatTime(distanciaRestante, nav.mode),
      progresso: Math.round(progresso),
      stepAtual: nav.currentStepIndex + 1,
      totalSteps: nav.steps.length,
      steps: nav.steps
    }
  });
  window.dispatchEvent(event);
}

function reiniciarNavegacao() {
  if (currentNavigation) {
    currentNavigation.currentStepIndex = 0;
    atualizarModalNavegacao();
    if (soundEnabled) {
      falarInstrucao('Navegação reiniciada');
    }
    console.log('🧭 Navegação reiniciada');
  }
}

function toggleSound() {
  soundEnabled = !soundEnabled;
  const status = soundEnabled ? 'ativado' : 'desativado';
  console.log(`🔊 Som ${status}`);
  return soundEnabled;
}

// ======================================
// ATUALIZAR INFORMAÇÕES DA ROTA ATIVA COM BOTÃO DE NAVEGAÇÃO
// ======================================

function updateRouteInfo(route, mode) {
  const info = document.getElementById("route-info");
  if (!info) return;
  
  info.style.display = "block";
  info.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:6px;">
      <div>📏 ${formatDistance(route.distance)}</div>
      <div>⏱ ${formatTime(route.distance, mode)}</div>
      <button id="btn-iniciar-navegacao" style="margin-top: 8px; padding: 8px 16px; background: linear-gradient(135deg, #667eea, #764ba2); border: none; border-radius: 10px; color: white; font-weight: bold; cursor: pointer; transition: transform 0.2s;">
        🧭 Iniciar Navegação
      </button>
    </div>
  `;
  
  const btnNav = document.getElementById('btn-iniciar-navegacao');
  if (btnNav) {
    btnNav.onclick = () => {
      if (currentRoutes && currentRoutes[activeRouteIndex] && currentFrom && currentTo) {
        iniciarNavegacao(
          currentRoutes[activeRouteIndex], 
          mode, 
          currentFrom.lat, 
          currentFrom.lng, 
          currentTo.lat, 
          currentTo.lng
        );
      }
    };
    btnNav.onmouseenter = () => btnNav.style.transform = 'scale(1.02)';
    btnNav.onmouseleave = () => btnNav.style.transform = 'scale(1)';
  }
}

// ======================================
// FUNÇÃO PARA ENQUADRAR TODAS AS ROTAS
// ======================================

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
        if (bounds && bounds.isValid()) {
          allBounds.extend(bounds);
        }
      } catch(e) {
        console.warn("Erro ao calcular bounds da rota:", e);
      }
    }
  });
  
  if (allBounds.isValid()) {
    window.map.fitBounds(allBounds, { padding: [60, 60] });
    console.log("🗺️ Zoom ajustado para enquadrar todas as rotas");
  } else {
    const fallbackBounds = L.latLngBounds([[fromLat, fromLng], [toLat, toLng]]);
    window.map.fitBounds(fallbackBounds, { padding: [60, 60] });
    console.log("🗺️ Zoom ajustado para origem/destino (fallback)");
  }
}

// ======================================
// TROCAR ROTA ATIVA (AO CLICAR)
// ======================================

function switchToRoute(index, mode, fromLat, fromLng, toLat, toLng) {
  if (index === activeRouteIndex) return;
  if (!currentRoutes[index]) return;
  
  console.log(`🔄 Trocando para rota ${index + 1}`);
  
  activeRouteIndex = index;
  const selectedRoute = currentRoutes[index];
  
  redrawAllRoutes(mode, fromLat, fromLng, toLat, toLng);
  updateRouteInfo(selectedRoute, mode);
}

// ======================================
// REDESENHAR TODAS AS ROTAS
// ======================================

function redrawAllRoutes(mode, fromLat, fromLng, toLat, toLng) {
  if (!window.routeLayer) return;
  
  window.routeLayer.clearLayers();
  currentRouteLayers = [];
  
  currentRoutes.forEach((route, idx) => {
    const isAlternative = (idx !== activeRouteIndex);
    const style = getRouteStyle(mode, isAlternative);
    
    const geo = L.geoJSON(route.geometry, { 
      style,
      interactive: true
    });
    
    geo.addTo(window.routeLayer);
    currentRouteLayers.push(geo);
    
    geo.eachLayer(layer => {
      if (layer.feature) {
        layer.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          console.log(`🔘 Clicou na rota ${idx + 1} (${isAlternative ? 'alternativa' : 'principal'})`);
          if (idx !== activeRouteIndex) {
            switchToRoute(idx, mode, fromLat, fromLng, toLat, toLng);
          }
        });
        
        if (isAlternative) {
          layer.on('mouseover', () => {
            layer.setStyle({ weight: 11, opacity: 1 });
          });
          layer.on('mouseout', () => {
            layer.setStyle({ weight: style.weight, opacity: style.opacity });
          });
        }
      }
    });
  });
  
  L.marker([fromLat, fromLng]).addTo(window.routeLayer);
  L.marker([toLat, toLng]).addTo(window.routeLayer);
  
  fitAllRoutesBounds(fromLat, fromLng, toLat, toLng);
}

// ======================================
// NORMALIZAR TEXTO
// ======================================

function normalizeText(text) {
  return (text || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

// ======================================
// VALIDAR COORDENADAS
// ======================================

function isValidCoordinate(lat, lng) {
  return (
    !isNaN(lat) &&
    !isNaN(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
  );
}

// ======================================
// INTEGRAÇÃO COM POIs MANUAIS
// ======================================

window.encontrarPOIManualPorNome = function(texto) {
  if (window.manualPOIs && Array.isArray(window.manualPOIs)) {
    const termo = normalizeText(texto);
    for (const poi of window.manualPOIs) {
      const nomePOI = normalizeText(poi.name);
      if (nomePOI === termo || nomePOI.includes(termo) || termo.includes(nomePOI)) {
        console.log(`📍 Destino encontrado nos POIs manuais: ${poi.name}`);
        return {
          lat: poi.lat,
          lng: poi.lon,
          name: poi.name
        };
      }
    }
  }
  
  if (window.poiLayer && window.poiLayer._layers) {
    const termo = normalizeText(texto);
    const layers = window.poiLayer._layers;
    for (let id in layers) {
      const layer = layers[id];
      if (layer._poiData) {
        const poi = layer._poiData;
        const nomePOI = normalizeText(poi.name);
        if (nomePOI === termo || nomePOI.includes(termo) || termo.includes(nomePOI)) {
          console.log(`📍 Destino encontrado nos POIs do mapa: ${poi.name} (${poi.source || 'poi'})`);
          return {
            lat: poi.lat,
            lng: poi.lng || poi.lon,
            name: poi.name
          };
        }
      }
    }
  }
  
  return null;
};

// ======================================
// RESOLVER LOCALIZAÇÃO
// ======================================

async function resolveText(text) {
  if (!text || typeof text !== "string") {
    return null;
  }
  text = text.trim();
  if (!text) {
    return null;
  }
  const normalized = normalizeText(text);
  
  if (window.selectedDestination &&
    normalizeText(window.selectedDestination.name) === normalized) {
    return {
      lat: Number(window.selectedDestination.lat),
      lng: Number(window.selectedDestination.lng),
      name: window.selectedDestination.name
    };
  }
  
  const poiManual = window.encontrarPOIManualPorNome(text);
  if (poiManual) {
    return poiManual;
  }
  
  if (Array.isArray(window.poiIndex)) {
    let local = window.poiIndex.find(poi => normalizeText(poi.name) === normalized);
    if (!local) {
      local = window.poiIndex.find(poi => normalizeText(poi.name).includes(normalized));
    }
    if (local) {
      const lat = Number(local.lat);
      const lng = Number(local.lng ?? local.lon);
      if (isValidCoordinate(lat, lng)) {
        console.log(`📍 Destino encontrado no poiIndex: ${local.name}`);
        return { lat, lng, name: local.name };
      }
    }
  }
  
  if (window.poiLayer && window.poiLayer._layers) {
    const layers = window.poiLayer._layers;
    for (let id in layers) {
      const layer = layers[id];
      if (layer._poiData) {
        const poi = layer._poiData;
        const nomePOI = normalizeText(poi.name);
        if (nomePOI === normalized || nomePOI.includes(normalized)) {
          const lat = Number(poi.lat);
          const lng = Number(poi.lng || poi.lon);
          if (isValidCoordinate(lat, lng)) {
            console.log(`📍 Destino encontrado no mapa (${poi.source}): ${poi.name}`);
            return { lat, lng, name: poi.name };
          }
        }
      }
    }
  }
  
  if (typeof window.geocode === "function") {
    try {
      const results = await window.geocode(text);
      if (!Array.isArray(results) || results.length === 0) {
        return null;
      }
      const best = results[0];
      const lat = Number(best.lat);
      const lng = Number(best.lng ?? best.lon);
      if (!isValidCoordinate(lat, lng)) {
        return null;
      }
      console.log(`📍 Destino encontrado via geocoding: ${best.name || text}`);
      return { lat, lng, name: best.name || text };
    } catch (err) {
      console.error("Erro geocode:", err);
    }
  }
  
  return null;
}

window.resolveText = resolveText;

// ======================================
// TRAÇAR ROTA
// ======================================

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
  
  if (currentRouteController) {
    currentRouteController.abort();
  }
  currentRouteController = new AbortController();
  
  const profile = mode === "foot" ? "walking" : mode === "bike" ? "cycling" : "driving";
  
  const url = `https://router.project-osrm.org/route/v1/${profile}/` +
    `${fromLng},${fromLat};${toLng},${toLat}` +
    `?alternatives=true&overview=full&geometries=geojson&steps=true`;
  
  try {
    const timeout = setTimeout(() => {
      currentRouteController.abort();
    }, 15000);
    
    const response = await fetch(url, {
      signal: currentRouteController.signal
    });
    
    clearTimeout(timeout);
    
    if (!response.ok) {
      console.error("Erro OSRM:", response.status);
      alert("Erro ao buscar rota");
      return false;
    }
    
    const data = await response.json();
    
    if (!data.routes || !data.routes.length) {
      alert("Rota não encontrada");
      return false;
    }
    
    clearAllRoutes();
    
    currentRoutes = data.routes;
    activeRouteIndex = 0;
    
    console.log(`✅ Encontradas ${currentRoutes.length} rotas alternativas`);
    currentRoutes.forEach((route, idx) => {
      console.log(`  Rota ${idx + 1}: ${formatDistance(route.distance)} • ${formatTime(route.distance, mode)}`);
    });
    
    redrawAllRoutes(mode, fromLat, fromLng, toLat, toLng);
    updateRouteInfo(currentRoutes[0], mode);
    
    return true;
    
  } catch (err) {
    if (err.name === "AbortError") {
      console.log("Rota cancelada");
      return false;
    }
    console.error("Erro rota:", err);
    alert("Erro ao criar rota");
    return false;
  }
}

window.traceRoute = traceRoute;

// ======================================
// CREATE ROUTE
// ======================================

async function createRoute(originText, destinationText, mode = "car") {
  let from = null;
  let to = null;
  
  if (!originText || originText.trim() === "") {
    const pos = window.locationEngine?.getPosition?.();
    if (!pos) {
      alert("GPS indisponível");
      return false;
    }
    from = {
      lat: Number(pos.lat),
      lng: Number(pos.lng),
      name: "Minha localização"
    };
  } else {
    from = await resolveText(originText);
  }
  
  to = await resolveText(destinationText);
  
  if (!from) {
    alert("Origem inválida");
    return false;
  }
  if (!to) {
    alert("Destino inválido");
    return false;
  }
  
  console.log(`🚗 Criando rota de "${from.name}" para "${to.name}" (${mode})`);
  return await traceRoute(from, to, mode);
}

window.createRoute = createRoute;

// ======================================
// ROTA DIRETA
// ======================================

async function routeToPlace(lat, lng, mode = "car") {
  const pos = window.locationEngine?.getPosition?.();
  if (!pos) {
    alert("GPS indisponível");
    return;
  }
  
  if (typeof window.closePanels === "function") {
    window.closePanels("route-panel");
  }
  
  const panel = document.getElementById("route-panel");
  if (panel) {
    panel.style.display = "flex";
  }
  
  const destinationInput = document.getElementById("route-destination");
  if (destinationInput) {
    destinationInput.value = `${lat}, ${lng}`;
  }
  
  await traceRoute(
    { lat: pos.lat, lng: pos.lng },
    { lat, lng },
    mode
  );
}

window.routeToPlace = routeToPlace;
window.clearRoute = clearAllRoutes;

// ======================================
// EXPORTAR FUNÇÕES DE NAVEGAÇÃO
// ======================================

window.iniciarNavegacao = iniciarNavegacao;
window.pararNavegacao = pararNavegacao;
window.reiniciarNavegacao = reiniciarNavegacao;
window.toggleSound = toggleSound;
window.extractStepsFromRoute = extractStepsFromRoute;

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
      console.log(`🚗 Modo selecionado: ${selectedMode}`);
    });
  });
  
  const defaultButton = document.querySelector('.mode-btn[data-mode="car"]');
  if (defaultButton) {
    defaultButton.classList.add("active");
    selectedMode = "car";
  }
  
  btn?.addEventListener("click", async () => {
    const origin = document.getElementById("route-origin")?.value || "";
    const destination = document.getElementById("route-destination")?.value || "";
    
    if (!destination || !destination.trim()) {
      alert("Digite um destino");
      return;
    }
    
    btn.disabled = true;
    const originalText = btn.innerHTML;
    btn.innerHTML = "Calculando...";
    
    try {
      await createRoute(origin, destination, selectedMode);
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  });
  
  console.log("✅ Sistema de rotas OSRM com múltiplas alternativas carregado!");
  console.log("✅ Integração com POIs manuais e sistema de 4 camadas ativa!");
  console.log("🧭 Sistema de navegação turn-by-turn carregado!");
});