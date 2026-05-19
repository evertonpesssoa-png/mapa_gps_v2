// ======================================
// CHAT DO ASURA - COPILOTO DO MAPA
// ======================================

class AsuraChat {
  constructor() {
    this.currentAsura = 'diva';
    this.isOpen = true;
    this.messages = [];
    
    // ======================================
    // TODOS OS 9 ASURAS
    // ======================================
    this.asuraConfig = {
      diva: {
        id: 'diva',
        name: 'DIVA',
        icon: '🤖',
        color: '#ff4db8',
        gradient: 'linear-gradient(135deg, #ff4db8, #ff88dd)',
        welcome: '✨ Olá! Sou DIVA, sua assistente de automação. Posso te ajudar a encontrar farmácias, mercados, restaurantes e muito mais!',
        categories: ['pharmacy', 'supermarket', 'restaurant', 'cafe', 'gas_station', 'bakery', 'mall']
      },
      siria: {
        id: 'siria',
        name: 'SIRIA',
        icon: '🌳',
        color: '#35ff9c',
        gradient: 'linear-gradient(135deg, #35ff9c, #00cc66)',
        welcome: '🌳 Sou SIRIA, especialista em finanças. Posso te ajudar a encontrar bancos, caixas eletrônicos e agências.',
        categories: ['bank', 'atm', 'finance', 'exchange']
      },
      merlim: {
        id: 'merlim',
        name: 'MERLIM',
        icon: '🔧',
        color: '#00d9ff',
        gradient: 'linear-gradient(135deg, #00d9ff, #00aaff)',
        welcome: '🔧 Aqui é MERLIM! Especialista em tecnologia. Posso encontrar lojas de informática, assistência técnica e coworking.',
        categories: ['electronics', 'computer', 'tech', 'coworking']
      },
      astreia: {
        id: 'astreia',
        name: 'ASTREIA',
        icon: '👁️',
        color: '#287bff',
        gradient: 'linear-gradient(135deg, #287bff, #44aaff)',
        welcome: '👁️ ASTREIA online. Monitoro segurança. Posso mostrar delegacias, hospitais e áreas seguras.',
        categories: ['police', 'hospital', 'medical', 'security']
      },
      umbra: {
        id: 'umbra',
        name: 'UMBRA',
        icon: '🕵️',
        color: '#8b2fff',
        gradient: 'linear-gradient(135deg, #8b2fff, #aa55ff)',
        welcome: '🕵️ Umbra aqui. Investigação e rastreamento. Posso ajudar a localizar locais específicos.',
        categories: ['detective', 'investigation', 'private']
      },
      atena: {
        id: 'atena',
        name: 'ATENA',
        icon: '🦉',
        color: '#ffd700',
        gradient: 'linear-gradient(135deg, #ffd700, #ffaa33)',
        welcome: '🦉 Atena, a mestra do conhecimento. Posso ajudar a encontrar escolas, bibliotecas e livrarias.',
        categories: ['school', 'university', 'library', 'bookstore']
      },
      victoria: {
        id: 'victoria',
        name: 'VICTORIA',
        icon: '🏅',
        color: '#ff0000',
        gradient: 'linear-gradient(135deg, #ff0000, #cc0000)',
        welcome: '🏅 Victoria aqui. Emergências e situações críticas. Posso mostrar hospitais, bombeiros e defesa civil.',
        categories: ['hospital', 'fire_station', 'emergency', 'civil_defense']
      },
      hestia: {
        id: 'hestia',
        name: 'HESTIA',
        icon: '🔮',
        color: '#fff0b3',
        gradient: 'linear-gradient(135deg, #fff0b3, #ffddaa)',
        welcome: '🔮 Hestia, guardiã dos princípios. Posso ajudar com tribunais, cartórios e serviços jurídicos.',
        categories: ['courthouse', 'lawyer', 'legal', 'notary']
      },
      daedala: {
        id: 'daedala',
        name: 'DAEDALA',
        icon: '⚗️',
        color: '#00ffd5',
        gradient: 'linear-gradient(135deg, #00ffd5, #00ccaa)',
        welcome: '⚗️ Daedala, a inventora! Posso encontrar laboratórios, centros de pesquisa e inovação.',
        categories: ['laboratory', 'research', 'science', 'innovation']
      }
    };
    
    this.init();
  }
  
  init() {
    this.cacheElements();
    this.bindEvents();
    this.populateAsuraSelector();
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
  
  populateAsuraSelector() {
    if (!this.asuraSelector) return;
    
    const asuras = [
      { id: 'diva', name: 'DIVA', icon: '🤖', desc: 'Automação' },
      { id: 'siria', name: 'SIRIA', icon: '🌳', desc: 'Finanças' },
      { id: 'merlim', name: 'MERLIM', icon: '🔧', desc: 'Tecnologia' },
      { id: 'astreia', name: 'ASTREIA', icon: '👁️', desc: 'Segurança' },
      { id: 'umbra', name: 'UMBRA', icon: '🕵️', desc: 'Investigação' },
      { id: 'atena', name: 'ATENA', icon: '🦉', desc: 'Conhecimento' },
      { id: 'victoria', name: 'VICTORIA', icon: '🏅', desc: 'Emergência' },
      { id: 'hestia', name: 'HESTIA', icon: '🔮', desc: 'Justiça' },
      { id: 'daedala', name: 'DAEDALA', icon: '⚗️', desc: 'Inovação' }
    ];
    
    this.asuraSelector.innerHTML = asuras.map(asura => `
      <option value="${asura.id}">${asura.icon} ${asura.name} - ${asura.desc}</option>
    `).join('');
  }
  
  bindEvents() {
    // Header toggle (minimizar/expandir)
    if (this.chatHeader) {
      this.chatHeader.addEventListener('click', (e) => {
        if (e.target.closest('.chat-controls')) return;
        this.toggleMinimize();
      });
    }
    
    // Botão minimizar
    if (this.chatMinimizeBtn) {
      this.chatMinimizeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleMinimize();
      });
    }
    
    // Botão fechar (esconder completamente)
    if (this.chatCloseBtn) {
      this.chatCloseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.close();
      });
    }
    
    // Botão abrir (quando fechado)
    if (this.openChatBtn) {
      this.openChatBtn.addEventListener('click', () => {
        this.open();
      });
    }
    
    // Seleção de Asura
    if (this.asuraSelector) {
      this.asuraSelector.addEventListener('change', (e) => {
        this.currentAsura = e.target.value;
        this.updateAsuraTheme();
        this.addMessage(this.asuraConfig[this.currentAsura].welcome, false);
      });
    }
    
    // Envio de mensagem
    if (this.sendBtn) {
      this.sendBtn.addEventListener('click', () => this.sendMessage());
    }
    
    if (this.chatInput) {
      this.chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.sendMessage();
      });
    }
  }
  
  updateAsuraTheme() {
    const config = this.asuraConfig[this.currentAsura];
    if (!config) return;
    
    const chatAvatar = document.querySelector('.chat-avatar');
    const sendBtn = document.querySelector('.chat-input-area button');
    
    if (chatAvatar) chatAvatar.style.background = config.gradient;
    if (sendBtn) sendBtn.style.background = config.gradient;
    if (this.chatAsuraName) this.chatAsuraName.textContent = config.name;
    if (this.chatAvatar) this.chatAvatar.textContent = config.icon;
    
    // Atualizar variável CSS
    document.documentElement.style.setProperty('--asura-color', config.color);
  }
  
  toggleMinimize() {
    this.isOpen = !this.isOpen;
    if (this.chat) this.chat.classList.toggle('collapsed', !this.isOpen);
    if (this.openChatBtn) this.openChatBtn.classList.toggle('hidden', this.isOpen);
  }
  
  open() {
    this.isOpen = true;
    if (this.chat) this.chat.classList.remove('collapsed');
    if (this.openChatBtn) this.openChatBtn.classList.add('hidden');
  }
  
  close() {
    this.isOpen = false;
    if (this.chat) this.chat.classList.add('collapsed');
    if (this.openChatBtn) this.openChatBtn.classList.remove('hidden');
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
    
    if (this.chatMessages) {
      this.chatMessages.appendChild(messageDiv);
      this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
      
      // Limitar mensagens
      while (this.chatMessages.children.length > 50) {
        this.chatMessages.removeChild(this.chatMessages.firstChild);
      }
    }
    
    this.messages.push({ text, isUser, time });
  }
  
  async sendMessage() {
    const message = this.chatInput?.value.trim();
    if (!message) return;
    
    this.addMessage(message, true);
    if (this.chatInput) this.chatInput.value = '';
    
    // Mostrar indicador de "pensando"
    const thinkingDiv = document.createElement('div');
    thinkingDiv.className = 'message asura';
    thinkingDiv.innerHTML = `
      <div class="message-avatar">${this.asuraConfig[this.currentAsura].icon}</div>
      <div class="message-content"><em>🧠 processando...</em></div>
    `;
    
    if (this.chatMessages) {
      this.chatMessages.appendChild(thinkingDiv);
      this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }
    
    // Processar comando
    setTimeout(async () => {
      if (thinkingDiv) thinkingDiv.remove();
      
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
    
    // Mapeamento de palavras-chave por categoria (para todos os Asuras)
    const keywordMap = {
      'farmácia': 'pharmacy', 'farmacia': 'pharmacy', 'remédio': 'pharmacy',
      'mercado': 'supermarket', 'supermercado': 'supermarket', 'compras': 'supermarket',
      'restaurante': 'restaurant', 'comer': 'restaurant', 'lanche': 'restaurant',
      'banco': 'bank', 'agência': 'bank', 'caixa': 'bank',
      'delegacia': 'police', 'polícia': 'police', 'policia': 'police',
      'hospital': 'hospital', 'pronto-socorro': 'hospital', 'upa': 'hospital',
      'posto': 'gas_station', 'gasolina': 'gas_station',
      'escola': 'school', 'colégio': 'school', 'faculdade': 'school',
      'biblioteca': 'library', 'livraria': 'bookstore',
      'bombeiro': 'fire_station', 'bombeiros': 'fire_station',
      'cartório': 'notary', 'tribunal': 'courthouse',
      'laboratório': 'laboratory', 'pesquisa': 'research'
    };
    
    let searchCategory = null;
    let displayTerm = null;
    
    // Identificar a categoria da busca
    for (const [keyword, category] of Object.entries(keywordMap)) {
      if (lower.includes(keyword)) {
        searchCategory = category;
        displayTerm = keyword;
        break;
      }
    }
    
    if (searchCategory && userPos) {
      return await this.searchAndShow(searchCategory, displayTerm, userPos);
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
  
  async searchAndShow(category, displayTerm, userPos) {
    if (!userPos) {
      return `⚠️ Não consegui obter sua localização para buscar ${displayTerm}. Verifique o GPS.`;
    }
    
    // Buscar no índice de POIs
    let results = [];
    
    if (window.poiIndex) {
      results = window.poiIndex.filter(poi => 
        poi.category === category || 
        poi.type === category ||
        poi.name?.toLowerCase().includes(category) ||
        poi.name?.toLowerCase().includes(displayTerm)
      );
    }
    
    // Filtrar por proximidade
    if (results.length > 0 && window.searchNearby) {
      results = window.searchNearby(userPos.lat, userPos.lng, 3000, category);
    }
    
    if (results.length === 0) {
      return `🔍 Não encontrei ${displayTerm} próximos a você. Tente ampliar a busca ou usar outro termo.`;
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
    
    // Ajustar zoom para mostrar os resultados
    if (window.map && results.length > 0) {
      const bounds = L.latLngBounds(results.map(r => [r.lat, r.lng]));
      bounds.extend([userPos.lat, userPos.lng]);
      window.map.fitBounds(bounds, { padding: [50, 50] });
    }
    
    const config = this.asuraConfig[this.currentAsura];
    return `${config.icon} Encontrei ${results.length} ${displayTerm} próximos a você! Eles apareceram no mapa e na lista de resultados.`;
  }
  
  getHelpMessage() {
    const config = this.asuraConfig[this.currentAsura];
    return `
      📋 <strong>${config.icon} ${config.name} pode te ajudar com:</strong><br>
      <br>
      🗺️ <strong>Buscas no mapa:</strong><br>
      • "farmácias perto de mim"<br>
      • "mercados próximos"<br>
      • "restaurantes na região"<br>
      • "bancos e agências"<br>
      • "hospitais próximos"<br>
      • "delegacias perto de mim"<br>
      • "escolas na região"<br>
      • "bibliotecas próximas"<br>
      • "bombeiros"<br>
      • "cartórios"<br>
      • "laboratórios"<br>
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
      siria: [
        "💰 Posso te ajudar com serviços financeiros. Tente 'bancos próximos' ou 'caixas eletrônicos'.",
        "📈 Quer encontrar agências bancárias? É só me pedir! Exemplo: 'mostra bancos perto de mim'.",
        "💵 Estou aqui para auxiliar com suas necessidades financeiras. Que tipo de estabelecimento você procura?"
      ],
      merlim: [
        "🔧 Tecnologia é minha especialidade! Tente 'lojas de informática' ou 'assistência técnica'.",
        "💻 Posso encontrar espaços de coworking, lojas de eletrônicos e muito mais. O que você precisa?",
        "🖥️ Que tal encontrar uma loja de tecnologia? É só me perguntar!"
      ],
      astreia: [
        "👁️ Estou monitorando. Quer que eu mostre delegacias ou hospitais próximos?",
        "🛡️ Posso te ajudar a encontrar pontos de segurança. Tente 'delegacias perto de mim'.",
        "⚠️ Se precisar de segurança, me pergunte sobre hospitais ou bases policiais na região."
      ],
      umbra: [
        "🕵️ Investigando... Que local você precisa encontrar? Posso ajudar com busca detalhada.",
        "🔍 Me pergunte sobre lugares específicos e vou rastrear para você.",
        "🌑 Nas sombras, encontro qualquer local. O que você procura?"
      ],
      atena: [
        "🦉 O conhecimento está ao seu alcance! Quer encontrar escolas, bibliotecas ou livrarias?",
        "📚 Educação é minha paixão. Posso ajudar a encontrar instituições de ensino na região.",
        "🎓 Tente 'escolas perto de mim' ou 'bibliotecas próximas'."
      ],
      victoria: [
        "🏅 Emergências? Posso mostrar hospitais, bombeiros e defesa civil mais próximos.",
        "🚨 Em situações críticas, estou aqui. Tente 'hospitais perto de mim' ou 'bombeiros'.",
        "⚡ Para situações de emergência, posso encontrar os locais mais próximos para ajudar."
      ],
      hestia: [
        "⚖️ Justiça e princípios. Posso ajudar com tribunais, cartórios e serviços jurídicos.",
        "📜 Precisa de serviços legais? Me pergunte sobre cartórios ou tribunais na região.",
        "🔮 Como guardiã dos princípios, posso orientar sobre locais de justiça e cidadania."
      ],
      daedala: [
        "⚗️ Inovação e ciência! Posso encontrar laboratórios, centros de pesquisa e inovação.",
        "🔬 Que tal descobrir laboratórios ou centros de pesquisa na região? É só me pedir!",
        "🧪 Tente 'laboratórios perto de mim' ou 'centros de pesquisa'."
      ]
    };
    
    const asuraResponses = responses[this.currentAsura] || responses.diva;
    return asuraResponses[Math.floor(Math.random() * asuraResponses.length)];
  }
}

// Inicializar o chat quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  window.asuraChat = new AsuraChat();
  console.log('💬 Asura Chat inicializado com 9 Asuras!');
});