/**
 * format-utils.js - Utilitários de formatação
 * Funções para formatação de moeda, números e escape de HTML
 */

import { getRuntimeProfile, DEFAULT_PROFILE } from './profile-utils.js';

/**
 * Formata valor como moeda brasileira
 * @param {number|string} value Valor a ser formatado
 * @param {Object} options Opções de formatação
 * @returns {string} Valor formatado como moeda
 */
export function fmtCurrency(value, options = {}) {
    const profile = getRuntimeProfile();
    const currency = options.currency || profile.currency || DEFAULT_PROFILE.currency;
    const locale = options.locale || profile.locale || DEFAULT_PROFILE.locale;
    const decimals = Number.isFinite(options.maximumFractionDigits)
        ? options.maximumFractionDigits
        : (profile.decimalPlaces ?? DEFAULT_PROFILE.decimalPlaces ?? 2);
    const minimumFractionDigits = options.minimumFractionDigits ?? decimals;
    const maximumFractionDigits = options.maximumFractionDigits ?? decimals;

    const numValue = Number(value) || 0;

    try {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency,
            minimumFractionDigits,
            maximumFractionDigits
        }).format(numValue);
    } catch (error) {
        console.warn('fmtCurrency error:', error);
        // Fallback simples mantendo moeda atual
        return `${currency} ${numValue.toFixed(maximumFractionDigits).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
    }
}

/**
 * Formata número com separadores de milhares
 * @param {number|string} value Valor a ser formatado
 * @param {Object} options Opções de formatação
 * @returns {string} Número formatado
 */
export function fmtNumber(value, options = {}) {
    const profile = getRuntimeProfile();
    const locale = options.locale || profile.locale || DEFAULT_PROFILE.locale;
    const minimumFractionDigits = Number.isFinite(options.minimumFractionDigits) ? options.minimumFractionDigits : 0;
    const maximumFractionDigits = Number.isFinite(options.maximumFractionDigits)
        ? options.maximumFractionDigits
        : Math.max(minimumFractionDigits, profile.decimalPlaces ?? DEFAULT_PROFILE.decimalPlaces ?? 2);

    const numValue = Number(value) || 0;

    try {
        return new Intl.NumberFormat(locale, {
            minimumFractionDigits,
            maximumFractionDigits
        }).format(numValue);
    } catch (error) {
        console.warn('fmtNumber error:', error);
        // Fallback simples
        return numValue.toFixed(maximumFractionDigits);
    }
}

/**
 * Converte string de moeda para número
 * @param {string} currencyStr String no formato monetário
 * @returns {number} Valor numérico
 */
export function parseCurrency(currencyStr) {
    if (typeof currencyStr !== 'string') {
        return Number(currencyStr) || 0;
    }
    
    const trimmed = currencyStr.trim();
    if (!trimmed) return 0;

    const profile = getRuntimeProfile();
    const locale = profile.locale || DEFAULT_PROFILE.locale;

    let decimalSymbol = '.';
    let groupSymbol = ',';

    try {
        const parts = new Intl.NumberFormat(locale).formatToParts(12345.6);
        const decimalPart = parts.find(part => part.type === 'decimal');
        const groupPart = parts.find(part => part.type === 'group');
        if (decimalPart?.value) decimalSymbol = decimalPart.value;
        if (groupPart?.value) groupSymbol = groupPart.value;
    } catch (_) {
        // fallback mantém símbolos padrão
    }

    // Mantém apenas dígitos, sinais e separadores conhecidos
    const allowed = new RegExp(`[^0-9\\${decimalSymbol}\\${groupSymbol}+\-]`, 'g');
    let normalized = trimmed.replace(allowed, '');

    if (groupSymbol) {
        const groupRegex = new RegExp(`\\${groupSymbol}`, 'g');
        normalized = normalized.replace(groupRegex, '');
    }

    if (decimalSymbol && decimalSymbol !== '.') {
        const decimalRegex = new RegExp(`\\${decimalSymbol}`, 'g');
        normalized = normalized.replace(decimalRegex, '.');
    }

    // Garante que apenas o último ponto permaneça como separador decimal
    const lastDot = normalized.lastIndexOf('.');
    if (lastDot !== -1) {
        normalized = normalized.slice(0, lastDot).replace(/\./g, '') + normalized.slice(lastDot);
    }

    // Normaliza múltiplos sinais (mantém apenas o primeiro)
    normalized = normalized.replace(/(?!^)[+-]/g, '');

    return Number(normalized) || 0;
}

/**
 * Escape de HTML para prevenir XSS
 * @param {string} unsafe String não segura
 * @returns {string} String com escape de HTML
 */
export function escHtml(unsafe) {
    if (typeof unsafe !== 'string') {
        return String(unsafe || '');
    }
    
    return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Formata porcentagem
 * @param {number} value Valor decimal (0.15 = 15%)
 * @param {Object} options Opções de formatação
 * @returns {string} Porcentagem formatada
 */
export function fmtPercent(value, options = {}) {
    const {
        locale = 'pt-BR',
        minimumFractionDigits = 1,
        maximumFractionDigits = 2
    } = options;
    
    const numValue = Number(value) || 0;
    
    try {
        return new Intl.NumberFormat(locale, {
            style: 'percent',
            minimumFractionDigits,
            maximumFractionDigits
        }).format(numValue);
    } catch (error) {
        console.warn('fmtPercent error:', error);
        // Fallback simples
        return `${(numValue * 100).toFixed(1)}%`;
    }
}

/**
 * Trunca texto com ellipsis
 * @param {string} text Texto a ser truncado
 * @param {number} maxLength Tamanho máximo
 * @returns {string} Texto truncado
 */
export function truncateText(text, maxLength = 50) {
    if (typeof text !== 'string') {
        return String(text || '');
    }
    
    if (text.length <= maxLength) {
        return text;
    }
    
    return text.slice(0, maxLength - 3) + '...';
}

/**
 * Formata tamanho de arquivo
 * @param {number} bytes Tamanho em bytes
 * @returns {string} Tamanho formatado
 */
export function fmtFileSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = Number(bytes) || 0;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }
    
    return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

/**
 * Capitaliza primeira letra
 * @param {string} str String a ser capitalizada
 * @returns {string} String capitalizada
 */
export function capitalize(str) {
    if (typeof str !== 'string') {
        return String(str || '');
    }
    
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Remove acentos de string
 * @param {string} str String com acentos
 * @returns {string} String sem acentos
 */
export function removeAccents(str) {
    if (typeof str !== 'string') {
        return String(str || '');
    }
    
    return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Normaliza string para comparação
 * @param {string} str String a ser normalizada
 * @returns {string} String normalizada
 */
export function normalizeString(str) {
    return removeAccents(str).trim().toLowerCase();
}

console.log('🎨 format-utils.js carregado - Utilitários de formatação disponíveis');
