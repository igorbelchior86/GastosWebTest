/**
 * Utilities for text and currency formatting
 * Extracted from main.js as part of FASE 1 refactoring
 */

/**
 * Escape HTML special characters to prevent XSS
 * @param {*} s - String to escape
 * @returns {string} HTML-escaped string
 */
export function escHtml(s) {
  return (s == null ? "" : String(s)).replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));
}

/**
 * Format number as Brazilian currency (BRL)
 * @param {number} v - Value to format
 * @returns {string} Formatted currency string
 */
export function currency(v) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/**
 * Format date for display (responsive: DD/MM or DD/MM/YYYY)
 * @param {Date|string} d - Date to format
 * @returns {string} Formatted date string
 */
export function fmt(d) {
  const date = d instanceof Date ? d : new Date(d);
  const mobile = () => window.innerWidth <= 480;
  return date.toLocaleDateString('pt-BR', mobile() 
    ? { day: '2-digit', month: '2-digit' }
    : { day: '2-digit', month: '2-digit', year: 'numeric' }
  );
}

/**
 * Format date as ISO string (YYYY-MM-DD)
 * @param {Date} date - Date to format
 * @returns {string} ISO date string or empty string if invalid
 */
export function formatDateISO(date) {
  if (!(date instanceof Date)) return '';
  return date.toISOString().slice(0, 10);
}

/**
 * Format number as BRL currency with custom format for display
 * @param {number} value - Value to format
 * @param {boolean} showSign - Whether to show + or - sign
 * @returns {string} Formatted value string
 */
export function formatCurrencyDisplay(value, showSign = true) {
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : (showSign && value > 0 ? '+' : '');
  return `R$ ${sign}${absValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

/**
 * Parse currency input string to number
 * @param {string} str - Currency string (e.g., "1.234,56")
 * @returns {number} Parsed number value
 */
export function parseCurrency(str) {
  if (!str) return 0;
  // Remove thousands separators (.) and replace decimal comma with dot
  return parseFloat(str.replace(/\./g, '').replace(/,/g, '.')) || 0;
}

/**
 * Array of month abbreviations in Portuguese
 */
export const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

/**
 * Check if current viewport is mobile
 * @returns {boolean} True if mobile viewport
 */
export function mobile() {
  return window.innerWidth <= 480;
}

// Maintain backward compatibility by exposing functions globally
if (typeof window !== 'undefined') {
  window.escHtml = escHtml;
  window.currency = currency;
  window.fmt = fmt;
  window.formatDateISO = formatDateISO;
  window.meses = meses;
  window.mobile = mobile;
}