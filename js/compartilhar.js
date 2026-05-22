// ======================================
// COMPARTILHAR LOCALIZAÇÃO E ROTA
// ======================================

// URL base do seu site (substitua pelo seu domínio real)
const APP_URL = window.location.origin + window.location.pathname;

// ======================================
// COMPARTILHAR LOCALIZAÇÃO ATUAL
// ======================================

function compartilharLocalizacao() {
    if (!window.map) {
        alert('Mapa não disponível');
        return;
    }
    
    const center = window.map.getCenter();
    const zoom = window.map.getZoom();
    const lat = center.lat.toFixed(6);
    const lng = center.lng.toFixed(6);
    
    // Criar link
    const link = `${APP_URL}?lat=${lat}&lng=${lng}&zoom=${zoom}`;
    
    // Copiar para clipboard
    copiarParaClipboard(link);
    
    // Mostrar modal com opções
    mostrarModalCompartilhar(link, {
        tipo: 'localizacao',
        lat: lat,
        lng: lng,
        zoom: zoom
    });
}

// ======================================
// COMPARTILHAR ROTA ATUAL
// ======================================

function compartilharRota() {
    if (!window.currentFrom || !window.currentTo || !window.currentRoutes || window.currentRoutes.length === 0) {
        alert('Nenhuma rota ativa. Trace uma rota primeiro!');
        return;
    }
    
    const from = window.currentFrom;
    const to = window.currentTo;
    const mode = window.currentMode || 'car';
    
    const link = `${APP_URL}?from_lat=${from.lat.toFixed(6)}&from_lng=${from.lng.toFixed(6)}&to_lat=${to.lat.toFixed(6)}&to_lng=${to.lng.toFixed(6)}&route_mode=${mode}`;
    
    copiarParaClipboard(link);
    
    mostrarModalCompartilhar(link, {
        tipo: 'rota',
        from: from,
        to: to,
        mode: mode
    });
}

// ======================================
// COPIAR PARA ÁREA DE TRANSFERÊNCIA
// ======================================

async function copiarParaClipboard(texto) {
    try {
        await navigator.clipboard.writeText(texto);
        console.log('✅ Link copiado:', texto);
    } catch (err) {
        console.error('❌ Erro ao copiar:', err);
        // Fallback
        const textarea = document.createElement('textarea');
        textarea.value = texto;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
    }
}

// ======================================
// MOSTRAR MODAL DE COMPARTILHAMENTO
// ======================================

function mostrarModalCompartilhar(link, dados) {
    // Remover modal existente
    const modalExistente = document.getElementById('share-modal');
    if (modalExistente) modalExistente.remove();
    
    // Criar modal
    const modal = document.createElement('div');
    modal.id = 'share-modal';
    modal.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: var(--card-bg, white);
        color: var(--text-primary, #1a1a2e);
        border-radius: 20px;
        padding: 24px;
        z-index: 20010;
        box-shadow: 0 4px 30px rgba(0,0,0,0.3);
        max-width: 90vw;
        width: 400px;
        text-align: center;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    `;
    
    const titulo = dados.tipo === 'rota' ? '🗺️ Compartilhar Rota' : '📍 Compartilhar Localização';
    const subtitulo = dados.tipo === 'rota' 
        ? `Rota de "${dados.from.name || 'origem'}" para "${dados.to.name || 'destino'}"`
        : `Lat: ${dados.lat} | Lng: ${dados.lng}`;
    
    modal.innerHTML = `
        <div style="margin-bottom: 16px;">
            <h3 style="margin: 0;">${titulo}</h3>
            <p style="font-size: 12px; color: var(--text-secondary, #666); margin-top: 8px;">${subtitulo}</p>
        </div>
        
        <div style="background: var(--bg-secondary, #f5f5f5); border-radius: 12px; padding: 12px; margin-bottom: 16px;">
            <code id="share-link" style="word-break: break-all; font-size: 12px;">${link}</code>
        </div>
        
        <div style="display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; margin-bottom: 16px;">
            <button onclick="copiarLink()" style="background: #4a90e2; color: white; border: none; border-radius: 25px; padding: 8px 20px; cursor: pointer;">
                📋 Copiar Link
            </button>
            <button onclick="compartilharWhatsApp()" style="background: #25D366; color: white; border: none; border-radius: 25px; padding: 8px 20px; cursor: pointer;">
                💬 WhatsApp
            </button>
            <button onclick="compartilharTelegram()" style="background: #0088cc; color: white; border: none; border-radius: 25px; padding: 8px 20px; cursor: pointer;">
                ✈️ Telegram
            </button>
        </div>
        
        <div style="margin-bottom: 16px;">
            <p style="font-size: 12px; margin-bottom: 8px;">📱 Ou escaneie o QR Code:</p>
            <div id="qr-code" style="display: flex; justify-content: center;"></div>
        </div>
        
        <button onclick="fecharModalCompartilhar()" style="background: var(--bg-secondary, #eee); color: var(--text-primary, #333); border: none; border-radius: 25px; padding: 8px 20px; cursor: pointer;">
            Fechar
        </button>
    `;
    
    document.body.appendChild(modal);
    
    // Adicionar fundo escuro
    const overlay = document.createElement('div');
    overlay.id = 'share-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        z-index: 20005;
    `;
    overlay.onclick = fecharModalCompartilhar;
    document.body.appendChild(overlay);
    
    // Gerar QR Code (se a biblioteca estiver disponível)
    if (typeof QRCode === 'function') {
        new QRCode(document.getElementById('qr-code'), {
            text: link,
            width: 128,
            height: 128,
            colorDark: '#000000',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.H
        });
    } else {
        document.getElementById('qr-code').innerHTML = '<span style="font-size: 12px;">📱 Escaneie: ' + link + '</span>';
    }
    
    window._shareLink = link;
}

function fecharModalCompartilhar() {
    const modal = document.getElementById('share-modal');
    const overlay = document.getElementById('share-overlay');
    if (modal) modal.remove();
    if (overlay) overlay.remove();
}

function copiarLink() {
    if (window._shareLink) {
        copiarParaClipboard(window._shareLink);
        mostrarToast('✅ Link copiado!');
    }
}

function compartilharWhatsApp() {
    if (window._shareLink) {
        const text = encodeURIComponent(`🗺️ Confira esta localização no mapa: ${window._shareLink}`);
        window.open(`https://wa.me/?text=${text}`, '_blank');
    }
}

function compartilharTelegram() {
    if (window._shareLink) {
        const text = encodeURIComponent(`🗺️ Confira esta localização no mapa: ${window._shareLink}`);
        window.open(`https://t.me/share/url?url=${encodeURIComponent(window._shareLink)}&text=${text}`, '_blank');
    }
}

function mostrarToast(mensagem) {
    let toast = document.getElementById('share-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'share-toast';
        toast.style.cssText = `
            position: fixed;
            bottom: 100px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 8px 16px;
            border-radius: 25px;
            font-size: 14px;
            z-index: 20015;
        `;
        document.body.appendChild(toast);
    }
    toast.textContent = mensagem;
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, 2000);
}

// ======================================
// CARREGAR PARÂMETROS DA URL (ABRIR LOCALIZAÇÃO/ROTA)
// ======================================

function carregarParametrosURL() {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Verificar se é compartilhamento de localização
    const lat = urlParams.get('lat');
    const lng = urlParams.get('lng');
    const zoom = urlParams.get('zoom');
    
    if (lat && lng) {
        setTimeout(() => {
            if (window.map) {
                window.map.setView([parseFloat(lat), parseFloat(lng)], zoom ? parseInt(zoom) : 15);
                console.log('📍 Navegando para localização compartilhada:', lat, lng);
                mostrarToast('📍 Localização compartilhada!');
            }
        }, 1000);
    }
    
    // Verificar se é compartilhamento de rota
    const fromLat = urlParams.get('from_lat');
    const fromLng = urlParams.get('from_lng');
    const toLat = urlParams.get('to_lat');
    const toLng = urlParams.get('to_lng');
    const routeMode = urlParams.get('route_mode') || 'car';
    
    if (fromLat && fromLng && toLat && toLng) {
        setTimeout(async () => {
            if (window.map && typeof window.createRoute === 'function') {
                console.log('🗺️ Carregando rota compartilhada...');
                mostrarToast('🗺️ Carregando rota compartilhada...');
                await window.createRoute(
                    `${fromLat},${fromLng}`,
                    `${toLat},${toLng}`,
                    routeMode
                );
            }
        }, 1500);
    }
}

// ======================================
// ADICIONAR BOTÃO DE COMPARTILHAR NO MAPA
// ======================================

function adicionarBotaoCompartilhar() {
    const mapControls = document.querySelector('.map-controls');
    if (!mapControls || document.getElementById('btn-compartilhar')) return;
    
    const btnCompartilhar = document.createElement('button');
    btnCompartilhar.id = 'btn-compartilhar';
    btnCompartilhar.className = 'control-btn';
    btnCompartilhar.innerHTML = '🔗';
    btnCompartilhar.title = 'Compartilhar localização/rota';
    btnCompartilhar.onclick = () => {
        if (window.currentRoutes && window.currentRoutes.length > 0) {
            compartilharRota();
        } else {
            compartilharLocalizacao();
        }
    };
    mapControls.appendChild(btnCompartilhar);
}

// ======================================
// CARREGAR QR CODE LIBRARY (OPCIONAL)
// ======================================

function carregarQRCodeLib() {
    if (typeof QRCode === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js';
        script.onload = () => console.log('✅ QRCode.js carregado');
        document.head.appendChild(script);
    }
}

// ======================================
// INICIALIZAÇÃO
// ======================================

setTimeout(() => {
    adicionarBotaoCompartilhar();
    carregarQRCodeLib();
    carregarParametrosURL();
}, 1000);

window.compartilharLocalizacao = compartilharLocalizacao;
window.compartilharRota = compartilharRota;
window.fecharModalCompartilhar = fecharModalCompartilhar;
window.copiarLink = copiarLink;
window.compartilharWhatsApp = compartilharWhatsApp;
window.compartilharTelegram = compartilharTelegram;

console.log('✅ Sistema de compartilhamento carregado');