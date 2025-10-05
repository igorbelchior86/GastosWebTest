/**
 * transaction-engine.js - Motor de transações
 * Lógica central para manipulação e cálculo de transações
 */

import { todayISO, parseISODate, addDaysToISO } from '../utils/date-utils.js';
import { getTransactions, setTransactions, addTransaction, removeTransaction, updateTransaction } from '../state/app-state.js';

/**
 * Ordena transações por data e timestamp
 * @param {Array} transactions Array de transações (opcional, usa estado se não fornecido)
 * @returns {Array} Transações ordenadas
 */
export function sortTransactions(transactions = null) {
    const txs = transactions || getTransactions();
    
    const sorted = [...txs].sort((a, b) => {
        const dateCompare = a.opDate.localeCompare(b.opDate);
        if (dateCompare !== 0) return dateCompare;
        
        // Fallback: compare timestamps when same date
        return (a.ts || '').localeCompare(b.ts || '');
    });
    
    // Atualiza o estado se não foi fornecido array específico
    if (!transactions) {
        setTransactions(sorted);
    }
    
    return sorted;
}

/**
 * Sanitiza transações garantindo campos obrigatórios
 * @param {Array} transactions Array de transações
 * @returns {Object} {sanitized, changed}
 */
export function sanitizeTransactions(transactions) {
    const txs = transactions || getTransactions();
    let changed = false;
    
    const sanitized = txs.map(t => {
        if (!t) return t;
        
        const nt = { ...t };
        
        // Garante opDate
        if (!nt.opDate) {
            if (nt.ts) {
                try {
                    nt.opDate = new Date(nt.ts).toISOString().slice(0, 10);
                } catch {
                    nt.opDate = todayISO();
                }
            } else {
                nt.opDate = todayISO();
            }
            changed = true;
        }
        
        // Garante postDate
        if (!nt.postDate) {
            const method = nt.method || 'Dinheiro';
            try {
                // Assumindo que existe função post() global - pode ser movida para utils
                nt.postDate = typeof post === 'function' ? post(nt.opDate, method) : nt.opDate;
            } catch {
                nt.postDate = nt.opDate;
            }
            changed = true;
        }
        
        // Garante flag planned
        if (typeof nt.planned === 'undefined') {
            nt.planned = nt.opDate > todayISO();
            changed = true;
        }
        
        return nt;
    });
    
    return { sanitized, changed };
}

/**
 * Agrupa transações por mês
 * @param {Array} transactions Transações (opcional)
 * @returns {Map} Map com agrupamento por mês YYYY-MM
 */
export function groupTransactionsByMonth(transactions = null) {
    const txs = transactions || sortTransactions();
    const groups = new Map();
    
    for (const tx of txs) {
        if (!tx) continue;
        
        // Usa postDate para agrupamento, com fallback
        const pd = tx.postDate || tx.opDate;
        if (!pd || typeof pd.slice !== 'function') continue;
        
        const monthKey = pd.slice(0, 7); // YYYY-MM
        if (!groups.has(monthKey)) {
            groups.set(monthKey, []);
        }
        groups.get(monthKey).push(tx);
    }
    
    // Ordena por mês, mais recente primeiro
    return new Map([...groups.entries()].sort((a, b) => b[0].localeCompare(a[0])));
}

/**
 * Obtém transações de uma data específica, incluindo expansão de recorrências
 * @param {string} isoDate Data no formato ISO
 * @param {Array} transactions Transações (opcional)
 * @param {Array} cards Cartões (opcional)
 * @returns {Array} Transações da data
 */
export function getTransactionsByDate(isoDate, transactions = null, cards = []) {
    const txs = transactions || getTransactions();
    const today = todayISO();
    const list = [];
    
    // Helper para resolver nome do cartão
    const resolveCardName = (method) => {
        if (!method || method === 'Dinheiro') return null;
        
        const found = cards.find(c => c && c.name === method);
        return found ? found.name : method;
    };
    
    // Transações não recorrentes
    txs.forEach(tx => {
        if (tx.recurrence || tx.opDate !== isoDate || tx.invoiceAdjust) return;
        
        if (tx.method !== 'Dinheiro') {
            // Cartão
            const cardName = resolveCardName(tx.method) || tx.method;
            const postDate = typeof post === 'function' ? post(tx.opDate, cardName) : tx.opDate;
            
            list.push({
                ...tx,
                method: cardName,
                postDate: postDate
            });
        } else {
            // Dinheiro
            list.push(tx);
        }
    });
    
    // Transações recorrentes (expansão)
    txs.filter(tx => tx.recurrence).forEach(master => {
        if (typeof occursOn === 'function' && !occursOn(master, isoDate)) return;
        
        const cardName = resolveCardName(master.method) || master.method;
        const postDate = typeof post === 'function' ? post(isoDate, cardName) : isoDate;
        const isPlanned = isoDate > today;
        
        list.push({
            ...master,
            opDate: isoDate,
            method: cardName,
            postDate: postDate,
            planned: isPlanned,
            recurrence: '' // Remove flag de recorrência na materialização
        });
    });
    
    // Ordena por timestamp
    list.sort((a, b) => {
        const dateCmp = a.opDate.localeCompare(b.opDate);
        if (dateCmp !== 0) return dateCmp;
        return (a.ts || '').localeCompare(b.ts || '');
    });
    
    return list;
}

/**
 * Calcula range de datas baseado nas transações
 * @param {Array} transactions Transações (opcional)
 * @returns {Object} {minDate, maxDate}
 */
export function calculateDateRange(transactions = null) {
    const txs = transactions || getTransactions();
    
    if (!Array.isArray(txs) || txs.length === 0) {
        const currentYear = new Date().getFullYear();
        return {
            minDate: `${currentYear}-01-01`,
            maxDate: `${currentYear}-12-31`
        };
    }
    
    let minDate = null;
    let maxDate = null;
    
    // Analisa transações únicas
    txs.forEach(tx => {
        if (!tx.recurrence) {
            const dates = [tx.opDate, tx.postDate].filter(Boolean);
            dates.forEach(date => {
                if (!minDate || date < minDate) minDate = date;
                if (!maxDate || date > maxDate) maxDate = date;
            });
        }
    });
    
    // Para recorrências, usa range amplo para capturar todas as ocorrências
    // (simplificado - em produção seria mais eficiente)
    const currentYear = new Date().getFullYear();
    const expandedMinDate = `${currentYear - 1}-01-01`;
    const expandedMaxDate = `${currentYear + 1}-12-31`;
    
    if (!minDate || expandedMinDate < minDate) minDate = expandedMinDate;
    if (!maxDate || expandedMaxDate > maxDate) maxDate = expandedMaxDate;
    
    return { minDate, maxDate };
}

/**
 * Prepara lista de transações planejadas
 * @param {number} daysAhead Dias à frente para projetar (padrão: 90)
 * @returns {Object} Transações agrupadas por data
 */
export function preparePlannedTransactions(daysAhead = 90) {
    const txs = getTransactions();
    const today = todayISO();
    const plannedByDate = {};
    
    const addToDate = (tx) => {
        if (!tx || !tx.opDate) return;
        
        const key = tx.opDate;
        if (!plannedByDate[key]) plannedByDate[key] = [];
        plannedByDate[key].push(tx);
    };
    
    // Planejadas já salvas (a partir de hoje)
    txs.forEach(tx => {
        if (tx && tx.planned && tx.opDate && tx.opDate >= today) {
            addToDate(tx);
        }
    });
    
    // Projeções de recorrência
    txs.filter(tx => tx && tx.recurrence).forEach(master => {
        for (let i = 1; i <= daysAhead; i++) {
            const futureDate = addDaysToISO(today, i);
            if (!futureDate) continue;
            
            // Verifica se ocorre nesta data
            if (typeof occursOn === 'function' && !occursOn(master, futureDate)) continue;
            
            // Respeita exceções
            if (master.exceptions && master.exceptions.includes(futureDate)) continue;
            
            // Respeita recurrenceEnd
            if (master.recurrenceEnd && futureDate >= master.recurrenceEnd) continue;
            
            // Evita duplicatas
            const existingByParent = (plannedByDate[futureDate] || []).some(t => 
                t.parentId && t.parentId === master.id
            );
            const existingByContent = (plannedByDate[futureDate] || []).some(t =>
                t.desc === master.desc && t.method === master.method && 
                Math.abs(Number(t.val) || 0) === Math.abs(Number(master.val) || 0)
            );
            
            if (existingByParent || existingByContent) continue;
            
            // Verifica se já existe transação real para esta data
            const realExists = txs.some(t => t &&
                t.opDate === futureDate &&
                ((t.parentId && t.parentId === master.id) ||
                 (t.desc === master.desc && t.method === master.method && 
                  Math.abs(Number(t.val) || 0) === Math.abs(Number(master.val) || 0)))
            );
            
            if (realExists) continue;
            
            // Adiciona projeção
            addToDate({
                ...master,
                id: `${master.id}_proj_${futureDate}`,
                parentId: master.id,
                opDate: futureDate,
                postDate: typeof post === 'function' ? post(futureDate, master.method) : futureDate,
                planned: true,
                recurrence: master.recurrence // Mantém indicador visual
            });
        }
    });
    
    return plannedByDate;
}

/**
 * Normaliza registro de transação
 * @param {Object} tx Transação a ser normalizada
 * @returns {Object} Transação normalizada
 */
export function normalizeTransaction(tx) {
    if (!tx) return null;
    
    const normalized = { ...tx };
    
    // Garante ID único
    if (!normalized.id) {
        normalized.id = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    // Normaliza timestamps
    if (!normalized.ts) {
        normalized.ts = new Date().toISOString();
    }
    
    // Normaliza modifiedAt
    normalized.modifiedAt = new Date().toISOString();
    
    // Garante opDate
    if (!normalized.opDate) {
        normalized.opDate = todayISO();
    }
    
    // Normaliza valor
    if (typeof normalized.val === 'string') {
        normalized.val = Number(normalized.val) || 0;
    }
    
    // Garante método
    if (!normalized.method) {
        normalized.method = 'Dinheiro';
    }
    
    // Normaliza planned flag
    if (typeof normalized.planned === 'undefined') {
        normalized.planned = normalized.opDate > todayISO();
    }
    
    return normalized;
}

/**
 * Encontra transação master de uma recorrência
 * @param {Object} transaction Transação filha
 * @param {string} targetDate Data da ocorrência
 * @param {Array} transactions Transações (opcional)
 * @returns {Object|null} Transação master ou null
 */
export function findMasterTransaction(transaction, targetDate, transactions = null) {
    const txs = transactions || getTransactions();
    
    // Se tem parentId, busca diretamente
    if (transaction.parentId) {
        return txs.find(t => t.id === transaction.parentId) || null;
    }
    
    // Busca por similaridade (desc, method, val) e que seja recorrente
    return txs.find(t => t &&
        t.recurrence &&
        t.desc === transaction.desc &&
        t.method === transaction.method &&
        Math.abs(Number(t.val) || 0) === Math.abs(Number(transaction.val) || 0)
    ) || null;
}

console.log('⚙️ transaction-engine.js carregado - Motor de transações disponível');