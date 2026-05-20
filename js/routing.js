// ======================================
// SISTEMA DE ROTAS INTELIGENTES (Estilo Google Maps)
// ======================================

// Configuração dos modos de transporte
const TRANSPORT_MODES = {
    car: {
        name: 'Carro',
        icon: '🚗',
        color: '#ef4444',
        profile: 'driving',
        speed: 40
    },
    foot: {
        name: 'A pé',
        icon: '🚶',
        color: '#10b981',
        profile: 'walking',
        speed: 5
    },
    bike: {
        name: 'Bicicleta',
        icon: '🚴',
        color: '#3b82f6',
        profile: 'cycling',
        speed: 15
    }
};

let currentRoutes = [];
let selectedRouteIndex = 0;
let routeLayer = null;
let startMarker = null;
let endMarker = null;

// ======================================
// CALCULAR ROTA (via OSRM)
// ======================================
async function calculateRoute(origin, destination, mode = 'car') {
    const config = TRANSPORT_MODES[mode];
    if (!config) return null;
    
    const url = `https://router.project-osrm.org/route/v1/${config.profile}/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson&steps=true`;
    
    try {
        console.log(`🔄 Calculando rota de ${config.name}...`);
        const response = await fetch(url);
        const data = await response.json();
        
        if (!data.routes || data.routes.length === 0) return null;
        
        const route = data.routes[0];
        return {
            mode: mode,
            name: config.name,
            icon: config.icon,
            color: config.color,
            distance: (route.distance / 1000).toFixed(1),
            duration: Math.round(route.duration / 60),
            geometry: route.geometry,
            steps: route.legs[0]?.steps || []
        };
        
    } catch (error) {
        console.error(`Erro na rota ${mode}:`, error);
        return null;
    }
}

// ======================================
// CALCULAR TODAS AS ROTAS
// ======================================
async function calculateAllRoutes(origin, destination) {
    const modes = ['car', 'foot', 'bike'];
    const routes = [];
    
    for (const mode of modes) {
        const route = await calculateRoute(origin, destination, mode);
        if (route) {
            routes.push(route);
        }
    }
    
    return routes;
}

// ======================================
// DESENHAR ROTAS NO MAPA
// ======================================
function drawRoutes(routes, selectedIndex = 0) {
    if (!window.map) return;
    
    // Limpar rotas anteriores
    if (routeLayer) {
        window.map.removeLayer(routeLayer);
    }
    
    routeLayer = L.layerGroup().addTo(window.map);
    
    // Desenhar cada rota
    routes.forEach((route, idx) => {
        const isSelected = idx === selectedIndex;
        const opacity = isSelected ? 0.9 : 0.4;
        const weight = isSelected ? 6 : 3;
        
        L.geoJSON(route.geometry, {
            color: route.color,
            weight: weight,
            opacity: opacity,
            lineCap: 'round',
            lineJoin: 'round'
        }).addTo(routeLayer);
    });
    
    selectedRouteIndex = selectedIndex;
}

// ======================================
// EXIBIR PAINEL DE ROTAS (SEM RANKING)
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
            <span>🗺️ ${routes.length} opções de rota</span>
            <button onclick="closeRoutesPanel()" class="close-panel" title="Fechar">✕</button>
        </div>
        <div class="routes-list">
    `;
    
    routes.forEach((route, idx) => {
        const isSelected = idx === selectedRouteIndex;
        
        html += `
            <div class="route-item ${isSelected ? 'selected' : ''}" onclick="selectRoute(${idx})" style="border-left-color: ${route.color}">
                <div class="route-icon">${route.icon}</div>
                <div class="route-details">
                    <div class="route-name">${route.name}</div>
                    <div class="route-stats">📏 ${route.distance} km • ⏱️ ${route.duration} min</div>
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

// ======================================
// FECHAR PAINEL DE ROTAS
// ======================================
window.closeRoutesPanel = function() {
    const panel = document.getElementById('routes-panel');
    if (panel) panel.style.display = 'none';
};

// ======================================
// LIMPAR TODAS AS ROTAS
// ======================================
window.clearAllRoutes = function() {
    if (routeLayer) {
        window.map.removeLayer(routeLayer);
        routeLayer = null;
    }
    if (startMarker) {
        window.map.removeLayer(startMarker);
        startMarker = null;
    }
    if (endMarker) {
        window.map.removeLayer(endMarker);
        endMarker = null;
    }
    closeRoutesPanel();
    currentRoutes = [];
    selectedRouteIndex = 0;
    console.log('🗑️ Todas as rotas foram limpas');
};

// ======================================
// SELECIONAR ROTA ESPECÍFICA
// ======================================
window.selectRoute = function(index) {
    if (currentRoutes && currentRoutes[index]) {
        selectedRouteIndex = index;
        drawRoutes(currentRoutes, selectedRouteIndex);
        showRoutesPanel(currentRoutes);
        
        // Ajustar zoom para a rota selecionada
        const bounds = L.latLngBounds(currentRoutes[index].geometry.coordinates.map(c => [c[1], c[0]]));
        window.map.fitBounds(bounds, { padding: [50, 50] });
        
        console.log(`✅ Rota selecionada: ${currentRoutes[index].name} - ${currentRoutes[index].duration}min`);
    }
};

// ======================================
// FUNÇÃO PRINCIPAL - CRIAR ROTA
// ======================================
window.createSmartRoute = async function(originText, destinationText) {
    console.log("🚀 Criando rota para:", destinationText);
    
    // Resolver destino
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
    
    // Usar GPS como origem
    const pos = window.locationEngine?.getPosition();
    if (!pos) {
        alert('📍 Ative o GPS para calcular rotas');
        return null;
    }
    
    const origin = { lat: pos.lat, lng: pos.lng, name: 'Sua localização' };
    
    // Mostrar loading
    const loading = document.createElement('div');
    loading.className = 'routes-loading';
    loading.innerHTML = '🔄 Calculando rotas...';
    document.body.appendChild(loading);
    
    // Calcular rotas
    const routes = await calculateAllRoutes(origin, destination);
    currentRoutes = routes;
    
    loading.remove();
    
    if (routes.length === 0) {
        alert('❌ Nenhuma rota encontrada');
        return null;
    }
    
    // Desenhar rotas (primeira como destaque)
    drawRoutes(routes, 0);
    
    // Mostrar painel
    showRoutesPanel(routes, origin, destination);
    
    // Ajustar zoom para a primeira rota
    const bounds = L.latLngBounds(routes[0].geometry.coordinates.map(c => [c[1], c[0]]));
    window.map.fitBounds(bounds, { padding: [50, 50] });
    
    // Adicionar marcadores
    if (startMarker) window.map.removeLayer(startMarker);
    if (endMarker) window.map.removeLayer(endMarker);
    
    startMarker = L.marker([origin.lat, origin.lng], {
        icon: L.divIcon({ html: '📍', className: 'custom-marker', iconSize: [24, 24] })
    }).addTo(window.map).bindPopup(`<b>📍 Origem</b><br>${origin.name}`);
    
    endMarker = L.marker([destination.lat, destination.lng], {
        icon: L.divIcon({ html: '🏁', className: 'custom-marker', iconSize: [24, 24] })
    }).addTo(window.map).bindPopup(`<b>🏁 Destino</b><br>${destination.name}`);
    
    console.log(`✅ ${routes.length} rotas calculadas!`);
    return routes;
};

// ======================================
// ABRIR MODAL DE ROTA (PELO BOTÃO)
// ======================================
window.openRouteDialog = function() {
    const destination = prompt('🗺️ Para onde você quer ir?\n\nDigite o endereço ou nome do lugar:', '');
    if (destination && destination.trim()) {
        createSmartRoute('', destination.trim());
    }
};

// ======================================
// ESTILOS CSS
// ======================================
const routesStyles = `
<style>
/* Painel de Rotas (Estilo Google Maps) */
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
    font-family: Arial, sans-serif;
    color: white;
    pointer-events: auto;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
}

.routes-panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
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
    transition: opacity 0.2s;
}

.close-panel:hover {
    opacity: 1;
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
    transition: all 0.2s;
    border-left: 3px solid;
}

.route-item:hover {
    background: rgba(255, 255, 255, 0.15);
    transform: translateX(5px);
}

.route-item.selected {
    background: rgba(255, 255, 255, 0.2);
    box-shadow: 0 0 8px rgba(0, 0, 0, 0.3);
}

.route-icon {
    font-size: 1.5rem;
    min-width: 40px;
    text-align: center;
}

.route-details {
    flex: 1;
}

.route-name {
    font-weight: bold;
    font-size: 0.85rem;
}

.route-stats {
    font-size: 0.7rem;
    opacity: 0.7;
    margin-top: 2px;
}

.route-select-indicator {
    width: 24px;
    text-align: center;
    font-size: 1rem;
    color: #4caf50;
}

.routes-summary {
    font-size: 0.7rem;
    padding: 8px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    margin-top: 8px;
    margin-bottom: 10px;
}

.summary-origin, .summary-destination {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.summary-origin {
    color: #4caf50;
    margin-bottom: 4px;
}

.summary-destination {
    color: #ff9800;
}

.clear-routes-btn {
    width: 100%;
    padding: 10px;
    background: rgba(255, 68, 68, 0.2);
    border: 1px solid #ff4444;
    border-radius: 30px;
    color: #ff4444;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 0.8rem;
}

.clear-routes-btn:hover {
    background: rgba(255, 68, 68, 0.4);
    transform: scale(1.02);
}

.routes-loading {
    position: fixed;
    bottom: 100px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(10px);
    padding: 10px 20px;
    border-radius: 30px;
    color: white;
    z-index: 10002;
    font-size: 0.85rem;
    border: 1px solid rgba(255,255,255,0.2);
    animation: fadeInUp 0.2s ease;
}

@keyframes fadeInUp {
    from {
        opacity: 0;
        transform: translateX(-50%) translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
    }
}

@media (max-width: 600px) {
    .routes-panel {
        bottom: 80px;
        left: 10px;
        right: 10px;
        max-width: none;
    }
}
</style>
`;

// Adicionar estilos se não existirem
if (!document.querySelector('#routes-styles')) {
    const styleTag = document.createElement('style');
    styleTag.id = 'routes-styles';
    styleTag.textContent = routesStyles;
    document.head.appendChild(styleTag);
}

// ======================================
// CONECTAR BOTÃO DO MAPA
// ======================================
document.addEventListener('DOMContentLoaded', () => {
    const routeSmartBtn = document.getElementById('routeSmartBtn');
    if (routeSmartBtn) {
        console.log('✅ Botão de rota inteligente encontrado!');
        routeSmartBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            console.log('🔘 Botão de rota clicado!');
            window.openRouteDialog();
        });
    } else {
        console.warn('⚠️ Botão #routeSmartBtn não encontrado no DOM');
    }
});

console.log('✅ Sistema de Rotas Inteligentes (Estilo Google Maps) carregado!');