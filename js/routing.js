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
// NAVEGAÇÃO NÍVEL GOOGLE MAPS
// ======================================

let carMarker = null;
let navigationAnimationId = null;
let currentRoutePoints = [];
let currentPositionIndex = 0;
let lastGPSPosition = null;
let isFollowingUser = true;
let navigationWatchId = null;

// Criar ícone do carro animado
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

// Extrair pontos da rota para animação
function extractRoutePoints(geometry) {
    const points = [];
    if (geometry && geometry.type === 'LineString') {
        geometry.coordinates.forEach(coord => {
            points.push([coord[1], coord[0]]); // [lat, lng]
        });
    }
    return points;
}

// Calcular rotação entre dois pontos
function calcularRotacao(lat1, lng1, lat2, lng2) {
    const angle = Math.atan2(lng2 - lng1, lat2 - lat1) * 180 / Math.PI;
    return angle + 90;
}

// Mover carro com animação suave
function animarCarroPara(pontoDestino, duracao = 1000, rotacaoFinal = null) {
    if (!carMarker) return;
    
    const pontoAtual = carMarker.getLatLng();
    const startTime = performance.now();
    
    function animar(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duracao, 1);
        
        const lat = pontoAtual.lat + (pontoDestino.lat - pontoAtual.lat) * progress;
        const lng = pontoAtual.lng + (pontoDestino.lng - pontoAtual.lng) * progress;
        
        carMarker.setLatLng([lat, lng]);
        
        if (rotacaoFinal !== null) {
            const rotacaoAtual = progress * rotacaoFinal;
            carMarker.setIcon(criarCarroIcon(rotacaoAtual));
        }
        
        if (progress < 1) {
            navigationAnimationId = requestAnimationFrame(animar);
        } else {
            navigationAnimationId = null;
            if (rotacaoFinal !== null) {
                carMarker.setIcon(criarCarroIcon(rotacaoFinal));
            }
        }
    }
    
    if (navigationAnimationId) {
        cancelAnimationFrame(navigationAnimationId);
    }
    navigationAnimationId = requestAnimationFrame(animar);
}

// Seguir o carro com o mapa
function seguirCarro() {
    if (!isFollowingUser || !carMarker) return;
    const pos = carMarker.getLatLng();
    if (window.map) {
        window.map.panTo(pos);
    }
}

// Atualizar instrução baseada na posição
function atualizarInstrucaoPorPosicao(posicaoAtual) {
    if (!currentNavigation || !currentNavigation.steps) return;
    
    let closestStep = null;
    let closestDistance = Infinity;
    
    currentNavigation.steps.forEach((step, idx) => {
        const stepPoint = L.latLng(step.startLat, step.startLng);
        const distance = posicaoAtual.distanceTo(stepPoint);
        if (distance < closestDistance) {
            closestDistance = distance;
            closestStep = idx;
        }
    });
    
    if (closestStep !== null && closestStep !== currentNavigation.currentStepIndex) {
        currentNavigation.currentStepIndex = closestStep;
        atualizarModalNavegacao();
        
        const step = currentNavigation.steps[closestStep];
        if (soundEnabled && step) {
            falarInstrucao(step.instrucao);
        }
    }
}

// Iniciar navegação com GPS real
function iniciarNavegacaoGPS() {
    if (!currentNavigation) return;
    
    // Criar marcador do carro no início da rota
    const startPoint = currentNavigation.origem;
    carMarker = L.marker([startPoint.lat, startPoint.lng], {
        icon: criarCarroIcon(0)
    }).addTo(window.map);
    
    // Extrair pontos da rota atual
    const currentRoute = currentRoutes[activeRouteIndex];
    if (currentRoute && currentRoute.geometry) {
        currentRoutePoints = extractRoutePoints(currentRoute.geometry);
        currentPositionIndex = 0;
    }
    
    // Iniciar acompanhamento GPS
    if (navigator.geolocation) {
        navigationWatchId = navigator.geolocation.watchPosition(
            (position) => {
                const { latitude, longitude, heading, speed } = position.coords;
                const novaPosicao = L.latLng(latitude, longitude);
                
                if (lastGPSPosition) {
                    const rotacao = heading || calcularRotacao(
                        lastGPSPosition.lat, lastGPSPosition.lng,
                        latitude, longitude
                    );
                    
                    animarCarroPara(novaPosicao, 500, rotacao);
                    atualizarInstrucaoPorPosicao(novaPosicao);
                    
                    if (isFollowingUser) {
                        window.map.panTo(novaPosicao);
                    }
                }
                
                lastGPSPosition = novaPosicao;
            },
            (error) => {
                console.warn('Erro GPS:', error);
                simularMovimentoNaRota();
            },
            { enableHighAccuracy: true, maximumAge: 5000 }
        );
    } else {
        simularMovimentoNaRota();
    }
}

// Simular movimento na rota (fallback)
function simularMovimentoNaRota() {
    if (!currentRoutePoints.length || !carMarker) return;
    
    let pointIndex = 0;
    
    function moverProximoPonto() {
        if (!currentNavigation || !currentNavigation.active) return;
        
        if (pointIndex < currentRoutePoints.length) {
            const ponto = currentRoutePoints[pointIndex];
            const nextPoint = currentRoutePoints[pointIndex + 1];
            
            let rotacao = 0;
            if (nextPoint) {
                rotacao = calcularRotacao(ponto[0], ponto[1], nextPoint[0], nextPoint[1]);
            }
            
            animarCarroPara(L.latLng(ponto[0], ponto[1]), 1500, rotacao);
            atualizarInstrucaoPorPosicao(L.latLng(ponto[0], ponto[1]));
            
            if (isFollowingUser && window.map) {
                window.map.panTo([ponto[0], ponto[1]]);
            }
            
            pointIndex++;
            setTimeout(moverProximoPonto, 2000);
        } else {
            finalizarNavegacao();
        }
    }
    
    moverProximoPonto();
}

// Parar navegação completa
function pararNavegacaoCompleta() {
    if (navigationWatchId) {
        navigator.geolocation.clearWatch(navigationWatchId);
        navigationWatchId = null;
    }
    
    if (navigationAnimationId) {
        cancelAnimationFrame(navigationAnimationId);
        navigationAnimationId = null;
    }
    
    if (carMarker && window.map) {
        window.map.removeLayer(carMarker);
        carMarker = null;
    }
    
    if (navigationInterval) {
        clearInterval(navigationInterval);
        navigationInterval = null;
    }
    
    currentRoutePoints = [];
    currentPositionIndex = 0;
    lastGPSPosition = null;
    currentNavigation = null;
    
    if (typeof window.fecharModalNavegacao === 'function') {
        window.fecharModalNavegacao();
    }
    
    console.log('🧭 Navegação encerrada');
}

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

// ======================================
// FECHAR CARD DE ROTA
// ======================================

function closeRouteCard() {
  const panel = document.getElementById("route-panel");
  if (panel) panel.style.display = "none";
}
window.closeRouteCard = closeRouteCard;

// ======================================
// SAIR DO MODO ROTA
// ======================================

function exitRouteMode() {
  clearAllRoutes();
  
  const originInput = document.getElementById("route-origin");
  const destInput = document.getElementById("route-destination");
  
  if (originInput) originInput.value = "";
  if (destInput) destInput.value = "";
  
  currentRoutes = [];
  activeRouteIndex = 0;
  currentFrom = null;
  currentTo = null;
  
  pararNavegacaoCompleta();
  
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

// ======================================
// ESTILO DA ROTA (PRINCIPAL vs ALTERNATIVA)
// ======================================

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
// EXTRAIR STEPS DA ROTA
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
  
  if (action === 'arrive') return '🏁 Você chegou ao destino!';
  if (action === 'depart') return `🚗 Sair de ${rua || 'sua localização'}`;
  if (rua && direcao) return `${acao} ${direcao} na ${rua} (${distance})`;
  if (rua) return `${acao} na ${rua} (${distance})`;
  return `${acao} ${direcao} (${distance})`;
}

// ======================================
// FUNÇÕES DE NAVEGAÇÃO
// ======================================

function iniciarNavegacao(route, mode, fromLat, fromLng, toLat, toLng) {
  if (currentNavigation) pararNavegacaoCompleta();
  
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
  
  if (typeof window.abrirModalNavegacao === 'function') {
    window.abrirModalNavegacao();
  }
  atualizarModalNavegacao();
  
  if (soundEnabled) {
    falarInstrucao(steps[0]?.instrucao || 'Navegação iniciada');
  }
  
  // Iniciar navegação com GPS
  setTimeout(() => iniciarNavegacaoGPS(), 500);
  
  console.log('🧭 Navegação iniciada');
  return currentNavigation;
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

function finalizarNavegacao() {
  if (soundEnabled) falarInstrucao('Você chegou ao seu destino!');
  if (typeof window.finalizarModalNavegacao === 'function') {
    window.finalizarModalNavegacao();
  }
  currentNavigation = null;
  console.log('🧭 Navegação finalizada - destino alcançado!');
}

function reiniciarNavegacao() {
  if (currentNavigation) {
    currentNavigation.currentStepIndex = 0;
    atualizarModalNavegacao();
    if (soundEnabled) falarInstrucao('Navegação reiniciada');
  }
}

function toggleSound() {
  soundEnabled = !soundEnabled;
  console.log(`🔊 Som ${soundEnabled ? 'ativado' : 'desativado'}`);
  return soundEnabled;
}

// ======================================
// ATUALIZAR INFORMAÇÕES DA ROTA ATIVA
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
        iniciarNavegacao(currentRoutes[activeRouteIndex], mode, currentFrom.lat, currentFrom.lng, currentTo.lat, currentTo.lng);
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
        if (bounds && bounds.isValid()) allBounds.extend(bounds);
      } catch(e) {}
    }
  });
  
  if (allBounds.isValid()) {
    window.map.fitBounds(allBounds, { padding: [60, 60] });
  } else {
    window.map.fitBounds(L.latLngBounds([[fromLat, fromLng], [toLat, toLng]]), { padding: [60, 60] });
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
  redrawAllRoutes(mode, fromLat, fromLng, toLat, toLng);
  updateRouteInfo(currentRoutes[index], mode);
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
    const geo = L.geoJSON(route.geometry, { style, interactive: true });
    geo.addTo(window.routeLayer);
    currentRouteLayers.push(geo);
    
    geo.eachLayer(layer => {
      if (layer.feature) {
        layer.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          if (idx !== activeRouteIndex) switchToRoute(idx, mode, fromLat, fromLng, toLat, toLng);
        });
        if (isAlternative) {
          layer.on('mouseover', () => layer.setStyle({ weight: 11, opacity: 1 }));
          layer.on('mouseout', () => layer.setStyle({ weight: style.weight, opacity: style.opacity }));
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
  return (text || "").toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

// ======================================
// VALIDAR COORDENADAS
// ======================================

function isValidCoordinate(lat, lng) {
  return !isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

// ======================================
// INTEGRAÇÃO COM POIs MANUAIS
// ======================================

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

// ======================================
// RESOLVER LOCALIZAÇÃO
// ======================================

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

// ======================================
// CREATE ROUTE
// ======================================

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
  
  return await traceRoute(from, to, mode);
}
window.createRoute = createRoute;

// ======================================
// ROTA DIRETA
// ======================================

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

// ======================================
// EXPORTAR FUNÇÕES DE NAVEGAÇÃO
// ======================================

window.iniciarNavegacao = iniciarNavegacao;
window.pararNavegacao = pararNavegacaoCompleta;
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
});