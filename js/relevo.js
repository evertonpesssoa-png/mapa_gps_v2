// ======================================
// RELEVO - Open-Elevation API (gratuita)
// ======================================

// Cache de altitudes para evitar requisições repetidas
const altitudeCache = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutos

// Buscar altitude por coordenadas
async function buscarAltitude(lat, lng) {
    const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    
    // Verificar cache
    if (altitudeCache.has(cacheKey)) {
        const cached = altitudeCache.get(cacheKey);
        if (Date.now() - cached.timestamp < CACHE_TTL) {
            console.log(`📦 Altitude cache hit: ${cached.altitude}m`);
            return cached.altitude;
        }
        altitudeCache.delete(cacheKey);
    }
    
    const url = `https://api.open-elevation.com/api/v1/lookup?locations=${lat},${lng}`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        if (data && data.results && data.results[0]) {
            const altitude = Math.round(data.results[0].elevation);
            
            // Salvar no cache
            altitudeCache.set(cacheKey, {
                altitude: altitude,
                timestamp: Date.now()
            });
            
            console.log(`⛰️ Altitude obtida: ${altitude}m para ${lat},${lng}`);
            return altitude;
        }
        return null;
    } catch (err) {
        console.error('Erro ao buscar altitude:', err);
        return null;
    }
}

// Buscar múltiplas altitudes para um perfil
async function buscarPerfilElevacao(pontos) {
    if (!pontos || pontos.length === 0) return [];
    
    const locations = pontos.map(p => `${p.lat},${p.lng}`).join('|');
    const url = `https://api.open-elevation.com/api/v1/lookup?locations=${locations}`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        if (data && data.results) {
            return data.results.map(r => Math.round(r.elevation));
        }
        return [];
    } catch (err) {
        console.error('Erro ao buscar perfil de elevação:', err);
        return [];
    }
}

// Obter descrição do terreno baseado na altitude
function getTerrainDescription(altitude) {
    if (altitude === null) return 'Desconhecido';
    if (altitude < 100) return '🌊 Planície / Nível do mar';
    if (altitude < 300) return '🏞️ Colinas baixas';
    if (altitude < 600) return '⛰️ Montanhas baixas';
    if (altitude < 1500) return '🏔️ Montanhas médias';
    return '🗻 Alta montanha';
}

// Obter ícone baseado na altitude
function getTerrainIcon(altitude) {
    if (altitude === null) return '❓';
    if (altitude < 100) return '🌊';
    if (altitude < 300) return '🏞️';
    if (altitude < 600) return '⛰️';
    if (altitude < 1500) return '🏔️';
    return '🗻';
}

// Atualizar informações de relevo no menu
async function atualizarRelevoNoMenu(lat, lng) {
    const relevoContainer = document.getElementById('relevo-details');
    if (!relevoContainer) return;
    
    // Mostrar loading
    relevoContainer.innerHTML = '<div class="relevo-loading">⛰️ Carregando altitude...</div>';
    
    const altitude = await buscarAltitude(lat, lng);
    
    if (altitude === null) {
        relevoContainer.innerHTML = `
            <div class="relevo-card">
                <div class="relevo-error">
                    ❌ Erro ao carregar altitude
                </div>
            </div>
        `;
        return;
    }
    
    const description = getTerrainDescription(altitude);
    const icon = getTerrainIcon(altitude);
    
    relevoContainer.innerHTML = `
        <div class="relevo-card">
            <div class="relevo-main">
                <div class="relevo-icon">${icon}</div>
                <div class="relevo-altitude">${altitude} m</div>
                <div class="relevo-descricao">${description}</div>
            </div>
            <div class="relevo-info">
                <div class="relevo-info-item">
                    <span class="info-label">📏 Elevação</span>
                    <span class="info-value">${altitude} metros</span>
                </div>
                <div class="relevo-info-item">
                    <span class="info-label">🏔️ Tipo</span>
                    <span class="info-value">${description}</span>
                </div>
            </div>
            <div class="relevo-dica">
                💡 Dica: Clique em qualquer lugar do mapa para ver a altitude
            </div>
        </div>
    `;
}

// Atualizar relevo baseado no centro do mapa
async function atualizarRelevoPorCentro() {
    if (!window.map) return;
    const center = window.map.getCenter();
    await atualizarRelevoNoMenu(center.lat, center.lng);
}

// Exportar funções
window.buscarAltitude = buscarAltitude;
window.buscarPerfilElevacao = buscarPerfilElevacao;
window.getTerrainDescription = getTerrainDescription;
window.atualizarRelevoNoMenu = atualizarRelevoNoMenu;
window.atualizarRelevoPorCentro = atualizarRelevoPorCentro;

console.log('✅ Sistema de Relevo (Open-Elevation) carregado');