// ======================================
// CHAT DO ASURA - COPILOTO DO MAPA COM MODO JARVIS
// ======================================

class AsuraChat {
  constructor() {
    this.currentAsura = 'diva';
    this.isOpen = true;
    this.isListening = false;      // Modo Jarvis ativado?
    this.recognition = null;
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
        welcome: '✨ Olá! Sou DIVA. Clique no microfone 🎤 para ativar o MODO JARVIS (escuta contínua) ou digite sua mensagem.',
        categories: ['pharmacy', 'supermarket', 'restaurant', 'cafe', 'gas_station', 'bakery', 'mall']
      },
      siria: {
        id: 'siria',
        name: 'SIRIA',
        icon: '🌳',
        color: '#35ff9c',
        gradient: 'linear-gradient(135deg, #35ff9c, #00cc66)',
        welcome: '🌳 Sou SIRIA. Clique no microfone 🎤 para ativar o MODO JARVIS e falar sobre finanças!',
        categories: ['bank', 'atm', 'finance', 'exchange']
      },
      merlim: {
        id: 'merlim',
        name: 'MERLIM',
        icon: '🔧',
        color: '#00d9ff',
        gradient: 'linear-gradient(135deg, #00d9ff, #00aaff)',
        welcome: '🔧 MERLIM aqui. Ative o modo Jarvis 🎤 para comandos de voz sobre tecnologia!',
        categories: ['electronics', 'computer', 'tech', 'coworking']
      },
      astreia: {
        id: 'astreia',
        name: 'ASTREIA',
        icon: '👁️',
        color: '#287bff',
        gradient: 'linear-gradient(135deg, #287bff, #44aaff)',
        welcome: '👁️ ASTREIA online. Ative o microfone 🎤 para falar sobre segurança no mapa!',
        categories: ['police', 'hospital', 'medical', 'security']
      },
      umbra: {
        id: 'umbra',
        name: 'UMBRA',
        icon: '🕵️',
        color: '#8b2fff',
        gradient: 'linear-gradient(135deg, #8b2fff, #aa55ff)',
        welcome: '🕵️ Umbra aqui. Use o microfone 🎤 para comandos de voz sobre investigação!',
        categories: ['detective', 'investigation', 'private']
      },
      atena: {
        id: 'atena',
        name: 'ATENA',
        icon: '🦉',
        color: '#ffd700',
        gradient: 'linear-gradient(135deg, #ffd700, #ffaa33)',
        welcome: '🦉 Atena, a mestra do conhecimento. Ative o modo Jarvis 🎤 para aprender!',
        categories: ['school', 'university', 'library', 'bookstore']
      },
      victoria: {
        id: 'victoria',
        name: 'VICTORIA',
        icon: '🏅',
        color: '#ff0000',
        gradient: 'linear-gradient(135deg, #ff0000, #cc0000)',
        welcome: '🏅 Victoria aqui. Use o microfone 🎤 para emergências e comandos de voz!',
        categories: ['hospital', 'fire_station', 'emergency', 'civil_defense']
      },
      hestia: {
        id: 'hestia',
        name: 'HESTIA',
        icon: '🔮',
        color: '#fff0b3',
        gradient: 'linear-gradient(135deg, #fff0b3, #ffddaa)',
        welcome: '🔮 Hestia aqui. Ative o modo Jarvis 🎤 para falar sobre justiça e princípios!',
        categories: ['courthouse', 'lawyer', 'legal', 'notary']
      },
      daedala: {
        id: 'daedala',
        name: 'DAEDALA',
        icon: '⚗️',
        color: '#00ffd5',
        gradient: 'linear-gradient(135deg, #00ffd5, #00ccaa)',
        welcome: '⚗️ Daedala, a inventora! Use o microfone 🎤 para comandos de voz sobre inovação!',
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
    this.initSpeechRecognition();
    this.addMessage(this.asuraConfig[this.currentAsura].welcome, false);
  }
  
  cacheElements() {
    this.chat = document.getElementById('asura-chat');
    this.chatHeader = document.getElementById('chatHeader');
    this.chatBody = document.getElementById('chatBody');
    this.chatMessages = document.getElementById('chatMessages');
    this.chatInput = document.getElementById('chatInput');
    this.sendBtn = document.getElementById('sendChatBtn');
    this.micBtn = document.getElementById('micBtn');
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
    // Header toggle
    if (this.chatHeader) {
      this.chatHeader.addEventListener('click', (e) => {
        if (e.target.closest('.chat-controls') || e.target.closest('#micBtn')) return;
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
    
    // Botão fechar
    if (this.chatCloseBtn) {
      this.chatCloseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.close();
      });
    }
    
    // Botão abrir
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
    
    // Botão enviar (digitação)
    if (this.sendBtn) {
      this.sendBtn.addEventListener('click', () => this.sendMessage());
    }
    
    // Enter no input
    if (this.chatInput) {
      this.chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.sendMessage();
      });
    }
    
    // Botão microfone (Modo Jarvis)
    if (this.micBtn) {
      this.micBtn.addEventListener('click', () => this.toggleJarvis());
    }
  }
  
  // ======================================
  // MODO JARVIS - RECONHECIMENTO DE VOZ
  // ======================================
  
  initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Reconhecimento de voz não suportado');
      if (this.micBtn) {
        this.micBtn.style.opacity = '0.5';
        this.micBtn.title = 'Voz não suportada';
      }
      return;
    }
    
    this.recognition = new SpeechRecognition();
    this.recognition.lang = 'pt-BR';
    this.recognition.continuous = true;      // ESCUTA CONTÍNUA
    this.recognition.interimResults = true;  // Mostra enquanto fala
    
    this.recognition.onstart = () => {
      this.isListening = true;
      if (this.micBtn) {
        this.micBtn.classList.add('listening');
        this.micBtn.title = 'Modo Jarvis ativo - clique para desativar';
      }
      this.showJarvisIndicator(true);
      this.addMessage("🎤 Modo Jarvis ativado! Estou ouvindo...", false);
    };
    
    this.recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      
      if (interimTranscript) {
        // Feedback opcional
      }
      
      if (finalTranscript) {
        console.log("🎤 Comando final:", finalTranscript);
        
        // Verificar comando de desativação
        if (finalTranscript.toLowerCase().includes('parar de ouvir') || 
            finalTranscript.toLowerCase().includes('desativar')) {
          this.toggleJarvis();
          this.addMessage("🔇 Modo Jarvis desativado. Fale quando precisar.", false);
          return;
        }
        
        // Processar o comando
        this.processVoiceCommand(finalTranscript);
      }
    };
    
    this.recognition.onerror = (event) => {
      console.error('Erro no reconhecimento:', event.error);
      if (event.error === 'no-speech') return;
      if (event.error === 'not-allowed') {
        this.addMessage("⚠️ Permissão do microfone negada. Por favor, permita o acesso.", false);
        this.toggleJarvis();
      }
    };
    
    this.recognition.onend = () => {
      if (this.isListening) {
        try {
          this.recognition.start();
        } catch (e) {
          console.log('Reiniciando reconhecimento...');
        }
      }
    };
  }
  
  toggleJarvis() {
    if (!this.recognition) {
      this.addMessage("⚠️ Reconhecimento de voz não suportado neste navegador.", false);
      return;
    }
    
    if (this.isListening) {
      this.isListening = false;
      try {
        this.recognition.stop();
      } catch(e) {}
      if (this.micBtn) {
        this.micBtn.classList.remove('listening');
        this.micBtn.title = 'Ativar Modo Jarvis (escuta contínua)';
      }
      this.showJarvisIndicator(false);
    } else {
      try {
        this.recognition.start();
      } catch (e) {
        console.log('Erro ao iniciar reconhecimento:', e);
      }
    }
  }
  
  showJarvisIndicator(show) {
    let indicator = document.getElementById('jarvisIndicator');
    if (!indicator && show) {
      indicator = document.createElement('div');
      indicator.id = 'jarvisIndicator';
      indicator.className = 'jarvis-indicator';
      indicator.innerHTML = `
        <div class="jarvis-dot"></div>
        <div class="jarvis-wave"><span></span><span></span><span></span><span></span></div>
        <span class="jarvis-text">🎤 MODO JARVIS ATIVO • Sempre ouvindo</span>
      `;
      document.body.appendChild(indicator);
    }
    if (indicator) {
      if (show) indicator.classList.add('active');
      else indicator.classList.remove('active');
    }
  }
  
  speak(text) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  }
  
  async processVoiceCommand(command) {
    // Adicionar ao chat como se o usuário tivesse digitado
    this.addMessage(command, true);
    
    // Mostrar indicador de "pensando"
    const config = this.asuraConfig[this.currentAsura];
    const thinkingDiv = document.createElement('div');
    thinkingDiv.className = 'message asura';
    thinkingDiv.innerHTML = `
      <div class="message-avatar">${config.icon}</div>
      <div class="message-content"><em>🧠 processando...</em></div>
    `;
    this.chatMessages.appendChild(thinkingDiv);
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    
    // Processar
    setTimeout(async () => {
      thinkingDiv.remove();
      const response = await this.processCommand(command);
      this.addMessage(response, false);
      this.speak(response);
    }, 600);
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
    
    const config = this.asuraConfig[this.currentAsura];
    const thinkingDiv = document.createElement('div');
    thinkingDiv.className = 'message asura';
    thinkingDiv.innerHTML = `
      <div class="message-avatar">${config.icon}</div>
      <div class="message-content"><em>🧠 processando...</em></div>
    `;
    this.chatMessages.appendChild(thinkingDiv);
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    
    setTimeout(async () => {
      thinkingDiv.remove();
      const response = await this.processCommand(message);
      this.addMessage(response, false);
    }, 600);
  }
  
  async processCommand(message) {
    const lower = message.toLowerCase();
    const config = this.asuraConfig[this.currentAsura];
    const userPos = window.locationEngine?.getPosition();
    
    // ======================================
    // 🎤 COMANDO DE VOZ: TROCAR DE ASURA
    // ======================================
    if (lower.includes('trocar para') || lower.includes('ativar') || lower.includes('mudar para')) {
      for (const [id, cfg] of Object.entries(this.asuraConfig)) {
        if (lower.includes(cfg.name.toLowerCase())) {
          this.currentAsura = id;
          if (this.asuraSelector) this.asuraSelector.value = id;
          this.updateAsuraTheme();
          return `✅ Trocando para ${cfg.name}. ${cfg.welcome}`;
        }
      }
      return `🎤 Não entendi qual Asura você quer. As opções são: DIVA, SIRIA, MERLIM, ASTREIA, UMBRA, ATENA, VICTORIA, HESTIA ou DAEDALA.`;
    }
    
    // ======================================
    // COMANDOS DE AJUDA
    // ======================================
    if (lower.includes('ajuda') || lower.includes('comandos')) {
      return this.getHelpMessage();
    }
    
    // ======================================
    // MAPEAMENTO DE PALAVRAS-CHAVE
    // ======================================
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
    
    // ======================================
    // COMANDO DE LOCALIZAÇÃO
    // ======================================
    if (lower.includes('onde estou') || lower.includes('minha localização')) {
      if (userPos) {
        return `📍 Você está em: latitude ${userPos.lat.toFixed(4)}, longitude ${userPos.lng.toFixed(4)}`;
      }
      return "📍 Não consegui sua localização. Verifique o GPS.";
    }
    
    // ======================================
    // RESPOSTA PADRÃO
    // ======================================
    return this.getDefaultResponse(lower);
  }
  
  async searchAndShow(category, displayTerm, userPos) {
    if (!userPos) {
      return `⚠️ Não consegui sua localização para buscar ${displayTerm}.`;
    }
    
    let results = [];
    if (window.poiIndex) {
      results = window.poiIndex.filter(poi => 
        poi.category === category || 
        poi.type === category ||
        poi.name?.toLowerCase().includes(category)
      );
    }
    
    if (results.length > 0 && window.searchNearby) {
      results = window.searchNearby(userPos.lat, userPos.lng, 3000, category);
    }
    
    if (results.length === 0) {
      return `🔍 Não encontrei ${displayTerm} próximos a você.`;
    }
    
    if (typeof window.renderResults === 'function') {
      window.renderResults(results.slice(0, 10));
    }
    
    const searchPanel = document.getElementById('search-panel');
    if (searchPanel) searchPanel.style.display = 'block';
    
    if (window.map && results.length > 0) {
      const bounds = L.latLngBounds(results.map(r => [r.lat, r.lng]));
      bounds.extend([userPos.lat, userPos.lng]);
      window.map.fitBounds(bounds, { padding: [50, 50] });
    }
    
    return `${this.asuraConfig[this.currentAsura].icon} Encontrei ${results.length} ${displayTerm} próximos! Eles apareceram no mapa.`;
  }
  
  getHelpMessage() {
    const config = this.asuraConfig[this.currentAsura];
    return `
      📋 <strong>${config.icon} ${config.name} pode te ajudar:</strong><br>
      • "farmácias perto de mim"<br>
      • "mercados próximos"<br>
      • "restaurantes na região"<br>
      • "bancos e agências"<br>
      • "hospitais próximos"<br>
      • "delegacias perto de mim"<br>
      • "escolas na região"<br>
      • "onde estou"<br>
      <br>
      🎤 <strong>Modo Jarvis:</strong> Clique no microfone para falar!<br>
      🗣️ <strong>Trocar de Asura por voz:</strong> "trocar para SIRIA", "ativar ASTREIA"
    `;
  }
  
  getDefaultResponse(lower) {
    const responses = {
      diva: ["🤖 Tente 'farmácias perto de mim' ou ative o microfone 🎤! Você também pode falar 'trocar para SIRIA'."],
      siria: ["🌳 Tente 'bancos próximos' ou ative o microfone 🎤! Você também pode falar 'trocar para DIVA'."],
      merlim: ["🔧 Tente 'lojas de informática' ou ative o microfone 🎤! Você também pode falar 'trocar para ASTREIA'."],
      astreia: ["👁️ Tente 'delegacias perto de mim' ou ative o microfone 🎤! Você também pode falar 'trocar para UMBRA'."],
      umbra: ["🕵️ Tente um comando de voz com o microfone 🎤! Você também pode falar 'trocar para ATENA'."],
      atena: ["🦉 Tente 'escolas na região' ou ative o microfone 🎤! Você também pode falar 'trocar para VICTORIA'."],
      victoria: ["🏅 Tente 'hospitais próximos' ou ative o microfone 🎤! Você também pode falar 'trocar para HESTIA'."],
      hestia: ["🔮 Tente 'cartórios' ou ative o microfone 🎤! Você também pode falar 'trocar para DAEDALA'."],
      daedala: ["⚗️ Tente 'laboratórios' ou ative o microfone 🎤! Você também pode falar 'trocar para DIVA'."]
    };
    return responses[this.currentAsura]?.[0] || "🎤 Clique no microfone para falar comigo! Diga 'trocar para SIRIA' para mudar de Asura.";
  }
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
  window.asuraChat = new AsuraChat();
  console.log('💬 Asura Chat com Modo Jarvis e troca de Asura por voz inicializado!');
});