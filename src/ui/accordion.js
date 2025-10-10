// Accordion UI rendering logic extracted from main.js
// This module encapsulates the calculation of running balances and
// construction of the month/day/invoice accordion. It receives all
// dependencies via the config object passed to `initAccordion` and
// exposes a `renderAccordion` function used by the main application.

import { formatToISO, todayISO, occursOn } from '../utils/date.js';
import { postDateForCard } from '../utils/date.js';

/**
 * Initialize the accordion renderer.
 *
 * @param {Object} config Configuration object providing dependencies.
 * @param {HTMLElement} config.acc The accordion DOM element.
 * @param {Function} config.getTransactions Optional function to return the current transaction list.
 * @param {Array} config.transactions Fallback array of transactions if getTransactions is not provided.
 * @param {Array} config.cards List of card objects used to determine invoice cycles.
 * @param {Object} config.state Application state containing startDate and startBalance.
 * @param {Function} config.calculateDateRange Function that returns the min and max ISO date strings.
 * @param {number} config.VIEW_YEAR The currently selected year to render.
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
    cards,
    state,
    calculateDateRange,
    VIEW_YEAR,
    txByDate,
    safeFmtCurrency,
    SALARY_WORDS,
    makeLine
  } = config;

  // Local alias for postDate calculation: compute due date for a given opDate and card.
  function post(opISO, cardName) {
    return postDateForCard(opISO, cardName, cards);
  }

  // Global cache for the complete running balance ledger
  let globalBalanceLedger = new Map();
  let ledgerGenerated = false;

  /**
   * Generate complete running balance ledger from anchor to multiple years ahead.
   * This runs once in background and caches everything.
   */
  function generateCompleteLedger() {
    if (ledgerGenerated) return globalBalanceLedger;
    
    console.log('[generateCompleteLedger] Building complete ledger...');
    
    const txs = getTransactions ? getTransactions() : transactions;
    const hasAnchor = !!state.startDate;
    const anchorISO = hasAnchor ? String(state.startDate) : '2025-01-01';
    const anchorBalance = (state.startBalance != null) ? state.startBalance : 0;
    
    // Generate ledger from anchor year to 2030 (enough for most use cases)
    const anchorYear = new Date(anchorISO).getFullYear();
    const startDate = new Date(anchorYear, 0, 1);
    const endDate = new Date(2030, 11, 31);
    
    console.log(`[generateCompleteLedger] Range: ${startDate.toISOString().slice(0,10)} to ${endDate.toISOString().slice(0,10)}, anchor: ${anchorISO} (${anchorBalance})`);
    
    let runningBalance = anchorBalance;
    let dayCount = 0;
    
    for (let current = new Date(startDate); current <= endDate; current.setDate(current.getDate() + 1)) {
      const iso = current.toISOString().slice(0, 10);
      dayCount++;
      
      // Reset to anchor balance at anchor date
      if (iso === anchorISO) {
        runningBalance = anchorBalance;
      }
      
      // Skip days before anchor
      if (iso < anchorISO) {
        globalBalanceLedger.set(iso, 0);
        continue;
      }
      
      // Get day transactions and calculate impact
      const dayTx = txByDate(iso);
      let dayImpact = 0;
      
      dayTx.forEach(t => {
        dayImpact += (t.val || 0);
      });
      
      runningBalance += dayImpact;
      globalBalanceLedger.set(iso, runningBalance);
      
      // Log progress every year
      if (current.getMonth() === 11 && current.getDate() === 31) {
        console.log(`[generateCompleteLedger] End of ${current.getFullYear()}: ${runningBalance.toFixed(2)}`);
      }
    }
    
    ledgerGenerated = true;
    console.log(`[generateCompleteLedger] Complete! ${dayCount} days, final balance: ${runningBalance.toFixed(2)}`);
    return globalBalanceLedger;
  }

  /**
   * Build a map of running balances for the current viewing year only.
   * Uses the pre-generated complete ledger for instant results.
   */
  function buildRunningBalanceMap() {
    // Ensure complete ledger is generated
    const completeLedger = generateCompleteLedger();
    
    // Extract only the viewing year from complete ledger
    const { minDate, maxDate } = calculateDateRange();
    const balanceMap = new Map();
    
    console.log(`[buildRunningBalanceMap] Extracting ${minDate} to ${maxDate} from complete ledger`);
    
    for (let current = new Date(minDate); current <= new Date(maxDate); current.setDate(current.getDate() + 1)) {
      const iso = current.toISOString().slice(0, 10);
      const balance = completeLedger.get(iso) || 0;
      balanceMap.set(iso, balance);
    }
    
    console.log(`[buildRunningBalanceMap] Extracted ${balanceMap.size} days for viewing`);
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
  function renderAccordion() {
    // Resolve the accordion element at render time so initialization
    // ordering doesn't prevent rendering if the DOM wasn't available
    // when initAccordion() was first called.
    const accEl = acc || (typeof document !== 'undefined' && document.getElementById('accordion'));
    if (!accEl) {
      try { console.debug('renderAccordion: accordion element not found'); } catch(_) {}
      return;
    }
    const startTime = performance.now();
    try { console.debug('renderAccordion: accEl found, transactions length =', (getTransactions ? (getTransactions() || []).length : (transactions || []).length)); } catch(_) {}
    
    // Verificar se o accordion está em modo skeleton (durante hidratação)
    const isSkeletonMode = accEl.dataset.state === 'skeleton';
    
    const { minDate, maxDate } = calculateDateRange();
    // Build the running balance map once per render
    const balanceMap = buildRunningBalanceMap();
    const txs = getTransactions ? getTransactions() : transactions;
    // Preserve which <details> are open before re-render
    const openKeys = Array.from(accEl.querySelectorAll('details[open]')).map(d => d.dataset.key || '');
    const openInvoices = Array.from(accEl.querySelectorAll('details.invoice[open]')).map(d => d.dataset.pd);
    
    // Performance optimization: use DocumentFragment to batch DOM operations
    const fragment = document.createDocumentFragment();
    const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    
    // Função auxiliar para aplicar shimmer nos valores quando em modo skeleton
    const currency = v => isSkeletonMode ? '<span class="skeleton skeleton-pill" style="width: 60px; height: 14px;"></span>' : safeFmtCurrency(v);
    const now = new Date();
    const curMonth = now.getMonth();
    const curYear = now.getFullYear();
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
    
    for (let mIdx = 0; mIdx < 12; mIdx++) {
      const nomeMes = new Date(VIEW_YEAR, mIdx).toLocaleDateString('pt-BR', { month: 'long' });
      const mDet = document.createElement('details');
      mDet.className = 'month';
      mDet.dataset.key = `m-${mIdx}`;
      const isCurrentYear = VIEW_YEAR === curYear;
      const isOpen = isCurrentYear ? (mIdx >= curMonth) : false;
      mDet.open = openKeys.includes(mDet.dataset.key) || isOpen;
      const monthTotal = (txs || [])
        .filter(t => new Date(t.postDate).getMonth() === mIdx)
        .reduce((s,t) => s + t.val, 0);
      let mSum = document.createElement('summary');
      mSum.className = 'month-divider';
      // Obter o último dia do mês
      const monthEndISO = new Date(VIEW_YEAR, mIdx + 1, 0).toISOString().slice(0, 10);
      
      // Simplesmente pegar o saldo do último dia do mês que já está calculado corretamente
      const monthEndBalance = balanceMap.get(monthEndISO) || 0;
      
      // Debug logs
      if (VIEW_YEAR === 2026 && mIdx === 0) {
        console.log(`[accordion] Janeiro 2026 debug:`, {
          VIEW_YEAR,
          mIdx,
          monthEndISO,
          monthEndBalance,
          balanceMapSize: balanceMap.size,
          hasKey: balanceMap.has(monthEndISO),
          balanceMapKeys: Array.from(balanceMap.keys()).slice(0, 10)
        });
      }
      
      let metaLabel = '';
      let metaValue = '';
      const isPastMonth = (VIEW_YEAR < curYear) || (VIEW_YEAR === curYear && mIdx < curMonth);
      const isCurrentMonth = VIEW_YEAR === curYear && mIdx === curMonth;
      
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
      // Number of days in this month
      const daysInMonth = new Date(VIEW_YEAR, mIdx + 1, 0).getDate();
      for (let d = 1; d <= daysInMonth; d++) {
        const dateObj = new Date(VIEW_YEAR, mIdx, d);
        const iso = formatToISO(dateObj);
        const allDayTx = txByDate(iso);
        
        // Filter transactions to only show those from the current viewing year
        const dayTx = allDayTx.filter(t => {
          // For non-recurring transactions, check if they belong to this year
          if (!t.recurrence) {
            const txYear = new Date(t.opDate).getFullYear();
            return txYear === VIEW_YEAR;
          }
          // For recurring transactions, they're already materialized for the correct date
          return true;
        });
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
        const addToGroup = (cardName, tx) => {
          if (!invoicesByCard[cardName]) invoicesByCard[cardName] = [];
          invoicesByCard[cardName].push(tx);
        };
        // Non‑recurring card transactions due today
        (txs || []).forEach(t => {
          if (t.method !== 'Dinheiro' && !t.recurrence && t.postDate === iso) {
            const validCard = cards.some(c => c && c.name === t.method && c.name !== 'Dinheiro');
            if (!validCard) return;
            addToGroup(t.method, t);
          }
        });
        // Recurring card transactions due today
        const scanStart = new Date(iso);
        scanStart.setDate(scanStart.getDate() - 60);
        for (const master of (txs || []).filter(t => t.recurrence && t.method !== 'Dinheiro')) {
          const validCard = cards.some(c => c && c.name === master.method && c.name !== 'Dinheiro');
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
        const dayBalance = balanceMap.has(iso) ? balanceMap.get(iso) : (state.startBalance || 0);
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
        const hasCardDue = cards.some(card => card.due === d);
        const hasSalary = dayTx.some(t => SALARY_WORDS.some(w => t.desc.toLowerCase().includes(w)));
        const labelParts = [baseLabel];
        if (hasCardDue) labelParts.push('<span class="icon-invoice"></span>');
        if (hasSalary) labelParts.push('<span class="icon-salary"></span>');
        const labelWithDue = labelParts.join('');
        dSum.innerHTML = `<span>${labelWithDue}</span><span class="day-balance" style="margin-left:auto">${saldoFormatado}</span>`;
        if (dayBalance < 0) dDet.classList.add('negative');
        dDet.appendChild(dSum);
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
        // Planned operations section
        const plannedOps = dayTx
          .filter(t => t.planned)
          .sort((a, b) => {
            const dateCmp = a.opDate.localeCompare(b.opDate);
            if (dateCmp !== 0) return dateCmp;
            return (a.ts || '').localeCompare(b.ts || '');
          });
        if (plannedOps.length > 0) {
          const plannedContainer = document.createElement('div');
          plannedContainer.className = 'planned-cash';
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
        const executedOps = dayTx
          .filter(t => !t.planned)
          .sort((a, b) => {
            const dateCmp = a.opDate.localeCompare(b.opDate);
            if (dateCmp !== 0) return dateCmp;
            return (a.ts || '').localeCompare(b.ts || '');
          });
        if (executedOps.length > 0) {
          const executedContainer = document.createElement('div');
          executedContainer.className = 'executed-cash';
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
    const endTime = performance.now();
    try { console.debug('renderAccordion: finished, months rendered =', accEl.querySelectorAll('details.month').length, 'time =', (endTime - startTime).toFixed(2) + 'ms (optimized with DocumentFragment)'); } catch(_) {}
  }
  // Function to invalidate ledger cache when data changes
  function invalidateLedger() {
    ledgerGenerated = false;
    globalBalanceLedger.clear();
    console.log('[invalidateLedger] Ledger cache cleared');
  }

  return { renderAccordion, invalidateLedger };
}
