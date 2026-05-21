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
    // Estilo alternativo: weight 9 para fácil clique
    return {
      color: lighterColor,
      weight: 9,
      opacity: 0.85,
      interactive: true,
      bubblingMouseEvents: true
    };
  }
  
  // Estilo principal: weight 9 também
  return {
    color: baseColor,
    weight: 9,
    opacity: 0.9,
    interactive: true,
    bubblingMouseEvents: true
  };
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
    </div>
  `;
}

// ======================================
// FUNÇÃO PARA ENQUADRAR TODAS AS ROTAS
// ======================================

function fitAllRoutesBounds(fromLat, fromLng, toLat, toLng) {
  if (!window.map) return;
  
  // Criar bounds combinados
  const allBounds = L.latLngBounds();
  
  // Adicionar origem e destino
  allBounds.extend([fromLat, fromLng]);
  allBounds.extend([toLat, toLng]);
  
  // Adicionar bounds de cada rota
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
  
  // Verificar se os bounds são válidos
  if (allBounds.isValid()) {
    window.map.fitBounds(allBounds, { padding: [60, 60] });
    console.log("🗺️ Zoom ajustado para enquadrar todas as rotas");
  } else {
    // Fallback: usar apenas origem e destino
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
  
  // Redesenhar todas as rotas com os novos estilos
  redrawAllRoutes(mode, fromLat, fromLng, toLat, toLng);
  
  // Atualizar informações
  updateRouteInfo(selectedRoute, mode);
}

// ======================================
// REDESENHAR TODAS AS ROTAS
// ======================================

function redrawAllRoutes(mode, fromLat, fromLng, toLat, toLng) {
  if (!window.routeLayer) return;
  
  // Limpar rotas existentes
  window.routeLayer.clearLayers();
  currentRouteLayers = [];
  
  // Desenhar cada rota
  currentRoutes.forEach((route, idx) => {
    const isAlternative = (idx !== activeRouteIndex);
    const style = getRouteStyle(mode, isAlternative);
    
    const geo = L.geoJSON(route.geometry, { 
      style,
      interactive: true
    });
    
    geo.addTo(window.routeLayer);
    currentRouteLayers.push(geo);
    
    // Adicionar evento de clique em TODAS as rotas
    geo.eachLayer(layer => {
      if (layer.feature) {
        layer.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          console.log(`🔘 Clicou na rota ${idx + 1} (${isAlternative ? 'alternativa' : 'principal'})`);
          if (idx !== activeRouteIndex) {
            switchToRoute(idx, mode, fromLat, fromLng, toLat, toLng);
          }
        });
        
        // Efeito de hover nas alternativas
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
  
  // Re-adicionar os marcadores
  L.marker([fromLat, fromLng]).addTo(window.routeLayer);
  L.marker([toLat, toLng]).addTo(window.routeLayer);
  
  // Aplicar zoom para enquadrar TODAS as rotas
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
// INTEGRAÇÃO COM POIs MANUAIS E SISTEMA DE 4 CAMADAS
// ======================================

// Função para encontrar POI manual por nome
window.encontrarPOIManualPorNome = function(texto) {
  // Buscar nos POIs manuais
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
  
  // Buscar nos POIs do sistema de 4 camadas (cache do mapa)
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
// RESOLVER LOCALIZAÇÃO (VERSÃO ATUALIZADA)
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
  
  // 1. Verificar destino selecionado globalmente
  if (window.selectedDestination &&
    normalizeText(window.selectedDestination.name) === normalized) {
    return {
      lat: Number(window.selectedDestination.lat),
      lng: Number(window.selectedDestination.lng),
      name: window.selectedDestination.name
    };
  }
  
  // 2. Buscar nos POIs MANUAIS (prioridade máxima)
  const poiManual = window.encontrarPOIManualPorNome(text);
  if (poiManual) {
    return poiManual;
  }
  
  // 3. Buscar no índice global (poiIndex - compatibilidade)
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
  
  // 4. Buscar nos POIs do mapa (4 camadas) via cache
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
  
  // 5. Geocoding externo (fallback)
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
// TRAÇAR ROTA (COM MÚLTIPLAS ALTERNATIVAS)
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
  
  // Salvar origem/destino para redesenho
  currentFrom = { lat: fromLat, lng: fromLng };
  currentTo = { lat: toLat, lng: toLng };
  currentMode = mode;
  
  // Cancelar request anterior
  if (currentRouteController) {
    currentRouteController.abort();
  }
  currentRouteController = new AbortController();
  
  const profile = mode === "foot" ? "walking" : mode === "bike" ? "cycling" : "driving";
  
  // URL com alternatives=true para múltiplas rotas
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
    
    // Limpar rotas anteriores
    clearAllRoutes();
    
    // Armazenar todas as rotas
    currentRoutes = data.routes;
    activeRouteIndex = 0;
    
    console.log(`✅ Encontradas ${currentRoutes.length} rotas alternativas`);
    currentRoutes.forEach((route, idx) => {
      console.log(`  Rota ${idx + 1}: ${formatDistance(route.distance)} • ${formatTime(route.distance, mode)}`);
    });
    
    // Redesenhar todas as rotas
    redrawAllRoutes(mode, fromLat, fromLng, toLat, toLng);
    
    // Mostrar informações da rota principal
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
  
  // ORIGEM
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
  
  // DESTINO
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

// ======================================
// LIMPAR ROTA (MANTIDO PARA COMPATIBILIDADE)
// ======================================

function clearRoute() {
  clearAllRoutes();
}

window.clearRoute = clearRoute;

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
});