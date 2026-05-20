// ======================================
// SISTEMA DE ROTAS INTELIGENTES
// ======================================

// Configuração dos modos de transporte
const TRANSPORT_MODES = {
    car: {
        name: 'Carro',
        icon: '🚗',
        color: '#ef4444',
        profile: 'driving',
        speed: 40,
        priority: 1
    },
    foot: {
        name: 'A pé',
        icon: '🚶',
        color: '#10b981',
        profile: 'walking',
        speed: 5,
        priority: 2
    },
    bike: {
        name: 'Bicicleta',
        icon: '🚴',
        color: '#3b82f6',
        profile: 'cycling',
        speed: 15,
        priority: 3
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
    
    const url = `https://router.project-osrm.org/route/v1/${config.profile}/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson&steps=true&alternatives=true`;
    
    try {
        console.log(`🔄 Calculando rota de ${config.name}...`);
        const response = await fetch(url);
        const data = await response.json();
        
        if (!data.routes || data.routes.length === 0) return null;
        
        const routes = data.routes.map((route, idx) => ({
            id: idx,
            mode: mode,
            name: config.name,
            icon: config.icon,
            color: config.color,
            distance: (route.distance / 1000).toFixed(1),
            duration: Math.round(route.duration / 60),
            geometry: route.geometry,
            steps: route.legs[0]?.steps || [],
            isAlternative: idx > 0
        }));
        
        return routes;
        
    } catch (error) {
        console.error(`Erro na rota ${mode}:`, error);
        return null;
    }
}

// ======================================
// CALCULAR TODAS AS ROTAS (MULTI-MODAL)
// ======================================
async function calculateAllRoutes(origin, destination) {
    const modes = ['car', 'foot', 'bike'];
    const allRoutes = [];
    
    for (const mode of modes) {
        const routes = await calculateRoute(origin, destination, mode);
        if (routes && routes.length > 0) {
            allRoutes.push(...routes);
        }
    }
    
    // Ordenar por duração
    allRoutes.sort((a, b) => a.duration - b.duration);
    
    return allRoutes;
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
// EXIBIR COMPARAÇÃO DE ROTAS
// ======================================
function showRoutesComparison(routes, origin, destination) {
    let comparisonDiv = document.getElementById('route-comparison');
    if (!comparisonDiv) {
        const newContainer = document.createElement('div');
        newContainer.id = 'route-comparison';
        newContainer.className = 'route-comparison';
        document.body.appendChild(newContainer);
        comparisonDiv = newContainer;
    }
    
    if (!routes || routes.length === 0) {
        comparisonDiv.style.display = 'none';
        return;
    }
    
    const best = routes[0];
    
    let html = `
        <div class="route-comparison-header">
            <span>📋 ${routes.length} rota(s) encontrada(s)</span>
            <button onclick="closeRouteComparison()" class="close-comparison">✕</button>
        </div>
        <div class="route-options">
    `;
    
    routes.forEach((route, idx) => {
        const isBest = idx === 0;
        const isSelected = idx === selectedRouteIndex;
        
        html += `
            <div class="route-option ${isSelected ? 'selected' : ''}" onclick="selectRoute(${idx})" style="border-left-color: ${route.color}">
                <div class="route-icon">${route.icon}</div>
                <div class="route-info">
                    <div class="route-name">${route.name} ${isBest ? '⭐ Melhor' : ''}</div>
                    <div class="route-details">📏 ${route.distance} km • ⏱️ ${route.duration} min</div>
                </div>
                <button class="route-select-btn" onclick="event.stopPropagation(); selectRoute(${idx})">👉</button>
            </div>
        `;
    });
    
    html += `</div>`;
    
    if (origin && destination) {
        html += `
            <div class="route-summary">
                <div>📍 De: <strong>${origin.name || 'Origem'}</strong></div>
                <div>📍 Para: <strong>${destination.name || 'Destino'}</strong></div>
                <div class="best-route">🏆 Melhor: ${best.icon} ${best.name} • ${best.duration}min (${best.distance}km)</div>
            </div>
            <button class="start-navigation-btn" onclick="startNavigation()">🚀 Iniciar Navegação</button>
        `;
    }
    
    comparisonDiv.innerHTML = html;
    comparisonDiv.style.display = 'block';
}

// ======================================
// SELECIONAR ROTA ESPECÍFICA
// ======================================
window.selectRoute = function(index) {
    if (currentRoutes && currentRoutes[index]) {
        selectedRouteIndex = index;
        drawRoutes(currentRoutes, selectedRouteIndex);
        showRoutesComparison(currentRoutes);
        
        // Destacar a rota selecionada no mapa
        const bounds = L.latLngBounds(currentRoutes[index].geometry.coordinates.map(c => [c[1], c[0]]));
        window.map.fitBounds(bounds, { padding: [50, 50] });
    }
};

// ======================================
// FECHAR COMPARAÇÃO
// ======================================
window.closeRouteComparison = function() {
    const container = document.getElementById('route-comparison');
    if (container) container.style.display = 'none';
};

// ======================================
// INICIAR NAVEGAÇÃO PASSO A PASSO
// ======================================
window.startNavigation = function() {
    const selectedRoute = currentRoutes[selectedRouteIndex];
    if (!selectedRoute) {
        alert('Nenhuma rota selecionada.');
        return;
    }
    
    // Mostrar instruções
    let instructions = `🚀 Navegação ${selectedRoute.icon} ${selectedRoute.name}\n`;
    instructions += `📏 ${selectedRoute.distance} km • ⏱️ ${selectedRoute.duration} min\n\n`;
    instructions += `📋 Instruções:\n`;
    
    if (selectedRoute.steps && selectedRoute.steps.length > 0) {
        selectedRoute.steps.forEach((step, idx) => {
            const instruction = step.instructions || step.name || `Siga em frente`;
            instructions += `${idx + 1}. ${instruction}\n`;
        });
    } else {
        instructions += `Siga a rota destacada no mapa até seu destino.`;
    }
    
    alert(instructions);
};

// ======================================
// FUNÇÃO PRINCIPAL - CRIAR ROTA INTELIGENTE
// ======================================
window.createSmartRoute = async function(originText, destinationText) {
    console.log("🚀 createSmartRoute chamado com:", { originText, destinationText });
    
    // Resolver origem
    let origin = null;
    let destination = null;
    
    // Se origem vazia, usa GPS
    if (!originText || originText.trim() === '') {
        const pos = window.locationEngine?.getPosition();
        if (!pos) {
            alert('📍 GPS indisponível. Digite uma origem ou ative o GPS.');
            return null;
        }
        origin = { lat: pos.lat, lng: pos.lng, name: 'Minha localização' };
        console.log("📍 Origem: GPS", origin);
    } else {
        // Usar geocoding para resolver origem
        if (typeof window.geocode === 'function') {
            const results = await window.geocode(originText);
            if (results && results.length > 0) {
                origin = { lat: results[0].lat, lng: results[0].lng, name: results[0].name };
                console.log("📍 Origem: geocode", origin);
            }
        }
    }
    
    // Resolver destino
    if (typeof window.geocode === 'function') {
        const results = await window.geocode(destinationText);
        if (results && results.length > 0) {
            destination = { lat: results[0].lat, lng: results[0].lng, name: results[0].name };
            console.log("📍 Destino: geocode", destination);
        }
    }
    
    if (!origin) {
        alert('❌ Não foi possível encontrar a origem.');
        return null;
    }
    
    if (!destination) {
        alert(`❌ Não foi possível encontrar o destino: "${destinationText}"`);
        return null;
    }
    
    // Mostrar loading
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'route-loading';
    loadingDiv.innerHTML = `
        <div style="position: fixed; bottom: 100px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.8); padding: 10px 20px; border-radius: 30px; color: white; z-index: 10002;">
            🗺️ Calculando rotas...
        </div>
    `;
    document.body.appendChild(loadingDiv);
    
    // Calcular todas as rotas
    const routes = await calculateAllRoutes(origin, destination);
    currentRoutes = routes;
    
    // Remover loading
    if (loadingDiv) loadingDiv.remove();
    
    if (routes.length === 0) {
        alert('❌ Nenhuma rota encontrada. Verifique as coordenadas ou tente outro destino.');
        return null;
    }
    
    // Desenhar rotas
    drawRoutes(routes, 0);
    
    // Mostrar comparação
    showRoutesComparison(routes, origin, destination);
    
    // Ajustar zoom
    const bounds = L.latLngBounds(routes[0].geometry.coordinates.map(c => [c[1], c[0]]));
    window.map.fitBounds(bounds, { padding: [50, 50] });
    
    // Adicionar marcadores
    if (startMarker) window.map.removeLayer(startMarker);
    if (endMarker) window.map.removeLayer(endMarker);
    
    startMarker = L.marker([origin.lat, origin.lng], {
        icon: L.divIcon({ html: '🚀', className: 'custom-marker', iconSize: [24, 24] })
    }).addTo(window.map).bindPopup(`<b>📍 Origem</b><br>${origin.name}`);
    
    endMarker = L.marker([destination.lat, destination.lng], {
        icon: L.divIcon({ html: '🏁', className: 'custom-marker', iconSize: [24, 24] })
    }).addTo(window.map).bindPopup(`<b>🏁 Destino</b><br>${destination.name}`);
    
    console.log(`✅ ${routes.length} rotas calculadas com sucesso!`);
    return routes;
};

// ======================================
// FUNÇÃO PARA ABRIR MODAL DE ROTA
// ======================================
window.openRouteDialog = function() {
    const destination = prompt('🗺️ Para onde você quer ir?\n\nDigite o endereço ou nome do lugar:', '');
    if (destination && destination.trim()) {
        createSmartRoute('', destination.trim());
    } else if (destination !== null) {
        alert('Digite um destino válido.');
    }
};

// ======================================
// LIMPAR ROTAS
// ======================================
window.clearRoutes = function() {
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
    closeRouteComparison();
    currentRoutes = [];
};

// ======================================
// ESTILOS CSS
// ======================================
const routeStyles = `
<style>
.route-comparison {
    position: fixed;
    bottom: 100px;
    left: 20px;
    right: 20px;
    max-width: 400px;
    background: rgba(0,0,0,0.95);
    backdrop-filter: blur(15px);
    border-radius: 20px;
    padding: 15px;
    z-index: 10001;
    border: 1px solid rgba(255,255,255,0.15);
    font-family: Arial, sans-serif;
    color: white;
    pointer-events: auto;
    box-shadow: 0 4px 20px rgba(0,0,0,0.5);
}

.route-comparison-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    font-weight: bold;
    font-size: 0.9rem;
}

.close-comparison {
    background: none;
    border: none;
    color: #fff;
    font-size: 1.2rem;
    cursor: pointer;
    opacity: 0.7;
    transition: opacity 0.2s;
}

.close-comparison:hover {
    opacity: 1;
}

.route-options {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 12px;
    max-height: 250px;
    overflow-y: auto;
}

.route-option {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px;
    background: rgba(255,255,255,0.08);
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s;
    border-left: 3px solid;
}

.route-option:hover {
    background: rgba(255,255,255,0.15);
    transform: translateX(5px);
}

.route-option.selected {
    background: rgba(255,255,255,0.2);
    box-shadow: 0 0 10px rgba(0,0,0,0.3);
}

.route-icon {
    font-size: 1.5rem;
}

.route-info {
    flex: 1;
}

.route-name {
    font-weight: bold;
    font-size: 0.85rem;
}

.route-details {
    font-size: 0.7rem;
    opacity: 0.7;
}

.route-select-btn {
    background: rgba(255,255,255,0.2);
    border: none;
    border-radius: 20px;
    padding: 5px 12px;
    color: white;
    cursor: pointer;
    transition: background 0.2s;
}

.route-select-btn:hover {
    background: rgba(255,255,255,0.4);
}

.route-summary {
    font-size: 0.7rem;
    padding: 8px;
    background: rgba(255,255,255,0.05);
    border-radius: 12px;
    margin-bottom: 12px;
}

.best-route {
    margin-top: 5px;
    color: #ffd700;
}

.start-navigation-btn {
    width: 100%;
    padding: 10px;
    background: linear-gradient(135deg, #ff4db8, #ff88dd);
    border: none;
    border-radius: 30px;
    color: #000;
    font-weight: bold;
    cursor: pointer;
    transition: transform 0.2s;
}

.start-navigation-btn:hover {
    transform: scale(1.02);
}

#route-loading {
    animation: fadeInOut 0.3s ease;
}

@keyframes fadeInOut {
    from { opacity: 0; transform: translateX(-50%) translateY(20px); }
    to { opacity: 1; transform: translateX(-50%) translateY(0); }
}

@media (max-width: 600px) {
    .route-comparison {
        bottom: 80px;
        left: 10px;
        right: 10px;
        max-width: none;
    }
}
</style>
`;

// Adicionar estilos se não existirem
if (!document.querySelector('#route-styles')) {
    const styleTag = document.createElement('style');
    styleTag.id = 'route-styles';
    styleTag.textContent = routeStyles;
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

console.log('✅ Sistema de Rotas Inteligentes carregado!');