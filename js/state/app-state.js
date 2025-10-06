/**
 * Central application state helpers.
 * Inicialmente cobre os campos do fluxo de "Saldo inicial" e boot.
 * A estrutura permite evoluções futuras (transactions, cards, etc.).
 */

const defaultState = {
  startBalance: null,
  startDate: null,
  startSet: false,
  bootHydrated: false
};

// Extend defaults for future state (transactions/cards)
defaultState.transactions = [];
defaultState.cards = [];

const state = { ...defaultState };
const subscribers = new Set();

function emit(changedKeys) {
  if (!changedKeys || !changedKeys.length) return;
  subscribers.forEach(fn => {
    try { fn({ changedKeys, state }); }
    catch (err) { console.error('State subscriber failed', err); }
  });
}

export function getState() {
  return state;
}

export function setState(patch = {}, options = {}) {
  const changed = [];
  Object.keys(patch).forEach(key => {
    if (!(key in state)) return;
    if (state[key] === patch[key]) return;
    state[key] = patch[key];
    changed.push(key);
  });
  if (changed.length && options.emit !== false) emit(changed);
  return state;
}

export function subscribeState(fn) {
  if (typeof fn !== 'function') return () => {};
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

export function getStartBalance() {
  return state.startBalance;
}

export function setStartBalance(value, options = {}) {
  if (state.startBalance === value) return state.startBalance;
  state.startBalance = value;
  if (options.emit !== false) emit(['startBalance']);
  return state.startBalance;
}

export function getStartDate() {
  return state.startDate;
}

export function setStartDate(value, options = {}) {
  if (state.startDate === value) return state.startDate;
  state.startDate = value;
  if (options.emit !== false) emit(['startDate']);
  return state.startDate;
}

export function getStartSet() {
  return state.startSet;
}

export function setStartSet(value, options = {}) {
  if (state.startSet === value) return state.startSet;
  state.startSet = value;
  if (options.emit !== false) emit(['startSet']);
  return state.startSet;
}

export function isBootHydrated() {
  return state.bootHydrated;
}

export function setBootHydrated(value, options = {}) {
  if (state.bootHydrated === value) return state.bootHydrated;
  state.bootHydrated = value;
  if (options.emit !== false) emit(['bootHydrated']);
  return state.bootHydrated;
}

// Transactions API
export function getTransactions() {
  return state.transactions || [];
}

export function setTransactions(list = [], options = {}) {
  const normalized = Array.isArray(list) ? list.slice() : [];
  if (JSON.stringify(state.transactions) === JSON.stringify(normalized)) return state.transactions;
  state.transactions = normalized;
  if (options.emit !== false) emit(['transactions']);
  // Backwards-compatibility: keep legacy global and hooks in sync immediately.
  try {
    if (typeof window !== 'undefined') {
      try { window.transactions = state.transactions; } catch (_) {}
      try { if (typeof window.onTransactionsUpdated === 'function') window.onTransactionsUpdated(state.transactions); } catch (_) {}
    }
  } catch (_) {}
  return state.transactions;
}

export function addTransaction(tx, options = {}) {
  if (!tx) return null;
  const arr = Array.isArray(state.transactions) ? state.transactions.slice() : [];
  arr.push(tx);
  state.transactions = arr;
  if (options.emit !== false) emit(['transactions']);
  return tx;
}

export function updateTransaction(id, patch = {}, options = {}) {
  if (!id) return null;
  const arr = Array.isArray(state.transactions) ? state.transactions.slice() : [];
  let found = null;
  for (let i = 0; i < arr.length; i++) {
    const t = arr[i];
    if (t && String(t.id) === String(id)) {
      const updated = { ...t, ...patch };
      arr[i] = updated;
      found = updated;
      break;
    }
  }
  if (found) {
    state.transactions = arr;
    if (options.emit !== false) emit(['transactions']);
  }
  return found;
}

export function removeTransaction(id, options = {}) {
  if (!id) return false;
  const arr = Array.isArray(state.transactions) ? state.transactions.slice() : [];
  const next = arr.filter(t => !(t && String(t.id) === String(id)));
  const changed = next.length !== arr.length;
  if (changed) {
    state.transactions = next;
    if (options.emit !== false) emit(['transactions']);
  }
  return changed;
}

// Cards API
export function getCards() {
  return state.cards || [];
}

export function setCards(list = [], options = {}) {
  const normalized = Array.isArray(list) ? list.slice() : [];
  if (JSON.stringify(state.cards) === JSON.stringify(normalized)) return state.cards;
  state.cards = normalized;
  if (options.emit !== false) emit(['cards']);
  return state.cards;
}

export function addCard(card, options = {}) {
  if (!card) return null;
  const arr = Array.isArray(state.cards) ? state.cards.slice() : [];
  arr.push(card);
  state.cards = arr;
  if (options.emit !== false) emit(['cards']);
  return card;
}

export function updateCard(nameOrIndex, patch = {}, options = {}) {
  if (!nameOrIndex) return null;
  const arr = Array.isArray(state.cards) ? state.cards.slice() : [];
  let found = null;
  for (let i = 0; i < arr.length; i++) {
    const c = arr[i];
    if (!c) continue;
    if ((typeof nameOrIndex === 'number' && i === nameOrIndex) || (typeof nameOrIndex !== 'number' && String(c.name) === String(nameOrIndex))) {
      const updated = { ...c, ...patch };
      arr[i] = updated;
      found = updated;
      break;
    }
  }
  if (found) {
    state.cards = arr;
    if (options.emit !== false) emit(['cards']);
  }
  return found;
}

export function removeCard(nameOrIndex, options = {}) {
  const arr = Array.isArray(state.cards) ? state.cards.slice() : [];
  let next;
  if (typeof nameOrIndex === 'number') {
    next = arr.slice();
    next.splice(nameOrIndex, 1);
  } else {
    next = arr.filter(c => !(c && String(c.name) === String(nameOrIndex)));
  }
  const changed = JSON.stringify(next) !== JSON.stringify(arr);
  if (changed) {
    state.cards = next;
    if (options.emit !== false) emit(['cards']);
  }
  return changed;
}

export function resetState(options = {}) {
  const changed = [];
  Object.keys(state).forEach(key => {
    if (state[key] === defaultState[key]) return;
    state[key] = defaultState[key];
    changed.push(key);
  });
  if (changed.length && options.emit !== false) emit(changed);
  return state;
}

export const appState = new Proxy(state, {
  get(target, prop) {
    if (prop === 'bootHydrated') return target.bootHydrated;
    if (prop in target) return target[prop];
    return undefined;
  },
  set(target, prop, value) {
    if (!(prop in target)) return false;
    const current = target[prop];
    if (current === value) return true;
    target[prop] = value;
    emit([prop]);
    return true;
  }
});

if (typeof window !== 'undefined') {
  window.APP_STATE = appState;
}

// Backwards-compatibility: expose commonly used helpers to the global scope
// so non-module legacy code (e.g. main.js) can keep calling them.
if (typeof window !== 'undefined') {
  try {
    window.getState = getState;
    window.setState = setState;

    window.getTransactions = getTransactions;
    window.setTransactions = setTransactions;
    window.addTransaction = addTransaction;
    window.updateTransaction = updateTransaction;
    window.removeTransaction = removeTransaction;

    window.getCards = getCards;
    window.setCards = setCards;
    window.addCard = addCard;
    window.updateCard = updateCard;
    window.removeCard = removeCard;

    window.subscribeState = subscribeState;
  } catch (e) {
    // non-fatal; keep runtime resilient
    console && console.warn && console.warn('Failed to attach app-state globals', e);
  }
}
