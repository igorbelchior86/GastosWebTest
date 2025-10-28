import { loadBudgets, saveBudgets } from './budgetStorage.js';
import { normalizeISODate } from '../utils/budgetUtils.js';
import { save as fbSave } from './firebaseService.js';

function iso(dateLike){
  try{
    if(!dateLike) return null;
    if(typeof dateLike === 'string') return dateLike.slice(0,10);
    return new Date(dateLike).toISOString().slice(0,10);
  } catch(_) { return null; }
}

function inRange(isoDate, startISO, endISO){
  if(!isoDate) return false;
  if(startISO && isoDate < startISO) return false;
  if(endISO && isoDate > endISO) return false;
  return true;
}

function sameKey(a, b){
  if (!a || !b) return false;
  const tagA = String(a.tag||'').trim();
  const tagB = String(b.tag||'').trim();
  const typeA = String(a.budgetType||'');
  const typeB = String(b.budgetType||'');
  const sA = iso(a.startDate); const eA = iso(a.endDate);
  const sB = iso(b.startDate); const eB = iso(b.endDate);
  return tagA === tagB && typeA === typeB && sA === sB && eA === eB;
}

export function removeBudget(budget){
  if (!budget) return { removed:false };
  const list = loadBudgets();
  const next = list.filter(b => {
    if (!b) return false; // prune nulls defensively
    if (b.id && budget.id && String(b.id) === String(budget.id)) return false;
    if (sameKey(b, budget)) return false;
    return true;
  });
  saveBudgets(next);
  return { removed: list.length !== next.length };
}

export function removeAdHocBudget(budget, options = {}){
  const { unlinkOps = false, getTransactions, setTransactions } = options;
  if (!budget) return { removed:false };
  // Remove by id/semantic key for resilience
  const { removed } = removeBudget(budget);

  // Optionally unlink transactions inside the window and remove the trigger TX (it is not real)
  if (unlinkOps && typeof getTransactions === 'function' && typeof setTransactions === 'function'){
    const txs = getTransactions() || [];
    const s = iso(budget.startDate);
    const e = iso(budget.endDate);
    const tag = String(budget.tag || '').trim();
    // First, unlink transactions inside the window
    const updated = txs.map(t => {
      try {
        if (!t || t.budgetTag !== tag) return t;
        const d = iso(t.opDate || t.postDate);
        if (!inRange(d, s, e)) return t;
        const nt = { ...t };
        delete nt.budgetTag;
        return nt;
      } catch(_) { return t; }
    });
    // Then, remove the trigger transaction unconditionally (it represents only the reservation)
    const pruned = updated.filter(t => {
      try {
        if (!t) return true;
        if (budget.triggerTxId && String(t.id) === String(budget.triggerTxId)) return false;
        // Fallback match by trigger ISO + tag when id is unavailable
        const trigISO = iso(budget.triggerTxIso);
        if (trigISO) {
          const d = iso(t.opDate || t.postDate);
          if (d === trigISO && String(t.budgetTag || '') === tag) return false;
        }
        return true;
      } catch(_) { return true; }
    });
    setTransactions(pruned);
    try { fbSave('tx', pruned); } catch(_) {}
  }
  return { removed };
}

export function closeRecurringBudget(budget){
  if(!budget || budget.budgetType !== 'recurring') return { closed:false };
  const list = loadBudgets();
  const next = list.map(b => {
    if (!b || b.id !== budget.id) return b;
    return { ...b, status: 'closed' };
  });
  saveBudgets(next);
  return { closed:true };
}

export function endRecurrence(budget, options = {}){
  const { getTransactions, setTransactions } = options;
  if (!getTransactions || !setTransactions) return { ended:false };
  const tag = String(budget?.tag || '').trim();
  const txs = getTransactions() || [];
  const today = new Date().toISOString().slice(0,10);
  let changed = false;
  const updated = txs.map(t => {
    if (!t) return t;
    const isMaster = !!(t.recurrence && String(t.recurrence).trim());
    if (!isMaster) return t;
    // match by id hints or by tag
    const matchId = (budget?.recurrenceId && String(t.id) === String(budget.recurrenceId))
      || (budget?.triggerTxId && String(t.id) === String(budget.triggerTxId));
    const matchTag = tag && t.budgetTag === tag;
    if (matchId || matchTag){
      changed = true;
      return { ...t, recurrenceEnd: today };
    }
    return t;
  });
  if (changed){
    setTransactions(updated);
    try { fbSave('tx', updated); } catch(_) {}
  }
  return { ended: changed };
}

/**
 * Update the initialValue (reservation) of the current recurring cycle budget.
 * @param {object} budget Recurring budget record (status=active)
 * @param {number} newInitial New reservation value
 */
export function updateRecurringCycleValue(budget, newInitial){
  if (!budget || budget.budgetType !== 'recurring') return { updated:false };
  const val = Number(newInitial);
  if (!Number.isFinite(val) || val < 0) return { updated:false };
  const list = loadBudgets();
  const updated = list.map(b => {
    if (!b || b.id !== budget.id) return b;
    return { ...b, initialValue: val };
  });
  saveBudgets(updated);
  return { updated:true };
}

/**
 * Update an ad‑hoc budget fields and optionally migrate operations in the
 * new period to the (possibly) new tag.
 *
 * @param {object} budget The original budget object (must be ad-hoc)
 * @param {object} changes { tag?, startDate?, endDate?, initialValue? }
 * @param {object} options { migrateOps?:boolean, getTransactions?, setTransactions? }
 */
export function updateAdHocBudget(budget, changes = {}, options = {}){
  if (!budget || budget.budgetType !== 'ad-hoc') return { updated:false };
  const list = loadBudgets();
  const idx = list.findIndex(b => b && b.id === budget.id);
  if (idx < 0) return { updated:false };

  const next = { ...list[idx] };
  const oldTag = String(next.tag || '').trim();
  const newTag = changes.tag != null ? String(changes.tag).replace(/^#+/, '').trim() : oldTag;
  const newStart = changes.startDate != null ? normalizeISODate(changes.startDate) : normalizeISODate(next.startDate);
  const newEnd   = changes.endDate   != null ? normalizeISODate(changes.endDate)   : normalizeISODate(next.endDate);
  const newInitial = (changes.initialValue != null) ? Number(changes.initialValue) : Number(next.initialValue || 0);

  // simple guards
  if (newStart && newEnd && newStart > newEnd) {
    // swap if inverted
    next.startDate = newEnd; next.endDate = newStart;
  } else {
    next.startDate = newStart; next.endDate = newEnd;
  }
  next.tag = newTag;
  if (Number.isFinite(newInitial)) next.initialValue = Math.max(0, newInitial);
  list[idx] = next;
  saveBudgets(list);

  const { migrateOps = false, getTransactions, setTransactions } = options;
  if (migrateOps && typeof getTransactions === 'function' && typeof setTransactions === 'function'){
    const txs = getTransactions() || [];
    const s = iso(next.startDate);
    const e = iso(next.endDate);
    const updated = txs.map(t => {
      try{
        if (!t) return t;
        const dateIso = iso(t.opDate || t.postDate);
        if (!inRange(dateIso, s, e)) return t;
        if (String(t.budgetTag || '') !== oldTag) return t;
        return { ...t, budgetTag: newTag };
      } catch(_) { return t; }
    });
    setTransactions(updated);
    try { fbSave('tx', updated); } catch(_) {}
  }
  return { updated:true, budget: next };
}

/**
 * Remove a recurring budget and unlink the recurrence master from the budget system.
 * This ensures all budget cards (including synthetic future cycles) disappear and
 * the balance stops reserving amounts for this tag.
 *
 * @param {object} budget Recurring budget to remove (expects budgetType === 'recurring')
 * @param {object} options { getTransactions?, setTransactions? } to persist unlinking the master
 */
export function removeRecurringBudget(budget, options = {}) {
  if (!budget || budget.budgetType !== 'recurring') return { removed: false };
  const { getTransactions, setTransactions } = options || {};
  // 1) Remove the persisted budget record
  const { removed } = removeBudget(budget);
  // 2) Remove the trigger transaction (recurring master) so no synthetic budgets are generated
  if (typeof getTransactions === 'function' && typeof setTransactions === 'function') {
    try {
      const tag = String(budget.tag || '').trim();
      const txs = getTransactions() || [];
      let changed = false;
      const updated = txs.filter((t) => {
        if (!t) return false;
        // Remove the exact trigger transaction by id when available
        if (budget.triggerTxId && String(t.id) === String(budget.triggerTxId)) { changed = true; return false; }
        // Fallback: remove a recurring master with same tag that starts on triggerTxIso
        const isMaster = !!(t.recurrence && String(t.recurrence).trim());
        if (isMaster && t.budgetTag === tag) {
          const trigISO = iso(budget.triggerTxIso);
          const tISO = iso(t.opDate || t.postDate);
          if (trigISO && tISO === trigISO) { changed = true; return false; }
        }
        return true;
      });
      if (changed) {
        setTransactions(updated);
        try { fbSave('tx', updated); } catch (_) {}
      }
    } catch (_) { /* ignore unlink errors */ }
  }
  return { removed };
}
