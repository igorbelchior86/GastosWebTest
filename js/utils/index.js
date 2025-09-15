/**
 * Utility modules index
 * Central export point for all utility functions
 * Part of FASE 3 refactoring - modular utilities from main.js
 */

// Re-export all utilities for easy importing
export * from './date-utils.js';
export * from './format-utils.js';
export * from './dom-utils.js';
export * from './data-utils.js';

// Phase 3 - New modular utilities
export * from './formatters.js';
export * from './calculations.js';
export * from './validators.js';
export * from './date-helpers.js';

// Named exports for specific imports (legacy compatibility)
export { 
  formatToISO, 
  todayISO, 
  post, 
  addYearsIso, 
  isSameDayOfMonth, 
  occursOn 
} from './date-utils.js';

export { 
  escHtml, 
  currency, 
  fmt, 
  formatDateISO, 
  formatCurrencyDisplay, 
  parseCurrency, 
  meses, 
  mobile 
} from './format-utils.js';

export { 
  toggleModal, 
  showModal, 
  hideModal, 
  focusInput, 
  scrollIntoView, 
  setTheme, 
  addListener, 
  createElement, 
  updateModalOpenState, 
  isElementVisible 
} from './dom-utils.js';

export { 
  sanitizeTransactions, 
  validateTransaction, 
  isDetachedOccurrence, 
  isInScrollableModal, 
  generateId, 
  deepClone, 
  sortTransactionsByDate, 
  filterTransactionsByDateRange, 
  calculateTotal 
} from './data-utils.js';

// Phase 3 - New utility exports
export {
  Formatters,
  escapeHtml,
  formatMoney,
  formatDate
} from './formatters.js';

export {
  Calculations,
  todayISO as todayISONew,
  post as postNew,
  formatToISO as formatToISONEw
} from './calculations.js';

export {
  Validators,
  sanitizeTransactions as sanitizeTransactionsNew,
  isValidTransaction,
  isValidNumber,
  isValidISODate
} from './validators.js';

export {
  DateHelpers,
  getCurrentPeriod,
  formatPeriod,
  getPreviousPeriod,
  getNextPeriod,
  isInPeriod,
  extractPeriod
} from './date-helpers.js';