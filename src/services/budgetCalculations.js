import { loadBudgets, saveBudgets } from './budgetStorage.js';
import { normalizeISODate } from '../utils/budgetUtils.js';
import { occursOn } from '../utils/date.js';

function isWithinRange(iso, start, end) {
  if (!iso) return false;
  if (start && iso < start) return false;
  // Treat end as INCLUSIVE boundary so the last day of a cycle
  // still contributes to reservations (overlap with next cycle start).
  if (end && iso > end) return false;
  return true;
}

function addDays(iso, days) {
  try { const d = new Date(`${iso}T00:00:00`); d.setDate(d.getDate() + days); return d.toISOString().slice(0,10); } catch (_) { return iso; }
}
function addMonths(iso, months) {
  try { const [y,m,d] = (iso||'').split('-').map(Number); const nx = new Date(y,(m-1)+months,d); return nx.toISOString().slice(0,10);} catch(_) { return iso; }
}
function nextFrom(occurrenceISO, recurrence) {
  switch (String(recurrence||'').trim()) {
    case 'D': return addDays(occurrenceISO, 1);
    case 'W': return addDays(occurrenceISO, 7);
    case 'BW': return addDays(occurrenceISO, 14);
    case 'M': return addMonths(occurrenceISO, 1);
    case 'Q': return addMonths(occurrenceISO, 3);
    case 'S': return addMonths(occurrenceISO, 6);
    case 'Y': { try { const d=new Date(`${occurrenceISO}T00:00:00`); d.setFullYear(d.getFullYear()+1); return d.toISOString().slice(0,10);} catch(_) { return occurrenceISO; } }
    default: return occurrenceISO;
  }
}

function prevFrom(occurrenceISO, recurrence) {
  switch (String(recurrence||'').trim()) {
    case 'D': return addDays(occurrenceISO, -1);
    case 'W': return addDays(occurrenceISO, -7);
    case 'BW': return addDays(occurrenceISO, -14);
    case 'M': return addMonths(occurrenceISO, -1);
    case 'Q': return addMonths(occurrenceISO, -3);
    case 'S': return addMonths(occurrenceISO, -6);
    case 'Y': { try { const d=new Date(`${occurrenceISO}T00:00:00`); d.setFullYear(d.getFullYear()-1); return d.toISOString().slice(0,10);} catch(_) { return occurrenceISO; } }
    default: return occurrenceISO;
  }
}

function computeInitialForRange(transactions, tag, startIso, endIso) {
  if (!Array.isArray(transactions) || !tag) return 0;
  const start = normalizeISODate(startIso);
  const end = normalizeISODate(endIso);
  return transactions.reduce((sum, tx) => {
    if (!tx || tx.budgetTag !== tag) return sum;
    const iso = normalizeISODate(tx.opDate || tx.postDate);
    if (!iso) return sum;
    if (start && iso < start) return sum;
    // end inclusive for cycle window
    if (end && iso > end) return sum;
    const val = Number(tx.val);
    if (!Number.isFinite(val)) return sum;
    return sum + Math.abs(val);
  }, 0);
}

export function spentNoPeriodo(transactions, tag, startDate, endDate, opts = {}) {
  if (!Array.isArray(transactions) || !tag) return 0;
  const start = normalizeISODate(startDate);
  const end = normalizeISODate(endDate);
  const excludeTxId = opts && opts.excludeTxId != null ? String(opts.excludeTxId) : null;
  const excludeISO = opts && typeof opts.excludeISO === 'string' ? normalizeISODate(opts.excludeISO) : null;
  return transactions.reduce((sum, tx) => {
    if (!tx || tx.budgetTag !== tag) return sum;
    if (excludeTxId && String(tx.id) === excludeTxId) return sum; // don't count the trigger transaction
    const baseIso = normalizeISODate(tx.opDate || tx.postDate);
    if (!baseIso || !isWithinRange(baseIso, start, end)) return sum;
    if (excludeISO && baseIso === excludeISO) return sum; // fallback guard by date
    if (tx.planned === true) return sum;
    const val = Number(tx.val);
    if (!Number.isFinite(val)) return sum;
    return sum + Math.abs(val);
  }, 0);
}

export function recomputeBudget(budget, transactions) {
  if (!budget) return null;
  const spentValue = spentNoPeriodo(transactions, budget.tag, budget.startDate, budget.endDate, {
    excludeTxId: budget.triggerTxId != null ? String(budget.triggerTxId) : null,
    excludeISO: budget.triggerTxIso || null,
  });
  const reservedValue = Math.max(Number(budget.initialValue || 0) - spentValue, 0);
  return {
    ...budget,
    spentValue,
    reservedValue,
  };
}

function findCycleStartFor(master, targetISO) {
  try {
    const target = normalizeISODate(targetISO);
    const base = normalizeISODate(master.opDate);
    if (!target || !base) return null;
    const rec = String(master.recurrence || '').trim();
    // Fast path for daily/weekly/bi-weekly: compute start by modulo
    if (rec === 'D' || rec === 'W' || rec === 'BW') {
      const t = new Date(`${target}T00:00:00`);
      const b = new Date(`${base}T00:00:00`);
      const diffDays = Math.floor((t - b) / 864e5);
      const period = rec === 'D' ? 1 : (rec === 'W' ? 7 : 14);
      const remainder = ((diffDays % period) + period) % period;
      const start = new Date(t);
      start.setDate(start.getDate() - remainder);
      const startIso = start.toISOString().slice(0,10);
      // Guard against pre-opDate
      return startIso < base ? base : startIso;
    }
    // Fallback scan for monthly/quarterly/semiannual/annual and exotic patterns
    const limit = 365;
    for (let i = 0; i <= limit; i++) {
      const d = new Date(`${target}T00:00:00`);
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0,10);
      if (!occursOn(master, iso)) continue;
      const prev = new Date(d); prev.setDate(prev.getDate() - 1);
      const prevIso = prev.toISOString().slice(0,10);
      if (!occursOn(master, prevIso)) return iso; // first day of that occurrence
    }
    return null;
  } catch (_) { return null; }
}

export function getReservedTotalForDate(dateISO, transactions) {
  const target = normalizeISODate(dateISO);
  if (!target) return 0;
  const budgets = loadBudgets();
  const shouldDebug = (() => { try { return !!(window && window.__gastos && window.__gastos.debugBudgetReserve); } catch (_) { return false; } })();
  const dbg = shouldDebug ? { date: target, persisted: [], synthetic: [], total: 0 } : null;
  // Helper: compute reserved value AS OF target date for a given window
  const computeReservedAsOf = (tag, startIso, endIso, initialValue, opts = {}) => {
    const start = normalizeISODate(startIso);
    const end = normalizeISODate(endIso);
    const cutoff = (!end || target < end) ? target : end; // spend up to the earlier of target or end
    const spent = spentNoPeriodo(transactions, tag, start, cutoff, {
      excludeTxId: opts.excludeTxId || null,
      excludeISO: opts.excludeISO || null,
    });
    const initial = Number(initialValue) || 0;
    return Math.max(initial - spent, 0);
  };

  // Sum persisted budgets (ad-hoc AND recurring) whose window includes target.
  // We track counted starts to avoid double counting later when walking masters.
  const countedStarts = new Set(); // key = `${tag}|${start}`
  let total = budgets.reduce((acc, budget) => {
    if (!budget || budget.status !== 'active') return acc;
    const start = normalizeISODate(budget.startDate);
    const end = normalizeISODate(budget.endDate);
    if (!isWithinRange(target, start, end)) return acc;
    const reservedAsOf = computeReservedAsOf(budget.tag, start, end, budget.initialValue, {
      excludeTxId: budget.triggerTxId != null ? String(budget.triggerTxId) : null,
      excludeISO: budget.triggerTxIso || null,
    });
    if (shouldDebug) {
      dbg.persisted.push({ tag: budget.tag, start, end, type: budget.budgetType || 'ad-hoc', initial: budget.initialValue, reservedAsOf });
    }
    const key = `${budget.tag}|${start}`;
    countedStarts.add(key);
    return acc + reservedAsOf;
  }, 0);

  // Include synthetic reservation for recurring masters occurring on `target`
  try {
    const txs = Array.isArray(transactions) ? transactions : [];
    // Unique master by tag (prefer the earliest opDate for stability)
    const mastersByTag = new Map();
    (txs || []).forEach((t) => {
      if (!t || !t.recurrence || !t.budgetTag) return;
      const tag = t.budgetTag;
      const prev = mastersByTag.get(tag);
      if (!prev || normalizeISODate(t.opDate) < normalizeISODate(prev.opDate)) mastersByTag.set(tag, t);
    });
    const masters = Array.from(mastersByTag.values());
    // Avoid double counting: track which cycle starts already
    // exist as persisted budgets for each tag.
    const persistedStartsByTag = new Map();
    (budgets || []).forEach((b) => {
      if (!b || b.status !== 'active' || !b.tag) return;
      const s = normalizeISODate(b.startDate);
      if (!s) return;
      if (!persistedStartsByTag.has(b.tag)) persistedStartsByTag.set(b.tag, new Set());
      persistedStartsByTag.get(b.tag).add(s);
    });
    masters.forEach((m) => {
      const tag = m.budgetTag;
      if (!tag) return;
      const persistedStarts = persistedStartsByTag.get(tag);
      // Accumulate ALL cycles that have started up to target (step function):
      // ... start_k ≤ target. This matches the requirement of deducting on
      // every cycle start day and never “giving back” on end.
      let start = findCycleStartFor(m, target);
      if (!start) start = normalizeISODate(m.opDate);
      const visited = new Set();
      const safety = 520; // up to 10 years of weekly cycles
      for (let i = 0; i < safety && start && normalizeISODate(start) >= normalizeISODate(m.opDate); i++) {
        if (normalizeISODate(start) > target) break;
        const key = `${tag}|${start}`;
        if (visited.has(key)) break; visited.add(key);
        if (!(persistedStarts && persistedStarts.has(start))) {
          const next = nextFrom(start, m.recurrence) || start;
          const initial = computeInitialForRange(txs, tag, start, next) || Math.abs(Number(m.val) || 0);
          // Spend only up to the earlier of target or cycle end
          const reserved = computeReservedAsOf(tag, start, next, initial, { excludeTxId: m.id != null ? String(m.id) : null, excludeISO: start });
          if (shouldDebug) { dbg.synthetic.push({ tag, start, end: next, initial, reservedAsOf: reserved }); }
          total += reserved;
        } else {
          // Persisted exists for this cycle. We already counted it above.
          // Guard against double counting when a master exists.
          const key = `${tag}|${start}`;
          if (shouldDebug && countedStarts.has(key)) {
            dbg.persisted.push({ tag, start, from: 'persisted:skipped-dup' });
          }
          // no-op
        }
        // move to previous cycle
        start = prevFrom(start, m.recurrence);
      }
    });
  } catch (_) {}

  if (shouldDebug) {
    try {
      dbg.total = total;
      // eslint-disable-next-line no-console
      console.groupCollapsed(`[reserve] ${target} total=${total}`);
      // eslint-disable-next-line no-console
      console.table({ total });
      if (dbg.persisted.length) { console.log('persisted', dbg.persisted); }
      if (dbg.synthetic.length) { console.log('synthetic', dbg.synthetic); }
      console.groupEnd();
    } catch (_) {}
  }
  return total;
}

export function refreshBudgetCache(transactions) {
  const budgets = loadBudgets();
  const updated = budgets.map((budget) => {
    if (!budget || budget.status !== 'active') return budget;
    return recomputeBudget(budget, transactions) || budget;
  });
  saveBudgets(updated);
  return updated;
}
