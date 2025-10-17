// Accordion UI rendering logic extracted from main.js
// This module encapsulates the calculation of running balances and
// construction of the month/day/invoice accordion. It receives all
// dependencies via the config object passed to `initAccordion` and
// exposes a `renderAccordion` function used by the main application.

import { formatToISO, todayISO, occursOn } from '../utils/date.js';
import { postDateForCard } from '../utils/date.js';
import { getMonthCache, setMonthCache, getCurrentMonth, isMonthStale } from '../utils/monthlyCache.js';
import { syncCurrentMonth, smartSync } from '../utils/deltaSync.js';
import { loadBudgets } from '../services/budgetStorage.js';
import { recomputeBudget } from '../services/budgetCalculations.js';

/**
 * Initialize the accordion renderer.
 *
 * @param {Object} config Configuration object providing dependencies.
 * @param {HTMLElement} config.acc The accordion DOM element.
 * @param {Function} config.getTransactions Optional function to return the current transaction list.
 * @param {Array} config.transactions Fallback array of transactions if getTransactions is not provided.
 * @param {Array} config.cards Initial list of card objects used to determine invoice cycles.
 * @param {Function} [config.getCards] Optional getter returning the latest cards array.
 * @param {Object} config.state Application state containing startDate and startBalance.
 * @param {Function} config.calculateDateRange Function that returns the min and max ISO date strings.
 * @param {number} config.VIEW_YEAR The currently selected year to render.
 * @param {Function} [config.getViewYear] Optional getter that returns the current view year.
 * @param {Function} config.txByDate Function that returns transactions on a given ISO date.
 * @param {Function} config.safeFmtCurrency Function to format currency values.
 * @param {Array} config.SALARY_WORDS Array of words used to detect salary transactions.
 * @param {Function} config.makeLine Helper that renders a transaction row (swipe-enabled).
 * @returns {{renderAccordion: Function}} Object exposing the renderAccordion function.
 */
export function initAccordion(config) {
  const {
    acc,
    getTransactions,
    transactions,
    cards: initialCards = [],
    getCards,
    state,
    calculateDateRange,
    VIEW_YEAR,
    getViewYear,
    txByDate,
    safeFmtCurrency,
    SALARY_WORDS,
    makeLine,
    getReservedTotalForDate,
    isBudgetsFeatureEnabled,
  } = config;

  // Inject polished styles for budget cards rendered inside the accordion
  ensureBudgetCardStyles();
  const resolveViewYear = () => {
    if (typeof getViewYear === 'function') {
      const dynamicYear = Number(getViewYear());
      if (Number.isFinite(dynamicYear)) return dynamicYear;
    }
    const fallbackYear = Number(VIEW_YEAR);
    if (Number.isFinite(fallbackYear)) return fallbackYear;
    return new Date().getFullYear();
  };

  const resolveReservedTotalForDate =
    typeof getReservedTotalForDate === 'function'
      ? getReservedTotalForDate
      : () => 0;

  const resolveBudgetsFeatureEnabled =
    typeof isBudgetsFeatureEnabled === 'function'
      ? isBudgetsFeatureEnabled
      : () => false;

  function getReservedAdjustmentForDate(iso) {
    if (!iso || !resolveBudgetsFeatureEnabled()) return 0;
    try {
      const txs = typeof getTransactions === 'function' ? getTransactions() : transactions || [];
      const raw = resolveReservedTotalForDate(iso, txs);
      const numeric = typeof raw === 'number' ? raw : Number(raw);
      return Number.isFinite(numeric) ? numeric : 0;
    } catch (_) {
      return 0;
    }
  }

  function normalizeBudgetDate(value) {
    if (!value) return null;
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    const str = String(value).trim();
    if (!str) return null;
    const match = str.match(/^(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : null;
  }

  function formatDayMonth(iso) {
    if (!iso) return '';
    try {
      const date = new Date(`${iso}T00:00:00`);
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    } catch (_) {
      return iso;
    }
  }

  function computeInitialValueForRange(transactionsList, tag, startIso, endIso) {
    if (!Array.isArray(transactionsList) || !tag) return 0;
    const start = normalizeBudgetDate(startIso);
    const end = normalizeBudgetDate(endIso);
    return transactionsList.reduce((sum, tx) => {
      if (!tx || tx.budgetTag !== tag) return sum;
      const iso = normalizeBudgetDate(tx.opDate || tx.postDate);
      if (!iso) return sum;
      if (start && iso < start) return sum;
      if (end && iso >= end) return sum;
      const val = Number(tx.val);
      if (!Number.isFinite(val)) return sum;
      return sum + Math.abs(val);
    }, 0);
  }

  function computeSpentForRange(transactionsList, tag, startIso, endIso) {
    if (!Array.isArray(transactionsList) || !tag) return 0;
    const start = normalizeBudgetDate(startIso);
    const end = normalizeBudgetDate(endIso);
    return transactionsList.reduce((sum, tx) => {
      if (!tx || tx.budgetTag !== tag) return sum;
      if (tx.planned === true) return sum;
      const iso = normalizeBudgetDate(tx.opDate || tx.postDate);
      if (!iso) return sum;
      if (start && iso < start) return sum;
      if (end && iso >= end) return sum;
      const val = Number(tx.val);
      if (!Number.isFinite(val)) return sum;
      return sum + Math.abs(val);
    }, 0);
  }

  function findNextOccurrence(master, afterIso) {
    if (!master || !afterIso) return null;
    const maxScan = 365;
    for (let offset = 1; offset <= maxScan; offset++) {
      const date = new Date(`${afterIso}T00:00:00`);
      date.setDate(date.getDate() + offset);
      const iso = date.toISOString().slice(0, 10);
      try {
        if (occursOn(master, iso)) return iso;
      } catch (_) {
        /* ignore */
      }
    }
    return null;
  }

  function buildBudgetDisplayMap(list, txs) {
    const map = new Map();
    const mastersById = new Map();
    (txs || []).forEach((tx) => {
      if (tx && tx.recurrence) {
        mastersById.set(String(tx.id), tx);
      }
    });

    const addBudget = (budget) => {
      if (!budget) return;
      const key = normalizeBudgetDate(budget.startDate);
      if (!key) return;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(budget);
    };

    (list || []).forEach((budget) => {
      if (!budget || budget.status !== 'active') return;
      addBudget(budget);
    });
    (list || []).forEach((budget) => {
      if (!budget || budget.status !== 'active' || budget.budgetType !== 'recurring') return;
      const master = budget.recurrenceId != null ? mastersById.get(String(budget.recurrenceId)) : null;
      if (!master) return;
      let start = normalizeBudgetDate(budget.endDate);
      const cyclesLimit = 4;
      for (let i = 0; i < cyclesLimit && start; i++) {
        const next = findNextOccurrence(master, start);
        if (!next) break;
        const initial = computeInitialValueForRange(txs, budget.tag, start, next) || Number(budget.initialValue || 0);
        const synthetic = {
          ...budget,
          id: `${budget.id || budget.tag || 'budget'}__future_${i + 1}`,
          startDate: start,
          endDate: next,
          initialValue: initial,
          reservedValue: initial,
          spentValue: 0,
          triggerTxId: master.id != null ? String(master.id) : null,
          triggerTxIso: start,
          status: 'future',
          isSynthetic: true,
        };
        addBudget(synthetic);
        start = next;
      }
    });
    return map;
  }

  function deriveFallbackBudgetsForDay(iso, txs, budgetTriggerIds, budgetTriggersByIso, dayTx, triggerSet) {
    const results = [];
    const prev = (() => { const d = new Date(`${iso}T00:00:00`); d.setDate(d.getDate()-1); return d.toISOString().slice(0,10); })();
    const masters = (txs || []).filter(t => t && t.recurrence && t.budgetTag);
    for (const master of masters) {
      try {
        if (!occursOn(master, iso)) continue;
        if (occursOn(master, prev)) continue; // not start of cycle
        const next = findNextOccurrence(master, iso) || iso;
        const tag = master.budgetTag;
        const initial = computeInitialValueForRange(txs, tag, iso, next);
        const spent = computeSpentForRange(txs, tag, iso, next);
        const synthetic = {
          id: `${master.id || tag}_fb_${iso}`,
          tag,
          budgetType: 'recurring',
          status: 'active',
          startDate: iso,
          endDate: next,
          initialValue: initial,
          reservedValue: Math.max(initial - spent, 0),
          spentValue: spent,
          recurrenceId: master.id != null ? String(master.id) : null,
          triggerTxId: master.id != null ? String(master.id) : null,
          triggerTxIso: iso,
          isSynthetic: true,
        };
        results.push(synthetic);
        // Mark a concrete transaction on this day as the trigger so lists can hide it
        if (triggerSet && Array.isArray(dayTx)) {
          const trig = dayTx.find(t => t && t.budgetTag === tag);
          if (trig) {
            try { triggerSet.add(trig); } catch (_) {}
          }
        }
        if (budgetTriggerIds) budgetTriggerIds.add(String(master.id));
        if (budgetTriggersByIso) {
          if (!budgetTriggersByIso.has(iso)) budgetTriggersByIso.set(iso, []);
          budgetTriggersByIso.get(iso).push({ tag, id: master.id != null ? String(master.id) : null });
        }
      } catch (_) { /* ignore */ }
    }
    return results;
  }

  function findTriggerTransaction(budget, dayTransactions) {
    if (!budget || !Array.isArray(dayTransactions)) return null;
    const tag = budget.tag;
    if (!tag) return null;
    if (budget.triggerTxId != null) {
      const targetId = String(budget.triggerTxId);
      const byId = dayTransactions.find((tx) => tx && String(tx.id) === targetId);
      if (byId) return byId;
    }
    const startISO = normalizeBudgetDate(budget.startDate);
    const triggerISO = normalizeBudgetDate(budget.triggerTxIso);
    return dayTransactions.find((tx) => {
      if (!tx) return false;
      if (tx.budgetTag !== tag) return false;
      const txDate = normalizeBudgetDate(tx.opDate);
      if (triggerISO && txDate === triggerISO) return true;
      return txDate === startISO;
    }) || null;
  }

  function createBudgetCardElement(budget, dayTransactions, triggerSet) {
    const card = document.createElement('div');
    card.className = 'budget-card op-line';
    card.dataset.cardType = 'budget';

    const header = document.createElement('div');
    header.className = 'budget-card__header';
    header.style.display = 'flex';
    header.style.flexDirection = 'column';
    header.style.gap = '2px';

    const titleRow = document.createElement('div');
    titleRow.style.display = 'flex';
    titleRow.style.justifyContent = 'space-between';
    titleRow.style.alignItems = 'center';

    const tagLabel = document.createElement('span');
    tagLabel.className = 'budget-card__tag';
    tagLabel.textContent = budget.tag || '#orçamento';
    tagLabel.style.fontWeight = '600';

    const periodLabel = document.createElement('span');
    periodLabel.className = 'budget-card__period';
    periodLabel.style.fontSize = '0.85em';
    periodLabel.style.color = 'var(--text-secondary, #b3b3b3)';
    const start = formatDayMonth(normalizeBudgetDate(budget.startDate));
    const end = formatDayMonth(normalizeBudgetDate(budget.endDate));
    const totalValue = safeFmtCurrency(Number(budget.initialValue || 0));
    periodLabel.textContent = `${start} até ${end} · ${totalValue}`;

    titleRow.appendChild(tagLabel);
    titleRow.appendChild(periodLabel);

    const meta = document.createElement('div');
    meta.className = 'budget-card__meta';
    meta.style.fontSize = '0.85em';
    meta.style.color = 'var(--text-secondary, #b3b3b3)';
    const triggerTx = findTriggerTransaction(budget, dayTransactions);
    if (triggerTx && triggerSet) {
      try { triggerSet.add(triggerTx); } catch (_) {}
    }
    let timeLabel = 'Orçamento';
    if (triggerTx && triggerTx.ts) {
      try {
        const time = new Date(triggerTx.ts);
        const formatted = time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });
        timeLabel = `${formatted} – Orçamento`;
      } catch (_) {}
    }
    meta.textContent = timeLabel;

    header.appendChild(titleRow);
    header.appendChild(meta);

    const details = document.createElement('div');
    details.className = 'budget-card__details';
    details.style.display = 'flex';
    details.style.justifyContent = 'space-between';
    details.style.marginTop = '12px';
    details.style.fontSize = '0.85em';

    // Match Panorama card logic exactly: compute period spending on UI,
    // ignoring only the trigger (reserva) by id; end is inclusive.
    const allTxs = (typeof getTransactions === 'function' ? getTransactions() : transactions) || [];
    const trigId = budget && budget.triggerTxId != null ? String(budget.triggerTxId) : null;
    const startIso = normalizeBudgetDate(budget.startDate);
    const endIso   = normalizeBudgetDate(budget.endDate);
    const spentValue = (allTxs || []).reduce((sum, tx) => {
      if (!tx || tx.budgetTag !== budget.tag) return sum;
      if (trigId && String(tx.id) === trigId) return sum; // não contar a reserva
      if (tx.planned === true) return sum;
      const iso = normalizeBudgetDate(tx.opDate || tx.postDate);
      if (!iso) return sum;
      if (startIso && iso < startIso) return sum;
      if (endIso && iso > endIso) return sum;
      const v = Number(tx.val);
      if (!Number.isFinite(v)) return sum;
      return sum + Math.abs(v);
    }, 0);
    const totalForCard = Number(budget.initialValue || 0);
    const reservedValue = Math.max(totalForCard - spentValue, 0);

    const spentLabel = document.createElement('span');
    spentLabel.textContent = `Gasto: ${safeFmtCurrency(spentValue)}`;
    const remainingLabel = document.createElement('span');
    remainingLabel.textContent = `Restante: ${safeFmtCurrency(reservedValue)}`;

    details.appendChild(spentLabel);
    details.appendChild(remainingLabel);

    const progress = document.createElement('div');
    progress.className = 'budget-card__progress';
    progress.style.height = '4px';
    progress.style.background = 'rgba(255,255,255,0.12)';
    progress.style.borderRadius = '2px';
    progress.style.marginTop = '6px';
    progress.style.overflow = 'hidden';

    const fill = document.createElement('div');
    fill.className = 'budget-card__progress-fill';
    fill.style.height = '100%';
    fill.style.background = 'var(--accent-color, #5DD39E)';
    fill.style.borderRadius = '2px';
    const denominator = Number(budget.initialValue || 0) || 0;
    const ratio = denominator > 0 ? Math.min(1, spentValue / denominator) : 0;
    fill.style.width = `${Math.round(ratio * 100)}%`;

    progress.appendChild(fill);

    card.appendChild(header);
    card.appendChild(details);
    card.appendChild(progress);
    // Open compact history on tap
    card.addEventListener('click', () => {
      try { window.__gastos?.showBudgetHistory?.(budget.tag); } catch (_) {}
    });

    return card;
  }


  // Local alias for postDate calculation: compute due date for a given opDate and card.
  function post(opISO, cardName) {
    return postDateForCard(opISO, cardName, resolveCards());
  }

  function resolveCards() {
    if (typeof getCards === 'function') {
      try {
        const dynamicCards = getCards();
        if (Array.isArray(dynamicCards) && dynamicCards.length) return dynamicCards;
      } catch (_) {
        /* ignore lookup errors */
      }
    }
    if (typeof window !== 'undefined') {
      const g = window.__gastos;
      if (g && Array.isArray(g.cards) && g.cards.length) {
        return g.cards;
      }
    }
    return Array.isArray(initialCards) ? initialCards : [];
  }

  function formatInvoiceGroupLabel(iso) {
    if (!iso) return '';
    try {
      const date = new Date(`${iso}T00:00:00`);
      if (Number.isNaN(date.getTime())) return iso;
      const day = String(date.getDate()).padStart(2, '0');
      const monthName = date.toLocaleDateString('pt-BR', { month: 'long' });
      const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
      return `${day} de ${capitalizedMonth}`;
    } catch (_) {
      return iso;
    }
  }

  /**
   * Build a map of running balances day‑by‑day across the date range.
   * Uses startDate/startBalance anchors when provided.
   *
   * @returns {Map<string, number>} Map keyed by ISO date to running balance.
   */
  function buildRunningBalanceMap() {
    const { minDate, maxDate } = calculateDateRange();
    // Build a quick lookup of budget trigger transactions to avoid
    // double-counting: the trigger reserves value via reservedAdjustment
    // and should NOT impact cash on the opDate.
    const budgetsEnabled = resolveBudgetsFeatureEnabled();
    const triggerIdSet = new Set();
    const triggerKeySet = new Set(); // key = `${iso}|${tag}`
    if (budgetsEnabled) {
      try {
        const active = (loadBudgets() || []).filter(b => b && b.status === 'active');
        active.forEach(b => {
          if (!b) return;
          if (b.triggerTxId != null) triggerIdSet.add(String(b.triggerTxId));
          const iso = normalizeBudgetDate(b.triggerTxIso || b.startDate);
          if (iso && b.tag) triggerKeySet.add(`${iso}|${b.tag}`);
        });
      } catch (_) {}
    }
    const balanceMap = new Map();
    let runningBalance = 0;
    const hasAnchor = !!state.startDate;
    const anchorISO = hasAnchor ? String(state.startDate) : null;
    const startDateObj = new Date(minDate);
    const endDateObj = new Date(maxDate);
    
    console.log('[accordion] buildRunningBalanceMap:', {
      'state.startDate': state.startDate,
      'state.startBalance': state.startBalance,
      hasAnchor,
      anchorISO,
      minDate,
      maxDate
    });
    
    // If the anchor occurs before the current range, seed the running balance at the anchor.
    if (hasAnchor && anchorISO && anchorISO < minDate && anchorISO <= maxDate) {
      runningBalance = (state.startBalance != null) ? state.startBalance : 0;
      console.log('[accordion] Anchor before range - seeding balance:', runningBalance);
    }
    const txs = getTransactions ? getTransactions() : transactions;
    for (let current = new Date(startDateObj); current <= endDateObj; current.setDate(current.getDate() + 1)) {
      const iso = current.toISOString().slice(0, 10);
      
      // Days BEFORE startDate should show zero balance
      if (hasAnchor && iso < anchorISO) {
        balanceMap.set(iso, 0);
        continue;
      }
      
      // ON the startDate, initialize with startBalance
      if (hasAnchor && iso === anchorISO) {
        runningBalance = (state.startBalance != null) ? state.startBalance : 0;
        console.log(`[accordion] ON startDate ${iso} - setting balance to:`, runningBalance);
      }
      
      // If no anchor is set, use startBalance on the first date (legacy behavior)
      if (!hasAnchor && iso === minDate) {
        runningBalance = (state.startBalance != null) ? state.startBalance : 0;
      }
      // Determine the impact on this day using existing logic
      const dayTx = txByDate(iso);
      // Identify derived budget trigger masters that start today
      const derivedTriggerIds = new Set();
      try {
        const prevIso = (() => { const d = new Date(`${iso}T00:00:00`); d.setDate(d.getDate()-1); return d.toISOString().slice(0,10); })();
        (txs || []).forEach((t) => {
          if (!t || !t.recurrence || !t.budgetTag) return;
          try {
            if (occursOn(t, iso) && !occursOn(t, prevIso) && t.id != null) {
              derivedTriggerIds.add(String(t.id));
            }
          } catch (_) {}
        });
      } catch (_) {}
      // 1) Cash transactions impact the balance on opDate, except
      //    budget trigger transactions which only create a reservation.
      const cashImpact = dayTx
        .filter(t => t.method === 'Dinheiro')
        .filter(t => {
          if (!budgetsEnabled || !t) return true;
          if (t.id != null && (triggerIdSet.has(String(t.id)) || derivedTriggerIds.has(String(t.id)))) return false;
          const tag = t.budgetTag || null;
          if (!tag) return true;
          const key = `${iso}|${tag}`;
          if (triggerKeySet.has(key)) return false;
          return true;
        })
        .reduce((s, t) => s + (t.val || 0), 0);
      // 2) Card invoices impact the balance on due dates
      const invoicesByCard = {};
      const addToGroup = (cardName, tx) => {
        if (!invoicesByCard[cardName]) invoicesByCard[cardName] = [];
        invoicesByCard[cardName].push(tx);
      };
      // Non‑recurring card transactions: due on their postDate
      txs.forEach(t => {
        if (t.method === 'Dinheiro' || t.recurrence) return;
        if (t.postDate === iso) addToGroup(t.method, t);
      });
      // Recurring card transactions: search up to 60 days back for occurrences due on this date
      const scanStart = new Date(iso);
      scanStart.setDate(scanStart.getDate() - 60);
      txs.filter(t => t.recurrence && t.method !== 'Dinheiro').forEach(master => {
        for (let d2 = new Date(scanStart); d2 <= new Date(iso); d2.setDate(d2.getDate() + 1)) {
          const occIso = d2.toISOString().slice(0, 10);
          if (!occursOn(master, occIso)) continue;
          const pd = post(occIso, master.method);
          if (pd === iso) {
            addToGroup(master.method, { ...master, opDate: occIso, postDate: iso, planned: false, recurrence: '' });
          }
        }
      });
      const invoiceTotals = {};
      Object.keys(invoicesByCard).forEach(cardName => {
        invoiceTotals[cardName] = invoicesByCard[cardName].reduce((s, t) => s + t.val, 0);
      });
      const sumAdjustFor = (cardName, dueISO) => txs
        .filter(t => t.invoiceAdjust && t.invoiceAdjust.card === cardName && t.invoiceAdjust.dueISO === dueISO)
        .reduce((s, t) => s + (Number(t.invoiceAdjust.amount) || 0), 0);
      let cardImpact = 0;
      Object.keys(invoiceTotals).forEach(cardName => {
        const adj = sumAdjustFor(cardName, iso);
        cardImpact += (invoiceTotals[cardName] + adj);
      });
      const dayTotal = cashImpact + cardImpact;
      runningBalance += dayTotal;
      const reservedAdjustment = getReservedAdjustmentForDate(iso);
      balanceMap.set(iso, runningBalance - reservedAdjustment);
    }
    return balanceMap;
  }

  /**
   * Calculate the date range based on transactions. Copied from main.js.
   * Ensures the range covers the currently selected year as well as all transactions.
   *
   * @returns {{minDate: string, maxDate: string}}
   */
  // Note: calculateDateRange is passed in via config; do not redefine here.

  /**
   * Helper to create the invoice header for a card. Returns a <summary> element.
   */
  function createCardInvoiceHeader(cardName, cardTotalAmount, dueISO, txs, isSkeletonMode) {
    const invSum = document.createElement('summary');
    invSum.classList.add('invoice-header-line');
    const formattedTotal = isSkeletonMode ? '<span class="skeleton skeleton-pill" style="width: 70px; height: 14px;"></span>' : safeFmtCurrency(cardTotalAmount, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    const paidAbs = (txs || [])
      .filter(t => t.invoicePayment && t.invoicePayment.card === cardName && t.invoicePayment.dueISO === dueISO)
      .reduce((s, t) => s + Math.abs(Number(t.val) || 0), 0);
    const parcel = (txs || []).find(t => t.invoiceParcelOf && t.invoiceParcelOf.card === cardName && t.invoiceParcelOf.dueISO === dueISO);
    const totalAbs = Math.abs(cardTotalAmount);
    const struck = (paidAbs > 0) || !!parcel;
    let note = '';
    if (parcel) {
      const n = parseInt(parcel.installments, 10) || 0;
      const per = Math.abs(Number(parcel.val) || 0);
      const perFmt = safeFmtCurrency(per, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      note = `<small class="note">Parcelada em ${n} vezes de ${perFmt}</small>`;
    } else if (paidAbs >= totalAbs - 0.005) {
      note = `<small class="note">Paga</small>`;
    } else if (paidAbs > 0) {
      const remaining = Math.max(0, totalAbs - paidAbs);
      note = `<small class="note">Restante - ${safeFmtCurrency(remaining, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</small>`;
    }
    invSum.innerHTML = `\n      <span class="invoice-label">Fatura - ${cardName}</span>\n      <span class="invoice-total"><span class="amount${struck ? ' struck' : ''}">${formattedTotal}</span>${note}</span>\n    `;
    return invSum;
  }

  /**
   * Return all transactions for a given card within the month/year of a date.
   */
  function getAllTransactionsOnCard(cardName, year, month, txs) {
    const res = [];
    const targetMonth = month;
    const targetYear = year;
    const windowStart = new Date(targetYear, targetMonth - 1, 1);
    const windowEnd = new Date(targetYear, targetMonth + 1, 0);
    (getTransactions ? getTransactions() : txs).forEach(tx => {
      if (tx.method !== cardName) return;
      if (!tx.recurrence) {
        const pd = new Date(tx.postDate);
        if (pd.getFullYear() === targetYear && pd.getMonth() === targetMonth) {
          res.push(tx);
        }
        return;
      }
      for (let d = new Date(windowStart); d <= windowEnd; d.setDate(d.getDate() + 1)) {
        const iso = d.toISOString().slice(0, 10);
        if (!occursOn(tx, iso)) continue;
        const pd = post(iso, cardName);
        const pdDate = new Date(pd);
        if (pdDate.getFullYear() === targetYear && pdDate.getMonth() === targetMonth) {
          res.push({
            ...tx,
            opDate: iso,
            postDate: pd,
            planned: iso > todayISO()
          });
        }
      }
    });
    return res.filter(t => !t.planned);
  }

  /**
   * Main render function. Rebuilds the accordion structure for the current year.
   */
  async function renderAccordion() {
    // Resolve the accordion element at render time so initialization
    // ordering doesn't prevent rendering if the DOM wasn't available
    // when initAccordion() was first called.
    const accEl = acc || (typeof document !== 'undefined' && document.getElementById('accordion'));
    if (!accEl) {
      return;
    }
    const startTime = performance.now();
    
    // Verificar se o accordion está em modo skeleton (durante hidratação)
    const isSkeletonMode = accEl.dataset.state === 'skeleton';
    
    // FAST PATH: Use cached data for instant render
    const currentMonth = getCurrentMonth();
    const viewYear = resolveViewYear();
    
    // Render current month from cache immediately for responsiveness
    if (!isSkeletonMode && viewYear === currentMonth.year) {
      const cachedCurrentMonth = getMonthCache(currentMonth.year, currentMonth.month);
      if (cachedCurrentMonth.length > 0 && !isMonthStale(currentMonth.year, currentMonth.month)) {
        renderFastPath(accEl, cachedCurrentMonth, startTime);
        
        // Background sync for updates
        backgroundSync(viewYear);
        return;
      }
    }
    
    const { minDate, maxDate } = calculateDateRange();
    // Build the running balance map once per render
    const balanceMap = buildRunningBalanceMap();
    const txs = getTransactions ? getTransactions() : transactions;
    const budgetsFeature = resolveBudgetsFeatureEnabled();
    const activeBudgets = budgetsFeature ? loadBudgets().filter((b) => b && b.status === 'active') : [];
    const budgetsByStart = budgetsFeature ? buildBudgetDisplayMap(activeBudgets, txs) : new Map();
    const budgetTriggerSet = budgetsFeature ? new WeakSet() : null;
    const budgetTriggerIds = budgetsFeature ? new Set() : null;
    const budgetTriggersByIso = budgetsFeature ? new Map() : null;
    if (budgetsFeature) {
      activeBudgets.forEach((budget) => {
        if (!budget) return;
        if (budget.triggerTxId != null) {
          budgetTriggerIds.add(String(budget.triggerTxId));
        }
        const iso = normalizeBudgetDate(budget.triggerTxIso || budget.startDate);
        if (iso) {
          if (!budgetTriggersByIso.has(iso)) budgetTriggersByIso.set(iso, []);
          budgetTriggersByIso.get(iso).push({
            tag: budget.tag,
            id: budget.triggerTxId != null ? String(budget.triggerTxId) : null,
          });
        }
      });
    }
    const isBudgetTriggerTransaction = (tx) => {
      if (!budgetsFeature || !tx) return false;
      try {
        if (budgetTriggerSet && budgetTriggerSet.has(tx)) return true;
      } catch (_) {}
      if (budgetTriggerIds && tx.id != null && budgetTriggerIds.has(String(tx.id))) {
        return true;
      }
      const iso = normalizeBudgetDate(tx.opDate || tx.postDate);
      if (!iso) return false;
      const candidates = budgetTriggersByIso && budgetTriggersByIso.get(iso);
      if (!candidates || !candidates.length) return false;
      return candidates.some((info) => {
        if (!info) return false;
        if (info.tag && tx.budgetTag && info.tag !== tx.budgetTag) return false;
        if (info.id) return info.id === String(tx.id);
        return true;
      });
    };
    
    const now = new Date();
    const curMonth = now.getMonth();
    const curYear = now.getFullYear();
    
    // Preserve which <details> are open before re-render
    // IMPORTANT: For non-current years, ignore openKeys (collapse all months)
    const isCurrentYearView = viewYear === curYear;
    const openKeys = isCurrentYearView 
      ? Array.from(accEl.querySelectorAll('details[open]')).map(d => d.dataset.key || '')
      : [];
    const openInvoices = Array.from(accEl.querySelectorAll('details.invoice[open]')).map(d => d.dataset.pd);
    
    // Performance optimization: use DocumentFragment to batch DOM operations
    const fragment = document.createDocumentFragment();
    const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    
    // Função auxiliar para aplicar shimmer nos valores quando em modo skeleton
    const currency = v => isSkeletonMode ? '<span class="skeleton skeleton-pill" style="width: 60px; height: 14px;"></span>' : safeFmtCurrency(v);
    const baselineBalance = Number.isFinite(state?.startBalance) ? Number(state.startBalance) : 0;
    const minDateObj = new Date(minDate);

    const getBalanceBefore = (iso) => {
      if (!iso) return baselineBalance;
      const target = new Date(iso);
      target.setDate(target.getDate() - 1);
      for (let d = new Date(target); d >= minDateObj; d.setDate(d.getDate() - 1)) {
        const key = d.toISOString().slice(0, 10);
        if (balanceMap.has(key)) return balanceMap.get(key);
      }
      const firstDayKey = iso;
      if (balanceMap.has(firstDayKey)) {
        // Derive the pre-day balance by subtracting the day's net movement
        const dayTx = txByDate(firstDayKey);
        const dayTotal = (dayTx || []).reduce((sum, t) => sum + (Number(t.val) || 0), 0);
        return balanceMap.get(firstDayKey) - dayTotal;
      }
      return baselineBalance;
    };
    
    // viewYear already declared above
    
    // Progressive rendering strategy: prioritize current month
    // isCurrentYearView already declared earlier
    const priorityMonth = isCurrentYearView ? curMonth : -1; // Current month gets priority
    
    for (let mIdx = 0; mIdx < 12; mIdx++) {
      const nomeMes = new Date(viewYear, mIdx).toLocaleDateString('pt-BR', { month: 'long' });
      const mDet = document.createElement('details');
      mDet.className = 'month';
      mDet.dataset.key = `m-${mIdx}`;
      const isCurrentYear = viewYear === curYear;
      const isCurrentMonth = isCurrentYear && mIdx === curMonth;
      const isPriorityMonth = mIdx === priorityMonth;
      
      // Open logic: current month + manually opened + future months in current year
      // IMPORTANT: For non-current years, collapse all months (openKeys will be empty after year change)
      const isOpen = isCurrentYear 
        ? (openKeys.includes(mDet.dataset.key) || mIdx >= curMonth)
        : openKeys.includes(mDet.dataset.key);
      mDet.open = isOpen;
      const monthTotal = (txs || [])
        .filter(t => new Date(t.postDate).getMonth() === mIdx)
        .reduce((s,t) => s + t.val, 0);
      let mSum = document.createElement('summary');
      mSum.className = 'month-divider';
      // Obter o último dia do mês
      const monthEndISO = new Date(viewYear, mIdx + 1, 0).toISOString().slice(0, 10);
      
      // Simplesmente pegar o saldo do último dia do mês que já está calculado corretamente
      const monthEndBalance = balanceMap.has(monthEndISO)
        ? balanceMap.get(monthEndISO)
        : getBalanceBefore(monthEndISO);
      
      let metaLabel = '';
      let metaValue = '';
      const isPastMonth = (viewYear < curYear) || (viewYear === curYear && mIdx < curMonth);
      // isCurrentMonth already declared above
      
      if (isPastMonth) {
        metaLabel = 'Saldo final:';
        metaValue = currency(monthEndBalance);
      } else if (isCurrentMonth) {
        metaLabel = 'Saldo projetado:';
        metaValue = currency(monthEndBalance);
      } else {
        metaLabel = 'Saldo projetado:';
        metaValue = currency(monthEndBalance);
      }
      mSum.innerHTML = `\n        <div class="month-row">\n          <span class="month-name">${nomeMes.toUpperCase()}</span>\n        </div>\n        <div class="month-meta">\n          <span class="meta-label">${metaLabel}</span>\n          <span class="meta-value">${metaValue}</span>\n        </div>`;
      mDet.appendChild(mSum);
      
      // PROGRESSIVE LOADING: Only render full content for priority months
      const shouldRenderFull = isPriorityMonth || isOpen || openKeys.includes(mDet.dataset.key);
      
      if (!shouldRenderFull) {
        // Lazy loading placeholder - will be populated when expanded
        const placeholder = document.createElement('div');
        placeholder.className = 'month-lazy-placeholder';
        placeholder.dataset.monthIndex = mIdx;
        placeholder.innerHTML = '<div class="lazy-loading">Carregando mês...</div>';
        mDet.appendChild(placeholder);
      } else {
        // Full rendering for priority months - keep original logic for now
      }
      
      // Skip the expensive day-by-day loop for non-priority months
      if (!shouldRenderFull) {
        fragment.appendChild(mDet);
        continue;
      }
      
      // Number of days in this month (only for full rendering)
      const daysInMonth = new Date(viewYear, mIdx + 1, 0).getDate();
      for (let d = 1; d <= daysInMonth; d++) {
        const dateObj = new Date(viewYear, mIdx, d);
        const iso = formatToISO(dateObj);
        const dayTx = txByDate(iso);
        // Daily cash impact
        const cashNonRecurring = (txs || [])
          .filter(t => t.method === 'Dinheiro' && !t.recurrence && t.opDate === iso && !t.invoiceAdjust)
          .reduce((s, t) => s + (Number(t.val) || 0), 0);
        const cashRecurring = (txs || [])
          .filter(t => t.method === 'Dinheiro' && t.recurrence)
          .filter(t => occursOn(t, iso))
          .reduce((s, t) => s + (Number(t.val) || 0), 0);
        const cashImpact = cashNonRecurring + cashRecurring;
        // Build invoice groups
        const invoicesByCard = {};
        const currentCards = resolveCards();
        const addToGroup = (cardName, tx) => {
          if (!invoicesByCard[cardName]) invoicesByCard[cardName] = [];
          invoicesByCard[cardName].push(tx);
        };
        // Non‑recurring card transactions due today
        (txs || []).forEach(t => {
          if (t.method !== 'Dinheiro' && !t.recurrence && t.postDate === iso) {
            const validCard = currentCards.some(c => c && c.name === t.method && c.name !== 'Dinheiro');
            if (!validCard) return;
            addToGroup(t.method, t);
          }
        });
        // Recurring card transactions due today
        const scanStart = new Date(iso);
        scanStart.setDate(scanStart.getDate() - 60);
        for (const master of (txs || []).filter(t => t.recurrence && t.method !== 'Dinheiro')) {
          const validCard = currentCards.some(c => c && c.name === master.method && c.name !== 'Dinheiro');
          if (!validCard) continue;
          for (let d2 = new Date(scanStart); d2 <= new Date(iso); d2.setDate(d2.getDate() + 1)) {
            const occIso = d2.toISOString().slice(0, 10);
            if (!occursOn(master, occIso)) continue;
            const pd = post(occIso, master.method);
            if (pd === iso) {
              addToGroup(master.method, { ...master, opDate: occIso, postDate: iso, planned: false, recurrence: '' });
            }
          }
        }
        // Compute invoice totals per card
        const invoiceTotals = {};
        Object.keys(invoicesByCard).forEach(cardName => {
          invoiceTotals[cardName] = invoicesByCard[cardName].reduce((s, t) => s + t.val, 0);
        });
        const sumAdjustFor = (cardName, dueISO) => (txs || [])
          .filter(t => t.invoiceAdjust && t.invoiceAdjust.card === cardName && t.invoiceAdjust.dueISO === dueISO)
          .reduce((s, t) => s + (Number(t.invoiceAdjust.amount) || 0), 0);
        let cardImpact = 0;
        Object.keys(invoiceTotals).forEach(cardName => {
          const adj = sumAdjustFor(cardName, iso);
          cardImpact += (invoiceTotals[cardName] + adj);
        });
        const dayTotal = cashImpact + cardImpact;
        // Retrieve the running balance for this day
        const dayBalance = balanceMap.has(iso) ? balanceMap.get(iso) : getBalanceBefore(iso);
        
        // DEBUG: Log balance for days around startDate
        if (state.startDate && (iso === state.startDate || 
            (iso >= '2025-09-20' && iso <= '2025-09-24'))) {
          console.log(`[accordion] Day ${iso} balance:`, {
            hasInMap: balanceMap.has(iso),
            mapValue: balanceMap.get(iso),
            finalBalance: dayBalance,
            isStartDate: iso === state.startDate
          });
        }
        
        const dow = dateObj.toLocaleDateString('pt-BR', { weekday: 'long', timeZone: 'America/Sao_Paulo' });
        const dDet = document.createElement('details');
        dDet.className = 'day';
        dDet.dataset.key = `d-${iso}`;
        dDet.dataset.has = String(dayTx.length > 0);
        dDet.open = openKeys.includes(dDet.dataset.key);
        if (iso === todayISO()) dDet.classList.add('today');
        const dSum = document.createElement('summary');
        dSum.className = 'day-summary';
        const saldoFormatado = isSkeletonMode ? '<span class="skeleton skeleton-pill" style="width: 70px; height: 14px;"></span>' : safeFmtCurrency(dayBalance, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const baseLabel = `${String(d).padStart(2,'0')} - ${dow.charAt(0).toUpperCase() + dow.slice(1)}`;
        const hasCardDue = currentCards.some(card => card.due === d);
        const hasSalary = dayTx.some(t => SALARY_WORDS.some(w => t.desc.toLowerCase().includes(w)));
        const labelParts = [baseLabel];
        if (hasCardDue) labelParts.push('<span class="icon-invoice"></span>');
        if (hasSalary) labelParts.push('<span class="icon-salary"></span>');
        const labelWithDue = labelParts.join('');
        dSum.innerHTML = `<span>${labelWithDue}</span><span class="day-balance" style="margin-left:auto">${saldoFormatado}</span>`;
        if (dayBalance < 0) dDet.classList.add('negative');
        dDet.appendChild(dSum);

        if (budgetsFeature) {
          let dayBudgets = budgetsByStart.get(iso) || [];
          if (!dayBudgets.length) {
            const fb = deriveFallbackBudgetsForDay(iso, txs, budgetTriggerIds, budgetTriggersByIso, dayTx, budgetTriggerSet);
            if (fb.length) dayBudgets = fb;
          }
          dayBudgets.forEach((budget) => {
            const cardEl = createBudgetCardElement(budget, dayTx, budgetTriggerSet);
            dDet.appendChild(cardEl);
          });
        }
        // Always clear any existing invoices
        const createdInvoicesForDay = new Set();
        Object.keys(invoicesByCard).forEach(cardName => {
          const invoiceKey = `${cardName}_${iso}`;
          if (createdInvoicesForDay.has(invoiceKey)) return;
          createdInvoicesForDay.add(invoiceKey);
          const det = document.createElement('details');
          det.className = 'invoice swipe-wrapper';
          det.dataset.pd = iso;
          det.dataset.swipeId = `inv_${cardName.replace(/[^a-z0-9]/gi,'')}_${iso.replace(/-/g,'')}_${Math.random().toString(36).slice(2,7)}`;
          const invHeader = createCardInvoiceHeader(cardName, invoiceTotals[cardName] || 0, iso, txs, isSkeletonMode);
          det.appendChild(invHeader);
          // Swipe actions
          const headerActions = document.createElement('div');
          headerActions.className = 'swipe-actions';
          headerActions.dataset.for = det.dataset.swipeId;
          const payBtn = document.createElement('button');
          payBtn.className = 'icon';
          const payIcon = document.createElement('div');
          payIcon.className = 'icon-action icon-pay';
          payBtn.appendChild(payIcon);
          payBtn.addEventListener('click', () => {
            const txList = typeof getTransactions === 'function' ? getTransactions() : (txs || []);
            const totalAbs = Math.abs(invoiceTotals[cardName] || 0);
            const paidAbs = (txList || [])
              .filter(t => t && t.invoicePayment && t.invoicePayment.card === cardName && t.invoicePayment.dueISO === iso)
              .reduce((sum, t) => sum + Math.abs(Number(t.val) || 0), 0);
            const adjustedAbs = (txList || [])
              .filter(t => t && t.invoiceAdjust && t.invoiceAdjust.card === cardName && t.invoiceAdjust.dueISO === iso)
              .reduce((sum, t) => sum + Math.abs(Number(t.invoiceAdjust.amount) || 0), 0);
            const remaining = Math.max(0, totalAbs - paidAbs - adjustedAbs);
            if (typeof window !== 'undefined') {
              const openFn =
                typeof window.openPayInvoiceModal === 'function'
                  ? window.openPayInvoiceModal
                  : (window.__gastos && typeof window.__gastos.openPayInvoiceModal === 'function'
                    ? window.__gastos.openPayInvoiceModal
                    : null);
              if (openFn) {
                openFn(cardName, iso, remaining, totalAbs, adjustedAbs);
              } else {
                console.warn('openPayInvoiceModal handler not available');
              }
            }
          });
          headerActions.appendChild(payBtn);
          dDet.style.position = dDet.style.position || 'relative';
          Object.assign(headerActions.style, {
            position:'absolute',
            right:'0',
            background:'transparent',
            zIndex: 3,
            pointerEvents: 'none'
          });
          requestAnimationFrame(() => {
            const top = det.offsetTop + invHeader.offsetTop;
            headerActions.style.top = top + 'px';
            headerActions.style.height = invHeader.getBoundingClientRect().height + 'px';
          });
          dDet.appendChild(headerActions);
          // Build details for each invoice item
          if (isSkeletonMode || typeof makeLine !== 'function') {
            const invDetails = document.createElement('div');
            invDetails.className = 'invoice-items';
            (invoicesByCard[cardName] || []).forEach(() => {
              const placeholder = document.createElement('div');
              placeholder.className = 'skeleton skeleton-line';
              placeholder.style.width = '100%';
              placeholder.style.height = '20px';
              placeholder.style.margin = '6px 0';
              invDetails.appendChild(placeholder);
            });
            det.appendChild(invDetails);
          } else {
            const invList = document.createElement('ul');
            invList.className = 'executed-list';
            const tsKey = (tx) => {
              if (!tx) return '';
              if (tx.ts) return tx.ts;
              const base = tx.opDate || tx.postDate || '';
              return `${base}T00:00:00`;
            };
            const invoiceEntries = (invoicesByCard[cardName] || []).slice().sort((a, b) => {
              const dateA = (a.opDate || a.postDate || '').slice(0, 10);
              const dateB = (b.opDate || b.postDate || '').slice(0, 10);
              if (dateA !== dateB) return dateB.localeCompare(dateA);
              return tsKey(b).localeCompare(tsKey(a));
            });
            const groupedByDay = new Map();
            invoiceEntries.forEach((entry) => {
              const dayIso = (entry.opDate || entry.postDate || '').slice(0, 10);
              if (!groupedByDay.has(dayIso)) groupedByDay.set(dayIso, []);
              groupedByDay.get(dayIso).push(entry);
            });
            Array.from(groupedByDay.entries())
              .sort((a, b) => b[0].localeCompare(a[0]))
              .forEach(([dayIso, dayEntries], groupIndex) => {
                const headerLi = document.createElement('li');
                headerLi.className = 'invoice-day-heading';
                const heading = document.createElement('div');
                heading.className = 'invoice-group-date';
                heading.textContent = formatInvoiceGroupLabel(dayIso);
                headerLi.appendChild(heading);
                const divider = document.createElement('div');
                divider.className = `invoice-divider ${groupIndex === 0 ? 'bold' : 'thin'}`;
                headerLi.appendChild(divider);
                invList.appendChild(headerLi);
                dayEntries
                  .slice()
                  .sort((a, b) => tsKey(b).localeCompare(tsKey(a)))
                  .forEach((tx) => {
                    const li = document.createElement('li');
                    const line = makeLine(tx, false, true);
                    if (line) li.appendChild(line);
                    invList.appendChild(li);
                  });
              });
            det.appendChild(invList);
          }
          dDet.appendChild(det);
        });
        // Planned operations section
        const visibleTx = dayTx.filter(tx => !isBudgetTriggerTransaction(tx));
        const plannedOps = visibleTx
          .filter(t => t.planned)
          .sort((a, b) => {
            const dateCmp = a.opDate.localeCompare(b.opDate);
            if (dateCmp !== 0) return dateCmp;
            return (a.ts || '').localeCompare(b.ts || '');
          });
        if (plannedOps.length > 0) {
          const plannedContainer = document.createElement('div');
          plannedContainer.className = 'planned-cash';
          
          // Add section title
          const plannedTitle = document.createElement('div');
          plannedTitle.className = 'section-title';
          plannedTitle.textContent = 'Planejados:';
          plannedContainer.appendChild(plannedTitle);
          
          if (isSkeletonMode || typeof makeLine !== 'function') {
            plannedOps.forEach(tx => {
              const div = document.createElement('div');
              div.className = 'planned-item';
              const amount = isSkeletonMode ? '<span class="skeleton skeleton-pill" style="width: 60px; height: 12px;"></span>' : safeFmtCurrency(tx.val, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
              div.innerHTML = `${tx.desc} <span class="amount">${amount}</span>`;
              plannedContainer.appendChild(div);
            });
          } else {
            const list = document.createElement('ul');
            list.className = 'planned-list';
            plannedOps.forEach(tx => {
              const li = document.createElement('li');
              const line = makeLine(tx);
              if (line) li.appendChild(line);
              list.appendChild(li);
            });
            plannedContainer.appendChild(list);
          }
          dDet.appendChild(plannedContainer);
        }
        // Executed operations section
        const executedOps = visibleTx
          .filter(t => !t.planned)
          .sort((a, b) => {
            const dateCmp = a.opDate.localeCompare(b.opDate);
            if (dateCmp !== 0) return dateCmp;
            return (a.ts || '').localeCompare(b.ts || '');
          });
        if (executedOps.length > 0) {
          const executedContainer = document.createElement('div');
          executedContainer.className = 'executed-cash';
          
          // Add section title
          const executedTitle = document.createElement('div');
          executedTitle.className = 'section-title';
          executedTitle.textContent = 'Executados:';
          executedContainer.appendChild(executedTitle);
          
          if (isSkeletonMode || typeof makeLine !== 'function') {
            executedOps.forEach(tx => {
              const div = document.createElement('div');
              div.className = 'executed-item';
              const amount = isSkeletonMode ? '<span class="skeleton skeleton-pill" style="width: 60px; height: 12px;"></span>' : safeFmtCurrency(tx.val, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
              div.innerHTML = `${tx.desc} <span class="amount">${amount}</span>`;
              executedContainer.appendChild(div);
            });
          } else {
            const list = document.createElement('ul');
            list.className = 'executed-list';
            executedOps.forEach(tx => {
              const li = document.createElement('li');
              const line = makeLine(tx);
              if (line) li.appendChild(line);
              list.appendChild(li);
            });
            executedContainer.appendChild(list);
          }
          dDet.appendChild(executedContainer);
        }
        mDet.appendChild(dDet);
      }
      fragment.appendChild(mDet);
    }
    
    // Single DOM operation: clear and append all months at once
    accEl.innerHTML = '';
    accEl.appendChild(fragment);
    // Restore open invoice panels
    openInvoices.forEach(pd => {
      const det = accEl.querySelector(`details.invoice[data-pd="${pd}"]`);
      if (det) det.open = true;
    });
    // Setup lazy loading event listeners
    setupLazyLoading(accEl);
    
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    if (renderTime > 50) { // Lower threshold to track improvements
      console.info('Accordion render:', renderTime.toFixed(2) + 'ms for', accEl.querySelectorAll('details.month').length, 'months');
    }
  }
  
  // Lazy loading setup - listens for month expansion
  function setupLazyLoading(accEl) {
    // Remove old listener if exists to prevent duplicates
    if (setupLazyLoading._listener) {
      accEl.removeEventListener('toggle', setupLazyLoading._listener, true);
    }
    
    // Create new listener
    const listener = (e) => {
      const monthEl = e.target.closest('details.month');
      if (!monthEl || !monthEl.open) return;
      
      const placeholder = monthEl.querySelector('.month-lazy-placeholder');
      if (!placeholder) return; // Already loaded
      
      const monthIndex = parseInt(placeholder.dataset.monthIndex, 10);
      if (isNaN(monthIndex)) return;
      
      // Replace placeholder with full content
      setTimeout(() => {
        loadFullMonthContent(monthEl, monthIndex, placeholder);
      }, 50); // Small delay for smooth UX
    };
    
    // Store listener reference for cleanup
    setupLazyLoading._listener = listener;
    
    // Attach listener with capture phase to ensure we catch it first
    accEl.addEventListener('toggle', listener, true);
  }
  
  // Load full month content on demand
  function loadFullMonthContent(monthEl, monthIndex, placeholder) {
    try {
      placeholder.innerHTML = '<div class="lazy-loading">Carregando transações...</div>';
      
      // Get fresh data
      const viewYear = resolveViewYear();
      const txs = getTransactions ? getTransactions() : transactions;
      const daysInMonth = new Date(viewYear, monthIndex + 1, 0).getDate();
      
      // Calculate balances for this specific month
      // We need to compute from the start of the year to this month to get accurate balances
      const monthBalanceMap = new Map();
      const { minDate, maxDate } = calculateDateRange();
      const minDateObj = new Date(minDate);
      const startDate = state.startDate ? new Date(state.startDate) : new Date(minDate);
      const baselineBalance = Number(state.startBalance) || 0;
      
      // Calculate running balance from start to end of this month
      let runningBalance = baselineBalance;
      const monthStart = new Date(viewYear, monthIndex, 1);
      const monthEnd = new Date(viewYear, monthIndex + 1, 0);
      
      for (let d = new Date(startDate); d <= monthEnd; d.setDate(d.getDate() + 1)) {
        const iso = d.toISOString().slice(0, 10);
        
        // Cash impact (same logic as main render)
        const cashNonRecurring = (txs || [])
          .filter(t => t.method === 'Dinheiro' && !t.recurrence && t.opDate === iso && !t.invoiceAdjust)
          .reduce((s, t) => s + (Number(t.val) || 0), 0);
        const cashRecurring = (txs || [])
          .filter(t => t.method === 'Dinheiro' && t.recurrence)
          .filter(t => occursOn(t, iso))
          .reduce((s, t) => s + (Number(t.val) || 0), 0);
        const cashImpact = cashNonRecurring + cashRecurring;
        
        runningBalance += cashImpact;
        const reservedAdjustment = getReservedAdjustmentForDate(iso);
        monthBalanceMap.set(iso, runningBalance - reservedAdjustment);
      }
      
      const simpleGetBalanceBefore = (iso) => {
        if (!iso) return baselineBalance;
        const target = new Date(iso);
        target.setDate(target.getDate() - 1);
        const key = target.toISOString().slice(0, 10);
        return monthBalanceMap.has(key) ? monthBalanceMap.get(key) : baselineBalance;
      };
      
      // Render full month content with calculated balances
      const content = renderFullMonthContent(
        monthIndex,
        viewYear,
        daysInMonth,
        txs,
        monthBalanceMap,
        simpleGetBalanceBefore,
        budgetsFeature,
        budgetsByStart,
        budgetTriggerSet,
        budgetTriggerIds,
        budgetTriggersByIso
      );
      
      // Replace placeholder with real content
      placeholder.replaceWith(...content);
      
    } catch (error) {
      console.error('❌ Failed to load month content:', error);
      placeholder.innerHTML = '<div class="lazy-error">Erro ao carregar</div>';
    }
  }
  
  // Fast path rendering using cached current month data
  function renderFastPath(accEl, cachedTransactions, startTime) {
    try {
      const fragment = document.createDocumentFragment();
      const currentMonth = getCurrentMonth();
      
      // Render just the current month with cached data
      const monthEl = createMonthElement(currentMonth.year, currentMonth.month, cachedTransactions, true);
      fragment.appendChild(monthEl);
      
      // Add placeholder months for other months
      for (let m = 0; m < 12; m++) {
        if (m !== currentMonth.month) {
          const placeholder = createPlaceholderMonth(currentMonth.year, m);
          fragment.appendChild(placeholder);
        }
      }
      
      accEl.innerHTML = '';
      accEl.appendChild(fragment);
      
      const endTime = performance.now();
      console.info(`Fast accordion render: ${(endTime - startTime).toFixed(2)}ms (cached current month)`);
      
    } catch (error) {
      console.error('Fast path render failed:', error);
      // Fallback to normal render
      renderAccordion();
    }
  }
  
  // Background sync to update stale data
  async function backgroundSync(viewYear) {
    if (typeof window === 'undefined' || !window.firebaseDb) return;
    
    try {
      const firebase = {
        firebaseDb: window.firebaseDb,
        ref: window.ref || ((db, path) => ({ path })), // Fallback
        get: window.get || (() => Promise.resolve({ exists: () => false })), // Fallback
        PATH: window.PATH
      };
      
      await smartSync(firebase, viewYear, (progress) => {
        if (progress.type === 'complete' && progress.count > 0) {
          console.log(`Background sync: updated ${progress.count} transactions for ${progress.year}-${progress.month}`);
          
          // Re-render only if significant changes
          if (progress.count > 5) {
            requestIdleCallback(() => {
              renderAccordion();
            });
          }
        }
      });
      
    } catch (error) {
      // Silent fail for background sync
    }
  }
  
  // Create a month element with transactions
  function createMonthElement(year, month, transactions, isExpanded = false) {
    const monthName = new Date(year, month).toLocaleDateString('pt-BR', { month: 'long' });
    const det = document.createElement('details');
    
    det.className = 'month';
    det.dataset.key = `m-${month}`;
    det.open = isExpanded;
    
    const summary = document.createElement('summary');
    summary.className = 'month-divider';
    summary.innerHTML = `
      <div class="month-row">
        <span class="month-name">${monthName.toUpperCase()}</span>
      </div>
      <div class="month-meta">
        <span class="meta-label">Transações:</span>
        <span class="meta-value">${transactions.length}</span>
      </div>
    `;
    
    det.appendChild(summary);
    
    if (isExpanded && transactions.length > 0) {
      const content = document.createElement('div');
      content.innerHTML = `<div class="month-transactions">${transactions.length} operações carregadas</div>`;
      det.appendChild(content);
    }
    
    return det;
  }
  
  // Create placeholder month (lazy loading)
  function createPlaceholderMonth(year, month) {
    const monthName = new Date(year, month).toLocaleDateString('pt-BR', { month: 'long' });
    const det = document.createElement('details');
    
    det.className = 'month';
    det.dataset.key = `m-${month}`;
    det.open = false;
    
    const summary = document.createElement('summary');
    summary.className = 'month-divider';
    summary.innerHTML = `
      <div class="month-row">
        <span class="month-name">${monthName.toUpperCase()}</span>
      </div>
      <div class="month-meta">
        <span class="meta-label">Carregamento:</span>
        <span class="meta-value">Sob demanda</span>
      </div>
    `;
    
    det.appendChild(summary);
    
    const placeholder = document.createElement('div');
    placeholder.className = 'month-lazy-placeholder';
    placeholder.dataset.monthIndex = month;
    placeholder.innerHTML = '<div class="lazy-loading">Expandir para carregar...</div>';
    det.appendChild(placeholder);
    
    return det;
  }
  
  // Extract full month content rendering
  function renderFullMonthContent(monthIndex, viewYear, daysInMonth, txs, balanceMap, getBalanceBefore, budgetsFeature, budgetsByStart, budgetTriggerSet, budgetTriggerIds, budgetTriggersByIso) {
    const elements = [];
    
    // Get all required helpers from already resolved context variables
    // These are already defined in the outer scope from ctx
    // const occursOn, post, makeLine, todayISO, etc. are all already available
    
    // Balance map is passed as parameter (may be empty for lazy loaded months)
    // const balanceMap - passed as parameter
    
    // Get transactions for this month
    const txByDate = (iso) => {
      const direct = (txs || []).filter(t => !t.recurrence && (t.opDate === iso || t.postDate === iso));
      const recurring = (txs || []).filter(t => t.recurrence && occursOn(t, iso));
      return [...direct, ...recurring];
    };

    const isBudgetTriggerTx = (tx) => {
      if (!budgetsFeature || !tx) return false;
      try {
        if (budgetTriggerSet && budgetTriggerSet.has(tx)) return true;
      } catch (_) {}
      if (budgetTriggerIds && tx.id != null && budgetTriggerIds.has(String(tx.id))) return true;
      const iso = normalizeBudgetDate(tx.opDate || tx.postDate);
      if (!iso) return false;
      const candidates = budgetTriggersByIso && budgetTriggersByIso.get(iso);
      if (!candidates || !candidates.length) return false;
      return candidates.some((info) => {
        if (!info) return false;
        if (info.tag && tx.budgetTag && info.tag !== tx.budgetTag) return false;
        if (info.id) return info.id === String(tx.id);
        return true;
      });
    };
    
    const openKeys = []; // No preserved open state for lazy loaded content
    const isSkeletonMode = false;
    
    // Render each day of the month
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(viewYear, monthIndex, d);
      const iso = formatToISO(dateObj);
      const dayTx = txByDate(iso);
      
      // Daily cash impact calculation (same as main loop)
      const cashNonRecurring = (txs || [])
        .filter(t => t.method === 'Dinheiro' && !t.recurrence && t.opDate === iso && !t.invoiceAdjust)
        .reduce((s, t) => s + (Number(t.val) || 0), 0);
      const cashRecurring = (txs || [])
        .filter(t => t.method === 'Dinheiro' && t.recurrence)
        .filter(t => occursOn(t, iso))
        .reduce((s, t) => s + (Number(t.val) || 0), 0);
      const cashImpact = cashNonRecurring + cashRecurring;
      
      // Build invoice groups
      const invoicesByCard = {};
      const currentCards = resolveCards();
      const addToGroup = (cardName, tx) => {
        if (!invoicesByCard[cardName]) invoicesByCard[cardName] = [];
        invoicesByCard[cardName].push(tx);
      };
      
      // Non-recurring card transactions
      (txs || []).forEach(t => {
        if (t.method !== 'Dinheiro' && !t.recurrence && t.postDate === iso) {
          const validCard = currentCards.some(c => c && c.name === t.method && c.name !== 'Dinheiro');
          if (!validCard) return;
          addToGroup(t.method, t);
        }
      });
      
      // Recurring card transactions
      const scanStart = new Date(iso);
      scanStart.setDate(scanStart.getDate() - 60);
      for (const master of (txs || []).filter(t => t.recurrence && t.method !== 'Dinheiro')) {
        const validCard = currentCards.some(c => c && c.name === master.method && c.name !== 'Dinheiro');
        if (!validCard) continue;
        for (let d2 = new Date(scanStart); d2 <= new Date(iso); d2.setDate(d2.getDate() + 1)) {
          const occIso = d2.toISOString().slice(0, 10);
          if (!occursOn(master, occIso)) continue;
          const pd = post(occIso, master.method);
          if (pd === iso) {
            addToGroup(master.method, { ...master, opDate: occIso, postDate: iso, planned: false, recurrence: '' });
          }
        }
      }
      
      // Invoice totals
      const invoiceTotals = {};
      Object.keys(invoicesByCard).forEach(cardName => {
        invoiceTotals[cardName] = invoicesByCard[cardName].reduce((s, t) => s + t.val, 0);
      });
      
      const sumAdjustFor = (cardName, dueISO) => (txs || [])
        .filter(t => t.invoiceAdjust && t.invoiceAdjust.card === cardName && t.invoiceAdjust.dueISO === dueISO)
        .reduce((s, t) => s + (Number(t.invoiceAdjust.amount) || 0), 0);
      
      let cardImpact = 0;
      Object.keys(invoiceTotals).forEach(cardName => {
        const adj = sumAdjustFor(cardName, iso);
        cardImpact += (invoiceTotals[cardName] + adj);
      });
      
      const dayBalance = balanceMap.has(iso) ? balanceMap.get(iso) : 0;
      const dow = dateObj.toLocaleDateString('pt-BR', { weekday: 'long', timeZone: 'America/Sao_Paulo' });
      
      // Create day details element
      const dDet = document.createElement('details');
      dDet.className = 'day';
      dDet.dataset.key = `d-${iso}`;
      dDet.dataset.has = String(dayTx.length > 0);
      if (iso === todayISO()) dDet.classList.add('today');
      
      const dSum = document.createElement('summary');
      dSum.className = 'day-summary';
      const saldoFormatado = safeFmtCurrency(dayBalance, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const baseLabel = `${String(d).padStart(2,'0')} - ${dow.charAt(0).toUpperCase() + dow.slice(1)}`;
      const hasCardDue = currentCards.some(card => card.due === d);
      const hasSalary = dayTx.some(t => SALARY_WORDS.some(w => t.desc.toLowerCase().includes(w)));
      const labelParts = [baseLabel];
      if (hasCardDue) labelParts.push('<span class="icon-invoice"></span>');
      if (hasSalary) labelParts.push('<span class="icon-salary"></span>');
      const labelWithDue = labelParts.join('');
      dSum.innerHTML = `<span>${labelWithDue}</span><span class="day-balance" style="margin-left:auto">${saldoFormatado}</span>`;
      if (dayBalance < 0) dDet.classList.add('negative');
      dDet.appendChild(dSum);
      
      if (budgetsFeature) {
        let dayBudgets = budgetsByStart.get(iso) || [];
        if (!dayBudgets.length) {
          const fb = deriveFallbackBudgetsForDay(iso, txs, budgetTriggerIds, budgetTriggersByIso, dayTx, budgetTriggerSet);
          if (fb.length) dayBudgets = fb;
        }
        dayBudgets.forEach((budget) => {
          const cardEl = createBudgetCardElement(budget, dayTx, budgetTriggerSet);
          dDet.appendChild(cardEl);
        });
      }

      // Add invoice details (simplified - just the list, no swipe actions for lazy loaded content)
      Object.keys(invoicesByCard).forEach(cardName => {
        const det = document.createElement('details');
        det.className = 'invoice';
        det.dataset.pd = iso;
        
        const invHeader = createCardInvoiceHeader(cardName, invoiceTotals[cardName] || 0, iso, txs, false);
        det.appendChild(invHeader);
        
        if (typeof makeLine === 'function') {
          const invList = document.createElement('ul');
          invList.className = 'executed-list';
          (invoicesByCard[cardName] || []).forEach(tx => {
            const li = document.createElement('li');
            const line = makeLine(tx, false, true);
            if (line) li.appendChild(line);
            invList.appendChild(li);
          });
          det.appendChild(invList);
        }
        dDet.appendChild(det);
      });
      
      // Planned operations
      const visibleTx = dayTx.filter(tx => !isBudgetTriggerTx(tx));
      const plannedOps = visibleTx.filter(t => t.planned);
      if (plannedOps.length > 0 && typeof makeLine === 'function') {
        const plannedContainer = document.createElement('div');
        plannedContainer.className = 'planned-cash';
        const list = document.createElement('ul');
        list.className = 'planned-list';
        plannedOps.forEach(tx => {
          const li = document.createElement('li');
          const line = makeLine(tx);
          if (line) li.appendChild(line);
          list.appendChild(li);
        });
        plannedContainer.appendChild(list);
        dDet.appendChild(plannedContainer);
      }
      
      // Executed operations
      const executedOps = visibleTx.filter(t => !t.planned);
      if (executedOps.length > 0 && typeof makeLine === 'function') {
        const executedContainer = document.createElement('div');
        executedContainer.className = 'executed-cash';
        const list = document.createElement('ul');
        list.className = 'executed-list';
        executedOps.forEach(tx => {
          const li = document.createElement('li');
          const line = makeLine(tx);
          if (line) li.appendChild(line);
          list.appendChild(li);
        });
        executedContainer.appendChild(list);
        dDet.appendChild(executedContainer);
      }
      
      elements.push(dDet);
    }
    
    return elements;
  }
  
  return { renderAccordion };
}

function ensureBudgetCardStyles() {
  if (document.getElementById('budget-card-styles')) return;
  const st = document.createElement('style');
  st.id = 'budget-card-styles';
  st.textContent = `
    /* Gorgeous budget card for the accordion list */
    .op-line.budget-card{
      position: relative;
      /* Match width and alignment of other day blocks (e.g., Executados) */
      margin: 10px 0 8px;
      width: 100%;
      box-sizing: border-box;
      padding: 12px 14px;
      border-radius: 14px;
      background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02));
      border: 1px solid rgba(255,255,255,0.08);
      box-shadow: 0 10px 24px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.05);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      transition: transform .15s ease, box-shadow .2s ease;
      color: var(--txt-main, #EDEDEF);
    }
    .op-line.budget-card:active{ transform: scale(0.995); }

    .op-line.budget-card .budget-card__header{ display:flex; gap:6px; }
    .op-line.budget-card .budget-card__tag{
      color:#5DD39E; font-weight:700; letter-spacing:.01em;
    }
    .op-line.budget-card .budget-card__period{
      color: rgba(255,255,255,0.75); font-size:12px;
    }
    .op-line.budget-card .budget-card__meta{
      color: rgba(255,255,255,0.65); font-size:12px; margin-top:-2px;
    }
    .op-line.budget-card .budget-card__details{
      display:flex; justify-content:space-between; align-items:center; margin-top:6px; font-size:13px; color: var(--txt-main, #EDEDEF);
    }
    .op-line.budget-card .budget-card__progress{
      height:6px; background: rgba(255,255,255,0.22); border-radius: 6px; overflow:hidden; margin-top:10px; position:relative;
    }
    .op-line.budget-card .budget-card__progress::before{
      content:''; position:absolute; inset:0; pointer-events:none; background:linear-gradient(90deg, rgba(255,255,255,0.05), rgba(255,255,255,0));
    }
    .op-line.budget-card .budget-card__progress-fill{
      height:100%; background: linear-gradient(90deg, #5DD39E, #3ecf8e); border-radius:6px; transition: width .35s ease;
    }

    /* Light theme tweaks */
    html[data-theme="light"] .op-line.budget-card{ background:#ffffffec; border:1px solid rgba(0,0,0,0.10); box-shadow:0 6px 14px rgba(0,0,0,0.08); color:#111; }
    html[data-theme="light"] .op-line.budget-card .budget-card__period{ color: rgba(0,0,0,0.6); }
    html[data-theme="light"] .op-line.budget-card .budget-card__meta{ color: rgba(0,0,0,0.55); }
    html[data-theme="light"] .op-line.budget-card .budget-card__details{ color:#111; }
    html[data-theme="light"] .op-line.budget-card .budget-card__progress{ background: rgba(0,0,0,0.12); }
  `;
  document.head.appendChild(st);
}
