/*
 * Legacy global assignments
 *
 * To ease migration from the original monolithic implementation to the
 * refactored module structure, this script imports the new modules and
 * re‑exports selected functions onto the global `window` object. This
 * allows existing code that relies on globals (e.g. main.js, login.view.js)
 * to continue functioning unchanged while new code can import from the
 * modular APIs directly. In the long term, usages of these globals
 * should be refactored away.
 */

import * as date from '../utils/date.js';
import * as data from '../utils/data.js';
import * as format from '../utils/format.js';
import * as dom from '../utils/dom.js';
import * as appState from '../state/appState.js';
import { FirebaseService } from '../services/firebaseService.js';
import { AuthService } from '../services/authService.js';
import * as cache from '../utils/cache.js';
import * as profile from '../utils/profile.js';

// Attach date utilities
if (typeof window !== 'undefined') {
  window.formatToISO = date.formatToISO;
  window.todayISO = date.todayISO;
  // Original code references `post` for card posting date. Delegate to
  // postDateForCard but keep the same signature (opDate, method) by
  // capturing the current cards from appState.
  window.post = function (iso, method) {
    try {
      const cards = appState.getCards();
      return date.postDateForCard(iso, method, cards);
    } catch {
      return iso;
    }
  };
  window.addYearsIso = date.addYearsIso;
  window.isSameDayOfMonth = date.isSameDayOfMonth;
  window.occursOn = date.occursOn;
}

// Attach data utilities
if (typeof window !== 'undefined') {
  window.sanitizeTransactions = function (list) {
    const cards = appState.getCards();
    return data.sanitizeTransactions(list, cards);
  };
  window.validateTransaction = data.validateTransaction;
  window.isDetachedOccurrence = data.isDetachedOccurrence;
  window.isInScrollableModal = data.isInScrollableModal;
  window.generateId = data.generateId;
  window.deepClone = data.deepClone;
  window.sortTransactionsByDate = data.sortTransactionsByDate;
  window.filterTransactionsByDateRange = data.filterTransactionsByDateRange;
  window.calculateTotal = data.calculateTotal;
}

// Attach format utilities
if (typeof window !== 'undefined') {
  window.escHtml = format.escHtml;
  window.currency = format.currency;
  // `fmt` historically formats dates. Delegate to fmtDate for clarity.
  window.fmt = function (d) { return format.fmtDate(d); };
  window.fmtCurrency = format.fmtCurrency;
  window.fmtNumber = format.fmtNumber;
  window.formatDateISO = format.formatDateISO;
  // Derive a display string with optional sign control
  window.formatCurrencyDisplay = function (value, showSign = true) {
    return format.fmtCurrency(value, { showSign: showSign ? undefined : false });
  };
  window.parseCurrency = format.parseCurrency;
  window.meses = format.meses;
  window.mobile = format.isMobile;
}

// Attach DOM utilities
if (typeof window !== 'undefined') {
  window.toggleModal = dom.toggleModal;
  window.showModal = dom.showModal;
  window.hideModal = dom.hideModal;
  window.focusInput = dom.focusInput;
  window.scrollIntoView = dom.scrollIntoView;
  window.setTheme = dom.setTheme;
  window.addListener = dom.addListener;
  window.createElement = dom.createElement;
  window.updateModalOpenState = dom.updateModalOpenState;
  window.isElementVisible = dom.isElementVisible;
}

// Attach state helpers
if (typeof window !== 'undefined') {
  window.getState = appState.getState;
  window.setState = appState.setState;
  window.subscribeState = appState.subscribeState;
  window.setStartBalance = appState.setStartBalance;
  window.getStartBalance = appState.getStartBalance;
  window.setStartDate = appState.setStartDate;
  window.getStartDate = appState.getStartDate;
  window.setStartSet = appState.setStartSet;
  window.getStartSet = appState.getStartSet;
  window.setBootHydrated = appState.setBootHydrated;
  window.isBootHydrated = appState.isBootHydrated;
  window.setTransactions = appState.setTransactions;
  window.getTransactions = appState.getTransactions;
  window.addTransaction = appState.addTransaction;
  window.updateTransaction = appState.updateTransaction;
  window.removeTransaction = appState.removeTransaction;
  window.setCards = appState.setCards;
  window.getCards = appState.getCards;
  window.addCard = appState.addCard;
  window.updateCard = appState.updateCard;
  window.removeCard = appState.removeCard;
  window.resetState = appState.resetState;
  // Also expose proxy for convenience
  window.APP_STATE = appState.appState;
}

// Attach cache helpers
if (typeof window !== 'undefined') {
  window.cacheGet = cache.cacheGet;
  window.cacheSet = cache.cacheSet;
  window.cacheRemove = cache.cacheRemove;
  window.cacheClearProfile = cache.cacheClearProfile;
}

// Attach profile helpers
if (typeof window !== 'undefined') {
  window.getRuntimeProfile = profile.getRuntimeProfile;
  window.getCurrencyName = profile.getCurrencyName;
  window.getCurrentProfileId = profile.getCurrentProfileId;
  window.scopedCacheKey = profile.scopedCacheKey;
  window.scopedDbSegment = profile.scopedDbSegment;
}

// Attach Firebase service
if (typeof window !== 'undefined') {
  window.FirebaseSvc = FirebaseService;
}

// Attach Auth service via a backwards‑compatible wrapper named `Auth`
if (typeof window !== 'undefined') {
  // Wait until AuthService has been initialised before invoking
  const authProxy = {
    async signInWithGoogle() { return AuthService.signInWithGoogle(); },
    async signOut() { return AuthService.signOut(); },
    onReady(cb) {
      // Immediately invoke with current user if available
      try {
        const user = AuthService.getCurrentUser();
        if (typeof cb === 'function') cb(user);
      } catch {
        /* ignore */
      }
      // Also subscribe to future changes
      return AuthService.onAuthChanged(cb);
    },
    get currentUser() { return AuthService.getCurrentUser(); }
  };
  window.Auth = authProxy;
  // Also expose the full service under a more explicit name
  window.AuthService = AuthService;
}