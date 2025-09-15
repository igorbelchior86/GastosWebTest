// ============================================================================
// 📅 DATE HELPERS MODULE
// ============================================================================
// Funções auxiliares específicas para manipulação de datas
// FASE 3 refatoração - utilitários extraídos do main.js

/**
 * DateHelpers - Utilitários específicos para datas do app
 * 
 * Responsabilidades:
 * - Helpers específicos do contexto da aplicação
 * - Manipulação de datas em português
 * - Formatação contextual de períodos
 * - Cálculos de períodos financeiros
 */
export class DateHelpers {
  /**
   * Obtém período atual no formato "YYYY-MM"
   * @returns {string} Período atual
   */
  static getCurrentPeriod() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  /**
   * Converte período "YYYY-MM" para string legível
   * @param {string} period - Período no formato YYYY-MM
   * @returns {string} Período formatado (ex: "Janeiro 2024")
   */
  static formatPeriod(period) {
    if (!period || typeof period !== 'string') return '';
    
    const [year, month] = period.split('-');
    if (!year || !month) return period;
    
    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    
    const monthIndex = parseInt(month) - 1;
    const monthName = monthNames[monthIndex] || month;
    
    return `${monthName} ${year}`;
  }

  /**
   * Obtém lista de períodos entre duas datas
   * @param {string} startISO - Data inicial (YYYY-MM-DD)
   * @param {string} endISO - Data final (YYYY-MM-DD)
   * @returns {Array<string>} Array de períodos (YYYY-MM)
   */
  static getPeriodsBetween(startISO, endISO) {
    const periods = [];
    const startDate = new Date(startISO);
    const endDate = new Date(endISO);
    
    let currentDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const lastDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
    
    while (currentDate <= lastDate) {
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      periods.push(`${year}-${month}`);
      
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
    
    return periods;
  }

  /**
   * Obtém período anterior
   * @param {string} period - Período atual (YYYY-MM)
   * @returns {string} Período anterior
   */
  static getPreviousPeriod(period) {
    const [year, month] = period.split('-').map(Number);
    
    if (month === 1) {
      return `${year - 1}-12`;
    } else {
      return `${year}-${String(month - 1).padStart(2, '0')}`;
    }
  }

  /**
   * Obtém próximo período
   * @param {string} period - Período atual (YYYY-MM)
   * @returns {string} Próximo período
   */
  static getNextPeriod(period) {
    const [year, month] = period.split('-').map(Number);
    
    if (month === 12) {
      return `${year + 1}-01`;
    } else {
      return `${year}-${String(month + 1).padStart(2, '0')}`;
    }
  }

  /**
   * Verifica se uma data ISO pertence a um período
   * @param {string} iso - Data ISO (YYYY-MM-DD)
   * @param {string} period - Período (YYYY-MM)
   * @returns {boolean} True se a data pertence ao período
   */
  static isInPeriod(iso, period) {
    if (!iso || !period) return false;
    return iso.substring(0, 7) === period;
  }

  /**
   * Extrai período de uma data ISO
   * @param {string} iso - Data ISO (YYYY-MM-DD)
   * @returns {string} Período (YYYY-MM)
   */
  static extractPeriod(iso) {
    if (!iso || typeof iso !== 'string') return '';
    return iso.substring(0, 7);
  }

  /**
   * Calcula diferença em meses entre dois períodos
   * @param {string} period1 - Primeiro período (YYYY-MM)
   * @param {string} period2 - Segundo período (YYYY-MM)
   * @returns {number} Diferença em meses
   */
  static monthsDifference(period1, period2) {
    const [year1, month1] = period1.split('-').map(Number);
    const [year2, month2] = period2.split('-').map(Number);
    
    return (year2 - year1) * 12 + (month2 - month1);
  }

  /**
   * Formata data relativa (hoje, ontem, etc.)
   * @param {string} iso - Data ISO
   * @returns {string} Descrição relativa
   */
  static formatRelativeDate(iso) {
    const today = new Date();
    const targetDate = new Date(iso);
    
    const todayStr = today.toISOString().slice(0, 10);
    
    if (iso === todayStr) {
      return 'Hoje';
    }
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);
    
    if (iso === yesterdayStr) {
      return 'Ontem';
    }
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().slice(0, 10);
    
    if (iso === tomorrowStr) {
      return 'Amanhã';
    }
    
    // Para outras datas, retorna formatação normal
    const options = { 
      day: 'numeric', 
      month: 'short',
      year: targetDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
    };
    
    return targetDate.toLocaleDateString('pt-BR', options);
  }

  /**
   * Obtém lista dos últimos N períodos
   * @param {number} count - Número de períodos
   * @param {string} fromPeriod - Período de referência (opcional, padrão é atual)
   * @returns {Array<string>} Array de períodos
   */
  static getLastPeriods(count, fromPeriod = null) {
    const periods = [];
    let currentPeriod = fromPeriod || this.getCurrentPeriod();
    
    for (let i = 0; i < count; i++) {
      periods.unshift(currentPeriod);
      currentPeriod = this.getPreviousPeriod(currentPeriod);
    }
    
    return periods;
  }

  /**
   * Verifica se é início do mês
   * @param {string} iso - Data ISO
   * @returns {boolean} True se é início do mês (primeiros 5 dias)
   */
  static isStartOfMonth(iso) {
    const day = parseInt(iso.split('-')[2]);
    return day <= 5;
  }

  /**
   * Verifica se é final do mês
   * @param {string} iso - Data ISO
   * @returns {boolean} True se é final do mês (últimos 5 dias)
   */
  static isEndOfMonth(iso) {
    const date = new Date(iso);
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const currentDay = date.getDate();
    
    return (lastDay - currentDay) <= 4;
  }

  /**
   * Obtém trimestre da data
   * @param {string} iso - Data ISO
   * @returns {number} Número do trimestre (1-4)
   */
  static getQuarter(iso) {
    const month = parseInt(iso.split('-')[1]);
    return Math.ceil(month / 3);
  }

  /**
   * Formata trimestre
   * @param {string} iso - Data ISO
   * @returns {string} Trimestre formatado (ex: "Q1 2024")
   */
  static formatQuarter(iso) {
    const year = iso.split('-')[0];
    const quarter = this.getQuarter(iso);
    return `Q${quarter} ${year}`;
  }

  /**
   * Verifica se duas datas são do mesmo trimestre
   * @param {string} iso1 - Primeira data ISO
   * @param {string} iso2 - Segunda data ISO
   * @returns {boolean} True se são do mesmo trimestre
   */
  static isSameQuarter(iso1, iso2) {
    const year1 = iso1.split('-')[0];
    const year2 = iso2.split('-')[0];
    
    if (year1 !== year2) return false;
    
    return this.getQuarter(iso1) === this.getQuarter(iso2);
  }

  /**
   * Obtém dias úteis em um período
   * @param {string} period - Período (YYYY-MM)
   * @returns {number} Número de dias úteis
   */
  static getBusinessDaysInPeriod(period) {
    const [year, month] = period.split('-').map(Number);
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    
    let businessDays = 0;
    let currentDay = new Date(firstDay);
    
    while (currentDay <= lastDay) {
      const dayOfWeek = currentDay.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Não é domingo nem sábado
        businessDays++;
      }
      currentDay.setDate(currentDay.getDate() + 1);
    }
    
    return businessDays;
  }
}

// Funções convenientes para compatibilidade
export const getCurrentPeriod = DateHelpers.getCurrentPeriod;
export const formatPeriod = DateHelpers.formatPeriod;
export const getPreviousPeriod = DateHelpers.getPreviousPeriod;
export const getNextPeriod = DateHelpers.getNextPeriod;
export const isInPeriod = DateHelpers.isInPeriod;
export const extractPeriod = DateHelpers.extractPeriod;

// Para uso global (compatibilidade com código existente)
if (typeof window !== 'undefined') {
  window.DateHelpers = DateHelpers;
  window.getCurrentPeriod = getCurrentPeriod;
  window.formatPeriod = formatPeriod;
  window.getPreviousPeriod = getPreviousPeriod;
  window.getNextPeriod = getNextPeriod;
  window.isInPeriod = isInPeriod;
  window.extractPeriod = extractPeriod;
}