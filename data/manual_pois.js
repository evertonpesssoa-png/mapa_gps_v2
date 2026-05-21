// ======================================
// POIs MANUAIS - BASE PERMANENTE COM CONTROLE DE ZOOM
// ======================================

// Lista de POIs manuais (seus dados)
window.manualPOIs = [
  {
    name: "Unidade Mista De Saúde",
    lat: -7.369247,
    lon: -35.238544,
    category: "hospital",
    icon: "🏥"
  },
  {
    name: "Delegacia De Policia Civil",
    lat: -7.369748,
    lon: -35.238492,
    category: "police",
    icon: "👮"
  },
  {
    name: "Destacamento De Policia Militar",
    lat: -7.371781,
    lon: -35.240715,
    category: "policeman",
    icon: "🚓"
  },
  {
    name: "Farmácia Veloso",
    lat: -7.374116,
    lon: -35.237992,
    category: "pharmacy",
    icon: "💊"
  },
  {
    name: "Posto Petrobrás",
    lat: -7.379626,
    lon: -35.23356,
    category: "gas",
    icon: "⛽"
  },
  {
    name: "Mercadinho Marinho",
    lat: -7.370714,
    lon: -35.238752,
    category: "supermarket",
    icon: "🛒"
  },
  {
    name: "Minha casa",
    lat: -7.368987,
    lon: -35.237316,
    category: "home",
    icon: "🏠"
  },
  {
    name: "Mecânico",
    lat: -7.372704,
    lon: -35.238166,
    category: "mechanic",
    icon: "🔧"
  },
  {
    name: "Posto De Saúde",
    lat: -7.369428,
    lon: -35.23805,
    category: "medical",
    icon: "🏥"
  },
  {
    name: "Ninha",
    lat: -7.18738,
    lon: -34.83779,
    category: "home",
    icon: "🏠"
  }
];

// Configurações de zoom para POIs manuais
const MANUAL_POI_ZOOM_CONFIG = {
  minZoom: 12,      // Só aparecem a partir do zoom 12
  maxZoom: 19,      // Desaparecem quando zoom muito alto
  maxDistance: 5000 // Distância máxima em metros (5km)
};

// Cache em memória para evitar cálculos repetidos
const manualPOICache = new Map();
const MANUAL_POI_CACHE_TTL = 30000; // 30 segundos

// ======================================
// FUNÇÃO PARA CALCULAR DISTÂNCIA
// ======================================

function calcularDistanciaManual(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Raio da Terra em metros
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ======================================
// VERIFICAR SE O POI DEVE SER EXIBIDO BASEADO NO ZOOM
// ======================================

function deveExibirPOIporZoom(zoomAtual) {
  return zoomAtual >= MANUAL_POI_ZOOM_CONFIG.minZoom && 
         zoomAtual <= MANUAL_POI_ZOOM_CONFIG.maxZoom;
}

// ======================================
// VERIFICAR TEMA ATUAL (CLARO/ESCURO)
// ======================================

function isDarkTheme() {
  return document.documentElement.getAttribute('data-theme') === 'dark';
}

// ======================================
// LIMPAR CACHE DE POIs MANUAIS
// ======================================

function limparCacheManualPOIs() {
  manualPOICache.clear();
  console.log('🧹 Cache de POIs manuais limpo');
}

// ======================================
// BUSCAR POIs MANUAIS PRÓXIMOS (COM CONTROLE DE ZOOM)
// ======================================

function buscarPOIsManuais(lat, lng, type = 'all', radius = 2000, zoom = 15) {
  // Se não tem coordenadas, retorna vazio
  if (!lat || !lng) return [];
  
  // Verificar cache
  const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)},${type},${radius},${zoom}`;
  if (manualPOICache.has(cacheKey)) {
    const cached = manualPOICache.get(cacheKey);
    if (Date.now() - cached.timestamp < MANUAL_POI_CACHE_TTL) {
      console.log(`📦 Cache manual hit: ${cached.data.length} POIs`);
      return cached.data;
    }
    manualPOICache.delete(cacheKey);
  }
  
  // Verificar zoom - se zoom baixo, não exibir
  if (!deveExibirPOIporZoom(zoom)) {
    console.log(`📌 POIs manuais ocultos (zoom ${zoom} - fora da faixa ${MANUAL_POI_ZOOM_CONFIG.minZoom}-${MANUAL_POI_ZOOM_CONFIG.maxZoom})`);
    return [];
  }
  
  // Filtrar por tipo (se não for 'all')
  let filteredPOIs = [...window.manualPOIs];
  if (type !== 'all') {
    filteredPOIs = filteredPOIs.filter(poi => poi.category === type);
  }
  
  // Filtrar por distância
  const poisComDistancia = filteredPOIs.map(poi => ({
    ...poi,
    distance: calcularDistanciaManual(lat, lng, poi.lat, poi.lon),
    source: 'manual'
  }));
  
  // Ajustar raio baseado no zoom (quanto mais zoom, menor o raio)
  let raioAjustado = radius;
  if (zoom > 16) {
    raioAjustado = 1000; // Zoom alto: só POIs muito próximos (1km)
  } else if (zoom > 14) {
    raioAjustado = 2000; // Zoom médio: 2km
  } else if (zoom > 12) {
    raioAjustado = 5000; // Zoom mais baixo: 5km
  }
  
  // Retornar apenas os que estão dentro do raio
  const withinRadius = poisComDistancia.filter(poi => poi.distance <= raioAjustado);
  
  // Ordenar por distância (mais perto primeiro)
  withinRadius.sort((a, b) => a.distance - b.distance);
  
  console.log(`📌 POIs manuais: ${withinRadius.length} encontrados (zoom: ${zoom}, raio: ${raioAjustado}m)`);
  
  // Salvar no cache
  manualPOICache.set(cacheKey, {
    timestamp: Date.now(),
    data: withinRadius
  });
  
  return withinRadius;
}

// ======================================
// FUNÇÃO PARA ADICIONAR NOVO POI MANUAL (COM VALIDAÇÃO)
// ======================================

function adicionarPOIManual(name, lat, lon, category, icon = '📍') {
  // Validar dados
  if (!name || typeof name !== 'string' || name.trim() === '') {
    console.warn('⚠️ Nome inválido para POI manual');
    return null;
  }
  
  if (isNaN(lat) || isNaN(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    console.warn('⚠️ Coordenadas inválidas para POI manual');
    return null;
  }
  
  // Verificar se já existe POI similar (evitar duplicatas)
  const existe = window.manualPOIs.some(poi => 
    poi.name === name && 
    Math.abs(poi.lat - lat) < 0.0001 && 
    Math.abs(poi.lon - lon) < 0.0001
  );
  
  if (existe) {
    console.warn(`⚠️ POI "${name}" já existe! Nenhuma duplicata adicionada.`);
    return null;
  }
  
  const novoPOI = {
    name: name.trim(),
    lat: Number(lat),
    lon: Number(lon),
    category: category || 'generic',
    icon: icon || '📍'
  };
  
  window.manualPOIs.push(novoPOI);
  console.log(`✅ POI manual adicionado: ${name}`);
  
  // Limpar cache pois os dados mudaram
  limparCacheManualPOIs();
  
  // Salvar no localStorage para persistência
  salvarPOIsManuais();
  
  return novoPOI;
}

// ======================================
// FUNÇÃO PARA REMOVER POI MANUAL
// ======================================

function removerPOIManual(name, lat, lon) {
  const index = window.manualPOIs.findIndex(poi => 
    poi.name === name && Math.abs(poi.lat - lat) < 0.0001 && Math.abs(poi.lon - lon) < 0.0001
  );
  
  if (index !== -1) {
    const removido = window.manualPOIs.splice(index, 1)[0];
    console.log(`🗑️ POI manual removido: ${removido.name}`);
    
    // Limpar cache pois os dados mudaram
    limparCacheManualPOIs();
    
    salvarPOIsManuais();
    return removido;
  }
  
  console.warn(`⚠️ POI não encontrado para remoção: ${name}`);
  return null;
}

// ======================================
// FUNÇÃO PARA EDITAR POI MANUAL
// ======================================

function editarPOIManual(oldName, oldLat, oldLon, newData) {
  const index = window.manualPOIs.findIndex(poi => 
    poi.name === oldName && 
    Math.abs(poi.lat - oldLat) < 0.0001 && 
    Math.abs(poi.lon - oldLon) < 0.0001
  );
  
  if (index !== -1) {
    window.manualPOIs[index] = {
      ...window.manualPOIs[index],
      ...newData
    };
    console.log(`✏️ POI manual editado: ${oldName} -> ${newData.name || oldName}`);
    
    // Limpar cache pois os dados mudaram
    limparCacheManualPOIs();
    
    salvarPOIsManuais();
    return window.manualPOIs[index];
  }
  
  console.warn(`⚠️ POI não encontrado para edição: ${oldName}`);
  return null;
}

// ======================================
// FUNÇÃO PARA SALVAR POIs NO LOCALSTORAGE
// ======================================

function salvarPOIsManuais() {
  try {
    localStorage.setItem('manual_pois', JSON.stringify(window.manualPOIs));
    console.log('💾 POIs manuais salvos no localStorage');
  } catch (e) {
    console.warn('Erro ao salvar POIs:', e);
  }
}

// ======================================
// FUNÇÃO PARA CARREGAR POIs DO LOCALSTORAGE
// ======================================

function carregarPOIsManuais() {
  try {
    const saved = localStorage.getItem('manual_pois');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        window.manualPOIs = parsed;
        console.log(`📂 POIs manuais carregados do localStorage: ${window.manualPOIs.length} itens`);
      }
    }
  } catch (e) {
    console.warn('Erro ao carregar POIs do localStorage:', e);
  }
}

// ======================================
// FUNÇÃO PARA BUSCAR CATEGORIAS ÚNICAS
// ======================================

function getCategoriasManuais() {
  const categorias = new Set();
  window.manualPOIs.forEach(poi => {
    if (poi.category) categorias.add(poi.category);
  });
  return Array.from(categorias);
}

// ======================================
// FUNÇÃO PARA CRIAR MARCADOR NO MAPA (COM SUPORTE A TEMA ESCURO)
// ======================================

function criarMarcadorManual(poi, mapLayer) {
  if (!mapLayer) return null;
  
  // Definir ícone baseado na categoria
  const iconMap = {
    hospital: '🏥',
    police: '👮',
    policeman: '🚓',
    pharmacy: '💊',
    gas: '⛽',
    supermarket: '🛒',
    home: '🏠',
    mechanic: '🔧',
    medical: '🏥'
  };
  
  const iconChar = poi.icon || iconMap[poi.category] || '📍';
  
  // Verificar tema atual para cores adaptativas
  const isDark = isDarkTheme();
  const bgColor = isDark ? '#1a1a2a' : 'white';
  const borderColor = isDark ? '#ff66c0' : '#ff4db8';
  
  // Criar ícone customizado com suporte a tema escuro
  const customIcon = L.divIcon({
    className: 'custom-poi-icon manual-poi',
    html: `<div style="background: ${bgColor}; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.2); border: 2px solid ${borderColor}; font-size: 16px; transition: all 0.2s ease;">${iconChar}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  });
  
  const marker = L.marker([poi.lat, poi.lon], { icon: customIcon });
  
  // Criar popup com informações (também adaptativo ao tema)
  const popupBgColor = isDark ? '#1a1a2a' : 'white';
  const popupTextColor = isDark ? 'white' : '#1a1a2e';
  
  marker.bindPopup(`
    <div style="min-width: 150px; background: ${popupBgColor}; color: ${popupTextColor}; border-radius: 8px; padding: 8px;">
      <strong>${poi.name}</strong><br>
      <span style="color: ${isDark ? '#aaa' : '#666'};">📌 ${poi.category}</span><br>
      <span style="color: ${isDark ? '#888' : '#999'}; font-size: 11px;">📡 Fonte: Manual (permanente)</span>
      ${poi.distance ? `<br><span style="color: ${isDark ? '#888' : '#999'}; font-size: 11px;">📏 ${(poi.distance / 1000).toFixed(1)}km de distância</span>` : ''}
    </div>
  `);
  
  return marker;
}

// ======================================
// FUNÇÃO PARA ATUALIZAR MARCADORES MANUAIS (APÓS MUDANÇA DE TEMA)
// ======================================

function atualizarMarcadoresManuais() {
  if (!window.poiLayer) return;
  
  // Re-criar marcadores manuais
  const manualMarkers = [];
  window.poiLayer.eachLayer(layer => {
    if (layer._poiData && layer._poiData.source === 'manual') {
      manualMarkers.push(layer._poiData);
      window.poiLayer.removeLayer(layer);
    }
  });
  
  manualMarkers.forEach(poi => {
    const marker = criarMarcadorManual(poi, window.poiLayer);
    if (marker) marker.addTo(window.poiLayer);
  });
  
  console.log(`🔄 Marcadores manuais atualizados para o tema ${isDarkTheme() ? 'escuro' : 'claro'}`);
}

// ======================================
// FUNÇÃO PARA CARREGAR TODOS OS POIs NO MAPA (COM CONTROLE DE ZOOM)
// ======================================

async function carregarPOIsManuaisNoMapa(lat, lng, radius = 5000, mapLayer) {
  if (!mapLayer || !lat || !lng) return [];
  
  // Obter zoom atual do mapa
  const zoomAtual = window.map ? window.map.getZoom() : 15;
  
  const pois = buscarPOIsManuais(lat, lng, 'all', radius, zoomAtual);
  
  pois.forEach(poi => {
    const marker = criarMarcadorManual(poi, mapLayer);
    if (marker) {
      marker._poiData = { ...poi, source: 'manual' };
      marker.addTo(mapLayer);
    }
  });
  
  console.log(`🗺️ ${pois.length} POIs manuais carregados no mapa (zoom: ${zoomAtual})`);
  return pois;
}

// ======================================
// OBSERVAR MUDANÇAS DE TEMA PARA ATUALIZAR MARCADORES
// ======================================

function iniciarObservadorTema() {
  const observer = new MutationObserver(() => {
    atualizarMarcadoresManuais();
  });
  
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  console.log('👁️ Observador de tema iniciado para POIs manuais');
}

// ======================================
// INICIALIZAÇÃO
// ======================================

// Carregar POIs salvos (se houver)
carregarPOIsManuais();

// Iniciar observador de tema
setTimeout(iniciarObservadorTema, 1000);

// Exportar funções para uso global
window.buscarPOIsManuais = buscarPOIsManuais;
window.adicionarPOIManual = adicionarPOIManual;
window.removerPOIManual = removerPOIManual;
window.editarPOIManual = editarPOIManual;
window.getCategoriasManuais = getCategoriasManuais;
window.criarMarcadorManual = criarMarcadorManual;
window.carregarPOIsManuaisNoMapa = carregarPOIsManuaisNoMapa;
window.limparCacheManualPOIs = limparCacheManualPOIs;
window.atualizarMarcadoresManuais = atualizarMarcadoresManuais;

console.log(`✅ POIs Manuais carregados! ${window.manualPOIs.length} locais disponíveis`);
console.log('📌 Categorias disponíveis:', getCategoriasManuais().join(', '));
console.log(`🔍 POIs manuais aparecem apenas com zoom >= ${MANUAL_POI_ZOOM_CONFIG.minZoom} e distância <= ${MANUAL_POI_ZOOM_CONFIG.maxDistance}m`);
console.log('🎨 Suporte a tema claro/escuro ativado para marcadores manuais');
console.log('💾 Cache em memória ativado (TTL: 30 segundos)');