// ============================================================================
// 🎨 FORMATTERS MODULE
// ============================================================================
// Funções de formatação e escaping de dados
// FASE 3 refatoração - utilitários extraídos do main.js

/**
 * Formatters - Utilitários de formatação de dados
 * 
 * Responsabilidades:
 * - Escape HTML para segurança
 * - Formatação de moeda e números
 * - Formatação de datas legível
 * - Formatação de strings para UI
 */
export class Formatters {
  /**
   * Escape HTML para prevenir XSS
   * @param {string} str - String a ser escapada
   * @returns {string} String escapada
   */
  static escapeHtml(str) {
    if (str == null) return "";
    return String(str).replace(/[&<>"']/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char]));
  }

  /**
   * Formata número como moeda brasileira
   * @param {number} value - Valor numérico
   * @param {Object} options - Opções de formatação
   * @returns {string} Valor formatado como moeda
   */
  static formatMoney(value, options = {}) {
    const {
      currency = 'BRL',
      locale = 'pt-BR',
      minimumFractionDigits = 2,
      maximumFractionDigits = 2,
      showSymbol = true
    } = options;

    try {
      const formatter = new Intl.NumberFormat(locale, {
        style: showSymbol ? 'currency' : 'decimal',
        currency: showSymbol ? currency : undefined,
        minimumFractionDigits,
        maximumFractionDigits
      });
      
      return formatter.format(Number(value) || 0);
    } catch (error) {
      // Fallback para formatação manual
      const num = Number(value) || 0;
      const formatted = num.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      return showSymbol ? `R$ ${formatted}` : formatted;
    }
  }

  /**
   * Formata número sem símbolo de moeda
   * @param {number} value - Valor numérico
   * @returns {string} Valor formatado
   */
  static formatNumber(value) {
    return this.formatMoney(value, { showSymbol: false });
  }

  /**
   * Formata data para exibição legível
   * @param {string|Date} date - Data a ser formatada
   * @param {Object} options - Opções de formatação
   * @returns {string} Data formatada
   */
  static formatDate(date, options = {}) {
    const {
      locale = 'pt-BR',
      dateStyle = 'short',
      timeStyle = null,
      weekday = null,
      showTime = false
    } = options;

    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      
      const formatOptions = {
        dateStyle: showTime ? undefined : dateStyle,
        timeStyle: showTime ? (timeStyle || 'short') : undefined,
        weekday
      };

      // Remove undefined values
      Object.keys(formatOptions).forEach(key => {
        if (formatOptions[key] === undefined) {
          delete formatOptions[key];
        }
      });

      return new Intl.DateTimeFormat(locale, formatOptions).format(dateObj);
    } catch (error) {
      // Fallback para formatação manual
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      return dateObj.toLocaleDateString('pt-BR');
    }
  }

  /**
   * Formata data para exibição com dia da semana
   * @param {string|Date} date - Data a ser formatada
   * @returns {string} Data formatada com dia da semana
   */
  static formatDateWithWeekday(date) {
    return this.formatDate(date, { 
      weekday: 'long',
      day: '2-digit',
      month: '2-digit'
    });
  }

  /**
   * Capitaliza primeira letra de uma string
   * @param {string} str - String a ser capitalizada
   * @returns {string} String capitalizada
   */
  static capitalize(str) {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  /**
   * Trunca string com reticências
   * @param {string} str - String a ser truncada
   * @param {number} maxLength - Comprimento máximo
   * @returns {string} String truncada
   */
  static truncate(str, maxLength = 50) {
    if (!str || str.length <= maxLength) return str;
    return str.substring(0, maxLength - 3) + '...';
  }

  /**
   * Remove acentos de uma string
   * @param {string} str - String com acentos
   * @returns {string} String sem acentos
   */
  static removeAccents(str) {
    if (!str) return str;
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  /**
   * Formata CPF
   * @param {string} cpf - CPF sem formatação
   * @returns {string} CPF formatado
   */
  static formatCPF(cpf) {
    if (!cpf) return '';
    const cleanCPF = cpf.replace(/\D/g, '');
    return cleanCPF.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }

  /**
   * Formata telefone brasileiro
   * @param {string} phone - Telefone sem formatação
   * @returns {string} Telefone formatado
   */
  static formatPhone(phone) {
    if (!phone) return '';
    const cleanPhone = phone.replace(/\D/g, '');
    
    if (cleanPhone.length === 10) {
      return cleanPhone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    } else if (cleanPhone.length === 11) {
      return cleanPhone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    
    return phone;
  }

  /**
   * Formata porcentagem
   * @param {number} value - Valor decimal (ex: 0.15 para 15%)
   * @param {number} decimals - Casas decimais
   * @returns {string} Porcentagem formatada
   */
  static formatPercentage(value, decimals = 1) {
    try {
      return new Intl.NumberFormat('pt-BR', {
        style: 'percent',
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      }).format(Number(value) || 0);
    } catch (error) {
      const percent = ((Number(value) || 0) * 100).toFixed(decimals);
      return `${percent}%`;
    }
  }

  /**
   * Formata tamanho de arquivo
   * @param {number} bytes - Tamanho em bytes
   * @returns {string} Tamanho formatado
   */
  static formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Formata duração em segundos para formato legível
   * @param {number} seconds - Duração em segundos
   * @returns {string} Duração formatada
   */
  static formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }
}

// Funções convenientes para compatibilidade
export const escHtml = Formatters.escapeHtml;
export const escapeHtml = Formatters.escapeHtml;
export const formatMoney = Formatters.formatMoney;
export const formatDate = Formatters.formatDate;
export const capitalize = Formatters.capitalize;
export const truncate = Formatters.truncate;

// Para uso global (compatibilidade com código existente)
if (typeof window !== 'undefined') {
  window.Formatters = Formatters;
  window.escHtml = escHtml;
  window.escapeHtml = escapeHtml;
  window.formatMoney = formatMoney;
  window.formatDate = formatDate;
  window.capitalize = capitalize;
  window.truncate = truncate;
}