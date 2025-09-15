// ============================================================================
// 🎯 DOM SELECTORS MODULE
// ============================================================================
// Centraliza todos os seletores DOM da aplicação
// FASE 4 refatoração - extraindo seletores do main.js

/**
 * DOMSelectors - Centraliza acesso aos elementos DOM
 * 
 * Responsabilidades:
 * - Cache de elementos DOM
 * - Seletores organizados por funcionalidade
 * - Inicialização lazy dos elementos
 * - Verificação de existência de elementos
 */
export class DOMSelectors {
  static _cache = new Map();
  static _initialized = false;

  /**
   * Inicializa todos os seletores principais
   */
  static init() {
    if (this._initialized) return;

    try {
      // Modals principais
      this.cacheElement('deleteRecurrenceModal', 'deleteRecurrenceModal');
      this.cacheElement('editRecurrenceModal', 'editRecurrenceModal');
      this.cacheElement('confirmMoveModal', 'confirmMoveModal');
      this.cacheElement('confirmLogoutModal', 'confirmLogoutModal');
      this.cacheElement('settingsModal', 'settingsModal');
      this.cacheElement('plannedModal', 'plannedModal');

      // Botões de fechamento
      this.cacheElement('closeDeleteRecurrenceModal', 'closeDeleteRecurrenceModal');
      this.cacheElement('closeEditRecurrenceModal', 'closeEditRecurrenceModal');
      this.cacheElement('closeConfirmMove', 'closeConfirmMove');
      this.cacheElement('closeConfirmLogout', 'closeConfirmLogout');
      this.cacheElement('closeSettingsModal', 'closeSettingsModal');
      this.cacheElement('closePlannedModal', 'closePlannedModal');

      // Botões de ação - Delete Recurrence
      this.cacheElement('deleteSingleBtn', 'deleteSingleBtn');
      this.cacheElement('deleteFutureBtn', 'deleteFutureBtn');
      this.cacheElement('deleteAllBtn', 'deleteAllBtn');
      this.cacheElement('cancelDeleteRecurrence', 'cancelDeleteRecurrence');

      // Botões de ação - Edit Recurrence
      this.cacheElement('editSingleBtn', 'editSingleBtn');
      this.cacheElement('editFutureBtn', 'editFutureBtn');
      this.cacheElement('editAllBtn', 'editAllBtn');
      this.cacheElement('cancelEditRecurrence', 'cancelEditRecurrence');

      // Botões de confirmação
      this.cacheElement('confirmMoveYes', 'confirmMoveYes');
      this.cacheElement('confirmMoveNo', 'confirmMoveNo');
      this.cacheElement('confirmLogoutYes', 'confirmLogoutYes');
      this.cacheElement('confirmLogoutNo', 'confirmLogoutNo');

      // Textos de confirmação
      this.cacheElement('confirmMoveText', 'confirmMoveText');
      this.cacheElement('confirmLogoutText', 'confirmLogoutText');

      // Botões principais
      this.cacheElement('toggleThemeBtn', 'toggleThemeBtn');
      this.cacheElement('openPlannedBtn', 'openPlannedBtn');

      // Listas e containers
      this.cacheElement('plannedList', 'plannedList');

      // Header e navegação
      this.cacheElement('headerSeg', '.header-seg', 'querySelector');

      this._initialized = true;
    } catch (error) {
      console.error('Erro ao inicializar seletores DOM:', error);
    }
  }

  /**
   * Armazena elemento no cache
   * @param {string} key - Chave para o cache
   * @param {string} selector - Seletor CSS ou ID
   * @param {string} method - Método de seleção (getElementById ou querySelector)
   */
  static cacheElement(key, selector, method = 'getElementById') {
    try {
      const element = method === 'getElementById' 
        ? document.getElementById(selector)
        : document.querySelector(selector);
      
      if (element) {
        this._cache.set(key, element);
      } else {
        console.warn(`Elemento não encontrado: ${selector}`);
      }
    } catch (error) {
      console.error(`Erro ao cachear elemento ${selector}:`, error);
    }
  }

  /**
   * Obtém elemento do cache ou busca no DOM
   * @param {string} key - Chave do elemento
   * @returns {HTMLElement|null} Elemento DOM
   */
  static get(key) {
    if (!this._initialized) {
      this.init();
    }
    
    return this._cache.get(key) || null;
  }

  /**
   * Obtém múltiplos elementos
   * @param {Array<string>} keys - Array de chaves
   * @returns {Object} Objeto com elementos
   */
  static getMultiple(keys) {
    const elements = {};
    keys.forEach(key => {
      elements[key] = this.get(key);
    });
    return elements;
  }

  /**
   * Verifica se elemento existe
   * @param {string} key - Chave do elemento
   * @returns {boolean} True se elemento existe
   */
  static exists(key) {
    return this.get(key) !== null;
  }

  /**
   * Limpa cache de elementos
   */
  static clearCache() {
    this._cache.clear();
    this._initialized = false;
  }

  /**
   * Recarrega elemento específico
   * @param {string} key - Chave do elemento
   * @param {string} selector - Seletor CSS ou ID
   * @param {string} method - Método de seleção
   */
  static refresh(key, selector, method = 'getElementById') {
    this.cacheElement(key, selector, method);
  }

  // ============================================================================
  // GETTERS CONVENIENTES PARA ELEMENTOS PRINCIPAIS
  // ============================================================================

  // Modals
  static get deleteRecurrenceModal() { return this.get('deleteRecurrenceModal'); }
  static get editRecurrenceModal() { return this.get('editRecurrenceModal'); }
  static get confirmMoveModal() { return this.get('confirmMoveModal'); }
  static get confirmLogoutModal() { return this.get('confirmLogoutModal'); }
  static get settingsModal() { return this.get('settingsModal'); }
  static get plannedModal() { return this.get('plannedModal'); }

  // Botões de fechamento
  static get closeDeleteRecurrenceModal() { return this.get('closeDeleteRecurrenceModal'); }
  static get closeEditRecurrenceModal() { return this.get('closeEditRecurrenceModal'); }
  static get closeConfirmMove() { return this.get('closeConfirmMove'); }
  static get closeConfirmLogout() { return this.get('closeConfirmLogout'); }
  static get closeSettingsModal() { return this.get('closeSettingsModal'); }
  static get closePlannedModal() { return this.get('closePlannedModal'); }

  // Botões de ação - Delete
  static get deleteSingleBtn() { return this.get('deleteSingleBtn'); }
  static get deleteFutureBtn() { return this.get('deleteFutureBtn'); }
  static get deleteAllBtn() { return this.get('deleteAllBtn'); }
  static get cancelDeleteRecurrence() { return this.get('cancelDeleteRecurrence'); }

  // Botões de ação - Edit
  static get editSingleBtn() { return this.get('editSingleBtn'); }
  static get editFutureBtn() { return this.get('editFutureBtn'); }
  static get editAllBtn() { return this.get('editAllBtn'); }
  static get cancelEditRecurrence() { return this.get('cancelEditRecurrence'); }

  // Botões de confirmação
  static get confirmMoveYes() { return this.get('confirmMoveYes'); }
  static get confirmMoveNo() { return this.get('confirmMoveNo'); }
  static get confirmLogoutYes() { return this.get('confirmLogoutYes'); }
  static get confirmLogoutNo() { return this.get('confirmLogoutNo'); }

  // Textos
  static get confirmMoveText() { return this.get('confirmMoveText'); }
  static get confirmLogoutText() { return this.get('confirmLogoutText'); }

  // Botões principais
  static get toggleThemeBtn() { return this.get('toggleThemeBtn'); }
  static get openPlannedBtn() { return this.get('openPlannedBtn'); }

  // Containers
  static get plannedList() { return this.get('plannedList'); }
  static get headerSeg() { return this.get('headerSeg'); }

  // ============================================================================
  // SELETORES DINÂMICOS E HELPERS
  // ============================================================================

  /**
   * Busca elemento por ID (sem cache)
   * @param {string} id - ID do elemento
   * @returns {HTMLElement|null} Elemento DOM
   */
  static byId(id) {
    return document.getElementById(id);
  }

  /**
   * Busca elemento por seletor (sem cache)
   * @param {string} selector - Seletor CSS
   * @returns {HTMLElement|null} Elemento DOM
   */
  static bySelector(selector) {
    return document.querySelector(selector);
  }

  /**
   * Busca múltiplos elementos por seletor
   * @param {string} selector - Seletor CSS
   * @returns {NodeList} Lista de elementos
   */
  static allBySelector(selector) {
    return document.querySelectorAll(selector);
  }

  /**
   * Verifica se elemento é visível
   * @param {HTMLElement} element - Elemento a verificar
   * @returns {boolean} True se visível
   */
  static isVisible(element) {
    if (!element) return false;
    return element.offsetParent !== null;
  }

  /**
   * Obtém posição do elemento na página
   * @param {HTMLElement} element - Elemento
   * @returns {Object} Objeto com top, left, width, height
   */
  static getPosition(element) {
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    return {
      top: rect.top + window.scrollY,
      left: rect.left + window.scrollX,
      width: rect.width,
      height: rect.height
    };
  }
}

// Inicialização automática quando disponível
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => DOMSelectors.init());
  } else {
    DOMSelectors.init();
  }
}

// Para uso global (compatibilidade)
if (typeof window !== 'undefined') {
  window.DOMSelectors = DOMSelectors;
}