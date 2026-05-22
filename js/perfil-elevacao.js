// ======================================
// PERFIL DE ELEVAÇÃO DA ROTA
// ======================================

let perfilChart = null;
let perfilModal = null;

// ======================================
// EXTRAIR PONTOS DA ROTA (AMOSTRAGEM INTELIGENTE)
// ======================================

function extrairPontosParaPerfil(geometry, maxPontos = 100) {
    if (!geometry || geometry.type !== 'LineString') return [];
    
    const coordenadas = geometry.coordinates;
    const total = coordenadas.length;
    
    // Se tem poucos pontos, retorna todos
    if (total <= maxPontos) {
        return coordenadas.map(coord => ({ lat: coord[1], lng: coord[0] }));
    }
    
    // Amostragem inteligente: pega pontos estratégicos
    const step = Math.floor(total / maxPontos);
    const pontos = [];
    
    for (let i = 0; i < total; i += step) {
        const coord = coordenadas[i];
        pontos.push({ lat: coord[1], lng: coord[0] });
    }
    
    // Garantir que o último ponto seja incluído
    const ultimo = coordenadas[total - 1];
    if (pontos[pontos.length - 1].lat !== ultimo[1]) {
        pontos.push({ lat: ultimo[1], lng: ultimo[0] });
    }
    
    return pontos;
}

// ======================================
// BUSCAR ALTITUDES EM LOTE
// ======================================

async function buscarAltitudesEmLote(pontos) {
    const locations = pontos.map(p => `${p.lat},${p.lng}`).join('|');
    const url = `https://api.open-elevation.com/api/v1/lookup?locations=${locations}`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        
        if (data && data.results) {
            return data.results.map(r => Math.round(r.elevation));
        }
        return null;
    } catch (err) {
        console.error('Erro ao buscar altitudes em lote:', err);
        return null;
    }
}

// ======================================
// BUSCAR ALTITUDES INDIVIDUALMENTE (FALLBACK)
// ======================================

async function buscarAltitudesIndividualmente(pontos) {
    const altitudes = [];
    
    for (const ponto of pontos) {
        const altitude = await window.buscarAltitude(ponto.lat, ponto.lng);
        altitudes.push(altitude !== null ? altitude : 0);
        
        // Pequeno delay para não sobrecarregar a API
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return altitudes;
}

// ======================================
// CALCULAR ESTATÍSTICAS DO PERFIL
// ======================================

function calcularEstatisticas(altitudes, distancias) {
    const maxAltura = Math.max(...altitudes);
    const minAltura = Math.min(...altitudes);
    const mediaAltura = Math.round(altitudes.reduce((a, b) => a + b, 0) / altitudes.length);
    
    let subidaTotal = 0;
    let descidaTotal = 0;
    
    for (let i = 1; i < altitudes.length; i++) {
        const diferenca = altitudes[i] - altitudes[i - 1];
        if (diferenca > 0) subidaTotal += diferenca;
        else descidaTotal += Math.abs(diferenca);
    }
    
    const distanciaTotal = distancias[distancias.length - 1] || 0;
    
    return {
        maxAltura,
        minAltura,
        mediaAltura,
        subidaTotal,
        descidaTotal,
        distanciaTotal,
        pontos: altitudes.length
    };
}

// ======================================
// FORMATAR DISTÂNCIA PARA O GRÁFICO
// ======================================

function formatarDistancia(km) {
    if (km < 1) return `${Math.round(km * 1000)}m`;
    return `${km.toFixed(1)}km`;
}

// ======================================
// CRIAR MODAL DO PERFIL
// ======================================

function criarModalPerfil() {
    // Remover modal existente
    if (perfilModal) {
        perfilModal.remove();
        perfilModal = null;
    }
    
    // Criar overlay
    const overlay = document.createElement('div');
    overlay.id = 'perfil-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        z-index: 20030;
        display: flex;
        align-items: center;
        justify-content: center;
    `;
    
    // Criar modal
    const modal = document.createElement('div');
    modal.id = 'perfil-modal';
    modal.style.cssText = `
        background: var(--card-bg, white);
        color: var(--text-primary, #1a1a2e);
        border-radius: 20px;
        width: 90%;
        max-width: 800px;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 0 4px 30px rgba(0,0,0,0.3);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    `;
    
    modal.innerHTML = `
        <div style="padding: 20px; border-bottom: 1px solid var(--card-border, #eee); display: flex; justify-content: space-between; align-items: center;">
            <h3 style="margin: 0;">📈 Perfil de Elevação</h3>
            <button id="fechar-perfil-btn" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-primary, #333);">✕</button>
        </div>
        <div style="padding: 20px;">
            <div id="perfil-grafico-container" style="height: 300px; margin-bottom: 20px;">
                <canvas id="perfil-canvas" style="width: 100%; height: 100%;"></canvas>
            </div>
            <div id="perfil-estatisticas" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 20px;"></div>
            <div style="text-align: center; font-size: 12px; color: var(--text-tertiary, #888);">
                📊 Gráfico baseado em dados de elevação | As altitudes podem variar conforme a fonte
            </div>
        </div>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    perfilModal = overlay;
    
    // Fechar ao clicar fora ou no botão
    overlay.onclick = (e) => {
        if (e.target === overlay) fecharPerfilElevacao();
    };
    document.getElementById('fechar-perfil-btn').onclick = () => fecharPerfilElevacao();
}

// ======================================
// CARREGAR CHART.JS (SE NÃO ESTIVER CARREGADO)
// ======================================

function carregarChartJS() {
    return new Promise((resolve, reject) => {
        if (typeof Chart !== 'undefined') {
            resolve();
            return;
        }
        
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Erro ao carregar Chart.js'));
        document.head.appendChild(script);
    });
}

// ======================================
// DESENHAR GRÁFICO
// ======================================

async function desenharGraficoPerfil(altitudes, distancias, estatisticas) {
    await carregarChartJS();
    
    const ctx = document.getElementById('perfil-canvas').getContext('2d');
    
    // Destruir gráfico anterior se existir
    if (perfilChart) {
        perfilChart.destroy();
    }
    
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#ffffff' : '#1a1a2e';
    const gridColor = isDark ? '#2a2a3a' : '#e0e0e0';
    const fillColor = isDark ? 'rgba(79, 70, 229, 0.2)' : 'rgba(79, 70, 229, 0.1)';
    const lineColor = isDark ? '#818cf8' : '#4f46e5';
    
    perfilChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: distancias.map(d => formatarDistancia(d)),
            datasets: [{
                label: 'Altitude (m)',
                data: altitudes,
                borderColor: lineColor,
                backgroundColor: fillColor,
                borderWidth: 2,
                pointRadius: 2,
                pointHoverRadius: 5,
                pointBackgroundColor: lineColor,
                pointBorderColor: textColor,
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    labels: { color: textColor }
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            return `Altitude: ${context.raw} m`;
                        },
                        afterLabel: (context) => {
                            const distancia = distancias[context.dataIndex];
                            return `Distância: ${formatarDistancia(distancia)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Distância percorrida',
                        color: textColor
                    },
                    ticks: { color: textColor },
                    grid: { color: gridColor }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Altitude (metros)',
                        color: textColor
                    },
                    ticks: { color: textColor },
                    grid: { color: gridColor },
                    beginAtZero: true
                }
            }
        }
    });
}

// ======================================
// ATUALIZAR ESTATÍSTICAS
// ======================================

function atualizarEstatisticas(estatisticas) {
    const container = document.getElementById('perfil-estatisticas');
    if (!container) return;
    
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const cardBg = isDark ? '#1a1a2a' : '#f8f9fa';
    const textColor = isDark ? 'white' : '#333';
    const subColor = isDark ? '#aaa' : '#666';
    
    container.innerHTML = `
        <div style="background: ${cardBg}; border-radius: 12px; padding: 12px; text-align: center;">
            <div style="font-size: 11px; color: ${subColor};">⛰️ Ponto mais alto</div>
            <div style="font-size: 20px; font-weight: bold; color: ${textColor};">${estatisticas.maxAltura} m</div>
        </div>
        <div style="background: ${cardBg}; border-radius: 12px; padding: 12px; text-align: center;">
            <div style="font-size: 11px; color: ${subColor};">📉 Ponto mais baixo</div>
            <div style="font-size: 20px; font-weight: bold; color: ${textColor};">${estatisticas.minAltura} m</div>
        </div>
        <div style="background: ${cardBg}; border-radius: 12px; padding: 12px; text-align: center;">
            <div style="font-size: 11px; color: ${subColor};">📏 Distância total</div>
            <div style="font-size: 20px; font-weight: bold; color: ${textColor};">${formatarDistancia(estatisticas.distanciaTotal)}</div>
        </div>
        <div style="background: ${cardBg}; border-radius: 12px; padding: 12px; text-align: center;">
            <div style="font-size: 11px; color: ${subColor};">⬆️ Subida total</div>
            <div style="font-size: 20px; font-weight: bold; color: #10b981;">+${estatisticas.subidaTotal} m</div>
        </div>
        <div style="background: ${cardBg}; border-radius: 12px; padding: 12px; text-align: center;">
            <div style="font-size: 11px; color: ${subColor};">⬇️ Descida total</div>
            <div style="font-size: 20px; font-weight: bold; color: #ef4444;">-${estatisticas.descidaTotal} m</div>
        </div>
        <div style="background: ${cardBg}; border-radius: 12px; padding: 12px; text-align: center;">
            <div style="font-size: 11px; color: ${subColor};">📊 Média altitude</div>
            <div style="font-size: 20px; font-weight: bold; color: ${textColor};">${estatisticas.mediaAltura} m</div>
        </div>
    `;
}

// ======================================
// FUNÇÃO PRINCIPAL: MOSTRAR PERFIL
// ======================================

async function mostrarPerfilElevacao() {
    if (!window.currentRoutes || !window.currentRoutes[window.activeRouteIndex]) {
        alert('❌ Nenhuma rota ativa para mostrar perfil');
        return;
    }
    
    const route = window.currentRoutes[window.activeRouteIndex];
    const mode = window.currentMode || 'car';
    const distanciaTotal = route.distance / 1000; // km
    const geometry = route.geometry;
    
    // Mostrar loading
    criarModalPerfil();
    const graficoContainer = document.getElementById('perfil-grafico-container');
    graficoContainer.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%;">⛰️ Carregando perfil de elevação...</div>';
    
    try {
        // Extrair pontos da rota
        const pontos = extrairPontosParaPerfil(geometry, 80);
        console.log(`📊 Extraídos ${pontos.length} pontos para análise de elevação`);
        
        // Buscar altitudes
        let altitudes = await buscarAltitudesEmLote(pontos);
        if (!altitudes) {
            console.log('⚠️ Falha na busca em lote, tentando individualmente...');
            altitudes = await buscarAltitudesIndividualmente(pontos);
        }
        
        if (!altitudes || altitudes.length === 0) {
            throw new Error('Não foi possível obter as altitudes');
        }
        
        // Calcular distâncias acumuladas
        const distancias = [];
        let acumulado = 0;
        
        for (let i = 1; i < pontos.length; i++) {
            const dist = calcularDistanciaEntrePontos(pontos[i-1], pontos[i]);
            acumulado += dist;
            distancias.push(acumulado / 1000); // converter para km
        }
        distancias.unshift(0);
        
        // Calcular estatísticas
        const estatisticas = calcularEstatisticas(altitudes, distancias);
        estatisticas.distanciaTotal = distanciaTotal;
        
        // Desenhar gráfico
        await desenharGraficoPerfil(altitudes, distancias, estatisticas);
        
        // Atualizar estatísticas
        atualizarEstatisticas(estatisticas);
        
        console.log('📊 Perfil de elevação gerado com sucesso!');
        
    } catch (error) {
        console.error('Erro ao gerar perfil:', error);
        graficoContainer.innerHTML = `<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #ef4444;">❌ Erro ao carregar perfil: ${error.message}</div>`;
    }
}

// ======================================
// CALCULAR DISTÂNCIA ENTRE DOIS PONTOS
// ======================================

function calcularDistanciaEntrePontos(p1, p2) {
    const R = 6371000;
    const dLat = (p2.lat - p1.lat) * Math.PI / 180;
    const dLng = (p2.lng - p1.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(p1.lat * Math.PI/180) * Math.cos(p2.lat * Math.PI/180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// ======================================
// FECHAR PERFIL
// ======================================

function fecharPerfilElevacao() {
    if (perfilChart) {
        perfilChart.destroy();
        perfilChart = null;
    }
    if (perfilModal) {
        perfilModal.remove();
        perfilModal = null;
    }
}

// ======================================
// ADICIONAR BOTÃO NO PAINEL DA ROTA
// ======================================

function adicionarBotaoPerfilElevacao() {
    const routeInfo = document.getElementById('route-info');
    if (!routeInfo) return;
    
    // Verificar se botão já existe
    if (document.getElementById('btn-perfil-elevacao')) return;
    
    const btnPerfil = document.createElement('button');
    btnPerfil.id = 'btn-perfil-elevacao';
    btnPerfil.innerHTML = '📈 Ver Perfil de Elevação';
    btnPerfil.style.cssText = `
        margin-top: 8px;
        padding: 8px 16px;
        background: linear-gradient(135deg, #10b981, #059669);
        border: none;
        border-radius: 10px;
        color: white;
        font-weight: bold;
        cursor: pointer;
        width: 100%;
        transition: transform 0.2s;
    `;
    btnPerfil.onmouseenter = () => btnPerfil.style.transform = 'scale(1.02)';
    btnPerfil.onmouseleave = () => btnPerfil.style.transform = 'scale(1)';
    btnPerfil.onclick = () => mostrarPerfilElevacao();
    
    routeInfo.appendChild(btnPerfil);
}

// ======================================
// OBSERVAR MUDANÇAS NO ROUTE-INFO
// ======================================

function iniciarObservadorPerfil() {
    const observer = new MutationObserver(() => {
        const routeInfo = document.getElementById('route-info');
        if (routeInfo && routeInfo.style.display === 'block') {
            adicionarBotaoPerfilElevacao();
        }
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
    console.log('👁️ Observador de perfil de elevação iniciado');
}

// ======================================
// INICIALIZAÇÃO
// ======================================

setTimeout(() => {
    iniciarObservadorPerfil();
    console.log('📈 Sistema de Perfil de Elevação carregado!');
}, 1000);

// Exportar funções
window.mostrarPerfilElevacao = mostrarPerfilElevacao;
window.fecharPerfilElevacao = fecharPerfilElevacao;
window.adicionarBotaoPerfilElevacao = adicionarBotaoPerfilElevacao;