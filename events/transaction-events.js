/**
 * Transaction Events - Phase 6
 * Specialized event handlers for transaction-related operations
 */

import { transactionModule } from '../features/transaction-module.js';
import { modalManager } from '../ui/modals.js';
import { renderTransactionsList, renderSummary } from '../ui/renderers.js';

export class TransactionEventHandlers {
  constructor() {
    this.modalManager = modalManager;
    this.txModule = transactionModule;
  }

  /**
   * Initialize transaction event handlers
   */
  init() {
    this.setupTransactionForm();
    this.setupTransactionActions();
    this.setupTransactionFilters();
    console.log('✅ Transaction event handlers initialized');
  }

  /**
   * Setup transaction form submission
   */
  setupTransactionForm() {
    const txForm = document.getElementById('txForm');
    if (!txForm) return;

    txForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleTransactionSubmit(e);
    });

    // Real-time validation
    const inputs = txForm.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      input.addEventListener('blur', () => this.validateField(input));
      input.addEventListener('input', () => this.clearFieldError(input));
    });
  }

  /**
   * Handle transaction form submission
   */
  async handleTransactionSubmit(event) {
    const form = event.target;
    const formData = new FormData(form);
    
    try {
      const txData = {
        desc: formData.get('desc'),
        val: parseFloat(formData.get('val')),
        method: formData.get('method'),
        postDate: formData.get('postDate'),
        opDate: formData.get('opDate') || null,
        recurrence: formData.get('recurrence') || null
      };

      // Check if editing existing transaction
      const txId = form.dataset.txId;
      let result;

      if (txId) {
        result = await this.txModule.updateTransaction(txId, txData);
        this.showToast('Transação atualizada com sucesso', 'success');
      } else {
        result = await this.txModule.addTransaction(txData);
        this.showToast('Transação adicionada com sucesso', 'success');
      }

      // Close modal and refresh UI
      this.modalManager.closeModal('txModal');
      this.refreshTransactionViews();
      
      // Reset form
      form.reset();
      delete form.dataset.txId;

    } catch (error) {
      console.error('Error submitting transaction:', error);
      this.showToast(error.message, 'error');
    }
  }

  /**
   * Setup transaction action handlers (edit, delete, etc.)
   */
  setupTransactionActions() {
    // Event delegation for transaction actions
    document.addEventListener('click', async (e) => {
      const target = e.target;

      // Edit transaction
      if (target.matches('.edit-tx-btn') || target.closest('.edit-tx-btn')) {
        const txId = this.getTxIdFromElement(target);
        if (txId) await this.handleEditTransaction(txId);
      }

      // Delete transaction
      if (target.matches('.delete-tx-btn') || target.closest('.delete-tx-btn')) {
        const txId = this.getTxIdFromElement(target);
        if (txId) await this.handleDeleteTransaction(txId);
      }

      // Duplicate transaction
      if (target.matches('.duplicate-tx-btn') || target.closest('.duplicate-tx-btn')) {
        const txId = this.getTxIdFromElement(target);
        if (txId) await this.handleDuplicateTransaction(txId);
      }
    });
  }

  /**
   * Handle edit transaction
   */
  async handleEditTransaction(txId) {
    try {
      const transactions = this.txModule.getTransactions();
      const tx = transactions.find(t => t.id === txId);
      
      if (!tx) {
        throw new Error('Transação não encontrada');
      }

      // Populate form with transaction data
      this.populateTransactionForm(tx);
      
      // Open modal in edit mode
      this.modalManager.openModal('txModal');
      
    } catch (error) {
      console.error('Error editing transaction:', error);
      this.showToast(error.message, 'error');
    }
  }

  /**
   * Handle delete transaction
   */
  async handleDeleteTransaction(txId) {
    if (!confirm('Tem certeza que deseja excluir esta transação?')) {
      return;
    }

    try {
      const result = await this.txModule.deleteTransaction(txId);
      const message = result.deletedCount > 1 
        ? `${result.deletedCount} transações excluídas` 
        : 'Transação excluída com sucesso';
      
      this.showToast(message, 'success');
      this.refreshTransactionViews();
      
    } catch (error) {
      console.error('Error deleting transaction:', error);
      this.showToast(error.message, 'error');
    }
  }

  /**
   * Handle duplicate transaction
   */
  async handleDuplicateTransaction(txId) {
    try {
      const transactions = this.txModule.getTransactions();
      const tx = transactions.find(t => t.id === txId);
      
      if (!tx) {
        throw new Error('Transação não encontrada');
      }

      // Create duplicate with modified description and today's date
      const duplicateData = {
        ...tx,
        desc: `${tx.desc} (cópia)`,
        postDate: new Date().toISOString().slice(0, 10),
        opDate: null, // Reset operation date
        recurrence: null, // Remove recurrence
        isOccurrence: false,
        baseId: null
      };

      delete duplicateData.id; // Remove ID so a new one is generated

      await this.txModule.addTransaction(duplicateData);
      this.showToast('Transação duplicada com sucesso', 'success');
      this.refreshTransactionViews();
      
    } catch (error) {
      console.error('Error duplicating transaction:', error);
      this.showToast(error.message, 'error');
    }
  }

  /**
   * Setup transaction filters
   */
  setupTransactionFilters() {
    const filterForm = document.getElementById('txFilterForm');
    if (!filterForm) return;

    filterForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.applyTransactionFilters();
    });

    // Real-time filtering
    const filterInputs = filterForm.querySelectorAll('input, select');
    filterInputs.forEach(input => {
      input.addEventListener('change', () => {
        clearTimeout(this.filterTimeout);
        this.filterTimeout = setTimeout(() => {
          this.applyTransactionFilters();
        }, 300);
      });
    });
  }

  /**
   * Apply transaction filters
   */
  applyTransactionFilters() {
    const filterForm = document.getElementById('txFilterForm');
    if (!filterForm) return;

    const formData = new FormData(filterForm);
    const criteria = {
      startDate: formData.get('startDate') || null,
      endDate: formData.get('endDate') || null,
      method: formData.get('method') || null,
      minValue: formData.get('minValue') ? parseFloat(formData.get('minValue')) : null,
      maxValue: formData.get('maxValue') ? parseFloat(formData.get('maxValue')) : null,
      description: formData.get('description') || null,
      type: formData.get('type') || null
    };

    // Remove null/empty criteria
    Object.keys(criteria).forEach(key => {
      if (criteria[key] === null || criteria[key] === '') {
        delete criteria[key];
      }
    });

    try {
      const filteredTxs = this.txModule.filterTransactions(criteria);
      this.renderFilteredTransactions(filteredTxs);
      
      // Update filter count
      const filterCount = document.getElementById('filterCount');
      if (filterCount) {
        filterCount.textContent = `${filteredTxs.length} transações encontradas`;
      }
      
    } catch (error) {
      console.error('Error applying filters:', error);
      this.showToast(error.message, 'error');
    }
  }

  /**
   * Populate transaction form with data
   */
  populateTransactionForm(tx) {
    const form = document.getElementById('txForm');
    if (!form) return;

    // Store transaction ID for editing
    form.dataset.txId = tx.id;

    // Populate form fields
    const fields = {
      desc: tx.desc,
      val: Math.abs(tx.val), // Always show positive value
      method: tx.method,
      postDate: tx.postDate,
      opDate: tx.opDate || '',
      recurrence: tx.recurrence || ''
    };

    Object.keys(fields).forEach(fieldName => {
      const field = form.querySelector(`[name="${fieldName}"]`);
      if (field) {
        field.value = fields[fieldName];
      }
    });

    // Set income/expense toggle
    const isIncome = tx.val > 0;
    const incomeToggle = form.querySelector('[name="isIncome"]');
    if (incomeToggle) {
      incomeToggle.checked = isIncome;
    }

    // Update modal title
    const modalTitle = document.querySelector('#txModal h2');
    if (modalTitle) {
      modalTitle.textContent = 'Editar Transação';
    }
  }

  /**
   * Validate form field
   */
  validateField(field) {
    const value = field.value.trim();
    const fieldName = field.name;
    let isValid = true;
    let errorMessage = '';

    switch (fieldName) {
      case 'desc':
        if (!value) {
          isValid = false;
          errorMessage = 'Descrição é obrigatória';
        }
        break;
      case 'val':
        if (!value || isNaN(parseFloat(value)) || parseFloat(value) <= 0) {
          isValid = false;
          errorMessage = 'Valor deve ser um número positivo';
        }
        break;
      case 'postDate':
        if (!value) {
          isValid = false;
          errorMessage = 'Data é obrigatória';
        }
        break;
    }

    this.setFieldValidation(field, isValid, errorMessage);
    return isValid;
  }

  /**
   * Set field validation state
   */
  setFieldValidation(field, isValid, errorMessage) {
    const fieldGroup = field.closest('.field-group') || field.parentElement;
    
    // Remove existing validation classes
    fieldGroup.classList.remove('field-valid', 'field-invalid');
    
    // Remove existing error message
    const existingError = fieldGroup.querySelector('.field-error');
    if (existingError) {
      existingError.remove();
    }

    if (!isValid) {
      fieldGroup.classList.add('field-invalid');
      
      // Add error message
      const errorDiv = document.createElement('div');
      errorDiv.className = 'field-error';
      errorDiv.textContent = errorMessage;
      fieldGroup.appendChild(errorDiv);
    } else if (field.value.trim()) {
      fieldGroup.classList.add('field-valid');
    }
  }

  /**
   * Clear field error
   */
  clearFieldError(field) {
    const fieldGroup = field.closest('.field-group') || field.parentElement;
    fieldGroup.classList.remove('field-invalid');
    
    const errorElement = fieldGroup.querySelector('.field-error');
    if (errorElement) {
      errorElement.remove();
    }
  }

  /**
   * Get transaction ID from DOM element
   */
  getTxIdFromElement(element) {
    // Try to find ID in data attributes
    let current = element;
    while (current && current !== document) {
      if (current.dataset.txId) return current.dataset.txId;
      if (current.dataset.id) return current.dataset.id;
      current = current.parentElement;
    }
    return null;
  }

  /**
   * Refresh transaction views
   */
  refreshTransactionViews() {
    try {
      // Re-render transaction list
      if (typeof renderTransactionsList === 'function') {
        renderTransactionsList();
      }
      
      // Re-render summary
      if (typeof renderSummary === 'function') {
        renderSummary();
      }

      // Dispatch custom event for other components
      window.dispatchEvent(new CustomEvent('transactionsUpdated', {
        detail: { transactions: this.txModule.getTransactions() }
      }));
      
    } catch (error) {
      console.error('Error refreshing transaction views:', error);
    }
  }

  /**
   * Render filtered transactions
   */
  renderFilteredTransactions(transactions) {
    // This would integrate with the existing rendering system
    // For now, just log the results
    console.log('Filtered transactions:', transactions);
    
    // Dispatch custom event with filtered data
    window.dispatchEvent(new CustomEvent('transactionsFiltered', {
      detail: { filteredTransactions: transactions }
    }));
  }

  /**
   * Show toast notification
   */
  showToast(message, type = 'info') {
    // Integration with existing toast system
    console.log(`Toast [${type}]: ${message}`);
    
    // If there's a global toast function, use it
    if (typeof window.showToast === 'function') {
      window.showToast(message, type);
    } else if (typeof window.buildSaveToast === 'function') {
      // Use existing toast system
      window.buildSaveToast({ desc: message });
    }
  }
}

// Export singleton instance
export const transactionEventHandlers = new TransactionEventHandlers();

// Global access for legacy compatibility
if (typeof window !== 'undefined') {
  window.TransactionEventHandlers = TransactionEventHandlers;
  window.transactionEventHandlers = transactionEventHandlers;
}