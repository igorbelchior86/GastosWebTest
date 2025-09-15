// ============================================================================
// 📊 APP STATE MANAGER
// ============================================================================
// Sistema centralizado de gerenciamento de estado do app
// FASE 2 refatoração - extraído do main.js

/**
 * AppState - Gerenciador centralizado do estado da aplicação
 * 
 * Responsabilidades:
 * - Centralizar estado global (transactions, cards, startBalance)
 * - Implementar padrão Observer para atualizações reativas
 * - Garantir integridade dos dados através de setters controlados
 * - Prover interface limpa para acesso aos dados
 */
export class AppState {
  constructor() {
    // Estado principal da aplicação
    this._transactions = [];
    this._cards = [{ name: 'Dinheiro', close: 0, due: 0 }];
    this._startBalance = 0;
    
    // Sistema de observadores para reatividade
    this._observers = new Set();
    this._changeLog = [];
    
    // Bind methods para preservar contexto
    this.subscribe = this.subscribe.bind(this);
    this.unsubscribe = this.unsubscribe.bind(this);
    this._notify = this._notify.bind(this);
  }

  // ============================================================================
  // 🔍 GETTERS - Interface pública para leitura
  // ============================================================================

  /**
   * Obtém todas as transações
   * @returns {Array} Cópia das transações
   */
  getTransactions() {
    return [...this._transactions];
  }

  /**
   * Obtém todos os cartões
   * @returns {Array} Cópia dos cartões
   */
  getCards() {
    return [...this._cards];
  }

  /**
   * Obtém o saldo inicial
   * @returns {number} Saldo inicial
   */
  getStartBalance() {
    return this._startBalance;
  }

  /**
   * Obtém transação por ID
   * @param {string} id - ID da transação
   * @returns {Object|null} Transação encontrada ou null
   */
  getTransactionById(id) {
    return this._transactions.find(tx => tx.id === id) || null;
  }

  /**
   * Obtém cartão por nome
   * @param {string} name - Nome do cartão
   * @returns {Object|null} Cartão encontrado ou null
   */
  getCardByName(name) {
    return this._cards.find(card => card.name === name) || null;
  }

  // ============================================================================
  // ✏️ SETTERS - Interface controlada para escrita
  // ============================================================================

  /**
   * Define todas as transações
   * @param {Array} transactions - Array de transações
   */
  setTransactions(transactions) {
    if (!Array.isArray(transactions)) {
      throw new Error('Transactions deve ser um array');
    }
    
    const oldLength = this._transactions.length;
    this._transactions = [...transactions];
    
    this._logChange('transactions', 'set', { 
      oldCount: oldLength, 
      newCount: transactions.length 
    });
    this._notify('transactions', { type: 'set', data: this._transactions });
  }

  /**
   * Define todos os cartões
   * @param {Array} cards - Array de cartões
   */
  setCards(cards) {
    if (!Array.isArray(cards)) {
      throw new Error('Cards deve ser um array');
    }
    
    // Garantir que "Dinheiro" sempre existe
    if (!cards.some(card => card.name === 'Dinheiro')) {
      cards.unshift({ name: 'Dinheiro', close: 0, due: 0 });
    }
    
    this._cards = [...cards];
    
    this._logChange('cards', 'set', { count: cards.length });
    this._notify('cards', { type: 'set', data: this._cards });
  }

  /**
   * Define o saldo inicial
   * @param {number} balance - Novo saldo inicial
   */
  setStartBalance(balance) {
    const numBalance = Number(balance) || 0;
    const oldBalance = this._startBalance;
    
    this._startBalance = numBalance;
    
    this._logChange('startBalance', 'set', { 
      oldValue: oldBalance, 
      newValue: numBalance 
    });
    this._notify('startBalance', { type: 'set', data: numBalance });
  }

  // ============================================================================
  // ➕ OPERAÇÕES CRUD - Métodos para modificar estado
  // ============================================================================

  /**
   * Adiciona uma nova transação
   * @param {Object} transaction - Transação a ser adicionada
   * @returns {string} ID da transação adicionada
   */
  addTransaction(transaction) {
    if (!transaction || typeof transaction !== 'object') {
      throw new Error('Transaction deve ser um objeto válido');
    }
    
    // Gerar ID se não existir
    if (!transaction.id) {
      transaction.id = this._generateId();
    }
    
    this._transactions.push({ ...transaction });
    
    this._logChange('transactions', 'add', { id: transaction.id });
    this._notify('transactions', { 
      type: 'add', 
      data: transaction, 
      collection: this._transactions 
    });
    
    return transaction.id;
  }

  /**
   * Atualiza uma transação existente
   * @param {string} id - ID da transação
   * @param {Object} updates - Campos a serem atualizados
   * @returns {boolean} True se atualizou, false se não encontrou
   */
  updateTransaction(id, updates) {
    const index = this._transactions.findIndex(tx => tx.id === id);
    if (index === -1) return false;
    
    const oldTx = { ...this._transactions[index] };
    this._transactions[index] = { ...oldTx, ...updates };
    
    this._logChange('transactions', 'update', { id, updates });
    this._notify('transactions', { 
      type: 'update', 
      data: this._transactions[index], 
      oldData: oldTx,
      collection: this._transactions 
    });
    
    return true;
  }

  /**
   * Remove uma transação
   * @param {string} id - ID da transação a ser removida
   * @returns {boolean} True se removeu, false se não encontrou
   */
  removeTransaction(id) {
    const index = this._transactions.findIndex(tx => tx.id === id);
    if (index === -1) return false;
    
    const removedTx = this._transactions.splice(index, 1)[0];
    
    this._logChange('transactions', 'remove', { id, removedTx });
    this._notify('transactions', { 
      type: 'remove', 
      data: removedTx, 
      collection: this._transactions 
    });
    
    return true;
  }

  /**
   * Adiciona um novo cartão
   * @param {Object} card - Cartão a ser adicionado
   * @returns {boolean} True se adicionou, false se já existe
   */
  addCard(card) {
    if (!card || !card.name) {
      throw new Error('Cartão deve ter um nome');
    }
    
    // Verificar se já existe
    if (this._cards.some(c => c.name === card.name)) {
      return false;
    }
    
    this._cards.push({ ...card });
    
    this._logChange('cards', 'add', { name: card.name });
    this._notify('cards', { 
      type: 'add', 
      data: card, 
      collection: this._cards 
    });
    
    return true;
  }

  /**
   * Remove um cartão
   * @param {string} name - Nome do cartão a ser removido
   * @returns {boolean} True se removeu, false se não encontrou ou é "Dinheiro"
   */
  removeCard(name) {
    if (name === 'Dinheiro') {
      throw new Error('Não é possível remover o cartão "Dinheiro"');
    }
    
    const index = this._cards.findIndex(card => card.name === name);
    if (index === -1) return false;
    
    const removedCard = this._cards.splice(index, 1)[0];
    
    this._logChange('cards', 'remove', { name, removedCard });
    this._notify('cards', { 
      type: 'remove', 
      data: removedCard, 
      collection: this._cards 
    });
    
    return true;
  }

  // ============================================================================
  // 👁️ SISTEMA DE OBSERVADORES - Padrão Observer para reatividade
  // ============================================================================

  /**
   * Subscreve um callback para mudanças de estado
   * @param {Function} callback - Função a ser chamada quando o estado mudar
   * @param {string} [filter] - Filtro opcional por tipo de estado
   */
  subscribe(callback, filter = null) {
    if (typeof callback !== 'function') {
      throw new Error('Callback deve ser uma função');
    }
    
    const observer = { callback, filter };
    this._observers.add(observer);
    
    return () => this.unsubscribe(observer);
  }

  /**
   * Remove um observador
   * @param {Object} observer - Observador a ser removido
   */
  unsubscribe(observer) {
    this._observers.delete(observer);
  }

  /**
   * Remove todos os observadores
   */
  clearObservers() {
    this._observers.clear();
  }

  // ============================================================================
  // 🔧 MÉTODOS INTERNOS
  // ============================================================================

  /**
   * Notifica observadores sobre mudanças
   * @private
   */
  _notify(type, data) {
    this._observers.forEach(observer => {
      try {
        if (!observer.filter || observer.filter === type) {
          observer.callback(type, data);
        }
      } catch (error) {
        console.error('Erro no observer:', error);
      }
    });
  }

  /**
   * Registra mudanças para debugging
   * @private
   */
  _logChange(type, action, details) {
    this._changeLog.push({
      timestamp: Date.now(),
      type,
      action,
      details
    });
    
    // Manter apenas os últimos 100 registros
    if (this._changeLog.length > 100) {
      this._changeLog.shift();
    }
  }

  /**
   * Gera um ID único para transações
   * @private
   */
  _generateId() {
    return `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // ============================================================================
  // 🐛 MÉTODOS DE DEBUG
  // ============================================================================

  /**
   * Obtém log de mudanças para debugging
   * @returns {Array} Array com as últimas mudanças
   */
  getChangeLog() {
    return [...this._changeLog];
  }

  /**
   * Obtém estatísticas do estado atual
   * @returns {Object} Objeto com estatísticas
   */
  getStats() {
    return {
      transactions: this._transactions.length,
      cards: this._cards.length,
      startBalance: this._startBalance,
      observers: this._observers.size,
      changes: this._changeLog.length
    };
  }

  /**
   * Obtém snapshot completo do estado
   * @returns {Object} Estado completo serializado
   */
  getSnapshot() {
    return {
      transactions: this.getTransactions(),
      cards: this.getCards(),
      startBalance: this.getStartBalance(),
      stats: this.getStats(),
      timestamp: Date.now()
    };
  }
}

// Instância global (será migrada futuramente para dependency injection)
export const appState = new AppState();

// Para debug no console
if (typeof window !== 'undefined') {
  window.AppState = AppState;
  window.appState = appState;
}