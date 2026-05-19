// ======================================
// CHAT DO ASURA - COPILOTO DO MAPA
// ======================================

class AsuraChat {
  constructor() {
    this.currentAsura = 'diva';
    this.isOpen = true;
    this.messages = [];
    this.asuraConfig = {
      diva: {
        name: 'DIVA',
        icon: '🤖',
        color: '#ff4db8',
        gradient: 'linear-gradient(135deg, #ff4db8, #ff88dd)',
        welcome: '✨ Olá! Sou DIVA, sua assistente de automação. Posso te ajudar a encontrar farmácias, mercados, restaurantes e muito mais!'
      },
      astreia: {
        name: 'ASTREIA',
        icon: '👁️',
        color: '#287bff',
        gradient: 'linear-gradient(135deg, #287bff, #44aaff)',
        welcome: '👁️ Aqui é ASTREIA. Estou monitorando a segurança da região. Posso te mostrar delegacias, hospitais e áreas seguras.'
      },
      siria: {
        name: 'SIRIA',
        icon: '🌳',
        color: '#35ff9c',
        gradient: 'linear-gradient(135deg, #35ff9c, #00cc66)',
        welcome: '🌳 Sou SIRIA, especialista em finanças. Posso te ajudar a encontrar bancos, caixas eletrônicos e agências próximas.'
      }
    };
    
    this.init();
  }
  
  init() {
    this.cacheElements();
    this.bindEvents();
    this.updateAsuraTheme();
    this.addMessage(this.asuraConfig[this.currentAsura].welcome, false);
  }
  
  cacheElements() {
    this.chat = document.getElementById('asura-chat');
    this.chatHeader = document.getElementById('chatHeader');
    this.chatBody = document.getElementById('chatBody');
    this.chatMessages = document.getElementById('chatMessages');
    this.chatInput = document.getElementById('chatInput');
    this.sendBtn = document.getElementById('sendChatBtn');
    this.asuraSelector = document.getElementById('asuraSelector');
    this.chatAvatar = document.getElementById('chatAvatar');
    this.chatAsuraName = document.getElementById('chatAsuraName');
    this.openChatBtn = document.getElementById('openChatBtn');
    this.chatMinimizeBtn = document.getElementById('chatMinimizeBtn');
    this.chatCloseBtn = document.getElementById('chatCloseBtn');
  }
  
  bindEvents() {
    // Header toggle (minimizar/expandir)
    this.chatHeader.addEventListener('click', (e) => {
      if (e.target.closest('.chat-controls')) return;
      this.toggleMinimize();
    });
    
    // Botão minimizar
    this.chatMinimizeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleMinimize();
    });
    
    // Botão fechar (esconder completamente)
    this.chatCloseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.close();
    });
    
    // Botão abrir (quando fechado)
    this.openChatBtn.addEventListener('click', () => {
      this.open();
    });
    
    // Seleção de Asura
    this.asuraSelector.addEventListener('change', (e) => {
      this.currentAsura = e.target.value;
      this.updateAsuraTheme();
      this.addMessage(this.asuraConfig[this.currentAsura].welcome, false);
    });
    
    // Envio de mensagem
    this.sendBtn.addEventListener('click', () => this.sendMessage());
    this.chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.sendMessage();
    });
  }
  
  updateAsuraTheme() {
    const config = this.asuraConfig[this.currentAsura];
    const chatAvatar = document.querySelector('.chat-avatar');
    const sendBtn = document.querySelector('.chat-input-area button');
    const messageAvatars = document.querySelectorAll('.message.asura .message-avatar');
    
    chatAvatar.style.background = config.gradient;
    sendBtn.style.background = config.gradient;
    this.chatAsuraName.textContent = config.name;
    this.chatAvatar.textContent = config.icon;
    
    // Atualizar variável CSS
    document.documentElement.style.setProperty('--asura-color', config.color);
  }
  
  toggleMinimize() {
    this.isOpen = !this.isOpen;
    this.chat.classList.toggle('collapsed', !this.isOpen);
    this.openChatBtn.classList.toggle('hidden', this.isOpen);
  }
  
  open() {
    this.isOpen = true;
    this.chat.classList.remove('collapsed');
    this.openChatBtn.classList.add('hidden');
  }
  
  close() {
    this.isOpen = false;
    this.chat.classList.add('collapsed');
    this.openChatBtn.classList.remove('hidden');
  }
  
  addMessage(text, isUser = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user' : 'asura'}`;
    const time = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const config = this.asuraConfig[this.currentAsura];
    
    messageDiv.innerHTML = `
      <div class="message-avatar">${isUser ? '👤' : config.icon}</div>
      <div class="message-content">
        ${text}
        <div class="message-time">${time}</div>
      </div>
    `;
    
    this.chatMessages.appendChild(messageDiv);
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    
    // Limitar mensagens
    while (this.chatMessages.children.length > 50) {
      this.chatMessages.removeChild(this.chatMessages.firstChild);
    }
    
    this.messages.push({ text, isUser, time });
  }
  
  async sendMessage() {
    const message = this.chatInput.value.trim();
    if (!message) return;
    
    this.addMessage(message, true);
    this.chatInput.value = '';
    
    // Mostrar indicador de "pensando"
    const thinkingDiv = document.createElement('div');
    thinkingDiv.className = 'message asura';
    thinkingDiv.innerHTML = `
      <div class="message-avatar">${this.asuraConfig[this.currentAsura].icon}</div>
      <div class="message-content"><em>🧠 processando...</em></div>
    `;
    this.chatMessages.appendChild(thinkingDiv);
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    
    // Processar comando
    setTimeout(async () => {
      thinkingDiv.remove();
      
      const response = await this.processCommand(message);
      this.addMessage(response, false);
      
      // Se tiver síntese de voz (opcional)
      if (window.speechSynthesis) {
        const utterance = new SpeechSynthesisUtterance(response.replace(/<br>/g, '. '));
        utterance.lang = 'pt-BR';
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
      }
    }, 600);
  }
  
  async processCommand(message) {
    const lower = message.toLowerCase();
    const config = this.asuraConfig[this.currentAsura];
    const userPos = window.locationEngine?.getPosition();
    
    // Comandos de ajuda
    if (lower.includes('ajuda') || lower.includes('comandos')) {
      return this.getHelpMessage();
    }
    
    // Comandos de busca no mapa
    if (lower.includes('farmácia') || lower.includes('farmacia')) {
      return await this.searchAndShow('pharmacy', 'farmácias', userPos);
    }
    
    if (lower.includes('mercado') || lower.includes('supermercado')) {
      return await this.searchAndShow('supermarket', 'mercados', userPos);
    }
    
    if (lower.includes('restaurante')) {
      return await this.searchAndShow('restaurant', 'restaurantes', userPos);
    }
    
    if (lower.includes('banco') || lower.includes('agência')) {
      return await this.searchAndShow('bank', 'bancos e agências', userPos);
    }
    
    if (lower.includes('delegacia') || lower.includes('polícia') || lower.includes('policia')) {
      return await this.searchAndShow('police', 'delegacias', userPos);
    }
    
    if (lower.includes('hospital') || lower.includes('pronto-socorro')) {
      return await this.searchAndShow('hospital', 'hospitais e postos de saúde', userPos);
    }
    
    if (lower.includes('posto') && lower.includes('gas')) {
      return await this.searchAndShow('gas_station', 'postos de gasolina', userPos);
    }
    
    // Comandos de localização
    if (lower.includes('onde estou') || lower.includes('minha localização')) {
      if (userPos) {
        return `📍 Você está localizado em: latitude ${userPos.lat.toFixed(4)}, longitude ${userPos.lng.toFixed(4)}. Quer que eu mostre algo próximo?`;
      }
      return "📍 Não consegui obter sua localização. Verifique se o GPS está ativo.";
    }
    
    // Resposta padrão
    return this.getDefaultResponse(lower);
  }
  
  async searchAndShow(category, displayName, userPos) {
    if (!userPos) {
      return `⚠️ Não consegui obter sua localização para buscar ${displayName}. Verifique o GPS.`;
    }
    
    // Buscar no índice de POIs
    let results = [];
    
    if (window.poiIndex) {
      results = window.poiIndex.filter(poi => 
        poi.category === category || 
        poi.type === category ||
        poi.name?.toLowerCase().includes(category)
      );
    }
    
    // Filtrar por proximidade
    if (results.length > 0 && window.searchNearby) {
      results = window.searchNearby(userPos.lat, userPos.lng, 3000, category);
    }
    
    if (results.length === 0) {
      return `🔍 Não encontrei ${displayName} próximos a você. Tente ampliar a busca ou usar outro termo.`;
    }
    
    // Renderizar no painel de busca
    if (typeof window.renderResults === 'function') {
      window.renderResults(results.slice(0, 10));
    }
    
    // Abrir painel de busca
    const searchPanel = document.getElementById('search-panel');
    if (searchPanel) {
      searchPanel.style.display = 'block';
    }
    
    // Criar marcadores no mapa
    if (window.poiLayer) {
      results.forEach(poi => {
        if (poi.lat && poi.lng && !poi.marker) {
          const marker = L.marker([poi.lat, poi.lng], {
            icon: L.divIcon({
              html: `<div style="background: ${this.asuraConfig[this.currentAsura].color}; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 12px; color: white;">📍</div>`,
              iconSize: [24, 24]
            })
          }).bindPopup(`<b>${poi.name}</b><br>📍 ${poi.category}`);
          
          marker.addTo(window.poiLayer);
          poi.marker = marker;
        }
      });
    }
    
    // Ajustar zoom para mostrar os resultados
    if (window.map && results.length > 0) {
      const bounds = L.latLngBounds(results.map(r => [r.lat, r.lng]));
      bounds.extend([userPos.lat, userPos.lng]);
      window.map.fitBounds(bounds, { padding: [50, 50] });
    }
    
    return `🔍 Encontrei ${results.length} ${displayName} próximos a você! Eles apareceram no mapa e na lista de resultados.`;
  }
  
  getHelpMessage() {
    const config = this.asuraConfig[this.currentAsura];
    return `
      📋 <strong>${config.name} pode te ajudar com:</strong><br>
      <br>
      🗺️ <strong>Buscas no mapa:</strong><br>
      • "farmácias perto de mim"<br>
      • "mercados próximos"<br>
      • "restaurantes na região"<br>
      • "bancos e agências"<br>
      • "hospitais próximos"<br>
      • "delegacias perto de mim"<br>
      <br>
      📍 <strong>Localização:</strong><br>
      • "onde estou"<br>
      <br>
      💡 <strong>Dica:</strong> Você também pode clicar nos marcadores do mapa para ver mais detalhes!
    `;
  }
  
  getDefaultResponse(lower) {
    const config = this.asuraConfig[this.currentAsura];
    const responses = {
      diva: [
        "🤖 Como posso automatizar sua busca? Tente 'farmácias perto de mim' ou 'mercados na região'.",
        "✨ Estou aqui para ajudar! Peça para eu encontrar lugares como restaurantes, farmácias ou mercados.",
        "💡 Dica: Você pode me perguntar sobre lugares específicos! Exemplo: 'mostra bancos próximos'."
      ],
      astreia: [
        "👁️ Estou monitorando. Quer que eu mostre delegacias ou hospitais próximos?",
        "🛡️ Posso te ajudar a encontrar pontos de segurança. Tente 'delegacias perto de mim'.",
        "⚠️ Se precisar de segurança, me pergunte sobre hospitais ou bases policiais na região."
      ],
      siria: [
        "💰 Posso te ajudar com serviços financeiros. Tente 'bancos próximos' ou 'caixas eletrônicos'.",
        "📈 Quer encontrar agências bancárias? É só me pedir! Exemplo: 'mostra bancos perto de mim'.",
        "💵 Estou aqui para auxiliar com suas necessidades financeiras. Que tipo de estabelecimento você procura?"
      ]
    };
    
    const asuraResponses = responses[this.currentAsura] || responses.diva;
    return asuraResponses[Math.floor(Math.random() * asuraResponses.length)];
  }
}

// Inicializar o chat quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  window.asuraChat = new AsuraChat();
  console.log('💬 Asura Chat inicializado!');
});