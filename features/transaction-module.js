/**
 * Transaction Module - Phase 6
 * Manages all transaction-related operations: CRUD, validation, sorting, filtering
 */

import { AppState } from '../js/state/app-state.js';
import { formatToISO } from '../js/utils/date-utils.js';
import { sanitizeTransactions } from '../js/utils/validators.js';
import { generateId } from '../js/utils/data-utils.js';
import { post } from '../js/utils/calculations.js';

export class TransactionModule {
  constructor() {
    this.appState = AppState;
  }

  /**
   * Get all transactions from app state
   */
  getTransactions() {
    return this.appState.getTransactions();
  }

  /**
   * Set transactions in app state
   */
  setTransactions(txs) {
    this.appState.setTransactions(txs);
  }

  /**
   * Sort transactions by date (newest first)
   */
  sortTransactions() {
    const txs = this.getTransactions();
    txs.sort((a, b) => {
      const dateA = a.opDate || a.postDate;
      const dateB = b.opDate || b.postDate;
      return dateB.localeCompare(dateA);
    });
    return txs;
  }

  /**
   * Infer card for a transaction based on method and dates
   */
  inferCardForTransaction(tx, cards) {
    const method = tx.method || '';
    if (method === 'Dinheiro' || method === '') return null;

    const nonCash = cards.filter(c => c.name !== 'Dinheiro');
    if (nonCash.length === 0) return null;

    // Direct match by name
    const directMatch = nonCash.find(c => c.name === method);
    if (directMatch) return directMatch;

    // Match by post date calculation
    if (tx.opDate) {
      const candidates = nonCash.filter(c => post(tx.opDate, c.name) === tx.postDate);
      if (candidates.length === 1) return candidates[0];
    }

    return null;
  }

  /**
   * Validate transaction data
   */
  validateTransaction(tx) {
    const errors = [];

    // Required fields
    if (!tx.desc || tx.desc.trim() === '') {
      errors.push('Descrição é obrigatória');
    }

    if (!tx.val || isNaN(parseFloat(tx.val))) {
      errors.push('Valor deve ser numérico');
    }

    // Date validation
    if (!tx.postDate) {
      errors.push('Data de postagem é obrigatória');
    }

    // Method validation (if cards exist)
    if (tx.method && tx.method !== 'Dinheiro') {
      // Validate that card exists
      const cards = this.appState.getCards();
      const cardExists = cards.some(c => c.name === tx.method);
      if (!cardExists) {
        errors.push(`Cartão "${tx.method}" não existe`);
      }
    }

    return errors;
  }

  /**
   * Add new transaction
   */
  async addTransaction(txData) {
    // Validate transaction
    const validationErrors = this.validateTransaction(txData);
    if (validationErrors.length > 0) {
      throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
    }

    // Generate ID and sanitize data
    const newTx = {
      id: generateId(),
      desc: txData.desc.trim(),
      val: parseFloat(txData.val),
      method: txData.method || 'Dinheiro',
      postDate: txData.postDate,
      opDate: txData.opDate || null,
      recurrence: txData.recurrence || null,
      isOccurrence: txData.isOccurrence || false,
      baseId: txData.baseId || null
    };

    // Infer card if needed
    if (!newTx.opDate && newTx.method !== 'Dinheiro') {
      const cards = this.appState.getCards();
      const inferredCard = this.inferCardForTransaction(newTx, cards);
      if (inferredCard) {
        newTx.opDate = this.calculateOpDateFromPost(newTx.postDate, inferredCard);
      }
    }

    // Add to transactions
    const transactions = this.getTransactions();
    transactions.push(newTx);
    this.setTransactions(transactions);

    // Sort after adding
    this.sortTransactions();

    return newTx;
  }

  /**
   * Update existing transaction
   */
  async updateTransaction(id, updateData) {
    const transactions = this.getTransactions();
    const txIndex = transactions.findIndex(tx => tx.id === id);
    
    if (txIndex === -1) {
      throw new Error(`Transaction with ID ${id} not found`);
    }

    // Merge update data with existing transaction
    const updatedTx = {
      ...transactions[txIndex],
      ...updateData,
      id // Ensure ID doesn't change
    };

    // Validate updated transaction
    const validationErrors = this.validateTransaction(updatedTx);
    if (validationErrors.length > 0) {
      throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
    }

    // Update transaction
    transactions[txIndex] = updatedTx;
    this.setTransactions(transactions);

    // Sort after updating
    this.sortTransactions();

    return updatedTx;
  }

  /**
   * Delete transaction
   */
  async deleteTransaction(id, handleRecurrence = true) {
    const transactions = this.getTransactions();
    const tx = transactions.find(x => x.id === id);
    
    if (!tx) {
      throw new Error(`Transaction with ID ${id} not found`);
    }

    // Handle recurrence deletion logic
    if (handleRecurrence && tx.recurrence && !tx.isOccurrence) {
      // This is a base recurring transaction
      // Remove all related occurrences
      const updatedTxs = transactions.filter(t => 
        t.id !== id && t.baseId !== id
      );
      this.setTransactions(updatedTxs);
      return { deletedCount: transactions.length - updatedTxs.length };
    } else {
      // Single transaction deletion
      const updatedTxs = transactions.filter(t => t.id !== id);
      this.setTransactions(updatedTxs);
      return { deletedCount: 1 };
    }
  }

  /**
   * Filter transactions by criteria
   */
  filterTransactions(criteria) {
    const transactions = this.getTransactions();
    
    return transactions.filter(tx => {
      // Filter by date range
      if (criteria.startDate && tx.postDate < criteria.startDate) return false;
      if (criteria.endDate && tx.postDate > criteria.endDate) return false;
      
      // Filter by method/card
      if (criteria.method && tx.method !== criteria.method) return false;
      
      // Filter by value range
      if (criteria.minValue && Math.abs(tx.val) < criteria.minValue) return false;
      if (criteria.maxValue && Math.abs(tx.val) > criteria.maxValue) return false;
      
      // Filter by description
      if (criteria.description) {
        const desc = tx.desc.toLowerCase();
        const search = criteria.description.toLowerCase();
        if (!desc.includes(search)) return false;
      }
      
      // Filter by type (income/expense)
      if (criteria.type === 'income' && tx.val <= 0) return false;
      if (criteria.type === 'expense' && tx.val >= 0) return false;
      
      return true;
    });
  }

  /**
   * Calculate operation date from post date and card
   */
  calculateOpDateFromPost(postDate, card) {
    // This is a reverse calculation - approximate
    // In practice, we'd need more sophisticated logic
    const postDateObj = new Date(postDate);
    const estimatedOpDate = new Date(postDateObj);
    estimatedOpDate.setDate(estimatedOpDate.getDate() - (card.due - card.close + 30) % 30);
    return formatToISO(estimatedOpDate);
  }

  /**
   * Get transaction statistics
   */
  getTransactionStats(period = 'month') {
    const transactions = this.getTransactions();
    const now = new Date();
    const startDate = new Date();
    
    // Set period start date
    switch (period) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    const periodTxs = transactions.filter(tx => 
      new Date(tx.postDate) >= startDate
    );

    const stats = {
      totalTransactions: periodTxs.length,
      totalIncome: 0,
      totalExpenses: 0,
      averageTransaction: 0,
      largestExpense: 0,
      largestIncome: 0,
      byMethod: {}
    };

    periodTxs.forEach(tx => {
      const value = tx.val;
      
      if (value > 0) {
        stats.totalIncome += value;
        stats.largestIncome = Math.max(stats.largestIncome, value);
      } else {
        stats.totalExpenses += Math.abs(value);
        stats.largestExpense = Math.max(stats.largestExpense, Math.abs(value));
      }

      // Group by method
      const method = tx.method || 'Dinheiro';
      if (!stats.byMethod[method]) {
        stats.byMethod[method] = { count: 0, total: 0 };
      }
      stats.byMethod[method].count++;
      stats.byMethod[method].total += Math.abs(value);
    });

    stats.netAmount = stats.totalIncome - stats.totalExpenses;
    stats.averageTransaction = periodTxs.length > 0 
      ? (stats.totalIncome + stats.totalExpenses) / periodTxs.length 
      : 0;

    return stats;
  }

  /**
   * Export transactions to JSON
   */
  exportTransactions(format = 'json') {
    const transactions = this.getTransactions();
    
    switch (format) {
      case 'json':
        return JSON.stringify(transactions, null, 2);
      case 'csv':
        return this.exportToCSV(transactions);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Export transactions to CSV format
   */
  exportToCSV(transactions) {
    const headers = ['ID', 'Descrição', 'Valor', 'Método', 'Data Postagem', 'Data Operação', 'Recorrência'];
    const rows = transactions.map(tx => [
      tx.id,
      `"${tx.desc}"`,
      tx.val,
      tx.method || '',
      tx.postDate,
      tx.opDate || '',
      tx.recurrence || ''
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }

  /**
   * Bulk import transactions
   */
  async importTransactions(transactionData, options = {}) {
    const { validateAll = true, skipDuplicates = true } = options;
    const existingTxs = this.getTransactions();
    const importResults = {
      imported: 0,
      skipped: 0,
      errors: []
    };

    for (const txData of transactionData) {
      try {
        // Check for duplicates if enabled
        if (skipDuplicates) {
          const isDuplicate = existingTxs.some(existing => 
            existing.desc === txData.desc &&
            existing.val === txData.val &&
            existing.postDate === txData.postDate
          );
          
          if (isDuplicate) {
            importResults.skipped++;
            continue;
          }
        }

        // Validate if enabled
        if (validateAll) {
          const validationErrors = this.validateTransaction(txData);
          if (validationErrors.length > 0) {
            importResults.errors.push({
              transaction: txData,
              errors: validationErrors
            });
            continue;
          }
        }

        // Import transaction
        await this.addTransaction(txData);
        importResults.imported++;

      } catch (error) {
        importResults.errors.push({
          transaction: txData,
          errors: [error.message]
        });
      }
    }

    return importResults;
  }
}

// Create singleton instance
export const transactionModule = new TransactionModule();

// Global access for legacy compatibility
if (typeof window !== 'undefined') {
  window.TransactionModule = TransactionModule;
  window.transactionModule = transactionModule;
}