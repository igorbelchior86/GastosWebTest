// ============================================================================
// 🪟 MODAL SYSTEM
// ============================================================================
// Sistema genérico de modais extraído do main.js
// FASE 4 refatoração - integrado com novos módulos de view

import { DOMSelectors } from './dom-selectors.js';
import { ViewState } from './view-state.js';

/**
 * Generic modal manager for confirmation dialogs
 * Creates promises for user interaction with modals
 */
export class ModalManager {
  constructor() {
    this.activeModals = new Set();
  }

  /**
   * Show a confirmation modal with customizable buttons
   * @param {Object} config - Modal configuration
   * @param {string} config.modalId - ID of the modal element
   * @param {string} config.yesButtonId - ID of the yes/confirm button
   * @param {string} config.noButtonId - ID of the no/cancel button
   * @param {string} config.closeButtonId - ID of the close button (optional)
   * @param {string} config.message - Message to display (optional)
   * @param {string} config.messageElementId - ID of element to update with message (optional)
   * @returns {Promise<boolean>} Promise that resolves to true if confirmed, false if cancelled
   */
  showConfirmModal(config) {
    const {
      modalId,
      yesButtonId,
      noButtonId,
      closeButtonId,
      message,
      messageElementId,
      fallbackMessage = 'Confirmar ação?'
    } = config;

    const modal = DOMSelectors.get(modalId) || DOMSelectors.byId(modalId);
    const yesBtn = DOMSelectors.get(yesButtonId) || DOMSelectors.byId(yesButtonId);
    const noBtn = DOMSelectors.get(noButtonId) || DOMSelectors.byId(noButtonId);
    const closeBtn = closeButtonId ? (DOMSelectors.get(closeButtonId) || DOMSelectors.byId(closeButtonId)) : null;
    const messageEl = messageElementId ? (DOMSelectors.get(messageElementId) || DOMSelectors.byId(messageElementId)) : null;

    // Fallback to native confirm if elements not found
    if (!modal || !yesBtn || !noBtn) {
      return Promise.resolve(window.confirm(fallbackMessage));
    }

    // Update message if provided
    if (message && messageEl) {
      messageEl.textContent = message;
    }

    this.activeModals.add(modalId);

    return new Promise(resolve => {
      const cleanup = () => {
        ViewState.closeModal(modalId);
        this.activeModals.delete(modalId);
        // Remove event listeners
        yesBtn.onclick = null;
        noBtn.onclick = null;
        if (closeBtn) closeBtn.onclick = null;
        modal.onclick = null;
      };

      yesBtn.onclick = () => { cleanup(); resolve(true); };
      noBtn.onclick = () => { cleanup(); resolve(false); };
      if (closeBtn) closeBtn.onclick = () => { cleanup(); resolve(false); };
      
      // Close on backdrop click
      modal.onclick = (e) => { 
        if (e.target === modal) { 
          cleanup(); 
          resolve(false); 
        } 
      };

      ViewState.openModal(modalId);
    });
  }

  /**
   * Show a simple modal (non-confirmation)
   * @param {string} modalId - ID of the modal element
   * @param {Function} onOpen - Callback when modal opens (optional)
   */
  showModal(modalId, onOpen) {
    const modal = DOMSelectors.get(modalId) || DOMSelectors.byId(modalId);
    if (!modal) return;

    ViewState.openModal(modalId, { onOpen });
    this.activeModals.add(modalId);
    this.updateModalOpenState();
  }

  /**
   * Hide a modal
   * @param {string} modalId - ID of the modal element
   */
  hideModal(modalId) {
    const modal = DOMSelectors.get(modalId) || DOMSelectors.byId(modalId);
    if (!modal) return;

    ViewState.closeModal(modalId);
    this.activeModals.delete(modalId);
    this.updateModalOpenState();
  }

  /**
   * Check if any modal is currently open
   * @returns {boolean}
   */
  hasOpenModals() {
    return this.activeModals.size > 0 || ViewState.getActiveModal() !== null;
  }

  /**
   * Update body class to indicate modal state
   * Used by CSS for proper layering and backdrop
   */
  updateModalOpenState() {
    const hasOpen = this.hasOpenModals();
    document.body.classList.toggle('modal-open', hasOpen);
    
    // Trigger custom event for other components
    window.dispatchEvent(new CustomEvent('modalStateChange', {
      detail: { hasOpenModals: hasOpen, activeModals: Array.from(this.activeModals) }
    }));
  }

  /**
   * Setup generic modal handlers for close button and backdrop
   * @param {string} modalId - ID of the modal element
   * @param {string} closeButtonId - ID of the close button
   * @param {Function} onClose - Callback when modal closes (optional)
   */
  setupModalHandlers(modalId, closeButtonId, onClose) {
    const modal = DOMSelectors.get(modalId) || DOMSelectors.byId(modalId);
    const closeBtn = DOMSelectors.get(closeButtonId) || DOMSelectors.byId(closeButtonId);
    
    if (!modal || !closeBtn) return;

    closeBtn.onclick = () => {
      this.hideModal(modalId);
      if (onClose) onClose();
    };

    modal.onclick = (e) => {
      if (e.target === modal) {
        this.hideModal(modalId);
        if (onClose) onClose();
      }
    };
  }
}

// Create global instance
export const modalManager = new ModalManager();

// =============================================================================
// 🔗 SPECIFIC MODAL FUNCTIONS (backwards compatibility)
// =============================================================================

/**
 * Ask user if they want to move to today
 * @returns {Promise<boolean>}
 */
export function askMoveToToday() {
  return modalManager.showConfirmModal({
    modalId: 'confirmMoveModal',
    yesButtonId: 'confirmMoveYes',
    noButtonId: 'confirmMoveNo',
    closeButtonId: 'closeConfirmMove',
    fallbackMessage: 'Operação concluída. Gostaria de mover para hoje?'
  });
}

/**
 * Ask user to confirm logout
 * @returns {Promise<boolean>}
 */
export function askConfirmLogout() {
  return modalManager.showConfirmModal({
    modalId: 'confirmLogoutModal',
    yesButtonId: 'confirmLogoutYes',
    noButtonId: 'confirmLogoutNo',
    closeButtonId: 'closeConfirmLogout',
    fallbackMessage: 'Deseja mesmo desconectar?'
  });
}

/**
 * Show planned transactions modal
 */
export function showPlannedModal() {
  modalManager.showModal('plannedModal', () => {
    // Render planned modal content if function exists
    if (typeof renderPlannedModal === 'function') {
      renderPlannedModal();
    }
  });
}

/**
 * Hide planned transactions modal
 */
export function hidePlannedModal() {
  modalManager.hideModal('plannedModal');
}

/**
 * Show settings modal
 */
export function showSettingsModal() {
  modalManager.showModal('settingsModal', () => {
    // Render settings modal content if function exists
    if (typeof renderSettingsModal === 'function') {
      renderSettingsModal();
    }
  });
}

/**
 * Hide settings modal
 */
export function hideSettingsModal() {
  modalManager.hideModal('settingsModal');
}

// =============================================================================
// 🔗 GLOBAL COMPATIBILITY
// =============================================================================
// Expose functions globally for backwards compatibility with existing code

if (typeof window !== 'undefined') {
  window.modalManager = modalManager;
  window.askMoveToToday = askMoveToToday;
  window.askConfirmLogout = askConfirmLogout;
  window.showPlannedModal = showPlannedModal;
  window.hidePlannedModal = hidePlannedModal;
  window.showSettingsModal = showSettingsModal;
  window.hideSettingsModal = hideSettingsModal;
  
  // Add to global utils if it exists
  if (window.updateModalOpenState) {
    window.updateModalOpenState = () => modalManager.updateModalOpenState();
  }
}