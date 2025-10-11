/**
 * Transaction modal utilities.
 * This module provides helper functions for managing the transaction modal state,
 * focusing fields, and resetting modal content.
 */
import { updateModalOpenState as syncRootModalState } from '../utils/dom.js';

/**
 * Resets the transaction modal to its default state
 */
export function resetTxModal() {
  try {
    // Get modal elements
    const val = document.getElementById('val');
    const desc = document.getElementById('desc');
    const card = document.getElementById('card');
    const installments = document.getElementById('installments');
    const invoiceParcelCheckbox = document.getElementById('invoiceParcelCheckbox');
    const parcelasBlock = document.getElementById('parcelasBlock');
    const recurrence = document.getElementById('recurrence');

    // Reset form fields
    if (val) val.value = '';
    if (desc) desc.value = '';
    if (card && card.options.length > 0) card.selectedIndex = 0;
    if (recurrence) recurrence.value = 'none';

    // Reset invoice parcel settings
    if (invoiceParcelCheckbox) {
      invoiceParcelCheckbox.checked = false;
    }
    if (parcelasBlock) {
      parcelasBlock.style.display = 'none';
    }
    if (installments) {
      installments.value = '2';
    }

    // Reset any edit mode indicators
    const modal = document.getElementById('txModal');
    if (modal) {
      modal.classList.remove('editing');
      modal.removeAttribute('data-editing-id');
    }

    // Reset modal title
    const modalTitle = modal?.querySelector('.modal-title');
    if (modalTitle) {
      modalTitle.textContent = 'Nova Transação';
    }

    // Clear any error states
    clearFieldErrors();

  } catch (error) {
    console.warn('Error resetting transaction modal:', error);
  }
}

/**
 * Updates the modal open state and manages related UI elements
 */
export function updateModalOpenState() {
  try {
    const txModal = document.getElementById('txModal');
    const openTxBtn = document.getElementById('openTxModal') || document.getElementById('openTxBtn');
    
    if (!txModal) return;

    const isOpen = !txModal.classList.contains('hidden');
    
    // Sync modal-open class with the root element so scroll locking stays consistent.
    if (typeof syncRootModalState === 'function') {
      syncRootModalState();
    } else {
      const root = document.documentElement || document.body;
      root?.classList.toggle('modal-open', isOpen);
    }

    // Update button rotation
    if (openTxBtn) {
      openTxBtn.style.transform = isOpen ? 'rotate(45deg)' : 'rotate(0deg)';
      openTxBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    }

    // Dispatch custom event for other components
    const event = new CustomEvent('modalStateChange', { 
      detail: { isOpen, modalType: 'transaction' }
    });
    window.dispatchEvent(event);

  } catch (error) {
    console.warn('Error updating modal open state:', error);
  }
}

/**
 * Focuses the value field in the transaction modal
 */
export function focusValueField() {
  try {
    const val = document.getElementById('val');
    if (val) {
      // Small delay to ensure modal is fully visible
      setTimeout(() => {
        val.focus();
        val.select(); // Select any existing text
      }, 100);
    }
  } catch (error) {
    console.warn('Error focusing value field:', error);
  }
}

/**
 * Sets the modal to edit mode for an existing transaction
 * @param {Object} transaction - The transaction to edit
 */
export function setEditMode(transaction) {
  try {
    if (!transaction) return;

    const modal = document.getElementById('txModal');
    const val = document.getElementById('val');
    const desc = document.getElementById('desc');
    const card = document.getElementById('card');

    // Mark modal as in edit mode
    if (modal) {
      modal.classList.add('editing');
      modal.setAttribute('data-editing-id', transaction.id);
    }

    // Update modal title
    const modalTitle = modal?.querySelector('.modal-title');
    if (modalTitle) {
      modalTitle.textContent = 'Editar Transação';
    }

    // Populate form fields
    if (val) val.value = transaction.value ? Math.abs(transaction.value).toString() : '';
    if (desc) desc.value = transaction.desc || '';
    if (card && transaction.card) {
      const option = Array.from(card.options).find(opt => opt.value === transaction.card);
      if (option) {
        card.value = transaction.card;
      }
    }

    // Handle invoice parcel data if present
    if (transaction.invoice) {
      const invoiceParcelCheckbox = document.getElementById('invoiceParcelCheckbox');
      const installments = document.getElementById('installments');
      const parcelasBlock = document.getElementById('parcelasBlock');

      if (invoiceParcelCheckbox && transaction.invoice.total > 1) {
        invoiceParcelCheckbox.checked = true;
        if (parcelasBlock) parcelasBlock.style.display = 'block';
        if (installments) installments.value = transaction.invoice.total.toString();
      }
    }

  } catch (error) {
    console.warn('Error setting edit mode:', error);
  }
}

/**
 * Gets the current form data from the modal
 * @returns {Object|null} Form data object or null if invalid
 */
export function getFormData() {
  try {
    const val = document.getElementById('val');
    const desc = document.getElementById('desc');
    const card = document.getElementById('card');
    const recurrence = document.getElementById('recurrence');
    const invoiceParcelCheckbox = document.getElementById('invoiceParcelCheckbox');
    const installments = document.getElementById('installments');

    if (!val || !desc || !card) return null;

    const data = {
      value: parseFloat(val.value) || 0,
      desc: desc.value.trim(),
      card: card.value,
      recurrence: recurrence?.value || 'none'
    };

    // Add invoice data if applicable
    if (invoiceParcelCheckbox?.checked && installments) {
      data.invoice = {
        installment: 1,
        total: parseInt(installments.value, 10) || 2
      };
    }

    return data;

  } catch (error) {
    console.warn('Error getting form data:', error);
    return null;
  }
}

/**
 * Validates the current form data
 * @returns {Object} Validation result with isValid flag and errors array
 */
export function validateForm() {
  const errors = [];
  
  try {
    const val = document.getElementById('val');
    const desc = document.getElementById('desc');
    const card = document.getElementById('card');

    // Clear previous errors
    clearFieldErrors();

    // Validate value
    if (!val?.value || parseFloat(val.value) <= 0) {
      errors.push('Valor deve ser maior que zero');
      markFieldError(val);
    }

    // Validate description
    if (!desc?.value?.trim()) {
      errors.push('Descrição é obrigatória');
      markFieldError(desc);
    }

    // Validate card selection
    if (!card?.value) {
      errors.push('Cartão deve ser selecionado');
      markFieldError(card);
    }

  } catch (error) {
    console.warn('Error validating form:', error);
    errors.push('Erro na validação do formulário');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Marks a field as having an error
 * @param {HTMLElement} field - The form field element
 */
function markFieldError(field) {
  if (field) {
    field.classList.add('error');
  }
}

/**
 * Clears error states from all form fields
 */
function clearFieldErrors() {
  const fields = ['val', 'desc', 'card'].map(id => document.getElementById(id));
  fields.forEach(field => {
    if (field) {
      field.classList.remove('error');
    }
  });
}
