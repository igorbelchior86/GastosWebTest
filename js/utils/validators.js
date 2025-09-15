// ============================================================================
// ✅ VALIDATORS MODULE  
// ============================================================================
// Funções de validação e sanitização de dados
// FASE 3 refatoração - utilitários extraídos do main.js

/**
 * Validators - Utilitários de validação e sanitização
 * 
 * Responsabilidades:
 * - Validação de transações e entradas
 * - Sanitização de dados
 * - Verificação de integridade
 * - Limpeza de dados corrompidos
 */
export class Validators {
  /**
   * Valida se uma string representa um número válido
   * @param {string} str - String a ser validada
   * @returns {boolean} True se é um número válido
   */
  static isValidNumber(str) {
    if (typeof str !== 'string') return false;
    return !isNaN(str) && !isNaN(parseFloat(str));
  }

  /**
   * Valida formato de data ISO (YYYY-MM-DD)
   * @param {string} iso - String a ser validada
   * @returns {boolean} True se é uma data ISO válida
   */
  static isValidISODate(iso) {
    if (typeof iso !== 'string') return false;
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(iso)) return false;
    
    const date = new Date(iso);
    return date.toISOString().slice(0, 10) === iso;
  }

  /**
   * Valida se um email tem formato válido
   * @param {string} email - Email a ser validado
   * @returns {boolean} True se é um email válido
   */
  static isValidEmail(email) {
    if (typeof email !== 'string') return false;
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  }

  /**
   * Valida se uma transação tem estrutura válida
   * @param {Object} transaction - Transação a ser validada
   * @returns {boolean} True se a transação é válida
   */
  static isValidTransaction(transaction) {
    if (!transaction || typeof transaction !== 'object') return false;
    
    // Campos obrigatórios
    const requiredFields = ['id', 'date', 'amount', 'card', 'category', 'note'];
    for (const field of requiredFields) {
      if (!(field in transaction)) return false;
    }
    
    // Validação dos tipos
    if (typeof transaction.id !== 'string') return false;
    if (!this.isValidISODate(transaction.date)) return false;
    if (typeof transaction.amount !== 'number') return false;
    if (typeof transaction.card !== 'string') return false;
    if (typeof transaction.category !== 'string') return false;
    if (typeof transaction.note !== 'string') return false;
    
    // Validação de valores
    if (transaction.amount === 0) return false;
    if (transaction.card.trim() === '') return false;
    if (transaction.category.trim() === '') return false;
    
    return true;
  }

  /**
   * Valida se um cartão tem estrutura válida
   * @param {Object} card - Cartão a ser validado
   * @returns {boolean} True se o cartão é válido
   */
  static isValidCard(card) {
    if (!card || typeof card !== 'object') return false;
    
    const requiredFields = ['name', 'close', 'due'];
    for (const field of requiredFields) {
      if (!(field in card)) return false;
    }
    
    if (typeof card.name !== 'string') return false;
    if (typeof card.close !== 'number') return false;
    if (typeof card.due !== 'number') return false;
    
    if (card.name.trim() === '') return false;
    if (card.close < 1 || card.close > 31) return false;
    if (card.due < 1 || card.due > 31) return false;
    
    return true;
  }

  /**
   * Sanitiza array de transações removendo entradas inválidas
   * @param {Array} transactions - Array de transações
   * @returns {Array} Array sanitizado
   */
  static sanitizeTransactions(transactions) {
    if (!Array.isArray(transactions)) return [];
    
    return transactions.filter(transaction => {
      try {
        // Remove transações inválidas
        if (!this.isValidTransaction(transaction)) {
          console.warn('Transação inválida removida:', transaction);
          return false;
        }
        
        // Sanitiza strings
        transaction.card = this.sanitizeString(transaction.card);
        transaction.category = this.sanitizeString(transaction.category);
        transaction.note = this.sanitizeString(transaction.note);
        
        // Remove transações com dados vazios após sanitização
        if (!transaction.card || !transaction.category) {
          console.warn('Transação com dados vazios removida:', transaction);
          return false;
        }
        
        return true;
      } catch (error) {
        console.error('Erro ao sanitizar transação:', error, transaction);
        return false;
      }
    });
  }

  /**
   * Sanitiza array de cartões removendo entradas inválidas
   * @param {Array} cards - Array de cartões
   * @returns {Array} Array sanitizado
   */
  static sanitizeCards(cards) {
    if (!Array.isArray(cards)) return [];
    
    return cards.filter(card => {
      try {
        if (!this.isValidCard(card)) {
          console.warn('Cartão inválido removido:', card);
          return false;
        }
        
        card.name = this.sanitizeString(card.name);
        
        if (!card.name) {
          console.warn('Cartão com nome vazio removido:', card);
          return false;
        }
        
        return true;
      } catch (error) {
        console.error('Erro ao sanitizar cartão:', error, card);
        return false;
      }
    });
  }

  /**
   * Sanitiza string removendo caracteres perigosos
   * @param {string} str - String a ser sanitizada
   * @returns {string} String sanitizada
   */
  static sanitizeString(str) {
    if (typeof str !== 'string') return '';
    
    return str
      .trim()
      .replace(/[\x00-\x1f\x7f-\x9f]/g, '') // Remove caracteres de controle
      .replace(/[<>&"']/g, match => {        // Escapa caracteres HTML
        const map = {
          '<': '&lt;',
          '>': '&gt;',
          '&': '&amp;',
          '"': '&quot;',
          "'": '&#x27;'
        };
        return map[match];
      });
  }

  /**
   * Sanitiza valor numérico
   * @param {any} value - Valor a ser sanitizado
   * @param {number} defaultValue - Valor padrão se inválido
   * @returns {number} Número sanitizado
   */
  static sanitizeNumber(value, defaultValue = 0) {
    const num = parseFloat(value);
    return isNaN(num) ? defaultValue : num;
  }

  /**
   * Remove duplicatas de array baseado em propriedade específica
   * @param {Array} array - Array a ser processado
   * @param {string} property - Propriedade para comparação
   * @returns {Array} Array sem duplicatas
   */
  static removeDuplicates(array, property) {
    if (!Array.isArray(array)) return [];
    
    const seen = new Set();
    return array.filter(item => {
      const value = item[property];
      if (seen.has(value)) {
        console.warn('Item duplicado removido:', item);
        return false;
      }
      seen.add(value);
      return true;
    });
  }

  /**
   * Valida se um ID é único em um array
   * @param {string} id - ID a ser validado
   * @param {Array} array - Array para verificar unicidade
   * @param {string} idProperty - Nome da propriedade ID
   * @returns {boolean} True se o ID é único
   */
  static isUniqueId(id, array, idProperty = 'id') {
    if (!Array.isArray(array)) return true;
    return !array.some(item => item[idProperty] === id);
  }

  /**
   * Gera ID único baseado em timestamp e random
   * @param {Array} existingIds - Array de IDs existentes para verificar unicidade
   * @returns {string} ID único
   */
  static generateUniqueId(existingIds = []) {
    let id;
    do {
      id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
    } while (existingIds.includes(id));
    
    return id;
  }

  /**
   * Valida integridade de dados completos
   * @param {Object} data - Dados a serem validados
   * @returns {Object} Resultado da validação
   */
  static validateDataIntegrity(data) {
    const result = {
      isValid: true,
      errors: [],
      warnings: []
    };
    
    try {
      // Valida estrutura básica
      if (!data || typeof data !== 'object') {
        result.isValid = false;
        result.errors.push('Dados não são um objeto válido');
        return result;
      }
      
      // Valida transações
      if (data.transactions) {
        if (!Array.isArray(data.transactions)) {
          result.isValid = false;
          result.errors.push('Transações devem ser um array');
        } else {
          const invalidTx = data.transactions.filter(tx => !this.isValidTransaction(tx));
          if (invalidTx.length > 0) {
            result.warnings.push(`${invalidTx.length} transações inválidas encontradas`);
          }
        }
      }
      
      // Valida cartões
      if (data.cards) {
        if (!Array.isArray(data.cards)) {
          result.isValid = false;
          result.errors.push('Cartões devem ser um array');
        } else {
          const invalidCards = data.cards.filter(card => !this.isValidCard(card));
          if (invalidCards.length > 0) {
            result.warnings.push(`${invalidCards.length} cartões inválidos encontrados`);
          }
        }
      }
      
      // Verifica duplicatas
      if (data.transactions && Array.isArray(data.transactions)) {
        const ids = data.transactions.map(tx => tx.id);
        const uniqueIds = new Set(ids);
        if (ids.length !== uniqueIds.size) {
          result.warnings.push('IDs duplicados encontrados nas transações');
        }
      }
      
      if (data.cards && Array.isArray(data.cards)) {
        const names = data.cards.map(card => card.name);
        const uniqueNames = new Set(names);
        if (names.length !== uniqueNames.size) {
          result.warnings.push('Nomes duplicados encontrados nos cartões');
        }
      }
      
    } catch (error) {
      result.isValid = false;
      result.errors.push(`Erro durante validação: ${error.message}`);
    }
    
    return result;
  }
}

// Funções convenientes para compatibilidade
export const sanitizeTransactions = Validators.sanitizeTransactions;
export const isValidTransaction = Validators.isValidTransaction;
export const isValidNumber = Validators.isValidNumber;
export const isValidISODate = Validators.isValidISODate;

// Para uso global (compatibilidade com código existente)
if (typeof window !== 'undefined') {
  window.Validators = Validators;
  window.sanitizeTransactions = sanitizeTransactions;
  window.isValidTransaction = isValidTransaction;
  window.isValidNumber = isValidNumber;
  window.isValidISODate = isValidISODate;
}