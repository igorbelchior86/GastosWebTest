/**
 * recurrence-engine.js - Motor de recorrências
 * Lógica para expansão e gerenciamento de transações recorrentes
 */

import { todayISO, parseISODate, addDaysToISO, getDateRange } from '../utils/date-utils.js';
import { getTransactions } from '../state/app-state.js';

/**
 * Verifica se uma recorrência ocorre em uma data específica
 * @param {Object} master Transação master com recorrência
 * @param {string} isoDate Data a verificar
 * @returns {boolean} Se ocorre na data
 */
export function occursOn(master, isoDate) {
    if (!master || !master.recurrence || !isoDate) return false;
    
    const rule = master.recurrence;
    const masterDate = parseISODate(master.opDate);
    const targetDate = parseISODate(isoDate);
    
    if (!masterDate || !targetDate) return false;
    
    // Verifica se a data alvo é anterior à data master
    if (targetDate < masterDate) return false;
    
    // Verifica se há recurrenceEnd definido
    if (master.recurrenceEnd && isoDate >= master.recurrenceEnd) return false;
    
    // Verifica exceções explícitas
    if (master.exceptions && master.exceptions.includes(isoDate)) return false;
    
    switch (rule) {
        case 'daily':
            return true;
            
        case 'weekly':
            return targetDate.getDay() === masterDate.getDay();
            
        case 'biweekly':
            const daysDiff = Math.floor((targetDate - masterDate) / (1000 * 60 * 60 * 24));
            return daysDiff % 14 === 0 && targetDate.getDay() === masterDate.getDay();
            
        case 'monthly':
            return targetDate.getDate() === masterDate.getDate();
            
        case 'bimonthly':
            const monthsDiff = (targetDate.getFullYear() - masterDate.getFullYear()) * 12 + 
                             (targetDate.getMonth() - masterDate.getMonth());
            return monthsDiff % 2 === 0 && targetDate.getDate() === masterDate.getDate();
            
        case 'quarterly':
            const quartersDiff = Math.floor(
                ((targetDate.getFullYear() - masterDate.getFullYear()) * 12 + 
                 (targetDate.getMonth() - masterDate.getMonth())) / 3
            );
            return quartersDiff > 0 && quartersDiff % 1 === 0 && 
                   targetDate.getDate() === masterDate.getDate();
            
        case 'yearly':
            return targetDate.getMonth() === masterDate.getMonth() && 
                   targetDate.getDate() === masterDate.getDate();
                   
        default:
            console.warn('occursOn: unknown recurrence rule:', rule);
            return false;
    }
}

/**
 * Expande transações recorrentes em um range de datas
 * @param {Object} master Transação master
 * @param {string} startDate Data inicial (ISO)
 * @param {string} endDate Data final (ISO)
 * @returns {Array} Array de transações expandidas
 */
export function expandRecurrence(master, startDate, endDate) {
    if (!master || !master.recurrence) return [];
    
    const expanded = [];
    const dateRange = getDateRange(startDate, endDate);
    
    for (const isoDate of dateRange) {
        if (occursOn(master, isoDate)) {
            expanded.push({
                ...master,
                id: `${master.id}_exp_${isoDate}`,
                parentId: master.id,
                opDate: isoDate,
                postDate: typeof post === 'function' ? post(isoDate, master.method) : isoDate,
                planned: isoDate > todayISO(),
                recurrence: '', // Remove flag na expansão
                isExpansion: true
            });
        }
    }
    
    return expanded;
}

/**
 * Obtém próximas ocorrências de uma recorrência
 * @param {Object} master Transação master
 * @param {number} count Número de ocorrências
 * @param {string} fromDate Data inicial (padrão: hoje)
 * @returns {Array} Próximas ocorrências
 */
export function getNextOccurrences(master, count = 5, fromDate = null) {
    if (!master || !master.recurrence) return [];
    
    const startDate = fromDate || todayISO();
    const occurrences = [];
    let currentDate = parseISODate(startDate);
    
    if (!currentDate) return [];
    
    // Procura até encontrar o número solicitado de ocorrências
    let attempts = 0;
    const maxAttempts = count * 100; // Evita loop infinito
    
    while (occurrences.length < count && attempts < maxAttempts) {
        const isoDate = currentDate.toISOString().slice(0, 10);
        
        if (occursOn(master, isoDate)) {
            occurrences.push({
                date: isoDate,
                postDate: typeof post === 'function' ? post(isoDate, master.method) : isoDate,
                planned: isoDate > todayISO(),
                isToday: isoDate === todayISO()
            });
        }
        
        // Avança para próximo dia
        currentDate.setDate(currentDate.getDate() + 1);
        attempts++;
    }
    
    return occurrences;
}

/**
 * Calcula estatísticas de uma recorrência
 * @param {Object} master Transação master
 * @param {number} days Período de análise em dias
 * @returns {Object} Estatísticas da recorrência
 */
export function getRecurrenceStats(master, days = 365) {
    if (!master || !master.recurrence) {
        return {
            rule: null,
            frequency: 0,
            nextOccurrence: null,
            totalValue: 0,
            avgMonthly: 0
        };
    }
    
    const startDate = todayISO();
    const endDate = addDaysToISO(startDate, days);
    
    const expanded = expandRecurrence(master, startDate, endDate);
    const frequency = expanded.length;
    const totalValue = frequency * (Number(master.val) || 0);
    const avgMonthly = totalValue / (days / 30.44); // Aproximadamente
    
    const nextOccurrences = getNextOccurrences(master, 1);
    const nextOccurrence = nextOccurrences.length > 0 ? nextOccurrences[0].date : null;
    
    return {
        rule: master.recurrence,
        frequency,
        nextOccurrence,
        totalValue,
        avgMonthly,
        period: days
    };
}

/**
 * Valida regra de recorrência
 * @param {string} rule Regra a validar
 * @returns {boolean} Se é válida
 */
export function isValidRecurrenceRule(rule) {
    const validRules = ['daily', 'weekly', 'biweekly', 'monthly', 'bimonthly', 'quarterly', 'yearly'];
    return validRules.includes(rule);
}

/**
 * Obtém nome amigável para regra de recorrência
 * @param {string} rule Regra de recorrência
 * @returns {string} Nome amigável
 */
export function getRecurrenceRuleName(rule) {
    const names = {
        daily: 'Diária',
        weekly: 'Semanal',
        biweekly: 'Quinzenal',
        monthly: 'Mensal',
        bimonthly: 'Bimestral',
        quarterly: 'Trimestral',
        yearly: 'Anual'
    };
    
    return names[rule] || rule;
}

/**
 * Adiciona exceção a uma recorrência
 * @param {Object} master Transação master
 * @param {string} isoDate Data da exceção
 * @returns {Object} Master atualizado
 */
export function addRecurrenceException(master, isoDate) {
    const updated = { ...master };
    
    if (!updated.exceptions) {
        updated.exceptions = [];
    }
    
    if (!updated.exceptions.includes(isoDate)) {
        updated.exceptions.push(isoDate);
        updated.exceptions.sort(); // Mantém ordenado
    }
    
    return updated;
}

/**
 * Remove exceção de uma recorrência
 * @param {Object} master Transação master
 * @param {string} isoDate Data da exceção a remover
 * @returns {Object} Master atualizado
 */
export function removeRecurrenceException(master, isoDate) {
    const updated = { ...master };
    
    if (updated.exceptions) {
        updated.exceptions = updated.exceptions.filter(date => date !== isoDate);
        
        // Remove array vazio
        if (updated.exceptions.length === 0) {
            delete updated.exceptions;
        }
    }
    
    return updated;
}

/**
 * Detecta conflitos entre recorrência e transações existentes
 * @param {Object} master Transação master
 * @param {Array} transactions Lista de transações (opcional)
 * @returns {Array} Lista de conflitos detectados
 */
export function detectRecurrenceConflicts(master, transactions = null) {
    const txs = transactions || getTransactions();
    const conflicts = [];
    
    // Verifica próximas 90 ocorrências
    const nextOccurrences = getNextOccurrences(master, 90);
    
    for (const occurrence of nextOccurrences) {
        const conflictingTxs = txs.filter(tx => 
            tx.id !== master.id &&
            tx.opDate === occurrence.date &&
            tx.desc === master.desc &&
            tx.method === master.method &&
            Math.abs((Number(tx.val) || 0) - (Number(master.val) || 0)) < 0.01
        );
        
        if (conflictingTxs.length > 0) {
            conflicts.push({
                date: occurrence.date,
                conflictingTransactions: conflictingTxs,
                masterValue: master.val,
                suggestion: 'add_exception' // Sugerir adicionar exceção
            });
        }
    }
    
    return conflicts;
}

/**
 * Resolve conflitos automaticamente adicionando exceções
 * @param {Object} master Transação master
 * @param {Array} conflicts Lista de conflitos
 * @returns {Object} Master atualizado com exceções
 */
export function resolveRecurrenceConflicts(master, conflicts) {
    let updated = { ...master };
    
    for (const conflict of conflicts) {
        if (conflict.suggestion === 'add_exception') {
            updated = addRecurrenceException(updated, conflict.date);
        }
    }
    
    return updated;
}

/**
 * Calcula frequência média de uma recorrência
 * @param {string} rule Regra de recorrência
 * @returns {number} Número médio de ocorrências por ano
 */
export function getRecurrenceFrequencyPerYear(rule) {
    const frequencies = {
        daily: 365,
        weekly: 52,
        biweekly: 26,
        monthly: 12,
        bimonthly: 6,
        quarterly: 4,
        yearly: 1
    };
    
    return frequencies[rule] || 0;
}

// Função helper global para compatibilidade (se post() não estiver disponível)
if (typeof post === 'undefined') {
    window.post = function(opDate, method) {
        // Implementação simplificada - em produção seria mais complexa
        if (method === 'Dinheiro') return opDate;
        
        // Para cartões, adiciona dias baseado em regras básicas
        const date = parseISODate(opDate);
        if (!date) return opDate;
        
        // Regra simples: vencimento 30 dias após compra
        date.setDate(date.getDate() + 30);
        return date.toISOString().slice(0, 10);
    };
}

console.log('🔄 recurrence-engine.js carregado - Motor de recorrências disponível');