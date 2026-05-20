// ======================================
// CHAT DO ASURA - COPILOTO DO MAPA
// ======================================

class AsuraChat {
  constructor() {
    this.currentAsura = 'diva';
    this.isOpen = true;
    this.isListening = false;
    this.recognition = null;
    this.messages = [];
    this.aiEnabled = false;
    this.aiApiKey = '';
    
    this.asuraConfig = {
      diva: { id: 'diva', name: 'DIVA', icon: '🤖', color: '#ff4db8', categories: ['pharmacy', 'supermarket', 'restaurant'], welcome: '✨ Olá! Sou DIVA. Posso ajudar com farmácias, mercados e restaurantes!' },
      siria: { id: 'siria', name: 'SIRIA', icon: '🌳', color: '#35ff9c', categories: ['bank', 'atm'], welcome: '🌳 Sou SIRIA. Especialista em bancos e finanças!' },
      merlim: { id: 'merlim', name: 'MERLIM', icon: '🔧', color: '#00d9ff', categories: ['electronics', 'tech'], welcome: '🔧 MERLIM aqui! Especialista em tecnologia!' },
      astreia: { id: 'astreia', name: 'ASTREIA', icon: '👁️', color: '#287bff', categories: ['police', 'hospital'], welcome: '👁️ ASTREIA! Segurança é comigo!' },
      umbra: { id: 'umbra', name: 'UMBRA', icon: '🕵️', color: '#8b2fff', categories: [], welcome: '🕵️ Umbra. Investigação e buscas detalhadas.' },
      atena: { id: 'atena', name: 'ATENA', icon: '🦉', color: '#ffd700', categories: ['school', 'library'], welcome: '🦉 Atena! Conhecimento e educação.' },
      victoria: { id: 'victoria', name: 'VICTORIA', icon: '🏅', color: '#ff0000', categories: ['hospital', 'fire_station'], welcome: '🏅 Victoria! Emergências e serviços críticos.' },
      hestia: { id: 'hestia', name: 'HESTIA', icon: '🔮', color: '#fff0b3', categories: ['courthouse', 'notary'], welcome: '🔮 Hestia. Justiça e princípios.' },
      daedala: { id: 'daedala', name: 'DAEDALA', icon: '⚗️', color: '#00ffd5', categories: ['laboratory', 'research'], welcome: '⚗️ Daedala! Inovação e ciência.' }
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
    this.asuraSelector.innerHTML = Object.entries(this.asuraConfig).map(([id, cfg]) => `<option value="${id}">${cfg.icon} ${cfg.name}</option>`).join('');
  }
  
  bindEvents() {
    if (this.chatHeader) this.chatHeader.addEventListener('click', (e) => { if (!e.target.closest('.chat-controls')) this.toggleMinimize(); });
    if (this.chatMinimizeBtn) this.chatMinimizeBtn.addEventListener('click', () => this.toggleMinimize());
    if (this.chatCloseBtn) this.chatCloseBtn.addEventListener('click', () => this.close());
    if (this.openChatBtn) this.openChatBtn.addEventListener('click', () => this.open());
    if (this.asuraSelector) this.asuraSelector.addEventListener('change', (e) => { this.currentAsura = e.target.value; this.updateAsuraTheme(); this.addMessage(this.asuraConfig[this.currentAsura].welcome, false); });
    if (this.sendBtn) this.sendBtn.addEventListener('click', () => this.sendMessage());
    if (this.chatInput) this.chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') this.sendMessage(); });
    if (this.micBtn) this.micBtn.addEventListener('click', () => this.toggleJarvis());
  }
  
  initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { console.warn('Voz não suportada'); return; }
    this.recognition = new SpeechRecognition();
    this.recognition.lang = 'pt-BR';
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.onstart = () => { this.isListening = true; this.micBtn?.classList.add('listening'); this.showJarvisIndicator(true); };
    this.recognition.onresult = (event) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
      }
      if (finalTranscript) this.processVoiceCommand(finalTranscript);
    };
    this.recognition.onend = () => { if (this.isListening) this.recognition?.start(); };
  }
  
  toggleJarvis() {
    if (!this.recognition) return;
    if (this.isListening) {
      this.isListening = false;
      this.recognition.stop();
      this.micBtn?.classList.remove('listening');
      this.showJarvisIndicator(false);
    } else {
      this.recognition.start();
    }
  }
  
  showJarvisIndicator(show) {
    let indicator = document.getElementById('jarvisIndicator');
    if (!indicator && show) {
      indicator = document.createElement('div');
      indicator.id = 'jarvisIndicator';
      indicator.className = 'jarvis-indicator';
      indicator.innerHTML = `<div class="jarvis-dot"></div><div class="jarvis-wave"><span></span><span></span><span></span><span></span></div><span class="jarvis-text">🎤 MODO JARVIS</span>`;
      document.body.appendChild(indicator);
    }
    if (indicator) show ? indicator.classList.add('active') : indicator.classList.remove('active');
  }
  
  speak(text) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    window.speechSynthesis.speak(utterance);
  }
  
  async processVoiceCommand(command) {
    this.addMessage(command, true);
    const response = await this.processCommand(command);
    this.addMessage(response, false);
    this.speak(response);
  }
  
  updateAsuraTheme() {
    const config = this.asuraConfig[this.currentAsura];
    if (!config) return;
    if (this.chatAsuraName) this.chatAsuraName.textContent = config.name;
    if (this.chatAvatar) this.chatAvatar.textContent = config.icon;
  }
  
  toggleMinimize() {
    this.isOpen = !this.isOpen;
    if (this.chat) this.chat.classList.toggle('collapsed', !this.isOpen);
    if (this.openChatBtn) this.openChatBtn.classList.toggle('hidden', this.isOpen);
  }
  
  open() { this.isOpen = true; this.chat?.classList.remove('collapsed'); this.openChatBtn?.classList.add('hidden'); }
  close() { this.isOpen = false; this.chat?.classList.add('collapsed'); this.openChatBtn?.classList.remove('hidden'); }
  
  addMessage(text, isUser = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user' : 'asura'}`;
    const time = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const config = this.asuraConfig[this.currentAsura];
    messageDiv.innerHTML = `<div class="message-avatar">${isUser ? '👤' : config.icon}</div><div class="message-content">${text}<div class="message-time">${time}</div></div>`;
    this.chatMessages?.appendChild(messageDiv);
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
  }
  
  async sendMessage() {
    const message = this.chatInput?.value.trim();
    if (!message) return;
    this.addMessage(message, true);
    this.chatInput.value = '';
    const response = await this.processCommand(message);
    this.addMessage(response, false);
  }
  
  async processCommand(message) {
    const lower = message.toLowerCase();
    const userPos = window.locationEngine?.getPosition();
    
    if (lower.includes('trocar para') || lower.includes('ativar')) {
      for (const [id, cfg] of Object.entries(this.asuraConfig)) {
        if (lower.includes(cfg.name.toLowerCase())) {
          this.currentAsura = id;
          this.asuraSelector.value = id;
          this.updateAsuraTheme();
          return `✅ Trocando para ${cfg.name}. ${cfg.welcome}`;
        }
      }
    }
    
    if (lower.includes('ajuda')) {
      return `📋 Comandos: "farmácias perto de mim", "mercados próximos", "rota para [lugar]", "onde estou", "trocar para SIRIA"`;
    }
    
    if (lower.includes('rota') || lower.includes('como chegar') || lower.includes('navegar')) {
      let destination = message.replace(/rota|como chegar|navegar|para|até/gi, '').trim();
      if (destination && window.createSmartRoute) {
        window.createSmartRoute('', destination);
        return `🗺️ Calculando rota para "${destination}"...`;
      }
      return "🗺️ Para qual lugar você quer ir?";
    }
    
    const keywordMap = {
      'farmácia': 'pharmacy', 'farmacia': 'pharmacy', 'mercado': 'supermarket', 'supermercado': 'supermarket',
      'restaurante': 'restaurant', 'banco': 'bank', 'delegacia': 'police', 'hospital': 'hospital'
    };
    
    for (const [keyword, category] of Object.entries(keywordMap)) {
      if (lower.includes(keyword) && userPos) {
        const results = window.searchNearby?.(userPos.lat, userPos.lng, 3000, category) || [];
        if (results.length) {
          if (window.renderResults) window.renderResults(results.slice(0, 10));
          document.getElementById('search-panel').style.display = 'block';
          return `🔍 Encontrei ${results.length} ${keyword}(s) próximos!`;
        }
        return `🔍 Nenhum ${keyword} encontrado próximo.`;
      }
    }
    
    if (lower.includes('onde estou') && userPos) {
      return `📍 Você está em: ${userPos.lat.toFixed(4)}, ${userPos.lng.toFixed(4)}`;
    }
    
    return `${this.asuraConfig[this.currentAsura].icon} Tente "farmácias perto de mim", "rota para mercado" ou "ajuda".`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.asuraChat = new AsuraChat();
  console.log('💬 Asura Chat carregado!');
});