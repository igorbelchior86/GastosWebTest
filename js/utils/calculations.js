// ============================================================================
// 🧮 CALCULATIONS MODULE
// ============================================================================
// Funções de cálculos financeiros e de datas
// FASE 3 refatoração - utilitários extraídos do main.js

/**
 * Calculations - Utilitários de cálculos financeiros e datas
 * 
 * Responsabilidades:
 * - Cálculos de datas (hoje, vencimentos, etc.)
 * - Cálculos de cartões de crédito
 * - Manipulação de datas ISO
 * - Lógica de recorrência
 */
export class Calculations {
  /**
   * Formata data para formato ISO (YYYY-MM-DD) no fuso local
   * @param {Date} date - Data a ser formatada
   * @returns {string} Data no formato ISO
   */
  static formatToISO(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Retorna data de hoje no formato ISO (YYYY-MM-DD)
   * @returns {string} Data de hoje no formato ISO
   */
  static todayISO() {
    return this.formatToISO(new Date());
  }

  /**
   * Calcula data de vencimento para cartão de crédito
   * @param {string} iso - Data da operação (YYYY-MM-DD)
   * @param {string} cardName - Nome do cartão
   * @param {Array} cards - Array de cartões
   * @returns {string} Data de vencimento no formato ISO
   */
  static calculatePostDate(iso, cardName, cards = []) {
    // Dinheiro sempre vence na mesma data
    if (cardName === 'Dinheiro') return iso;
    
    // Buscar cartão
    const card = cards.find(c => c.name === cardName);
    if (!card) return iso;
    
    const [year, month, day] = iso.split('-').map(Number);
    const closingDay = card.close;
    const dueDay = card.due;
    const txDay = day;
    
    let invoiceMonth = month - 1; // JS Date/Month é 0-based
    let invoiceYear = year;
    
    // Se transação foi após fechamento, vai para fatura do mês seguinte
    if (txDay > closingDay) {
      if (invoiceMonth === 11) {
        invoiceMonth = 0;
        invoiceYear += 1;
      } else {
        invoiceMonth += 1;
      }
    }
    
    // Monta data de vencimento da fatura
    return this.formatToISO(new Date(invoiceYear, invoiceMonth, dueDay));
  }

  /**
   * Adiciona anos a uma data ISO
   * @param {string} iso - Data no formato ISO
   * @param {number} years - Número de anos a adicionar
   * @returns {string} Nova data no formato ISO
   */
  static addYearsISO(iso, years) {
    const date = new Date(iso);
    date.setFullYear(date.getFullYear() + years);
    return this.formatToISO(date);
  }

  /**
   * Adiciona meses a uma data ISO
   * @param {string} iso - Data no formato ISO
   * @param {number} months - Número de meses a adicionar
   * @returns {string} Nova data no formato ISO
   */
  static addMonthsISO(iso, months) {
    const date = new Date(iso);
    date.setMonth(date.getMonth() + months);
    return this.formatToISO(date);
  }

  /**
   * Adiciona dias a uma data ISO
   * @param {string} iso - Data no formato ISO
   * @param {number} days - Número de dias a adicionar
   * @returns {string} Nova data no formato ISO
   */
  static addDaysISO(iso, days) {
    const date = new Date(iso);
    date.setDate(date.getDate() + days);
    return this.formatToISO(date);
  }

  /**
   * Calcula diferença em dias entre duas datas
   * @param {string} iso1 - Primeira data ISO
   * @param {string} iso2 - Segunda data ISO
   * @returns {number} Diferença em dias
   */
  static daysDifference(iso1, iso2) {
    const date1 = new Date(iso1);
    const date2 = new Date(iso2);
    const timeDiff = date2.getTime() - date1.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  }

  /**
   * Verifica se duas datas são do mesmo mês
   * @param {string} iso1 - Primeira data ISO
   * @param {string} iso2 - Segunda data ISO
   * @returns {boolean} True se são do mesmo mês
   */
  static isSameMonth(iso1, iso2) {
    const [year1, month1] = iso1.split('-');
    const [year2, month2] = iso2.split('-');
    return year1 === year2 && month1 === month2;
  }

  /**
   * Verifica se é o mesmo dia do mês (para recorrências)
   * @param {string} baseISO - Data base
   * @param {string} testISO - Data para testar
   * @param {number} monthInterval - Intervalo em meses
   * @returns {boolean} True se é o mesmo dia em intervalo correto
   */
  static isSameDayOfMonth(baseISO, testISO, monthInterval = 1) {
    const [baseYear, baseMonth, baseDay] = baseISO.split('-').map(Number);
    const [testYear, testMonth, testDay] = testISO.split('-').map(Number);
    
    if (testDay !== baseDay) return false;
    
    const monthsDiff = (testYear - baseYear) * 12 + (testMonth - baseMonth);
    return monthsDiff % monthInterval === 0;
  }

  /**
   * Obtém primeiro dia do mês
   * @param {string} iso - Data ISO
   * @returns {string} Primeiro dia do mês no formato ISO
   */
  static getFirstDayOfMonth(iso) {
    const [year, month] = iso.split('-');
    return `${year}-${month}-01`;
  }

  /**
   * Obtém último dia do mês
   * @param {string} iso - Data ISO
   * @returns {string} Último dia do mês no formato ISO
   */
  static getLastDayOfMonth(iso) {
    const [year, month] = iso.split('-').map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  }

  /**
   * Obtém nome do mês
   * @param {string} iso - Data ISO
   * @param {boolean} short - Se true, retorna nome abreviado
   * @returns {string} Nome do mês
   */
  static getMonthName(iso, short = false) {
    const date = new Date(iso);
    const options = { month: short ? 'short' : 'long' };
    return date.toLocaleDateString('pt-BR', options);
  }

  /**
   * Obtém nome do dia da semana
   * @param {string} iso - Data ISO
   * @param {boolean} short - Se true, retorna nome abreviado
   * @returns {string} Nome do dia da semana
   */
  static getWeekdayName(iso, short = false) {
    const date = new Date(iso);
    const options = { weekday: short ? 'short' : 'long' };
    return date.toLocaleDateString('pt-BR', options);
  }

  /**
   * Verifica se uma data é fim de semana
   * @param {string} iso - Data ISO
   * @returns {boolean} True se é fim de semana
   */
  static isWeekend(iso) {
    const date = new Date(iso);
    const day = date.getDay();
    return day === 0 || day === 6; // Domingo = 0, Sábado = 6
  }

  /**
   * Obtém próximo dia útil
   * @param {string} iso - Data ISO
   * @returns {string} Próximo dia útil no formato ISO
   */
  static getNextBusinessDay(iso) {
    let date = new Date(iso);
    
    do {
      date.setDate(date.getDate() + 1);
    } while (this.isWeekend(this.formatToISO(date)));
    
    return this.formatToISO(date);
  }

  /**
   * Calcula juros simples
   * @param {number} principal - Valor principal
   * @param {number} rate - Taxa de juros (decimal)
   * @param {number} time - Tempo em períodos
   * @returns {number} Valor com juros
   */
  static simpleInterest(principal, rate, time) {
    return principal * (1 + rate * time);
  }

  /**
   * Calcula juros compostos
   * @param {number} principal - Valor principal
   * @param {number} rate - Taxa de juros (decimal)
   * @param {number} time - Tempo em períodos
   * @returns {number} Valor com juros compostos
   */
  static compoundInterest(principal, rate, time) {
    return principal * Math.pow(1 + rate, time);
  }

  /**
   * Calcula porcentagem
   * @param {number} value - Valor
   * @param {number} total - Total
   * @returns {number} Porcentagem (decimal)
   */
  static calculatePercentage(value, total) {
    if (total === 0) return 0;
    return value / total;
  }

  /**
   * Arredonda valor para múltiplo específico
   * @param {number} value - Valor a arredondar
   * @param {number} multiple - Múltiplo para arredondar
   * @returns {number} Valor arredondado
   */
  static roundToMultiple(value, multiple) {
    return Math.round(value / multiple) * multiple;
  }
}

// Funções convenientes para compatibilidade
export const formatToISO = Calculations.formatToISO;
export const todayISO = Calculations.todayISO;
export const post = (iso, cardName) => {
  // Esta função precisa acessar a lista de cartões
  // Por enquanto, assumimos que `cards` está disponível globalmente
  const cards = typeof window !== 'undefined' && window.cards ? window.cards : [];
  return Calculations.calculatePostDate(iso, cardName, cards);
};
export const addYearsIso = Calculations.addYearsISO;
export const isSameDayOfMonth = Calculations.isSameDayOfMonth;

// Para uso global (compatibilidade com código existente)
if (typeof window !== 'undefined') {
  window.Calculations = Calculations;
  window.formatToISO = formatToISO;
  window.todayISO = todayISO;
  window.post = post;
  window.addYearsIso = addYearsIso;
  window.isSameDayOfMonth = isSameDayOfMonth;
}