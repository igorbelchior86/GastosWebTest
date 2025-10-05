/**
 * balance-calculator.js - Calculadora de saldos
 * Engine para cálculo de saldos corridos e projeções
 */

import { todayISO, getDateRange, parseISODate } from '../utils/date-utils.js';
import { getTransactions } from '../state/app-state.js';
import { getTransactionsByDate, calculateDateRange } from './transaction-engine.js';

/**
 * Constrói mapa de saldos corridos dia a dia
 * @param {Object} options Opções de cálculo
 * @returns {Map} Mapa com saldos por data ISO
 */
export function buildRunningBalanceMap(options = {}) {
    const {
        startBalance = 0,
        startDate = null,
        transactions = null,
        cards = []
    } = options;
    
    const txs = transactions || getTransactions();
    const { minDate, maxDate } = calculateDateRange(txs);
    const balanceMap = new Map();
    
    // Configuração de ancoragem
    const hasAnchor = !!startDate;
    const anchorISO = hasAnchor ? String(startDate) : null;
    let runningBalance = 0;
    
    // Se há âncora antes do range, pré-carrega o saldo
    if (hasAnchor && anchorISO && anchorISO < minDate) {
        runningBalance = Number(startBalance) || 0;
    }
    
    // Itera dia a dia no range
    const dateRange = getDateRange(minDate, maxDate);
    
    for (const isoDate of dateRange) {
        // Lógica de ancoragem
        if (hasAnchor && isoDate < anchorISO) {
            balanceMap.set(isoDate, 0);
            continue;
        }
        
        if (hasAnchor && isoDate === anchorISO) {
            runningBalance = Number(startBalance) || 0;
        }
        
        // Se não há âncora e é o primeiro dia, inicializa
        if (!hasAnchor && isoDate === minDate) {
            runningBalance = Number(startBalance) || 0;
        }
        
        // Calcula impacto do dia
        const dayImpact = calculateDayImpact(isoDate, txs, cards);
        runningBalance += dayImpact;
        
        balanceMap.set(isoDate, runningBalance);
    }
    
    return balanceMap;
}

/**
 * Calcula impacto financeiro de um dia específico
 * @param {string} isoDate Data ISO
 * @param {Array} transactions Transações
 * @param {Array} cards Cartões
 * @returns {number} Impacto total do dia
 */
export function calculateDayImpact(isoDate, transactions = null, cards = []) {
    const txs = transactions || getTransactions();
    
    // 1. Impacto direto do dinheiro no opDate
    const cashImpact = calculateCashImpact(isoDate, txs);
    
    // 2. Impacto dos cartões no vencimento das faturas
    const cardImpact = calculateCardImpact(isoDate, txs, cards);
    
    return cashImpact + cardImpact;
}

/**
 * Calcula impacto do dinheiro em uma data
 * @param {string} isoDate Data ISO
 * @param {Array} transactions Transações
 * @returns {number} Impacto total do dinheiro
 */
export function calculateCashImpact(isoDate, transactions) {
    const dayTransactions = getTransactionsByDate(isoDate, transactions);
    
    return dayTransactions
        .filter(tx => tx.method === 'Dinheiro')
        .reduce((total, tx) => total + (Number(tx.val) || 0), 0);
}

/**
 * Calcula impacto dos cartões em uma data (vencimento de faturas)
 * @param {string} isoDate Data ISO
 * @param {Array} transactions Transações
 * @param {Array} cards Cartões
 * @returns {number} Impacto total dos cartões
 */
export function calculateCardImpact(isoDate, transactions, cards) {
    const invoicesByCard = groupInvoicesByCard(isoDate, transactions, cards);
    let totalImpact = 0;
    
    // Calcula total por cartão
    Object.keys(invoicesByCard).forEach(cardName => {
        const invoiceTotal = invoicesByCard[cardName]
            .reduce((sum, tx) => sum + (Number(tx.val) || 0), 0);
        
        // Subtrai ajustes positivos (que deslocam parte da fatura)
        const adjustments = calculateInvoiceAdjustments(cardName, isoDate, transactions);
        
        totalImpact += invoiceTotal - adjustments;
    });
    
    return totalImpact;
}

/**
 * Agrupa transações por cartão que vencem em uma data específica
 * @param {string} dueDate Data de vencimento
 * @param {Array} transactions Transações
 * @param {Array} cards Cartões
 * @returns {Object} Agrupamento por cartão
 */
export function groupInvoicesByCard(dueDate, transactions, cards) {
    const invoices = {};
    
    // Transações não recorrentes de cartão
    transactions.forEach(tx => {
        if (tx.method === 'Dinheiro' || tx.recurrence || tx.postDate !== dueDate) return;
        
        // Verifica se é cartão válido
        const isValidCard = cards.some(c => c && c.name === tx.method && c.name !== 'Dinheiro');
        if (!isValidCard) return;
        
        if (!invoices[tx.method]) invoices[tx.method] = [];
        invoices[tx.method].push(tx);
    });
    
    // Transações recorrentes de cartão (scan de 60 dias para trás)
    const scanStart = new Date(dueDate);
    scanStart.setDate(scanStart.getDate() - 60);
    
    transactions.filter(tx => tx.recurrence && tx.method !== 'Dinheiro').forEach(master => {
        // Verifica se é cartão válido
        const isValidCard = cards.some(c => c && c.name === master.method && c.name !== 'Dinheiro');
        if (!isValidCard) return;
        
        const scanRange = getDateRange(scanStart.toISOString().slice(0, 10), dueDate);
        
        scanRange.forEach(scanDate => {
            // Verifica se recorrência ocorre nesta data
            if (typeof occursOn === 'function' && occursOn(master, scanDate)) {
                const postDate = typeof post === 'function' ? post(scanDate, master.method) : scanDate;
                
                if (postDate === dueDate) {
                    if (!invoices[master.method]) invoices[master.method] = [];
                    
                    invoices[master.method].push({
                        ...master,
                        opDate: scanDate,
                        postDate: dueDate,
                        planned: false,
                        recurrence: ''
                    });
                }
            }
        });
    });
    
    return invoices;
}

/**
 * Calcula ajustes de fatura para um cartão e data
 * @param {string} cardName Nome do cartão
 * @param {string} dueDate Data de vencimento
 * @param {Array} transactions Transações
 * @returns {number} Total de ajustes
 */
export function calculateInvoiceAdjustments(cardName, dueDate, transactions) {
    return transactions
        .filter(tx => 
            tx.invoiceAdjust && 
            tx.invoiceAdjust.card === cardName && 
            tx.invoiceAdjust.dueISO === dueDate
        )
        .reduce((sum, tx) => sum + (Number(tx.invoiceAdjust.amount) || 0), 0);
}

/**
 * Calcula saldo em uma data específica
 * @param {string} isoDate Data ISO
 * @param {Object} options Opções de cálculo
 * @returns {number} Saldo na data
 */
export function getBalanceOnDate(isoDate, options = {}) {
    const balanceMap = buildRunningBalanceMap(options);
    return balanceMap.get(isoDate) || 0;
}

/**
 * Calcula projeção de saldo para os próximos dias
 * @param {number} days Número de dias à frente
 * @param {Object} options Opções de cálculo
 * @returns {Array} Array de {date, balance}
 */
export function projectBalance(days = 30, options = {}) {
    const today = todayISO();
    const projections = [];
    
    const balanceMap = buildRunningBalanceMap(options);
    
    for (let i = 0; i <= days; i++) {
        const date = new Date();
        date.setDate(date.getDate() + i);
        const isoDate = date.toISOString().slice(0, 10);
        
        const balance = balanceMap.get(isoDate) || getBalanceOnDate(isoDate, options);
        
        projections.push({
            date: isoDate,
            balance: balance,
            isPast: isoDate < today,
            isToday: isoDate === today,
            isFuture: isoDate > today
        });
    }
    
    return projections;
}

/**
 * Encontra datas com saldo negativo
 * @param {Object} options Opções de cálculo
 * @returns {Array} Datas com saldo negativo
 */
export function findNegativeBalanceDates(options = {}) {
    const balanceMap = buildRunningBalanceMap(options);
    const negativeDates = [];
    
    for (const [date, balance] of balanceMap.entries()) {
        if (balance < 0) {
            negativeDates.push({
                date,
                balance,
                isPast: date < todayISO(),
                isToday: date === todayISO(),
                isFuture: date > todayISO()
            });
        }
    }
    
    return negativeDates.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Calcula estatísticas de saldo
 * @param {Object} options Opções de cálculo
 * @returns {Object} Estatísticas do saldo
 */
export function getBalanceStats(options = {}) {
    const balanceMap = buildRunningBalanceMap(options);
    const balances = Array.from(balanceMap.values());
    
    if (balances.length === 0) {
        return {
            min: 0,
            max: 0,
            avg: 0,
            current: 0,
            trend: 'stable'
        };
    }
    
    const min = Math.min(...balances);
    const max = Math.max(...balances);
    const avg = balances.reduce((sum, b) => sum + b, 0) / balances.length;
    const current = getBalanceOnDate(todayISO(), options);
    
    // Calcula tendência baseada nos últimos 7 dias
    const recentBalances = balances.slice(-7);
    const trend = recentBalances.length >= 2 ?
        (recentBalances[recentBalances.length - 1] > recentBalances[0] ? 'up' : 
         recentBalances[recentBalances.length - 1] < recentBalances[0] ? 'down' : 'stable') :
        'stable';
    
    return {
        min,
        max,
        avg,
        current,
        trend,
        negativeDays: findNegativeBalanceDates(options).length
    };
}

console.log('📊 balance-calculator.js carregado - Calculadora de saldos disponível');