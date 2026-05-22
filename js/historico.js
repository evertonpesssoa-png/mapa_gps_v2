// ======================================
// HISTÓRICO DE ROTAS E POIs
// ======================================

// Estrutura do histórico
let historicoData = {
    favoritos: [],
    recentes: [],
    rotas: []
};

// Limite máximo de itens
const MAX_RECENTES = 20;
const MAX_ROTAS = 30;

// ======================================
// CARREGAR HISTÓRICO DO LOCALSTORAGE
// ======================================

function carregarHistorico() {
    const saved = localStorage.getItem('mapa_historico');
    if (saved) {
        try {
            historicoData = JSON.parse(saved);
            console.log(`📚 Histórico carregado: ${historicoData.favoritos.length} favoritos, ${historicoData.recentes.length} recentes, ${historicoData.rotas.length} rotas`);
        } catch(e) {
            console.warn('Erro ao carregar histórico:', e);
        }
    }
    atualizarMenuHistorico();
}

// ======================================
// SALVAR HISTÓRICO NO LOCALSTORAGE
// ======================================

function salvarHistorico() {
    localStorage.setItem('mapa_historico', JSON.stringify(historicoData));
    console.log('💾 Histórico salvo');
}

// ======================================
// ADICIONAR LOCAL RECENTE
// ======================================

function adicionarLocalRecente(nome, lat, lng, categoria) {
    // Evitar duplicatas recentes (mesmo local)
    const existe = historicoData.recentes.some(item => 
        item.nome === nome && Math.abs(item.lat - lat) < 0.0001
    );
    
    if (existe) return;
    
    const recente = {
        nome: nome,
        lat: lat,
        lng: lng,
        categoria: categoria,
        data: new Date().toISOString(),
        dataFormatada: new Date().toLocaleString('pt-BR')
    };
    
    historicoData.recentes.unshift(recente);
    
    // Limitar tamanho
    if (historicoData.recentes.length > MAX_RECENTES) {
        historicoData.recentes.pop();
    }
    
    salvarHistorico();
    atualizarMenuHistorico();
    console.log(`📌 Local adicionado aos recentes: ${nome}`);
}

// ======================================
// ADICIONAR ROTA AO HISTÓRICO
// ======================================

function adicionarRotaHistorico(origem, destino, distancia, tempo, modo) {
    const rota = {
        id: Date.now(),
        origem: typeof origem === 'object' ? origem.name : origem,
        origemLat: typeof origem === 'object' ? origem.lat : null,
        origemLng: typeof origem === 'object' ? origem.lng : null,
        destino: typeof destino === 'object' ? destino.name : destino,
        destinoLat: typeof destino === 'object' ? destino.lat : null,
        destinoLng: typeof destino === 'object' ? destino.lng : null,
        distancia: distancia,
        tempo: tempo,
        modo: modo,
        data: new Date().toISOString(),
        dataFormatada: new Date().toLocaleString('pt-BR')
    };
    
    historicoData.rotas.unshift(rota);
    
    if (historicoData.rotas.length > MAX_ROTAS) {
        historicoData.rotas.pop();
    }
    
    salvarHistorico();
    atualizarMenuHistorico();
    console.log(`🗺️ Rota adicionada ao histórico: ${origem.name || origem} → ${destino.name || destino}`);
}

// ======================================
// ADICIONAR FAVORITO
// ======================================

function adicionarFavorito(nome, lat, lng, categoria) {
    // Verificar se já existe
    const existe = historicoData.favoritos.some(item => 
        item.nome === nome && Math.abs(item.lat - lat) < 0.0001
    );
    
    if (existe) {
        alert('⚠️ Este local já está nos favoritos!');
        return false;
    }
    
    const favorito = {
        id: Date.now(),
        nome: nome,
        lat: lat,
        lng: lng,
        categoria: categoria,
        dataAdicionado: new Date().toISOString()
    };
    
    historicoData.favoritos.push(favorito);
    salvarHistorico();
    atualizarMenuHistorico();
    console.log(`⭐ Favorito adicionado: ${nome}`);
    return true;
}

// ======================================
// REMOVER FAVORITO
// ======================================

function removerFavorito(id) {
    historicoData.favoritos = historicoData.favoritos.filter(f => f.id !== id);
    salvarHistorico();
    atualizarMenuHistorico();
    console.log(`⭐ Favorito removido`);
}

// ======================================
// LIMPAR HISTÓRICO
// ======================================

function limparHistorico() {
    if (confirm('Tem certeza que deseja limpar todo o histórico? (Favoritos não serão removidos)')) {
        historicoData.recentes = [];
        historicoData.rotas = [];
        salvarHistorico();
        atualizarMenuHistorico();
        console.log('🗑️ Histórico limpo');
        alert('✅ Histórico limpo!');
    }
}

// ======================================
// ATUALIZAR MENU DE HISTÓRICO
// ======================================

function atualizarMenuHistorico() {
    const container = document.getElementById('historico-details');
    if (!container) return;
    
    if (historicoData.favoritos.length === 0 && historicoData.recentes.length === 0 && historicoData.rotas.length === 0) {
        container.innerHTML = `
            <div class="historico-vazio">
                <p>📭 Nenhum item no histórico</p>
                <p style="font-size: 12px;">Pesquise lugares ou trace rotas para aparecerem aqui</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    
    // FAVORITOS
    if (historicoData.favoritos.length > 0) {
        html += `
            <div class="historico-secao">
                <div class="historico-secao-titulo">⭐ FAVORITOS</div>
                ${historicoData.favoritos.map(f => `
                    <div class="historico-item" onclick="window.irParaLocal(${f.lat}, ${f.lng}, '${f.nome}')">
                        <div class="historico-item-icon">${getIconForCategory(f.categoria)}</div>
                        <div class="historico-item-info">
                            <div class="historico-item-nome">${f.nome}</div>
                            <div class="historico-item-categoria">${f.categoria || 'Local'}</div>
                        </div>
                        <button class="historico-item-remover" onclick="event.stopPropagation(); window.removerFavorito(${f.id})" title="Remover dos favoritos">✕</button>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    // RECENTES
    if (historicoData.recentes.length > 0) {
        html += `
            <div class="historico-secao">
                <div class="historico-secao-titulo">🕐 RECENTES</div>
                ${historicoData.recentes.map(r => `
                    <div class="historico-item" onclick="window.irParaLocal(${r.lat}, ${r.lng}, '${r.nome}')">
                        <div class="historico-item-icon">${getIconForCategory(r.categoria)}</div>
                        <div class="historico-item-info">
                            <div class="historico-item-nome">${r.nome}</div>
                            <div class="historico-item-data">${r.dataFormatada}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    // ROTAS SALVAS
    if (historicoData.rotas.length > 0) {
        html += `
            <div class="historico-secao">
                <div class="historico-secao-titulo">🗺️ ROTAS SALVAS</div>
                ${historicoData.rotas.map(r => `
                    <div class="historico-item" onclick="window.recarregarRota(${JSON.stringify(r).replace(/"/g, '&quot;')})">
                        <div class="historico-item-icon">${r.modo === 'car' ? '🚗' : r.modo === 'foot' ? '🚶' : '🚴'}</div>
                        <div class="historico-item-info">
                            <div class="historico-item-nome">${r.origem} → ${r.destino}</div>
                            <div class="historico-item-data">📏 ${r.distancia} • ⏱️ ${r.tempo} • ${r.dataFormatada}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    // Botão limpar histórico
    html += `
        <div class="historico-actions">
            <button class="historico-btn-limpar" onclick="window.limparHistorico()">🗑️ Limpar histórico</button>
        </div>
    `;
    
    container.innerHTML = html;
}

// ======================================
// IR PARA LOCAL (usado pelo histórico)
// ======================================

function irParaLocal(lat, lng, nome) {
    if (window.map) {
        window.map.setView([lat, lng], 16);
        // Opcional: mostrar um toast ou popup
        if (typeof window.mostrarToast === 'function') {
            window.mostrarToast(`📍 Navegando para: ${nome}`);
        } else {
            alert(`📍 Navegando para: ${nome}`);
        }
    }
}

// ======================================
// RECARREGAR ROTA (usado pelo histórico)
// ======================================

async function recarregarRota(rota) {
    if (rota.origemLat && rota.destinoLat) {
        if (typeof window.createRoute === 'function') {
            await window.createRoute(
                `${rota.origemLat},${rota.origemLng}`,
                `${rota.destinoLat},${rota.destinoLng}`,
                rota.modo
            );
            if (typeof window.mostrarToast === 'function') {
                window.mostrarToast(`🗺️ Rota carregada: ${rota.origem} → ${rota.destino}`);
            }
        }
    } else {
        alert('Não foi possível recarregar esta rota');
    }
}

// ======================================
// ADICIONAR BOTÃO FAVORITAR NO POPUP
// ======================================

function adicionarBotaoFavoritarNoPopup(poi) {
    const isFavorito = historicoData.favoritos.some(f => 
        f.nome === poi.name && Math.abs(f.lat - poi.lat) < 0.0001
    );
    
    const btnTexto = isFavorito ? '⭐ Remover dos favoritos' : '⭐ Adicionar aos favoritos';
    const acao = isFavorito ? () => {
        const fav = historicoData.favoritos.find(f => f.nome === poi.name);
        if (fav) removerFavorito(fav.id);
    } : () => adicionarFavorito(poi.name, poi.lat, poi.lng, poi.category);
    
    return `<button onclick="(${acao.toString()})()" style="background: #f59e0b; border: none; color: white; padding: 6px 12px; border-radius: 20px; cursor: pointer; margin-top: 8px; width: 100%;">${btnTexto}</button>`;
}

// ======================================
// ADICIONAR ABA DE HISTÓRICO NO MENU
// ======================================

function adicionarAbaHistorico() {
    const menuTabs = document.querySelector('.menu-tabs');
    const menuContent = document.querySelector('.side-menu .menu-tabs + div');
    
    if (!menuTabs || document.getElementById('menu-tab-historico')) return;
    
    // Adicionar aba
    const newTab = document.createElement('button');
    newTab.className = 'menu-tab';
    newTab.setAttribute('data-tab', 'historico');
    newTab.setAttribute('onclick', "window.switchMenuTab?.('historico')");
    newTab.innerHTML = '📜 Histórico';
    menuTabs.appendChild(newTab);
    
    // Adicionar conteúdo
    const newContent = document.createElement('div');
    newContent.id = 'menu-tab-historico';
    newContent.className = 'menu-tab-content';
    newContent.innerHTML = '<div id="historico-details" class="historico-container">📚 Carregando histórico...</div>';
    menuContent.parentNode.appendChild(newContent);
    
    // Atualizar conteúdo
    atualizarMenuHistorico();
}

// ======================================
// CSS DO HISTÓRICO (será adicionado dinamicamente)
// ======================================

function adicionarCSSHistorico() {
    const style = document.createElement('style');
    style.textContent = `
        .historico-container {
            max-height: 500px;
            overflow-y: auto;
        }
        
        .historico-vazio {
            text-align: center;
            padding: 40px 20px;
            color: var(--text-secondary);
        }
        
        .historico-secao {
            margin-bottom: 20px;
        }
        
        .historico-secao-titulo {
            font-size: 12px;
            font-weight: bold;
            color: var(--accent-color);
            margin-bottom: 10px;
            padding-bottom: 5px;
            border-bottom: 1px solid var(--card-border);
        }
        
        .historico-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 10px;
            margin-bottom: 8px;
            background: var(--bg-secondary);
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.2s ease;
        }
        
        .historico-item:hover {
            background: var(--bg-tertiary);
            transform: scale(1.01);
        }
        
        .historico-item-icon {
            font-size: 24px;
        }
        
        .historico-item-info {
            flex: 1;
        }
        
        .historico-item-nome {
            font-size: 14px;
            font-weight: bold;
            color: var(--text-primary);
        }
        
        .historico-item-categoria,
        .historico-item-data {
            font-size: 11px;
            color: var(--text-tertiary);
        }
        
        .historico-item-remover {
            background: none;
            border: none;
            font-size: 16px;
            cursor: pointer;
            color: var(--text-tertiary);
            padding: 4px 8px;
            border-radius: 50%;
            transition: all 0.2s ease;
        }
        
        .historico-item-remover:hover {
            background: #ef4444;
            color: white;
        }
        
        .historico-actions {
            margin-top: 20px;
            text-align: center;
        }
        
        .historico-btn-limpar {
            background: #ef4444;
            color: white;
            border: none;
            border-radius: 25px;
            padding: 8px 16px;
            cursor: pointer;
            font-size: 12px;
            transition: all 0.2s ease;
        }
        
        .historico-btn-limpar:hover {
            background: #dc2626;
            transform: scale(1.02);
        }
    `;
    document.head.appendChild(style);
}

// ======================================
// INICIALIZAÇÃO
// ======================================

function iniciarHistorico() {
    carregarHistorico();
    adicionarCSSHistorico();
    setTimeout(() => {
        adicionarAbaHistorico();
    }, 500);
}

// Exportar funções
window.historicoData = historicoData;
window.adicionarLocalRecente = adicionarLocalRecente;
window.adicionarRotaHistorico = adicionarRotaHistorico;
window.adicionarFavorito = adicionarFavorito;
window.removerFavorito = removerFavorito;
window.limparHistorico = limparHistorico;
window.irParaLocal = irParaLocal;
window.recarregarRota = recarregarRota;
window.iniciarHistorico = iniciarHistorico;

console.log('✅ Sistema de histórico carregado');