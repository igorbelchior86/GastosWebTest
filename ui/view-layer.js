// ============================================================================
// 🎨 VIEW LAYER INDEX
// ============================================================================
// Ponto central de acesso para todos os módulos de view
// FASE 4 refatoração - camada de view unificada

// Importa todos os módulos de view
export { DOMSelectors } from './dom-selectors.js';
export { Renderers } from './renderers.js';
export { ViewState } from './view-state.js';
export { ModalManager, modalManager } from './modals.js';
export { StickyHeaderManager, stickyHeader } from './sticky-header.js';

// Re-exporta funções específicas para compatibilidade
export {
  askMoveToToday,
  askConfirmLogout,
  showPlannedModal,
  hidePlannedModal,
  showSettingsModal,
  hideSettingsModal
} from './modals.js';

/**
 * ViewLayer - Classe principal para gerenciar toda a camada de view
 * 
 * Responsabilidades:
 * - Inicialização coordenada de todos os módulos
 * - Interface unificada para operações de view
 * - Coordenação entre diferentes módulos
 * - Gerenciamento de ciclo de vida
 */
export class ViewLayer {
  static _initialized = false;

  /**
   * Inicializa toda a camada de view
   */
  static async init() {
    if (this._initialized) return;

    try {
      console.log('Inicializando camada de view...');

      // Inicializa seletores DOM primeiro
      DOMSelectors.init();

      // Inicializa outros módulos
      stickyHeader.init();

      // Configura event listeners globais
      this.setupGlobalListeners();

      this._initialized = true;
      console.log('Camada de view inicializada com sucesso');

      // Emite evento de inicialização
      document.dispatchEvent(new CustomEvent('viewLayerInitialized'));

    } catch (error) {
      console.error('Erro ao inicializar camada de view:', error);
      throw error;
    }
  }

  /**
   * Configura event listeners globais
   */
  static setupGlobalListeners() {
    // Listener para mudanças de estado de modal
    ViewState.on('modalOpened', (event) => {
      modalManager.updateModalOpenState();
    });

    ViewState.on('modalClosed', (event) => {
      modalManager.updateModalOpenState();
    });

    // Listener para teclas ESC (fechar modals)
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        const activeModal = ViewState.getActiveModal();
        if (activeModal) {
          ViewState.closeModal();
        }
      }
    });

    // Listener para redimensionamento da janela
    window.addEventListener('resize', () => {
      this.handleResize();
    });
  }

  /**
   * Manipula redimensionamento da janela
   */
  static handleResize() {
    // Reposiciona modals se necessário
    const activeModal = ViewState.getActiveModal();
    if (activeModal) {
      // Lógica de reposicionamento se necessário
    }
  }

  /**
   * Renderiza componente específico
   * @param {string} component - Nome do componente
   * @param {Object} data - Dados para renderização
   * @param {Object} options - Opções de renderização
   */
  static render(component, data = {}, options = {}) {
    try {
      switch (component) {
        case 'settingsModal':
          return Renderers.renderSettingsModal();
        
        case 'cardSelector':
          return Renderers.renderCardSelector(data.cards, data.selectedCard);
        
        case 'cardList':
          return Renderers.renderCardList(data.cards);
        
        case 'transactionTable':
          return Renderers.renderTable(data.transactions);
        
        case 'transactionGroups':
          return Renderers.renderTransactionGroups(data.groups);
        
        case 'plannedModal':
          return Renderers.renderPlannedModal(data.plannedTransactions);
        
        case 'pendingBadge':
          return Renderers.updatePendingBadge(data.count);
        
        default:
          console.warn(`Componente desconhecido: ${component}`);
      }
    } catch (error) {
      console.error(`Erro ao renderizar ${component}:`, error);
      
      // Renderiza estado de erro se container foi especificado
      if (options.container) {
        Renderers.renderError(options.container, `Erro ao carregar ${component}`);
      }
    }
  }

  /**
   * Atualiza múltiplos componentes
   * @param {Array} updates - Array de atualizações
   */
  static updateMultiple(updates) {
    updates.forEach(update => {
      this.render(update.component, update.data, update.options);
    });
  }

  /**
   * Mostra loading para componente
   * @param {string} component - Nome do componente
   * @param {string} message - Mensagem de loading
   */
  static showLoading(component, message = 'Carregando...') {
    const container = this.getComponentContainer(component);
    if (container) {
      ViewState.showLoading(container, message);
    }
  }

  /**
   * Esconde loading de componente
   * @param {string} component - Nome do componente
   */
  static hideLoading(component) {
    const container = this.getComponentContainer(component);
    if (container) {
      ViewState.hideLoading(container);
    }
  }

  /**
   * Obtém container de um componente
   * @param {string} component - Nome do componente
   * @returns {HTMLElement|null} Container do componente
   */
  static getComponentContainer(component) {
    const containerMap = {
      'transactionTable': 'transactionTable',
      'cardList': 'cardsList',
      'plannedModal': 'plannedList',
      'cardSelector': 'cardSelect'
    };

    const containerId = containerMap[component];
    return containerId ? DOMSelectors.byId(containerId) : null;
  }

  /**
   * Executa operação com loading automático
   * @param {string} component - Nome do componente
   * @param {Function} operation - Operação assíncrona
   * @param {string} loadingMessage - Mensagem de loading
   */
  static async withLoading(component, operation, loadingMessage = 'Carregando...') {
    try {
      this.showLoading(component, loadingMessage);
      const result = await operation();
      return result;
    } catch (error) {
      console.error(`Erro durante operação em ${component}:`, error);
      
      const container = this.getComponentContainer(component);
      if (container) {
        Renderers.renderError(container, 'Erro ao carregar dados');
      }
      
      throw error;
    } finally {
      this.hideLoading(component);
    }
  }

  /**
   * Reseta toda a camada de view
   */
  static reset() {
    ViewState.reset();
    DOMSelectors.clearCache();
    this._initialized = false;
  }

  /**
   * Verifica se a camada está inicializada
   * @returns {boolean} True se inicializada
   */
  static isInitialized() {
    return this._initialized;
  }

  /**
   * Obtém informações de debug
   * @returns {Object} Informações de debug
   */
  static getDebugInfo() {
    return {
      initialized: this._initialized,
      activeModal: ViewState.getActiveModal(),
      viewState: ViewState.getState(),
      cachedElements: DOMSelectors._cache.size
    };
  }
}

// Auto-inicialização quando DOM estiver pronto
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ViewLayer.init());
  } else {
    ViewLayer.init();
  }
}

// Para uso global (compatibilidade)
if (typeof window !== 'undefined') {
  window.ViewLayer = ViewLayer;
  window.DOMSelectors = DOMSelectors;
  window.Renderers = Renderers;
  window.ViewState = ViewState;
}