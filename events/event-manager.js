// ============================================================================
// 🎯 EVENT MANAGER MODULE
// ============================================================================
// Coordena todos os event handlers da aplicação
// FASE 5 refatoração - sistema central de eventos

import { UIEventHandlers } from './ui-handlers.js';
import { AuthEventHandlers } from './auth-handlers.js';
import { TouchEventHandlers } from './touch-handlers.js';
import { NetworkEventHandlers } from './network-handlers.js';

/**
 * EventManager - Sistema central de gerenciamento de eventos
 * 
 * Responsabilidades:
 * - Inicialização coordenada de todos os handlers
 * - Comunicação entre handlers
 * - Event bus central
 * - Debug e monitoramento de eventos
 * - Cleanup e shutdown
 */
export class EventManager {
  static _initialized = false;
  static _handlers = new Map();
  static _eventBus = new Map();
  static _globalListeners = new Map();

  /**
   * Inicializa o sistema de eventos
   */
  static async init() {
    if (this._initialized) {
      console.warn('EventManager já foi inicializado');
      return;
    }

    try {
      console.log('🎯 Inicializando EventManager...');
      
      // Inicializa handlers em ordem de dependência
      await this.initializeHandlers();
      
      // Configura event bus
      this.setupEventBus();
      
      // Configura listeners globais
      this.setupGlobalListeners();
      
      this._initialized = true;
      console.log('✅ EventManager inicializado com sucesso');
      
      // Dispara evento de inicialização
      this.emit('events:initialized');
      
    } catch (error) {
      console.error('❌ Erro ao inicializar EventManager:', error);
      throw error;
    }
  }

  /**
   * Inicializa todos os handlers de evento
   */
  static async initializeHandlers() {
    const handlers = [
      { name: 'NetworkEventHandlers', class: NetworkEventHandlers, priority: 1 },
      { name: 'AuthEventHandlers', class: AuthEventHandlers, priority: 2 },
      { name: 'TouchEventHandlers', class: TouchEventHandlers, priority: 3 },
      { name: 'UIEventHandlers', class: UIEventHandlers, priority: 4 }
    ];

    // Ordena por prioridade
    handlers.sort((a, b) => a.priority - b.priority);

    for (const handler of handlers) {
      try {
        console.log(`📡 Inicializando ${handler.name}...`);
        
        if (typeof handler.class.init === 'function') {
          await handler.class.init();
          this._handlers.set(handler.name, handler.class);
          console.log(`✅ ${handler.name} inicializado`);
        } else {
          console.warn(`⚠️  ${handler.name} não possui método init()`);
        }
      } catch (error) {
        console.error(`❌ Erro ao inicializar ${handler.name}:`, error);
        // Continua com outros handlers mesmo se um falhar
      }
    }
  }

  /**
   * Configura event bus central
   */
  static setupEventBus() {
    // Event delegation para eventos personalizados
    document.addEventListener('custom:event', (e) => {
      this.handleCustomEvent(e);
    });

    // Error handling global
    window.addEventListener('error', (e) => {
      this.handleGlobalError(e);
    });

    window.addEventListener('unhandledrejection', (e) => {
      this.handleUnhandledRejection(e);
    });

    console.log('📡 Event bus configurado');
  }

  /**
   * Configura listeners globais
   */
  static setupGlobalListeners() {
    // DOM Content Loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.emit('dom:ready');
      });
    } else {
      // DOM já carregado
      setTimeout(() => this.emit('dom:ready'), 0);
    }

    // Window load
    if (document.readyState === 'complete') {
      setTimeout(() => this.emit('window:loaded'), 0);
    } else {
      window.addEventListener('load', () => {
        this.emit('window:loaded');
      });
    }

    // Before unload
    window.addEventListener('beforeunload', (e) => {
      this.emit('window:beforeUnload', e);
      this.cleanup();
    });

    // Page hide
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.emit('page:hidden');
      } else {
        this.emit('page:visible');
      }
    });

    console.log('🌍 Listeners globais configurados');
  }

  // ============================================================================
  // EVENT BUS METHODS
  // ============================================================================

  /**
   * Emite evento no event bus
   * @param {string} eventName - Nome do evento
   * @param {*} data - Dados do evento
   */
  static emit(eventName, data = null) {
    try {
      // Dispara evento custom no DOM
      const event = new CustomEvent(eventName, { 
        detail: data,
        bubbles: true,
        cancelable: true
      });
      document.dispatchEvent(event);

      // Notifica listeners registrados
      const listeners = this._eventBus.get(eventName) || [];
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`Erro em listener para ${eventName}:`, error);
        }
      });

      console.log(`📤 Evento emitido: ${eventName}`, data);
    } catch (error) {
      console.error(`Erro ao emitir evento ${eventName}:`, error);
    }
  }

  /**
   * Adiciona listener para evento
   * @param {string} eventName - Nome do evento
   * @param {Function} callback - Função callback
   * @returns {Function} Função para remover o listener
   */
  static on(eventName, callback) {
    if (!this._eventBus.has(eventName)) {
      this._eventBus.set(eventName, []);
    }
    
    this._eventBus.get(eventName).push(callback);

    // Retorna função para remover o listener
    return () => {
      this.off(eventName, callback);
    };
  }

  /**
   * Remove listener de evento
   * @param {string} eventName - Nome do evento
   * @param {Function} callback - Função callback
   */
  static off(eventName, callback) {
    const listeners = this._eventBus.get(eventName);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Adiciona listener que executa apenas uma vez
   * @param {string} eventName - Nome do evento
   * @param {Function} callback - Função callback
   * @returns {Function} Função para remover o listener
   */
  static once(eventName, callback) {
    const onceCallback = (data) => {
      callback(data);
      this.off(eventName, onceCallback);
    };
    
    return this.on(eventName, onceCallback);
  }

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  /**
   * Manipula evento personalizado
   * @param {CustomEvent} e - Evento personalizado
   */
  static handleCustomEvent(e) {
    console.log('📨 Evento personalizado recebido:', e.type, e.detail);
    
    // Log para debug
    if (this.isDebugMode()) {
      console.log('Event details:', {
        type: e.type,
        detail: e.detail,
        target: e.target,
        timeStamp: e.timeStamp
      });
    }
  }

  /**
   * Manipula erro global
   * @param {ErrorEvent} e - Evento de erro
   */
  static handleGlobalError(e) {
    console.error('🔥 Erro global capturado:', {
      message: e.message,
      filename: e.filename,
      lineno: e.lineno,
      colno: e.colno,
      error: e.error
    });

    // Emite evento de erro
    this.emit('error:global', {
      message: e.message,
      filename: e.filename,
      lineno: e.lineno,
      colno: e.colno,
      error: e.error
    });
  }

  /**
   * Manipula promise rejeitada não tratada
   * @param {PromiseRejectionEvent} e - Evento de promise rejeitada
   */
  static handleUnhandledRejection(e) {
    console.error('🔥 Promise rejeitada não tratada:', e.reason);

    // Emite evento de erro
    this.emit('error:unhandledRejection', {
      reason: e.reason,
      promise: e.promise
    });

    // Previne log padrão do browser
    e.preventDefault();
  }

  // ============================================================================
  // HANDLER MANAGEMENT
  // ============================================================================

  /**
   * Obtém handler específico
   * @param {string} handlerName - Nome do handler
   * @returns {Object|null} Handler ou null
   */
  static getHandler(handlerName) {
    return this._handlers.get(handlerName) || null;
  }

  /**
   * Verifica se handler está ativo
   * @param {string} handlerName - Nome do handler
   * @returns {boolean} Se está ativo
   */
  static isHandlerActive(handlerName) {
    const handler = this.getHandler(handlerName);
    return handler && handler._initialized === true;
  }

  /**
   * Reinicia handler específico
   * @param {string} handlerName - Nome do handler
   */
  static async restartHandler(handlerName) {
    const handler = this.getHandler(handlerName);
    if (!handler) {
      console.error(`Handler ${handlerName} não encontrado`);
      return;
    }

    try {
      // Remove listeners atuais
      if (typeof handler.removeAllListeners === 'function') {
        handler.removeAllListeners();
      }

      // Reinicializa
      if (typeof handler.init === 'function') {
        await handler.init();
        console.log(`✅ Handler ${handlerName} reiniciado`);
      }
    } catch (error) {
      console.error(`❌ Erro ao reiniciar ${handlerName}:`, error);
    }
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  /**
   * Verifica se está em modo debug
   * @returns {boolean} Se está em debug
   */
  static isDebugMode() {
    return localStorage.getItem('debug') === 'true' || 
           window.location.search.includes('debug=true');
  }

  /**
   * Ativa/desativa modo debug
   * @param {boolean} enabled - Se deve ativar debug
   */
  static setDebugMode(enabled) {
    if (enabled) {
      localStorage.setItem('debug', 'true');
      console.log('🐛 Modo debug ativado');
    } else {
      localStorage.removeItem('debug');
      console.log('🐛 Modo debug desativado');
    }
  }

  /**
   * Limpa recursos e remove listeners
   */
  static cleanup() {
    console.log('🧹 Fazendo cleanup do EventManager...');

    try {
      // Remove listeners de todos os handlers
      this._handlers.forEach((handler, name) => {
        if (typeof handler.removeAllListeners === 'function') {
          handler.removeAllListeners();
          console.log(`🧹 Listeners removidos de ${name}`);
        }
      });

      // Limpa event bus
      this._eventBus.clear();
      this._globalListeners.clear();

      this._initialized = false;
      console.log('✅ Cleanup concluído');
    } catch (error) {
      console.error('❌ Erro durante cleanup:', error);
    }
  }

  /**
   * Obtém estatísticas dos handlers
   * @returns {Object} Estatísticas
   */
  static getStats() {
    const stats = {
      initialized: this._initialized,
      handlersCount: this._handlers.size,
      eventBusListeners: 0,
      handlers: {}
    };

    // Conta listeners do event bus
    this._eventBus.forEach((listeners, eventName) => {
      stats.eventBusListeners += listeners.length;
    });

    // Estatísticas de cada handler
    this._handlers.forEach((handler, name) => {
      if (typeof handler.getDebugInfo === 'function') {
        stats.handlers[name] = handler.getDebugInfo();
      } else {
        stats.handlers[name] = { available: true };
      }
    });

    return stats;
  }

  /**
   * Gera relatório detalhado
   * @returns {string} Relatório formatado
   */
  static generateReport() {
    const stats = this.getStats();
    
    let report = '📊 RELATÓRIO DO EVENT MANAGER\n';
    report += '═══════════════════════════════\n\n';
    
    report += `Status: ${stats.initialized ? '✅ Inicializado' : '❌ Não inicializado'}\n`;
    report += `Handlers ativos: ${stats.handlersCount}\n`;
    report += `Event bus listeners: ${stats.eventBusListeners}\n\n`;
    
    report += 'HANDLERS DETALHADOS:\n';
    report += '───────────────────\n';
    
    Object.entries(stats.handlers).forEach(([name, info]) => {
      report += `\n${name}:\n`;
      report += `  Inicializado: ${info.initialized ? '✅' : '❌'}\n`;
      if (info.listenerCount) {
        report += `  Listeners: ${info.listenerCount}\n`;
      }
      if (info.activeListeners) {
        report += `  Tipos: ${info.activeListeners.join(', ')}\n`;
      }
    });

    return report;
  }

  /**
   * Imprime relatório no console
   */
  static printReport() {
    console.log(this.generateReport());
  }
}

// Para uso global (compatibilidade)
if (typeof window !== 'undefined') {
  window.EventManager = EventManager;

  // Função de conveniência para debug
  window.debugEvents = () => {
    EventManager.printReport();
  };
}

// Export default para compatibilidade
export default EventManager;