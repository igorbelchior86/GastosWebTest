// ============================================================================
// 🌐 NETWORK & PWA EVENT HANDLERS MODULE
// ============================================================================
// Gerencia eventos de rede, PWA, e status de conectividade
// FASE 5 refatoração - modularizando event handlers

/**
 * NetworkEventHandlers - Gerencia eventos de rede e PWA
 * 
 * Responsabilidades:
 * - Network status (online/offline)
 * - PWA lifecycle events
 * - Service worker events
 * - Sync/update events
 * - Installation prompts
 */
export class NetworkEventHandlers {
  static _initialized = false;
  static _listeners = new Map();
  static _networkStatus = {
    isOnline: navigator.onLine,
    lastOnline: Date.now(),
    reconnectAttempts: 0
  };
  static _pwaStatus = {
    isInstalled: false,
    deferredPrompt: null,
    updateAvailable: false
  };

  /**
   * Inicializa todos os event handlers de rede e PWA
   */
  static init() {
    if (this._initialized) return;

    try {
      this.setupNetworkEvents();
      this.setupPWAEvents();
      this.setupServiceWorkerEvents();
      this.setupSyncEvents();
      this._initialized = true;
      console.log('NetworkEventHandlers inicializados');
    } catch (error) {
      console.error('Erro ao inicializar NetworkEventHandlers:', error);
    }
  }

  /**
   * Configura eventos de rede
   */
  static setupNetworkEvents() {
    // Online/Offline events
    this.addListener(window, 'online', () => {
      this.handleOnline();
    }, 'windowOnline');

    this.addListener(window, 'offline', () => {
      this.handleOffline();
    }, 'windowOffline');

    // Connection change (se suportado)
    if ('connection' in navigator) {
      this.addListener(navigator.connection, 'change', () => {
        this.handleConnectionChange();
      }, 'connectionChange');
    }

    // Page visibility para verificar conectividade
    this.addListener(document, 'visibilitychange', () => {
      if (!document.hidden) {
        this.checkNetworkStatus();
      }
    }, 'visibilityChangeNetwork');
  }

  /**
   * Configura eventos de PWA
   */
  static setupPWAEvents() {
    // Before install prompt
    this.addListener(window, 'beforeinstallprompt', (e) => {
      this.handleBeforeInstallPrompt(e);
    }, 'beforeInstallPrompt');

    // App installed
    this.addListener(window, 'appinstalled', () => {
      this.handleAppInstalled();
    }, 'appInstalled');

    // Page load para verificar se é PWA
    this.addListener(window, 'load', () => {
      this.checkPWAStatus();
    }, 'windowLoadPWA');
  }

  /**
   * Configura eventos do Service Worker
   */
  static setupServiceWorkerEvents() {
    if ('serviceWorker' in navigator) {
      // Service Worker registration
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          this.handleServiceWorkerRegistered(registration);
          
          // Update found
          registration.addEventListener('updatefound', () => {
            this.handleServiceWorkerUpdate(registration);
          });
        })
        .catch(error => {
          console.error('Service Worker registration failed:', error);
        });

      // Service Worker controller change
      this.addListener(navigator.serviceWorker, 'controllerchange', () => {
        this.handleControllerChange();
      }, 'serviceWorkerControllerChange');

      // Message from Service Worker
      this.addListener(navigator.serviceWorker, 'message', (e) => {
        this.handleServiceWorkerMessage(e);
      }, 'serviceWorkerMessage');
    }
  }

  /**
   * Configura eventos de sincronização
   */
  static setupSyncEvents() {
    // Custom sync events
    this.addListener(document, 'sync:start', () => {
      this.handleSyncStart();
    }, 'syncStart');

    this.addListener(document, 'sync:complete', (e) => {
      this.handleSyncComplete(e.detail);
    }, 'syncComplete');

    this.addListener(document, 'sync:error', (e) => {
      this.handleSyncError(e.detail);
    }, 'syncError');

    // Background sync (se suportado)
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      this.setupBackgroundSync();
    }
  }

  // ============================================================================
  // NETWORK EVENT HANDLERS
  // ============================================================================

  /**
   * Manipula evento de volta online
   */
  static handleOnline() {
    console.log('Aplicação voltou online');
    
    this._networkStatus.isOnline = true;
    this._networkStatus.lastOnline = Date.now();
    this._networkStatus.reconnectAttempts = 0;

    // Atualiza UI
    this.updateNetworkUI(true);

    // Notifica usuário
    this.showNetworkNotification('Conectado novamente!', 'success');

    // Tenta sincronizar dados pendentes
    this.attemptOfflineSync();

    // Dispara evento custom
    this.dispatchNetworkEvent('network:online');

    // Chama função global se existir
    if (typeof onNetworkOnline === 'function') {
      onNetworkOnline();
    }
  }

  /**
   * Manipula evento de ficar offline
   */
  static handleOffline() {
    console.log('Aplicação ficou offline');
    
    this._networkStatus.isOnline = false;

    // Atualiza UI
    this.updateNetworkUI(false);

    // Notifica usuário
    this.showNetworkNotification('Sem conexão com a internet', 'warning');

    // Dispara evento custom
    this.dispatchNetworkEvent('network:offline');

    // Chama função global se existir
    if (typeof onNetworkOffline === 'function') {
      onNetworkOffline();
    }
  }

  /**
   * Manipula mudanças na conexão
   */
  static handleConnectionChange() {
    if ('connection' in navigator) {
      const connection = navigator.connection;
      console.log('Connection changed:', {
        type: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt
      });

      // Dispara evento custom com detalhes da conexão
      this.dispatchNetworkEvent('network:connectionChanged', {
        type: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt
      });
    }
  }

  /**
   * Verifica status da rede
   */
  static checkNetworkStatus() {
    const wasOnline = this._networkStatus.isOnline;
    const isOnline = navigator.onLine;

    if (wasOnline !== isOnline) {
      if (isOnline) {
        this.handleOnline();
      } else {
        this.handleOffline();
      }
    }
  }

  // ============================================================================
  // PWA EVENT HANDLERS
  // ============================================================================

  /**
   * Manipula prompt de instalação
   * @param {Event} e - Evento beforeinstallprompt
   */
  static handleBeforeInstallPrompt(e) {
    console.log('PWA install prompt available');
    
    // Previne o prompt automático
    e.preventDefault();
    
    // Armazena o evento para uso posterior
    this._pwaStatus.deferredPrompt = e;

    // Mostra botão de instalação se existir
    this.showInstallButton();

    // Dispara evento custom
    this.dispatchNetworkEvent('pwa:installPromptAvailable');
  }

  /**
   * Manipula app instalado
   */
  static handleAppInstalled() {
    console.log('PWA foi instalado');
    
    this._pwaStatus.isInstalled = true;
    this._pwaStatus.deferredPrompt = null;

    // Esconde botão de instalação
    this.hideInstallButton();

    // Notifica usuário
    this.showNetworkNotification('App instalado com sucesso!', 'success');

    // Dispara evento custom
    this.dispatchNetworkEvent('pwa:installed');

    // Chama função global se existir
    if (typeof onPWAInstalled === 'function') {
      onPWAInstalled();
    }
  }

  /**
   * Verifica status do PWA
   */
  static checkPWAStatus() {
    // Verifica se está rodando como PWA
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isInWebAppiOS = window.navigator.standalone === true;
    const isInWebAppChrome = document.referrer.includes('android-app://');

    this._pwaStatus.isInstalled = isStandalone || isInWebAppiOS || isInWebAppChrome;

    if (this._pwaStatus.isInstalled) {
      console.log('App está rodando como PWA');
      this.dispatchNetworkEvent('pwa:runningAsApp');
    }
  }

  /**
   * Inicia instalação do PWA
   */
  static async installPWA() {
    if (!this._pwaStatus.deferredPrompt) {
      console.log('Prompt de instalação não disponível');
      return false;
    }

    try {
      // Mostra o prompt
      this._pwaStatus.deferredPrompt.prompt();
      
      // Aguarda a escolha do usuário
      const result = await this._pwaStatus.deferredPrompt.userChoice;
      
      console.log('Escolha do usuário:', result.outcome);
      
      if (result.outcome === 'accepted') {
        this.dispatchNetworkEvent('pwa:installAccepted');
      } else {
        this.dispatchNetworkEvent('pwa:installDismissed');
      }
      
      // Limpa o prompt
      this._pwaStatus.deferredPrompt = null;
      
      return result.outcome === 'accepted';
    } catch (error) {
      console.error('Erro ao instalar PWA:', error);
      return false;
    }
  }

  // ============================================================================
  // SERVICE WORKER HANDLERS
  // ============================================================================

  /**
   * Manipula Service Worker registrado
   * @param {ServiceWorkerRegistration} registration - Registration
   */
  static handleServiceWorkerRegistered(registration) {
    console.log('Service Worker registrado:', registration.scope);
    
    this.dispatchNetworkEvent('sw:registered', { scope: registration.scope });
  }

  /**
   * Manipula atualização do Service Worker
   * @param {ServiceWorkerRegistration} registration - Registration
   */
  static handleServiceWorkerUpdate(registration) {
    console.log('Atualização do Service Worker disponível');
    
    this._pwaStatus.updateAvailable = true;
    
    // Mostra notificação de atualização
    this.showUpdateNotification();
    
    this.dispatchNetworkEvent('sw:updateAvailable');
  }

  /**
   * Manipula mudança de controller
   */
  static handleControllerChange() {
    console.log('Service Worker controller changed');
    
    // Recarrega a página para usar a nova versão
    if (this._pwaStatus.updateAvailable) {
      window.location.reload();
    }
  }

  /**
   * Manipula mensagem do Service Worker
   * @param {MessageEvent} e - Evento de mensagem
   */
  static handleServiceWorkerMessage(e) {
    console.log('Mensagem do Service Worker:', e.data);
    
    const message = e.data;
    
    switch (message.type) {
      case 'UPDATE_AVAILABLE':
        this.handleServiceWorkerUpdate();
        break;
      case 'OFFLINE_READY':
        this.showNetworkNotification('App pronto para uso offline', 'info');
        break;
      case 'SYNC_COMPLETE':
        this.handleSyncComplete(message.data);
        break;
    }
  }

  // ============================================================================
  // SYNC HANDLERS
  // ============================================================================

  /**
   * Manipula início de sincronização
   */
  static handleSyncStart() {
    console.log('Sincronização iniciada');
    
    // Mostra indicador de sync
    this.showSyncIndicator(true);
    
    this.dispatchNetworkEvent('sync:started');
  }

  /**
   * Manipula sincronização completa
   * @param {Object} data - Dados da sincronização
   */
  static handleSyncComplete(data) {
    console.log('Sincronização completa:', data);
    
    // Esconde indicador de sync
    this.showSyncIndicator(false);
    
    // Mostra notificação se houve mudanças
    if (data && data.changes > 0) {
      this.showNetworkNotification(`${data.changes} itens sincronizados`, 'success');
    }
    
    this.dispatchNetworkEvent('sync:completed', data);
  }

  /**
   * Manipula erro de sincronização
   * @param {Object} error - Erro da sincronização
   */
  static handleSyncError(error) {
    console.error('Erro na sincronização:', error);
    
    // Esconde indicador de sync
    this.showSyncIndicator(false);
    
    // Mostra notificação de erro
    this.showNetworkNotification('Erro na sincronização', 'error');
    
    this.dispatchNetworkEvent('sync:error', error);
  }

  /**
   * Configura background sync
   */
  static setupBackgroundSync() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        // Registra background sync para dados pendentes
        registration.sync.register('sync-pending-data')
          .then(() => {
            console.log('Background sync registrado');
          })
          .catch(error => {
            console.error('Erro ao registrar background sync:', error);
          });
      });
    }
  }

  /**
   * Tenta sincronizar dados offline
   */
  static attemptOfflineSync() {
    console.log('Tentando sincronizar dados offline...');
    
    // Chama função de sync se existir
    if (typeof syncOfflineData === 'function') {
      syncOfflineData();
    }
    
    // Dispara evento para outros módulos
    this.dispatchNetworkEvent('sync:attemptOffline');
  }

  // ============================================================================
  // UI UPDATES
  // ============================================================================

  /**
   * Atualiza UI baseado no status da rede
   * @param {boolean} isOnline - Status online
   */
  static updateNetworkUI(isOnline) {
    // Atualiza indicador de status
    const statusIndicator = document.querySelector('.network-status');
    if (statusIndicator) {
      statusIndicator.classList.toggle('online', isOnline);
      statusIndicator.classList.toggle('offline', !isOnline);
    }

    // Atualiza elementos baseados no status
    const onlineElements = document.querySelectorAll('[data-network="online"]');
    const offlineElements = document.querySelectorAll('[data-network="offline"]');

    onlineElements.forEach(el => {
      el.style.display = isOnline ? '' : 'none';
    });

    offlineElements.forEach(el => {
      el.style.display = isOnline ? 'none' : '';
    });

    // Atualiza botões de sync
    const syncButtons = document.querySelectorAll('[data-action="sync"]');
    syncButtons.forEach(btn => {
      btn.disabled = !isOnline;
    });
  }

  /**
   * Mostra/esconde botão de instalação
   */
  static showInstallButton() {
    const installBtn = document.querySelector('[data-action="install-pwa"]');
    if (installBtn) {
      installBtn.style.display = '';
      
      // Adiciona listener se não existe
      if (!this._listeners.has('installPWABtn')) {
        this.addListener(installBtn, 'click', () => {
          this.installPWA();
        }, 'installPWABtn');
      }
    }
  }

  /**
   * Esconde botão de instalação
   */
  static hideInstallButton() {
    const installBtn = document.querySelector('[data-action="install-pwa"]');
    if (installBtn) {
      installBtn.style.display = 'none';
    }
  }

  /**
   * Mostra notificação de atualização
   */
  static showUpdateNotification() {
    // Tenta usar sistema de notificações
    if (typeof showNotification === 'function') {
      showNotification('Nova versão disponível!', 'info', {
        action: 'Atualizar',
        callback: () => {
          window.location.reload();
        }
      });
    } else {
      console.log('Nova versão disponível!');
    }
  }

  /**
   * Mostra/esconde indicador de sincronização
   * @param {boolean} show - Mostrar indicador
   */
  static showSyncIndicator(show) {
    const syncIndicator = document.querySelector('.sync-indicator');
    if (syncIndicator) {
      syncIndicator.style.display = show ? '' : 'none';
    }

    // Atualiza ícones de sync
    const syncIcons = document.querySelectorAll('.sync-icon');
    syncIcons.forEach(icon => {
      icon.classList.toggle('spinning', show);
    });
  }

  /**
   * Mostra notificação de rede
   * @param {string} message - Mensagem
   * @param {string} type - Tipo da notificação
   */
  static showNetworkNotification(message, type) {
    if (typeof showNotification === 'function') {
      showNotification(message, type);
    } else {
      console.log(`[${type.toUpperCase()}] ${message}`);
    }
  }

  // ============================================================================
  // EVENT UTILITIES
  // ============================================================================

  /**
   * Dispara evento custom de rede
   * @param {string} eventName - Nome do evento
   * @param {Object} detail - Detalhes do evento
   */
  static dispatchNetworkEvent(eventName, detail = {}) {
    const event = new CustomEvent(eventName, { detail });
    document.dispatchEvent(event);
  }

  /**
   * Adiciona event listener com tracking
   * @param {HTMLElement} element - Elemento
   * @param {string} event - Tipo de evento
   * @param {Function} handler - Handler function
   * @param {string} id - ID para tracking
   */
  static addListener(element, event, handler, id) {
    if (!element) return;

    element.addEventListener(event, handler);
    this._listeners.set(id, { element, event, handler });
  }

  /**
   * Remove event listener específico
   * @param {string} id - ID do listener
   */
  static removeListener(id) {
    const listener = this._listeners.get(id);
    if (listener) {
      listener.element.removeEventListener(listener.event, listener.handler);
      this._listeners.delete(id);
    }
  }

  /**
   * Remove todos os event listeners
   */
  static removeAllListeners() {
    this._listeners.forEach((listener, id) => {
      listener.element.removeEventListener(listener.event, listener.handler);
    });
    this._listeners.clear();
    this._initialized = false;
  }

  /**
   * Obtém status da rede
   * @returns {Object} Status da rede
   */
  static getNetworkStatus() {
    return { ...this._networkStatus };
  }

  /**
   * Obtém status do PWA
   * @returns {Object} Status do PWA
   */
  static getPWAStatus() {
    return { 
      ...this._pwaStatus,
      deferredPrompt: !!this._pwaStatus.deferredPrompt
    };
  }

  /**
   * Obtém informações de debug
   * @returns {Object} Info de debug
   */
  static getDebugInfo() {
    return {
      initialized: this._initialized,
      activeListeners: Array.from(this._listeners.keys()),
      listenerCount: this._listeners.size,
      networkStatus: this.getNetworkStatus(),
      pwaStatus: this.getPWAStatus()
    };
  }
}

// Para uso global (compatibilidade)
if (typeof window !== 'undefined') {
  window.NetworkEventHandlers = NetworkEventHandlers;
}