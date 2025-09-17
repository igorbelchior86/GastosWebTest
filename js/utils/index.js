/**
 * Utility modules index
 * Central export point for all utility functions
 * Part of FASE 1 refactoring - extracting utilities from main.js
 */

// Re-export all utilities for easy importing
export * from './date-utils.js';
export * from './format-utils.js';
export * from './dom-utils.js';
export * from './data-utils.js';

// Named exports for specific imports
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