// ============================================================================
// 👁️ VIEW STATE MODULE
// ============================================================================
// Gerencia estado da interface e interações visuais
// FASE 4 refatoração - extraindo controle de view do main.js

import { DOMSelectors } from './dom-selectors.js';

/**
 * ViewState - Gerencia estado visual da aplicação
 * 
 * Responsabilidades:
 * - Estado de modals (aberto/fechado)
 * - Visibilidade de elementos
 * - Estados de loading
 * - Classes CSS dinâmicas
 * - Foco e seleção
 */
export class ViewState {
  static _state = {
    activeModal: null,
    loadingElements: new Set(),
    disabledElements: new Set(),
    hiddenElements: new Set(),
    activeTab: null,
    activeFilter: null
  };

  // ============================================================================
  // GERENCIAMENTO DE MODALS
  // ============================================================================

  /**
   * Abre modal
   * @param {string} modalId - ID do modal
   * @param {Object} options - Opções do modal
   */
  static openModal(modalId, options = {}) {
    const modal = DOMSelectors.get(modalId) || DOMSelectors.byId(modalId);
    if (!modal) {
      console.warn(`Modal não encontrado: ${modalId}`);
      return;
    }

    // Fecha modal anterior se existir
    if (this._state.activeModal) {
      this.closeModal(this._state.activeModal);
    }

    // Abre novo modal
    modal.style.display = 'block';
    modal.classList.add('modal-open');
    document.body.classList.add('modal-active');

    this._state.activeModal = modalId;

    // Foca primeiro input se especificado
    if (options.focusFirst) {
      const firstInput = modal.querySelector('input, select, textarea, button');
      if (firstInput) {
        setTimeout(() => firstInput.focus(), 100);
      }
    }

    // Callback após abrir
    if (options.onOpen) {
      options.onOpen(modal);
    }

    // Emite evento
    this.emitEvent('modalOpened', { modalId, modal });
  }

  /**
   * Fecha modal
   * @param {string} modalId - ID do modal (opcional, fecha ativo se não informado)
   */
  static closeModal(modalId = null) {
    const targetModalId = modalId || this._state.activeModal;
    if (!targetModalId) return;

    const modal = DOMSelectors.get(targetModalId) || DOMSelectors.byId(targetModalId);
    if (!modal) return;

    modal.style.display = 'none';
    modal.classList.remove('modal-open');
    document.body.classList.remove('modal-active');

    if (this._state.activeModal === targetModalId) {
      this._state.activeModal = null;
    }

    // Emite evento
    this.emitEvent('modalClosed', { modalId: targetModalId, modal });
  }

  /**
   * Verifica se modal está aberto
   * @param {string} modalId - ID do modal
   * @returns {boolean} True se modal está aberto
   */
  static isModalOpen(modalId) {
    return this._state.activeModal === modalId;
  }

  /**
   * Obtém modal ativo
   * @returns {string|null} ID do modal ativo
   */
  static getActiveModal() {
    return this._state.activeModal;
  }

  // ============================================================================
  // GERENCIAMENTO DE LOADING
  // ============================================================================

  /**
   * Mostra loading em elemento
   * @param {string|HTMLElement} target - Seletor ou elemento
   * @param {string} message - Mensagem de loading
   */
  static showLoading(target, message = 'Carregando...') {
    const element = typeof target === 'string' ? DOMSelectors.bySelector(target) : target;
    if (!element) return;

    const loadingId = element.id || `loading_${Date.now()}`;
    this._state.loadingElements.add(loadingId);

    element.classList.add('loading');
    element.setAttribute('aria-busy', 'true');

    // Adiciona spinner se não existir
    let spinner = element.querySelector('.loading-spinner');
    if (!spinner) {
      spinner = document.createElement('div');
      spinner.className = 'loading-spinner';
      spinner.innerHTML = `
        <div class="spinner"></div>
        <span class="loading-text">${message}</span>
      `;
      element.appendChild(spinner);
    } else {
      const textElement = spinner.querySelector('.loading-text');
      if (textElement) {
        textElement.textContent = message;
      }
    }
  }

  /**
   * Remove loading de elemento
   * @param {string|HTMLElement} target - Seletor ou elemento
   */
  static hideLoading(target) {
    const element = typeof target === 'string' ? DOMSelectors.bySelector(target) : target;
    if (!element) return;

    const loadingId = element.id || `loading_${Date.now()}`;
    this._state.loadingElements.delete(loadingId);

    element.classList.remove('loading');
    element.removeAttribute('aria-busy');

    const spinner = element.querySelector('.loading-spinner');
    if (spinner) {
      spinner.remove();
    }
  }

  /**
   * Verifica se elemento está em loading
   * @param {string|HTMLElement} target - Seletor ou elemento
   * @returns {boolean} True se está em loading
   */
  static isLoading(target) {
    const element = typeof target === 'string' ? DOMSelectors.bySelector(target) : target;
    if (!element) return false;
    return element.classList.contains('loading');
  }

  // ============================================================================
  // GERENCIAMENTO DE VISIBILIDADE
  // ============================================================================

  /**
   * Mostra elemento
   * @param {string|HTMLElement} target - Seletor ou elemento
   * @param {string} display - Tipo de display (block, flex, etc.)
   */
  static show(target, display = 'block') {
    const element = typeof target === 'string' ? DOMSelectors.bySelector(target) : target;
    if (!element) return;

    element.style.display = display;
    element.classList.remove('hidden');
    this._state.hiddenElements.delete(element.id);
  }

  /**
   * Esconde elemento
   * @param {string|HTMLElement} target - Seletor ou elemento
   */
  static hide(target) {
    const element = typeof target === 'string' ? DOMSelectors.bySelector(target) : target;
    if (!element) return;

    element.style.display = 'none';
    element.classList.add('hidden');
    if (element.id) {
      this._state.hiddenElements.add(element.id);
    }
  }

  /**
   * Alterna visibilidade
   * @param {string|HTMLElement} target - Seletor ou elemento
   * @param {string} display - Tipo de display quando visível
   */
  static toggle(target, display = 'block') {
    const element = typeof target === 'string' ? DOMSelectors.bySelector(target) : target;
    if (!element) return;

    if (this.isVisible(element)) {
      this.hide(element);
    } else {
      this.show(element, display);
    }
  }

  /**
   * Verifica se elemento está visível
   * @param {string|HTMLElement} target - Seletor ou elemento
   * @returns {boolean} True se visível
   */
  static isVisible(target) {
    const element = typeof target === 'string' ? DOMSelectors.bySelector(target) : target;
    if (!element) return false;
    
    return element.offsetParent !== null && 
           !element.classList.contains('hidden') &&
           element.style.display !== 'none';
  }

  // ============================================================================
  // GERENCIAMENTO DE ESTADO DE ELEMENTOS
  // ============================================================================

  /**
   * Habilita elemento
   * @param {string|HTMLElement} target - Seletor ou elemento
   */
  static enable(target) {
    const element = typeof target === 'string' ? DOMSelectors.bySelector(target) : target;
    if (!element) return;

    element.disabled = false;
    element.classList.remove('disabled');
    this._state.disabledElements.delete(element.id);
  }

  /**
   * Desabilita elemento
   * @param {string|HTMLElement} target - Seletor ou elemento
   */
  static disable(target) {
    const element = typeof target === 'string' ? DOMSelectors.bySelector(target) : target;
    if (!element) return;

    element.disabled = true;
    element.classList.add('disabled');
    if (element.id) {
      this._state.disabledElements.add(element.id);
    }
  }

  /**
   * Verifica se elemento está habilitado
   * @param {string|HTMLElement} target - Seletor ou elemento
   * @returns {boolean} True se habilitado
   */
  static isEnabled(target) {
    const element = typeof target === 'string' ? DOMSelectors.bySelector(target) : target;
    if (!element) return false;
    return !element.disabled && !element.classList.contains('disabled');
  }

  // ============================================================================
  // GERENCIAMENTO DE FOCO
  // ============================================================================

  /**
   * Define foco em elemento
   * @param {string|HTMLElement} target - Seletor ou elemento
   * @param {Object} options - Opções de foco
   */
  static focus(target, options = {}) {
    const element = typeof target === 'string' ? DOMSelectors.bySelector(target) : target;
    if (!element) return;

    if (options.delay) {
      setTimeout(() => element.focus(), options.delay);
    } else {
      element.focus();
    }

    if (options.select && element.select) {
      element.select();
    }
  }

  /**
   * Remove foco do elemento ativo
   */
  static blur() {
    if (document.activeElement) {
      document.activeElement.blur();
    }
  }

  // ============================================================================
  // GERENCIAMENTO DE CLASSES CSS
  // ============================================================================

  /**
   * Adiciona classe a elemento
   * @param {string|HTMLElement} target - Seletor ou elemento
   * @param {string} className - Nome da classe
   */
  static addClass(target, className) {
    const element = typeof target === 'string' ? DOMSelectors.bySelector(target) : target;
    if (element) {
      element.classList.add(className);
    }
  }

  /**
   * Remove classe de elemento
   * @param {string|HTMLElement} target - Seletor ou elemento
   * @param {string} className - Nome da classe
   */
  static removeClass(target, className) {
    const element = typeof target === 'string' ? DOMSelectors.bySelector(target) : target;
    if (element) {
      element.classList.remove(className);
    }
  }

  /**
   * Alterna classe em elemento
   * @param {string|HTMLElement} target - Seletor ou elemento
   * @param {string} className - Nome da classe
   */
  static toggleClass(target, className) {
    const element = typeof target === 'string' ? DOMSelectors.bySelector(target) : target;
    if (element) {
      element.classList.toggle(className);
    }
  }

  /**
   * Verifica se elemento tem classe
   * @param {string|HTMLElement} target - Seletor ou elemento
   * @param {string} className - Nome da classe
   * @returns {boolean} True se tem a classe
   */
  static hasClass(target, className) {
    const element = typeof target === 'string' ? DOMSelectors.bySelector(target) : target;
    return element ? element.classList.contains(className) : false;
  }

  // ============================================================================
  // GERENCIAMENTO DE TABS E NAVEGAÇÃO
  // ============================================================================

  /**
   * Ativa tab
   * @param {string} tabId - ID da tab
   */
  static activateTab(tabId) {
    // Remove ativo de todas as tabs
    const allTabs = DOMSelectors.allBySelector('.tab');
    allTabs.forEach(tab => tab.classList.remove('active'));

    // Ativa tab específica
    const tab = DOMSelectors.byId(tabId);
    if (tab) {
      tab.classList.add('active');
      this._state.activeTab = tabId;
    }

    // Emite evento
    this.emitEvent('tabChanged', { tabId });
  }

  /**
   * Obtém tab ativa
   * @returns {string|null} ID da tab ativa
   */
  static getActiveTab() {
    return this._state.activeTab;
  }

  // ============================================================================
  // SISTEMA DE EVENTOS
  // ============================================================================

  /**
   * Emite evento customizado
   * @param {string} eventName - Nome do evento
   * @param {Object} detail - Dados do evento
   */
  static emitEvent(eventName, detail = {}) {
    const event = new CustomEvent(`viewState:${eventName}`, { detail });
    document.dispatchEvent(event);
  }

  /**
   * Escuta evento do ViewState
   * @param {string} eventName - Nome do evento
   * @param {Function} callback - Função callback
   */
  static on(eventName, callback) {
    document.addEventListener(`viewState:${eventName}`, callback);
  }

  /**
   * Para de escutar evento
   * @param {string} eventName - Nome do evento
   * @param {Function} callback - Função callback
   */
  static off(eventName, callback) {
    document.removeEventListener(`viewState:${eventName}`, callback);
  }

  // ============================================================================
  // UTILITÁRIOS
  // ============================================================================

  /**
   * Obtém estado atual
   * @returns {Object} Estado atual
   */
  static getState() {
    return { ...this._state };
  }

  /**
   * Reseta estado
   */
  static reset() {
    this._state = {
      activeModal: null,
      loadingElements: new Set(),
      disabledElements: new Set(),
      hiddenElements: new Set(),
      activeTab: null,
      activeFilter: null
    };
  }
}

// Para uso global (compatibilidade)
if (typeof window !== 'undefined') {
  window.ViewState = ViewState;
}