// ============================================================================
// 🎯 UI EVENT HANDLERS MODULE
// ============================================================================
// Gerencia eventos de interface (clicks, navigation, modals)
// FASE 5 refatoração - modularizando event handlers

import { DOMSelectors } from '../ui/dom-selectors.js';
import { ViewState } from '../ui/view-state.js';
import { modalManager } from '../ui/modals.js';

/**
 * UIEventHandlers - Gerencia eventos de interface do usuário
 * 
 * Responsabilidades:
 * - Clicks em botões e navegação
 * - Eventos de modals
 * - Navegação do header segmentado
 * - Interações de UI
 */
export class UIEventHandlers {
  static _initialized = false;
  static _listeners = new Map();

  /**
   * Inicializa todos os event handlers de UI
   */
  static init() {
    if (this._initialized) return;

    try {
      this.setupHeaderNavigation();
      this.setupModalHandlers();
      this.setupGlobalClickHandler();
      this.setupBottomPillEvents();
      this._initialized = true;
      console.log('UIEventHandlers inicializados');
    } catch (error) {
      console.error('Erro ao inicializar UIEventHandlers:', error);
    }
  }

  /**
   * Configura navegação do header segmentado
   */
  static setupHeaderNavigation() {
    const headerSeg = DOMSelectors.headerSeg;
    if (!headerSeg) return;

    const handler = (e) => {
      const btn = e.target.closest('.seg-option');
      if (!btn) return;
      
      const action = btn.dataset.action;
      
      if (action === 'planned') {
        const openPlannedBtn = DOMSelectors.openPlannedBtn;
        if (openPlannedBtn) {
          headerSeg.dataset.selected = 'planned';
          openPlannedBtn.click();
        }
      } else if (action === 'cards') {
        const openCardBtn = DOMSelectors.byId('openCardModal');
        if (openCardBtn) {
          headerSeg.dataset.selected = 'cards';
          openCardBtn.click();
        }
      }
    };

    this.addListener(headerSeg, 'click', handler, 'headerNavigation');
  }

  /**
   * Configura handlers para modals
   */
  static setupModalHandlers() {
    // Settings modal
    const closeSettingsBtn = DOMSelectors.closeSettingsModal;
    const settingsModal = DOMSelectors.settingsModal;

    if (closeSettingsBtn) {
      this.addListener(closeSettingsBtn, 'click', () => this.closeSettings(), 'closeSettingsBtn');
    }

    if (settingsModal) {
      this.addListener(settingsModal, 'click', (e) => {
        if (e.target === settingsModal) this.closeSettings();
      }, 'settingsModalBackdrop');
    }

    // Planned modal
    const openPlannedBtn = DOMSelectors.openPlannedBtn;
    if (openPlannedBtn) {
      this.addListener(openPlannedBtn, 'click', () => {
        setTimeout(() => {
          if (typeof renderPlannedModal === 'function') {
            renderPlannedModal();
          }
        }, 100);
      }, 'openPlannedBtn');
    }

    // Auth state listener
    try {
      this.addListener(document, 'auth:state', () => {
        if (typeof renderSettingsModal === 'function') {
          renderSettingsModal();
        }
      }, 'authStateSettings');
    } catch (_) {
      console.warn('Não foi possível adicionar listener auth:state');
    }
  }

  /**
   * Configura handler global de clicks
   */
  static setupGlobalClickHandler() {
    const handler = (e) => {
      // Delegation para diferentes tipos de elementos
      const target = e.target;
      
      // Botões de transação
      if (target.matches('.tx-btn')) {
        this.handleTransactionButton(e);
        return;
      }

      // Botões de cartão
      if (target.matches('.card-btn')) {
        this.handleCardButton(e);
        return;
      }

      // Links de categorias
      if (target.matches('.category-link')) {
        this.handleCategoryLink(e);
        return;
      }

      // Botões de ação em tabelas
      if (target.matches('.action-btn')) {
        this.handleActionButton(e);
        return;
      }
    };

    this.addListener(document, 'click', handler, 'globalClickHandler');
  }

  /**
   * Configura eventos do bottom pill
   */
  static setupBottomPillEvents() {
    const bottomPill = DOMSelectors.bySelector('.bottom-pill');
    if (!bottomPill) return;

    const handler = (e) => {
      const btn = e.target.closest('.pill-btn');
      if (!btn) return;

      const action = btn.dataset.action;
      
      switch (action) {
        case 'add':
          this.handleAddTransaction();
          break;
        case 'filter':
          this.handleFilterToggle();
          break;
        case 'sync':
          this.handleSyncAction();
          break;
        default:
          console.log('Ação do pill não reconhecida:', action);
      }
    };

    this.addListener(bottomPill, 'click', handler, 'bottomPillEvents');
  }

  // ============================================================================
  // HANDLERS ESPECÍFICOS
  // ============================================================================

  /**
   * Manipula cliques em botões de transação
   * @param {Event} e - Evento de click
   */
  static handleTransactionButton(e) {
    const button = e.target;
    const action = button.dataset.action;
    const txId = button.dataset.txId;

    switch (action) {
      case 'edit':
        this.editTransaction(txId);
        break;
      case 'delete':
        this.deleteTransaction(txId);
        break;
      case 'duplicate':
        this.duplicateTransaction(txId);
        break;
    }
  }

  /**
   * Manipula cliques em botões de cartão
   * @param {Event} e - Evento de click
   */
  static handleCardButton(e) {
    const button = e.target;
    const action = button.dataset.action;
    const cardName = button.dataset.cardName;

    switch (action) {
      case 'edit':
        this.editCard(cardName);
        break;
      case 'delete':
        this.deleteCard(cardName);
        break;
      case 'view':
        this.viewCardTransactions(cardName);
        break;
    }
  }

  /**
   * Manipula cliques em links de categoria
   * @param {Event} e - Evento de click
   */
  static handleCategoryLink(e) {
    e.preventDefault();
    const category = e.target.dataset.category;
    if (category && typeof filterByCategory === 'function') {
      filterByCategory(category);
    }
  }

  /**
   * Manipula botões de ação gerais
   * @param {Event} e - Evento de click
   */
  static handleActionButton(e) {
    const button = e.target;
    const action = button.dataset.action;
    
    // Delegates para função apropriada baseada na ação
    if (typeof window[action] === 'function') {
      const params = button.dataset.params ? JSON.parse(button.dataset.params) : [];
      window[action](...params);
    }
  }

  /**
   * Abre modal de nova transação
   */
  static handleAddTransaction() {
    if (typeof openTxModal === 'function') {
      openTxModal();
    }
  }

  /**
   * Alterna filtros
   */
  static handleFilterToggle() {
    if (typeof toggleFilters === 'function') {
      toggleFilters();
    }
  }

  /**
   * Força sincronização
   */
  static handleSyncAction() {
    if (typeof forcSync === 'function') {
      forcSync();
    }
  }

  /**
   * Edita transação
   * @param {string} txId - ID da transação
   */
  static editTransaction(txId) {
    if (typeof editTx === 'function') {
      editTx(txId);
    }
  }

  /**
   * Deleta transação
   * @param {string} txId - ID da transação
   */
  static deleteTransaction(txId) {
    if (typeof deleteTx === 'function') {
      deleteTx(txId);
    }
  }

  /**
   * Duplica transação
   * @param {string} txId - ID da transação
   */
  static duplicateTransaction(txId) {
    if (typeof duplicateTx === 'function') {
      duplicateTx(txId);
    }
  }

  /**
   * Edita cartão
   * @param {string} cardName - Nome do cartão
   */
  static editCard(cardName) {
    if (typeof editCard === 'function') {
      editCard(cardName);
    }
  }

  /**
   * Deleta cartão
   * @param {string} cardName - Nome do cartão
   */
  static deleteCard(cardName) {
    if (typeof deleteCard === 'function') {
      deleteCard(cardName);
    }
  }

  /**
   * Visualiza transações do cartão
   * @param {string} cardName - Nome do cartão
   */
  static viewCardTransactions(cardName) {
    if (typeof filterByCard === 'function') {
      filterByCard(cardName);
    }
  }

  /**
   * Fecha modal de settings
   */
  static closeSettings() {
    ViewState.closeModal('settingsModal');
    if (typeof closeSettings === 'function') {
      closeSettings();
    }
  }

  // ============================================================================
  // UTILITÁRIOS DE EVENT LISTENERS
  // ============================================================================

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
   * Lista todos os listeners ativos
   * @returns {Array} Lista de listeners
   */
  static getActiveListeners() {
    return Array.from(this._listeners.keys());
  }

  /**
   * Obtém informações de debug
   * @returns {Object} Info de debug
   */
  static getDebugInfo() {
    return {
      initialized: this._initialized,
      activeListeners: this.getActiveListeners(),
      listenerCount: this._listeners.size
    };
  }
}

// Para uso global (compatibilidade)
if (typeof window !== 'undefined') {
  window.UIEventHandlers = UIEventHandlers;
}