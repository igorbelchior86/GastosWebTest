/**
 * date-utils.js - Utilitários de data e tempo
 * Funções para manipulação e formatação de datas
 */

/**
 * Obtém data atual no formato ISO (YYYY-MM-DD)
 * @returns {string} Data atual em formato ISO
 */
export function todayISO() {
    return new Date().toISOString().slice(0, 10);
}

/**
 * Converte Date para formato ISO
 * @param {Date} date Objeto Date
 * @returns {string} Data em formato ISO
 */
export function formatToISO(date) {
    if (!(date instanceof Date)) {
        return null;
    }
    
    return date.toISOString().slice(0, 10);
}

/**
 * Normaliza entrada de data para ISO
 * @param {string|Date} input Entrada de data
 * @returns {string|null} Data normalizada ou null
 */
export function normalizeISODate(input) {
    if (!input) return null;
    
    if (input instanceof Date) {
        return input.toISOString().slice(0, 10);
    }
    
    const str = String(input).trim();
    if (!str) return null;
    
    // Verifica se já está no formato YYYY-MM-DD
    const match = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return match ? match[0] : null;
}

/**
 * Converte string ISO para Date
 * @param {string} isoString String no formato YYYY-MM-DD
 * @returns {Date|null} Objeto Date ou null
 */
export function parseISODate(isoString) {
    if (!isoString || typeof isoString !== 'string') {
        return null;
    }
    
    const match = isoString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;
    
    const [, year, month, day] = match;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    
    // Verifica se a data é válida
    if (date.getFullYear() !== parseInt(year) ||
        date.getMonth() !== parseInt(month) - 1 ||
        date.getDate() !== parseInt(day)) {
        return null;
    }
    
    return date;
}

/**
 * Adiciona dias a uma data ISO
 * @param {string} isoDate Data no formato ISO
 * @param {number} days Dias a adicionar (pode ser negativo)
 * @returns {string|null} Nova data em ISO
 */
export function addDaysToISO(isoDate, days) {
    const date = parseISODate(isoDate);
    if (!date) return null;
    
    date.setDate(date.getDate() + days);
    return formatToISO(date);
}

/**
 * Calcula diferença em dias entre duas datas ISO
 * @param {string} isoDate1 Primeira data
 * @param {string} isoDate2 Segunda data
 * @returns {number|null} Diferença em dias (positivo se date1 > date2)
 */
export function daysBetween(isoDate1, isoDate2) {
    const date1 = parseISODate(isoDate1);
    const date2 = parseISODate(isoDate2);
    
    if (!date1 || !date2) return null;
    
    const timeDiff = date1.getTime() - date2.getTime();
    return Math.floor(timeDiff / (1000 * 60 * 60 * 24));
}

/**
 * Obtém primeiro dia do mês
 * @param {string} isoDate Data de referência
 * @returns {string|null} Primeiro dia do mês
 */
export function getFirstDayOfMonth(isoDate) {
    const date = parseISODate(isoDate);
    if (!date) return null;
    
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
}

/**
 * Obtém último dia do mês
 * @param {string} isoDate Data de referência
 * @returns {string|null} Último dia do mês
 */
export function getLastDayOfMonth(isoDate) {
    const date = parseISODate(isoDate);
    if (!date) return null;
    
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    return formatToISO(lastDay);
}

/**
 * Verifica se duas datas ISO estão no mesmo mês
 * @param {string} isoDate1 Primeira data
 * @param {string} isoDate2 Segunda data
 * @returns {boolean} Se estão no mesmo mês
 */
export function isSameMonth(isoDate1, isoDate2) {
    if (!isoDate1 || !isoDate2) return false;
    
    const month1 = isoDate1.slice(0, 7); // YYYY-MM
    const month2 = isoDate2.slice(0, 7); // YYYY-MM
    
    return month1 === month2;
}

/**
 * Verifica se data está no passado
 * @param {string} isoDate Data a verificar
 * @returns {boolean} Se está no passado
 */
export function isPast(isoDate) {
    return isoDate < todayISO();
}

/**
 * Verifica se data está no futuro
 * @param {string} isoDate Data a verificar
 * @returns {boolean} Se está no futuro
 */
export function isFuture(isoDate) {
    return isoDate > todayISO();
}

/**
 * Verifica se data é hoje
 * @param {string} isoDate Data a verificar
 * @returns {boolean} Se é hoje
 */
export function isToday(isoDate) {
    return isoDate === todayISO();
}

/**
 * Formata data para exibição brasileira
 * @param {string} isoDate Data ISO
 * @param {Object} options Opções de formatação
 * @returns {string} Data formatada
 */
export function formatBRDate(isoDate, options = {}) {
    const date = parseISODate(isoDate);
    if (!date) return '';
    
    const {
        includeWeekday = false,
        includeYear = true,
        shortMonth = false
    } = options;
    
    const formatOptions = {
        day: '2-digit',
        month: shortMonth ? 'short' : '2-digit'
    };
    
    if (includeYear) {
        formatOptions.year = 'numeric';
    }
    
    if (includeWeekday) {
        formatOptions.weekday = 'long';
    }
    
    try {
        return date.toLocaleDateString('pt-BR', formatOptions);
    } catch (error) {
        console.warn('formatBRDate error:', error);
        // Fallback manual
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        
        return includeYear ? `${day}/${month}/${year}` : `${day}/${month}`;
    }
}

/**
 * Obtém range de datas do mês
 * @param {string} isoDate Data de referência
 * @returns {Object} {start, end} com datas do range
 */
export function getMonthRange(isoDate) {
    const start = getFirstDayOfMonth(isoDate);
    const end = getLastDayOfMonth(isoDate);
    
    return { start, end };
}

/**
 * Obtém array de datas entre duas datas
 * @param {string} startISO Data inicial
 * @param {string} endISO Data final
 * @returns {Array} Array de datas ISO
 */
export function getDateRange(startISO, endISO) {
    const dates = [];
    const start = parseISODate(startISO);
    const end = parseISODate(endISO);
    
    if (!start || !end || start > end) {
        return dates;
    }
    
    const current = new Date(start);
    
    while (current <= end) {
        dates.push(formatToISO(current));
        current.setDate(current.getDate() + 1);
    }
    
    return dates;
}

/**
 * Converte timestamp para ISO date
 * @param {number} timestamp Timestamp em ms
 * @returns {string} Data ISO
 */
export function timestampToISO(timestamp) {
    const date = new Date(timestamp);
    return formatToISO(date);
}

/**
 * Obtém timestamp do início do dia para data ISO
 * @param {string} isoDate Data ISO
 * @returns {number} Timestamp do início do dia
 */
export function getStartOfDayTimestamp(isoDate) {
    const date = parseISODate(isoDate);
    if (!date) return null;
    
    return date.getTime();
}

console.log('📅 date-utils.js carregado - Utilitários de data disponíveis');