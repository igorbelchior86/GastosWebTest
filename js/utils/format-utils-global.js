// ============================================================================
// 🎨 FORMAT UTILITIES - GLOBAL VERSION  
// ============================================================================
// Funções utilitárias para formatação de texto e moeda
// Versão global para compatibilidade com browsers mais antigos

/**
 * Escape HTML special characters to prevent XSS
 * @param {*} s - String to escape
 * @returns {string} HTML-escaped string
 */
function escHtml(s) {
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
function currency(v) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/**
 * Format date for display (responsive: DD/MM or DD/MM/YYYY)
 * @param {Date|string} d - Date to format
 * @returns {string} Formatted date string
 */
function fmt(d) {
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
function formatDateISO(date) {
  if (!(date instanceof Date)) return '';
  return date.toISOString().slice(0, 10);
}

/**
 * Check if current viewport is mobile
 * @returns {boolean} True if mobile viewport
 */
function mobile() {
  return window.innerWidth <= 480;
}

/**
 * Array of month abbreviations in Portuguese
 */
const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

// Expose all functions globally
window.escHtml = escHtml;
window.currency = currency;
window.fmt = fmt;
window.formatDateISO = formatDateISO;
window.mobile = mobile;
window.meses = meses;