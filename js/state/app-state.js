/**
 * app-state.js - Gerenciamento centralizado do estado da aplicação
 * Fonte de verdade única para transações, cartões, saldo inicial e datas
 */

// Estado interno da aplicação
const appState = {
    transactions: [],
    cards: [{ name: 'Dinheiro', close: 0, due: 0 }],
    startBalance: null,
    startDate: null,
    startSet: false,
    bootHydrated: false,
    profiles: new Map(),
    currentProfileId: 'default'
};

// Subscribers para mudanças de estado
const stateSubscribers = new Set();

// Event emitter para mudanças de estado
function notifyStateChange(type, data) {
    stateSubscribers.forEach(callback => {
        try {
            callback(type, data);
        } catch (error) {
            console.error('State subscriber error:', error);
        }
    });
}

// ===== TRANSACTIONS API =====

/**
 * Obtém snapshot imutável das transações
 * @returns {Array} Cópia das transações atuais
 */
export function getTransactions() {
    return [...appState.transactions];
}

/**
 * Define o conjunto completo de transações (operação batch)
 * @param {Array} transactions Array de transações
 */
export function setTransactions(transactions) {
    if (!Array.isArray(transactions)) {
        console.warn('setTransactions: expected array, got', typeof transactions);
        return;
    }
    
    appState.transactions = [...transactions];
    notifyStateChange('transactions:set', appState.transactions.length);
}

/**
 * Adiciona uma nova transação
 * @param {Object} transaction Objeto da transação
 */
export function addTransaction(transaction) {
    if (!transaction || !transaction.id) {
        console.warn('addTransaction: transaction must have an id');
        return;
    }
    
    // Evita duplicatas
    const existingIndex = appState.transactions.findIndex(t => t.id === transaction.id);
    if (existingIndex >= 0) {
        appState.transactions[existingIndex] = { ...transaction };
    } else {
        appState.transactions.push({ ...transaction });
    }
    
    notifyStateChange('transactions:add', transaction);
}

/**
 * Remove uma transação por ID
 * @param {string} transactionId ID da transação
 */
export function removeTransaction(transactionId) {
    const initialLength = appState.transactions.length;
    appState.transactions = appState.transactions.filter(t => t.id !== transactionId);
    
    if (appState.transactions.length < initialLength) {
        notifyStateChange('transactions:remove', transactionId);
    }
}

/**
 * Atualiza uma transação existente
 * @param {string} transactionId ID da transação
 * @param {Object} updates Campos a serem atualizados
 */
export function updateTransaction(transactionId, updates) {
    const index = appState.transactions.findIndex(t => t.id === transactionId);
    if (index >= 0) {
        appState.transactions[index] = { ...appState.transactions[index], ...updates };
        notifyStateChange('transactions:update', { id: transactionId, updates });
    }
}

/**
 * Encontra uma transação por ID
 * @param {string} transactionId ID da transação
 * @returns {Object|null} Transação encontrada ou null
 */
export function findTransaction(transactionId) {
    return appState.transactions.find(t => t.id === transactionId) || null;
}

// ===== CARDS API =====

/**
 * Obtém snapshot dos cartões
 * @returns {Array} Cópia dos cartões atuais
 */
export function getCards() {
    return [...appState.cards];
}

/**
 * Define o conjunto de cartões
 * @param {Array} cards Array de cartões
 */
export function setCards(cards) {
    if (!Array.isArray(cards)) {
        console.warn('setCards: expected array, got', typeof cards);
        return;
    }
    
    appState.cards = [...cards];
    notifyStateChange('cards:set', appState.cards.length);
}

/**
 * Adiciona ou atualiza um cartão
 * @param {Object} card Objeto do cartão
 */
export function upsertCard(card) {
    if (!card || !card.name) {
        console.warn('upsertCard: card must have a name');
        return;
    }
    
    const existingIndex = appState.cards.findIndex(c => c.name === card.name);
    if (existingIndex >= 0) {
        appState.cards[existingIndex] = { ...card };
    } else {
        appState.cards.push({ ...card });
    }
    
    notifyStateChange('cards:upsert', card);
}

/**
 * Remove um cartão por nome
 * @param {string} cardName Nome do cartão
 */
export function removeCard(cardName) {
    const initialLength = appState.cards.length;
    appState.cards = appState.cards.filter(c => c.name !== cardName);
    
    if (appState.cards.length < initialLength) {
        notifyStateChange('cards:remove', cardName);
    }
}

// ===== BALANCE & DATE API =====

/**
 * Define o saldo inicial
 * @param {number|null} balance Saldo inicial
 */
export function setStartBalance(balance) {
    const numBalance = balance === null ? null : Number(balance) || 0;
    if (appState.startBalance !== numBalance) {
        appState.startBalance = numBalance;
        notifyStateChange('startBalance:set', numBalance);
    }
}

/**
 * Obtém o saldo inicial
 * @returns {number|null} Saldo inicial
 */
export function getStartBalance() {
    return appState.startBalance;
}

/**
 * Define a data inicial
 * @param {string|null} date Data no formato YYYY-MM-DD
 */
export function setStartDate(date) {
    if (appState.startDate !== date) {
        appState.startDate = date;
        notifyStateChange('startDate:set', date);
    }
}

/**
 * Obtém a data inicial
 * @returns {string|null} Data inicial
 */
export function getStartDate() {
    return appState.startDate;
}

/**
 * Define se o start foi configurado pelo usuário
 * @param {boolean} isSet Flag de configuração
 */
export function setStartSet(isSet) {
    if (appState.startSet !== isSet) {
        appState.startSet = Boolean(isSet);
        notifyStateChange('startSet:set', isSet);
    }
}

/**
 * Verifica se o start foi configurado
 * @returns {boolean} Se foi configurado
 */
export function getStartSet() {
    return appState.startSet;
}

/**
 * Define se a hidratação do boot foi concluída
 * @param {boolean} hydrated Flag de hidratação
 */
export function setBootHydrated(hydrated) {
    if (appState.bootHydrated !== hydrated) {
        appState.bootHydrated = Boolean(hydrated);
        notifyStateChange('bootHydrated:set', hydrated);
    }
}

/**
 * Verifica se o boot foi hidratado
 * @returns {boolean} Se foi hidratado
 */
export function getBootHydrated() {
    return appState.bootHydrated;
}

// ===== PROFILES API =====

/**
 * Define o perfil atual
 * @param {string} profileId ID do perfil
 */
export function setCurrentProfile(profileId) {
    if (appState.currentProfileId !== profileId) {
        appState.currentProfileId = profileId;
        notifyStateChange('currentProfile:set', profileId);
    }
}

/**
 * Obtém o ID do perfil atual
 * @returns {string} ID do perfil atual
 */
export function getCurrentProfile() {
    return appState.currentProfileId;
}

// ===== SUBSCRIPTION API =====

/**
 * Subscreve a mudanças de estado
 * @param {Function} callback Função callback (type, data) => void
 * @returns {Function} Função para cancelar a subscrição
 */
export function subscribeState(callback) {
    if (typeof callback !== 'function') {
        throw new Error('subscribeState: callback must be a function');
    }
    
    stateSubscribers.add(callback);
    
    // Retorna função de unsubscribe
    return () => {
        stateSubscribers.delete(callback);
    };
}

// ===== STATE EXPORT =====

/**
 * Exporta o estado completo (somente leitura)
 * @returns {Object} Estado atual da aplicação
 */
export function getAppState() {
    return {
        transactions: getTransactions(),
        cards: getCards(),
        startBalance: getStartBalance(),
        startDate: getStartDate(),
        startSet: getStartSet(),
        bootHydrated: getBootHydrated(),
        currentProfileId: getCurrentProfile()
    };
}

/**
 * Exporta referência ao estado interno (para compatibilidade legada)
 * DEPRECATED: Use as funções específicas instead
 */
export { appState };

// Log de inicialização
console.log('📊 app-state.js carregado - Estado centralizado inicializado');
