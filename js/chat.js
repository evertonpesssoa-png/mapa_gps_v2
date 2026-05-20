// ======================================
// CHAT DO ASURA - COPILOTO DO MAPA COM MODO JARVIS
// ESTRATÉGIA HÍBRIDA: IA (OpenAI/DeepSeek) + Fallback de comandos fixos
// ======================================

class AsuraChat {
  constructor() {
    this.currentAsura = 'diva';
    this.isOpen = true;
    this.isListening = false;      // Modo Jarvis ativado?
    this.recognition = null;
    this.messages = [];
    
    // ======================================
    // CONFIGURAÇÃO DA IA (DESATIVADA POR PADRÃO)
    // ======================================
    this.aiEnabled = false;  // Mude para true quando integrar a API
    this.aiApiKey = '';      // Sua chave da API (OpenAI ou DeepSeek)
    this.aiModel = 'gpt-4o-mini'; // ou 'deepseek-chat'
    this.aiEndpoint = 'https://api.openai.com/v1/chat/completions'; // ou endpoint do DeepSeek
    
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
        categories: ['pharmacy', 'supermarket', 'restaurant', 'cafe', 'gas_station', 'bakery', 'mall'],
        systemPrompt: `Você é a DIVA, uma assistente especialista em automação e buscas do dia a dia. 
Você ajuda usuários a encontrar lugares como farmácias, mercados, restaurantes, etc. 
Seja amigável, concisa e direta. Use emojis relacionados à tecnologia e automação (🤖, 🔧, ⚙️). 
Sempre responda em português do Brasil.`
      },
      siria: {
        id: 'siria',
        name: 'SIRIA',
        icon: '🌳',
        color: '#35ff9c',
        gradient: 'linear-gradient(135deg, #35ff9c, #00cc66)',
        welcome: '🌳 Sou SIRIA. Clique no microfone 🎤 para ativar o MODO JARVIS e falar sobre finanças!',
        categories: ['bank', 'atm', 'finance', 'exchange'],
        systemPrompt: `Você é a SIRIA, especialista em finanças, bancos e investimentos. 
Você ajuda usuários a encontrar bancos, caixas eletrônicos e serviços financeiros. 
Seja calma, sábia e use metáforas com natureza e crescimento (🌳, 🌱, 💰). 
Sempre responda em português do Brasil.`
      },
      merlim: {
        id: 'merlim',
        name: 'MERLIM',
        icon: '🔧',
        color: '#00d9ff',
        gradient: 'linear-gradient(135deg, #00d9ff, #00aaff)',
        welcome: '🔧 MERLIM aqui. Ative o modo Jarvis 🎤 para comandos de voz sobre tecnologia!',
        categories: ['electronics', 'computer', 'tech', 'coworking'],
        systemPrompt: `Você é o MERLIM, especialista em tecnologia, programação e inovação. 
Você ajuda usuários a encontrar lojas de informática, assistência técnica e espaços de coworking. 
Seja técnica, precisa e use emojis de tecnologia (🔧, 💻, 🖥️). 
Sempre responda em português do Brasil.`
      },
      astreia: {
        id: 'astreia',
        name: 'ASTREIA',
        icon: '👁️',
        color: '#287bff',
        gradient: 'linear-gradient(135deg, #287bff, #44aaff)',
        welcome: '👁️ ASTREIA online. Ative o microfone 🎤 para falar sobre segurança no mapa!',
        categories: ['police', 'hospital', 'medical', 'security'],
        systemPrompt: `Você é a ASTREIA, guardiã da segurança. 
Você ajuda usuários a encontrar delegacias, hospitais e áreas seguras. 
Seja vigilante, protetora e use emojis de segurança (👁️, 🛡️, 🚨). 
Sempre responda em português do Brasil.`
      },
      umbra: {
        id: 'umbra',
        name: 'UMBRA',
        icon: '🕵️',
        color: '#8b2fff',
        gradient: 'linear-gradient(135deg, #8b2fff, #aa55ff)',
        welcome: '🕵️ Umbra aqui. Use o microfone 🎤 para comandos de voz sobre investigação!',
        categories: ['detective', 'investigation', 'private'],
        systemPrompt: `Você é a UMBRA, detetive e investigadora. 
Você ajuda usuários a encontrar locais específicos e fazer buscas detalhadas. 
Seja misteriosa, precisa e use emojis de investigação (🕵️, 🔍, 🌑). 
Sempre responda em português do Brasil.`
      },
      atena: {
        id: 'atena',
        name: 'ATENA',
        icon: '🦉',
        color: '#ffd700',
        gradient: 'linear-gradient(135deg, #ffd700, #ffaa33)',
        welcome: '🦉 Atena, a mestra do conhecimento. Ative o modo Jarvis 🎤 para aprender!',
        categories: ['school', 'university', 'library', 'bookstore'],
        systemPrompt: `Você é a ATENA, mestra do conhecimento e educação. 
Você ajuda usuários a encontrar escolas, bibliotecas e livrarias. 
Seja sábia, educativa e use emojis de conhecimento (🦉, 📚, 🎓). 
Sempre responda em português do Brasil.`
      },
      victoria: {
        id: 'victoria',
        name: 'VICTORIA',
        icon: '🏅',
        color: '#ff0000',
        gradient: 'linear-gradient(135deg, #ff0000, #cc0000)',
        welcome: '🏅 Victoria aqui. Use o microfone 🎤 para emergências e comandos de voz!',
        categories: ['hospital', 'fire_station', 'emergency', 'civil_defense'],
        systemPrompt: `Você é a VICTORIA, especialista em emergências e situações críticas. 
Você ajuda usuários a encontrar hospitais, bombeiros e serviços de emergência. 
Seja direta, enérgica e use emojis de emergência (🏅, 🚨, ⚡). 
Sempre responda em português do Brasil.`
      },
      hestia: {
        id: 'hestia',
        name: 'HESTIA',
        icon: '🔮',
        color: '#fff0b3',
        gradient: 'linear-gradient(135deg, #fff0b3, #ffddaa)',
        welcome: '🔮 Hestia aqui. Ative o modo Jarvis 🎤 para falar sobre justiça e princípios!',
        categories: ['courthouse', 'lawyer', 'legal', 'notary'],
        systemPrompt: `Você é a HESTIA, guardiã dos princípios e justiça. 
Você ajuda usuários a encontrar tribunais, cartórios e serviços jurídicos. 
Seja serena, justa e use emojis de justiça (🔮, ⚖️, 📜). 
Sempre responda em português do Brasil.`
      },
      daedala: {
        id: 'daedala',
        name: 'DAEDALA',
        icon: '⚗️',
        color: '#00ffd5',
        gradient: 'linear-gradient(135deg, #00ffd5, #00ccaa)',
        welcome: '⚗️ Daedala, a inventora! Use o microfone 🎤 para comandos de voz sobre inovação!',
        categories: ['laboratory', 'research', 'science', 'innovation'],
        systemPrompt: `Você é a DAEDALA, inventora e cientista maluca. 
Você ajuda usuários a encontrar laboratórios, centros de pesquisa e inovação. 
Seja criativa, entusiasmada e use emojis de invenção (⚗️, 🔬, 🧪). 
Sempre responda em português do Brasil.`
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
    if (this.chatHeader) {
      this.chatHeader.addEventListener('click', (e) => {
        if (e.target.closest('.chat-controls') || e.target.closest('#micBtn')) return;
        this.toggleMinimize();
      });
    }
    
    if (this.chatMinimizeBtn) {
      this.chatMinimizeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleMinimize();
      });
    }
    
    if (this.chatCloseBtn) {
      this.chatCloseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.close();
      });
    }
    
    if (this.openChatBtn) {
      this.openChatBtn.addEventListener('click', () => {
        this.open();
      });
    }
    
    if (this.asuraSelector) {
      this.asuraSelector.addEventListener('change', (e) => {
        this.currentAsura = e.target.value;
        this.updateAsuraTheme();
        this.addMessage(this.asuraConfig[this.currentAsura].welcome, false);
      });
    }
    
    if (this.sendBtn) {
      this.sendBtn.addEventListener('click', () => this.sendMessage());
    }
    
    if (this.chatInput) {
      this.chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.sendMessage();
      });
    }
    
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
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    
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
      
      if (interimTranscript) {}
      
      if (finalTranscript) {
        console.log("🎤 Comando final:", finalTranscript);
        
        if (finalTranscript.toLowerCase().includes('parar de ouvir') || 
            finalTranscript.toLowerCase().includes('desativar')) {
          this.toggleJarvis();
          this.addMessage("🔇 Modo Jarvis desativado. Fale quando precisar.", false);
          return;
        }
        
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
    this.addMessage(command, true);
    
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
      const response = await this.processCommand(command);
      this.addMessage(response, false);
      this.speak(response);
    }, 600);
  }
  
  // ======================================
  // INTEGRAÇÃO COM IA (OpenAI/DeepSeek)
  // ======================================
  
  async callAI(message) {
    if (!this.aiEnabled || !this.aiApiKey) return null;
    
    const config = this.asuraConfig[this.currentAsura];
    const userPos = window.locationEngine?.getPosition();
    
    const messages = [
      { role: 'system', content: config.systemPrompt },
      { role: 'user', content: message }
    ];
    
    // Adicionar contexto da localização se disponível
    if (userPos) {
      messages.unshift({ 
        role: 'system', 
        content: `A localização atual do usuário é: latitude ${userPos.lat.toFixed(4)}, longitude ${userPos.lng.toFixed(4)}. 
        Se o usuário pedir lugares próximos, sugira que ele use o comando de busca ou informe que você pode ajudar a encontrar.`
      });
    }
    
    try {
      const response = await fetch(this.aiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.aiApiKey}`
        },
        body: JSON.stringify({
          model: this.aiModel,
          messages: messages,
          temperature: 0.7,
          max_tokens: 500
        })
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      return data.choices[0].message.content;
      
    } catch (error) {
      console.error('Erro na chamada da IA:', error);
      return null;
    }
  }
  
  // ======================================
  // EXECUTAR AÇÃO VIA IA
  // ======================================
  
  async executeAIAction(aiResponse) {
    const lower = aiResponse.toLowerCase();
    const userPos = window.locationEngine?.getPosition();
    
    // Detectar intenções via IA (analisando a resposta)
    if (lower.includes('farmácia') || lower.includes('farmacia')) {
      return await this.searchAndShow('pharmacy', 'farmácia', userPos);
    }
    if (lower.includes('mercado') || lower.includes('supermercado')) {
      return await this.searchAndShow('supermarket', 'mercado', userPos);
    }
    if (lower.includes('banco') || lower.includes('agência')) {
      return await this.searchAndShow('bank', 'banco', userPos);
    }
    if (lower.includes('delegacia') || lower.includes('polícia')) {
      return await this.searchAndShow('police', 'delegacia', userPos);
    }
    if (lower.includes('hospital') || lower.includes('pronto-socorro')) {
      return await this.searchAndShow('hospital', 'hospital', userPos);
    }
    if (lower.includes('escola')) {
      return await this.searchAndShow('school', 'escola', userPos);
    }
    if (lower.includes('biblioteca')) {
      return await this.searchAndShow('library', 'biblioteca', userPos);
    }
    if (lower.includes('rota') || lower.includes('como chegar')) {
      return `🗺️ Para criar uma rota, diga "rota para [lugar]" ou use o botão de rota no mapa.`;
    }
    
    return aiResponse;
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
  
  // ======================================
  // PROCESSAR COMANDO (ESTRATÉGIA HÍBRIDA)
  // ======================================
  
  async processCommand(message) {
    const lower = message.toLowerCase();
    const userPos = window.locationEngine?.getPosition();
    
    // ======================================
    // 1. TENTAR IA PRIMEIRO (SE HABILITADA)
    // ======================================
    if (this.aiEnabled && this.aiApiKey) {
      try {
        console.log("🤖 Tentando IA...");
        const aiResponse = await this.callAI(message);
        if (aiResponse) {
          console.log("✅ IA respondeu");
          // Tenta extrair ação da resposta da IA
          const actionResult = await this.executeAIAction(aiResponse);
          if (actionResult !== aiResponse) {
            return actionResult;
          }
          return aiResponse;
        }
      } catch (error) {
        console.warn("⚠️ IA falhou, usando fallback:", error);
      }
    }
    
    // ======================================
    // 2. FALLBACK: COMANDOS FIXOS
    // ======================================
    console.log("📝 Usando fallback de comandos fixos");
    
    // Trocar de Asura
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
    
    // Ajuda
    if (lower.includes('ajuda') || lower.includes('comandos')) {
      return this.getHelpMessage();
    }
    
    // Rota inteligente
    if (lower.includes('rota') || lower.includes('como chegar') || lower.includes('navegar')) {
      let destination = message.replace(/rota|como chegar|navegar|para|até/gi, '').trim();
      if (destination) {
        await this.createSmartRoute(destination);
        return `🗺️ Calculando rota para "${destination}"...`;
      }
      return "🗺️ Para qual lugar você quer ir? Diga 'rota para farmácia' ou 'como chegar ao hospital'.";
    }
    
    // Buscas por categoria
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
    
    // Localização
    if (lower.includes('onde estou') || lower.includes('minha localização')) {
      if (userPos) {
        return `📍 Você está em: latitude ${userPos.lat.toFixed(4)}, longitude ${userPos.lng.toFixed(4)}`;
      }
      return "📍 Não consegui sua localização. Verifique o GPS.";
    }
    
    // Resposta padrão
    return this.getDefaultResponse(lower);
  }
  
  async createSmartRoute(destinationText) {
    const userPos = window.locationEngine?.getPosition();
    if (!userPos) {
      this.addMessage("📍 Não consegui sua localização. Ative o GPS.", false);
      return;
    }
    
    this.addMessage(`🗺️ Calculando rota para ${destinationText}...`, false);
    
    if (typeof window.geocode === 'function') {
      const results = await window.geocode(destinationText);
      if (results && results.length > 0) {
        const dest = results[0];
        if (typeof window.createSmartRoute === 'function') {
          await window.createSmartRoute('', dest.name);
        } else {
          this.addMessage(`✅ Encontrei: ${dest.name}. Use o botão 🗺️ no mapa para ver a rota!`, false);
        }
      } else {
        this.addMessage(`❌ Não encontrei "${destinationText}". Tente um nome mais específico.`, false);
      }
    }
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
      • "rota para [lugar]"<br>
      • "onde estou"<br>
      <br>
      🎤 <strong>Modo Jarvis:</strong> Clique no microfone para falar!<br>
      🗣️ <strong>Trocar de Asura por voz:</strong> "trocar para SIRIA", "ativar ASTREIA"<br>
      🤖 <strong>IA:</strong> ${this.aiEnabled ? 'ATIVA' : 'DESATIVADA (modo local)'}
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
  console.log('💬 Asura Chat com Modo Jarvis e Estratégia Híbrida (IA + Fallback) inicializado!');
  console.log('🤖 IA está DESATIVADA. Para ativar, configure aiEnabled=true e aiApiKey');
});