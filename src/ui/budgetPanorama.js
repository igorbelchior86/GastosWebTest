import { loadBudgets } from '../services/budgetStorage.js';
import { recomputeBudget } from '../services/budgetCalculations.js';

export function setupBudgetPanorama(ctx = {}) {
  const {
    isPanoramaEnabled = () => true,
    getTransactions = () => (window.__gastos?.getTransactions?.() || []),
    safeFmtCurrency = (v) => String(v),
    todayISO = () => (window.todayISO ? window.todayISO() : new Date().toISOString().slice(0, 10)),
    showBudgetHistory = () => {},
    updateModalOpenState = () => {},
  } = ctx;

  ensureStyles();

  const modal = document.createElement('div');
  modal.id = 'panoramaModal';
  modal.className = 'bottom-modal backdrop-blur hidden sheet-modal';
  modal.innerHTML = `
    <div class="bottom-modal-box">
      <div class="modal-drag"></div>
      <button class="modal-close-btn" aria-label="Fechar">✕</button>
      <header class="sheet-header"><h2>Panorama</h2></header>
      <div class="modal-content panorama-content">
        <section class="widget" role="presentation">
          <div class="bars">
            <div class="bar income">
              <span class="label">Entradas</span>
              <span class="value"></span>
              <div class="fill"></div>
            </div>
            <div class="bar expense">
              <span class="label">Saídas</span>
              <span class="value"></span>
              <div class="fill"></div>
            </div>
          </div>
          <canvas class="yearly-canvas hidden" width="360" height="180"></canvas>
          <p class="mode-hint"></p>
        </section>
        <section class="budgets">
          <h4>Orçamentos ativos</h4>
          <div class="budgets__list"></div>
          <p class="empty hidden">Nenhum orçamento ativo.</p>
        </section>
      </div>
    </div>`;
  document.body.appendChild(modal);

  const closeBtn = modal.querySelector('.modal-close-btn');
  const incomeBar = modal.querySelector('.bar.income');
  const expenseBar = modal.querySelector('.bar.expense');
  const budgetsList = modal.querySelector('.budgets__list');
  const emptyEl = modal.querySelector('.budgets .empty');
  const widget = modal.querySelector('.widget');
  const yearlyCanvas = modal.querySelector('.yearly-canvas');
  const modeHint = modal.querySelector('.mode-hint');
  const barsWrapper = modal.querySelector('.bars');

  let viewMode = 'monthly';
  let renderedMode = null; // controla o estado atual para aplicar animação só quando alternar

  closeBtn.onclick = () => hide();
  modal.addEventListener('click', (e) => {
    if (e.target === modal) hide();
  });
  if (widget) {
    widget.addEventListener('click', () => {
      viewMode = viewMode === 'monthly' ? 'yearly' : 'monthly';
      try { window.__gastos?.emitTelemetry?.(viewMode === 'yearly' ? 'panorama_toggle_yearly' : 'panorama_toggle_monthly', { origin: 'widget' }); } catch (_) {}
      render();
    });
  }

  function handleOpen() {
    if (!isPanoramaEnabled()) return false;
    render();
    modal.classList.remove('hidden');
    try { updateModalOpenState(); } catch (_) {}
    try { window.__gastos?.emitTelemetry?.('panorama_open', { origin: 'header' }); } catch (_) {}
    return true;
  }

  function hide() {
    modal.classList.add('hidden');
    try { updateModalOpenState(); } catch (_) {}
    if (viewMode !== 'monthly') {
      viewMode = 'monthly';
      updateHint(false);
    }
  }

  function render() {
    const today = todayISO();
    const [year, month] = today.split('-');
    const txs = getTransactions() || [];

    const summary = computeMonthlySummary(txs, year, month);
    const isYearly = viewMode === 'yearly';
    updateHint(isYearly);
    if (isYearly) {
      // prepara dados do canvas antes de mostrar
      drawYearlyBars(yearlyCanvas, computeYearlySeries(txs, year, month));
      animateTo('yearly');
    } else {
      // atualiza barras antes de mostrar
      setBar(incomeBar, summary.income, summary.max);
      setBar(expenseBar, summary.expense, summary.max);
      animateTo('monthly');
    }

    const budgets = loadBudgets()
      .filter((b) => b && b.status === 'active')
      .map((b) => recomputeBudget({ ...b }, txs) || b)
      .sort((a, b) => String(a.endDate || '').localeCompare(String(b.endDate || '')));

    budgetsList.innerHTML = '';
    if (!budgets.length) {
      emptyEl.classList.remove('hidden');
      return;
    }
    emptyEl.classList.add('hidden');

    budgets.forEach((budget) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'budget-card';
      const { spent, remaining, total } = computeCardTotals(budget, txs);
      const ratio = total > 0 ? Math.min(1, spent / total) : 0;
      const start = formatDay(budget.startDate);
      const end = formatDay(budget.endDate);
      card.innerHTML = `
        <div class="row">
          <span class="tag">${budget.tag || '#tag'}</span>
          <span class="period">${start}–${end}</span>
        </div>
        <div class="row">
          <span class="spent">Gasto: ${fmt(spent)} / ${fmt(total)}</span>
          <span class="rest">Restante: ${fmt(remaining)}</span>
        </div>
        <div class="progress"><div class="fill" style="width:${ratio * 100}%"></div></div>
      `;
      card.onclick = () => {
        try { window.__gastos?.emitTelemetry?.('panorama_budget_card_open', { tag: budget.tag }); } catch (_) {}
        try { showBudgetHistory(budget.tag); } catch (_) {}
      };
      budgetsList.appendChild(card);
    });
  }

  function computeCardTotals(budget, txs) {
    const trigId = budget && budget.triggerTxId != null ? String(budget.triggerTxId) : null;
    const startIso = (budget.startDate || '').slice(0,10);
    const endIso = (budget.endDate || '').slice(0,10);
    const spent = (txs || []).reduce((sum, tx) => {
      if (!tx || tx.budgetTag !== budget.tag) return sum;
      if (trigId && String(tx.id) === trigId) return sum; // não contar a reserva
      if (tx.planned === true) return sum;
      const iso = (tx.opDate || tx.postDate || '').slice(0,10);
      if (!iso) return sum;
      if (startIso && iso < startIso) return sum;
      if (endIso && iso > endIso) return sum;
      const v = Number(tx.val);
      if (!Number.isFinite(v)) return sum;
      return sum + Math.abs(v);
    }, 0);
    const total = Number(budget.initialValue || 0);
    const remaining = Math.max(total - spent, 0);
    return { spent, remaining, total };
  }

  // Crossfade suave entre modos sem bibliotecas
  function animateTo(targetMode) {
    if (!barsWrapper || !yearlyCanvas) return;
    // Primeira renderização: apenas garante estado base sem animar
    if (!renderedMode) {
      if (targetMode === 'yearly') {
        barsWrapper.classList.add('hidden');
        yearlyCanvas.classList.remove('hidden');
        setOpacity(yearlyCanvas, 1, 0);
        setOpacity(barsWrapper, 0, 0);
      } else {
        yearlyCanvas.classList.add('hidden');
        barsWrapper.classList.remove('hidden');
        setOpacity(barsWrapper, 1, 0);
        setOpacity(yearlyCanvas, 0, 0);
      }
      renderedMode = targetMode;
      return;
    }
    if (renderedMode === targetMode) return; // nada a fazer

    const fromEl = targetMode === 'yearly' ? barsWrapper : yearlyCanvas;
    const toEl = targetMode === 'yearly' ? yearlyCanvas : barsWrapper;

    // Mostrar destino invisível para animar
    toEl.classList.remove('hidden');
    setOpacity(toEl, 0, 6); // inicia invisível e levemente deslocado
    // força reflow para aplicar transição
    void toEl.offsetWidth;

    // Inicia animação
    setOpacity(fromEl, 0, -6); // some com fade/slide up
    setOpacity(toEl, 1, 0);    // entra com fade/slide

    // Ao final, esconder origem
    const done = () => {
      fromEl.classList.add('hidden');
      clearTransient(fromEl);
      clearTransient(toEl);
      fromEl.removeEventListener('transitionend', done);
    };
    fromEl.addEventListener('transitionend', done);

    renderedMode = targetMode;
  }

  function setOpacity(el, opacity, translateY) {
    if (!el) return;
    el.style.opacity = String(opacity);
    el.style.transform = translateY ? `translateY(${translateY}px)` : 'translateY(0)';
  }
  function clearTransient(el) {
    if (!el) return;
    el.style.opacity = '';
    el.style.transform = '';
  }

  function setBar(el, value, max) {
    const val = Number(value || 0);
    const absVal = Math.abs(val);
    const limit = max > 0 ? Math.min(1, absVal / max) : 0;
    let runner = el.querySelector('.fill');
    if (!runner) {
      runner = document.createElement('div');
      runner.className = 'fill';
      el.appendChild(runner);
    }
    runner.style.width = `${limit * 100}%`;
    const valueEl = el.querySelector('.value');
    if (valueEl) valueEl.textContent = fmt(absVal);
  }

  function computeMonthlySummary(txs, year, month) {
    const prefix = `${year}-${month}`;
    let income = 0;
    let expense = 0;
    (txs || []).forEach(tx => {
      if (!tx || tx.planned) return;
      const iso = (tx.opDate || '').slice(0, 7);
      if (iso !== prefix) return;
      const val = Number(tx.val) || 0;
      if (val > 0) income += val;
      else expense += Math.abs(val);
    });
    const max = Math.max(income, expense, 1);
    return { income, expense, max };
  }

  function formatDay(iso) {
    if (!iso) return '';
    try {
      const d = new Date(`${iso}T00:00:00`);
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    } catch (_) {
      return iso;
    }
  }

  function computeYearlySeries(txs, year, month) {
    const series = [];
    const baseDate = new Date(Number(year), Number(month) - 1, 1);
    for (let i = 11; i >= 0; i--) {
      const date = new Date(baseDate);
      date.setMonth(date.getMonth() - i);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('pt-BR', { month: 'short' });
      series.push({ key, label, income: 0, expense: 0 });
    }
    const buckets = new Map(series.map(item => [item.key, item]));
    (txs || []).forEach((tx) => {
      if (!tx || tx.planned) return;
      const key = (tx.opDate || '').slice(0, 7);
      const bucket = buckets.get(key);
      if (!bucket) return;
      const val = Number(tx.val) || 0;
      if (val > 0) bucket.income += val;
      else bucket.expense += Math.abs(val);
    });
    return series;
  }

  function drawYearlyBars(canvas, data) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const ratio = window.devicePixelRatio || 1;
    const displayWidth = canvas.clientWidth || canvas.width;
    const displayHeight = canvas.clientHeight || canvas.height;
    if (canvas.width !== displayWidth * ratio || canvas.height !== displayHeight * ratio) {
      canvas.width = displayWidth * ratio;
      canvas.height = displayHeight * ratio;
    }
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    const width = displayWidth;
    const height = displayHeight;
    ctx.clearRect(0, 0, width, height);
    const padding = 24;
    const barGroupWidth = (width - padding * 2) / data.length;
    const barWidth = barGroupWidth * 0.35;
    const spacing = barGroupWidth * 0.3;
    const maxVal = Math.max(1, ...data.map(d => Math.max(d.income, d.expense)));
    ctx.fillStyle = '#B3B3B3';
    ctx.font = '12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    data.forEach((item, index) => {
      const groupX = padding + index * barGroupWidth;
      const incomeHeight = (item.income / maxVal) * (height - padding * 2);
      const expenseHeight = (item.expense / maxVal) * (height - padding * 2);
      const baseY = height - padding;
      ctx.fillStyle = '#5DD39E';
      ctx.fillRect(groupX, baseY - incomeHeight, barWidth, incomeHeight);
      ctx.fillStyle = '#FF6B6B';
      ctx.fillRect(groupX + barWidth + spacing, baseY - expenseHeight, barWidth, expenseHeight);
      ctx.fillStyle = '#B3B3B3';
      ctx.fillText(item.label.toUpperCase(), groupX + barWidth + spacing / 2, baseY + 14);
    });
  }

  function updateHint(isYearly) {
    if (!modeHint) return;
    modeHint.textContent = isYearly
      ? 'Toque para voltar ao mês atual'
      : 'Toque para ver os últimos 12 meses';
  }

  function emitTelemetry(eventName) {
    try {
      window.__gastos?.telemetry?.emit?.(eventName, { origin: 'panorama' });
    } catch (_) {}
  }

  const fmt = (v) => {
    try { return safeFmtCurrency(Number(v) || 0); } catch (_) { return String(v); }
  };

  return { handleOpen, hide };
}

function ensureStyles() {
  if (document.getElementById('panorama-styles')) return;
  const st = document.createElement('style');
  st.id = 'panorama-styles';
  st.textContent = `
    .panorama-content{ color: var(--txt-main, #EDEDEF); }
    .panorama-content .widget{border-radius:12px;padding:16px;display:flex;flex-direction:column;gap:12px;cursor:pointer}
    .panorama-content .widget:active{opacity:.96}
    .panorama-content .widget .bars{display:flex;gap:16px;transition:opacity .24s ease, transform .24s ease; will-change:opacity,transform}
    .panorama-content .widget .bars.hidden{display:none}
    .panorama-content .widget .bar{flex:1;border-radius:10px;padding:12px 14px;display:flex;flex-direction:column;gap:8px;position:relative;overflow:hidden;color:var(--txt-main,#EDEDEF)}
    .panorama-content .widget .bar .label{font-size:12px;color:rgba(255,255,255,0.75)}
    .panorama-content .widget .bar .value{font-size:16px;font-weight:600}
    .panorama-content .widget .bar .fill{position:absolute;left:0;bottom:0;height:4px;background:#5DD39E;border-radius:2px;width:0;transition:width .3s ease}
    .panorama-content .widget .bar.expense .fill{background:#FF6B6B}
    .panorama-content .widget .yearly-canvas{width:100%;max-width:100%;height:auto;display:block;background:rgba(0,0,0,0.12);border-radius:12px;padding:8px;box-sizing:border-box;transition:opacity .24s ease, transform .24s ease; will-change:opacity,transform}
    .panorama-content .widget .yearly-canvas.hidden{display:none}
    .panorama-content .widget .mode-hint{margin:6px 0 0 0;font-size:12px;color:rgba(255,255,255,0.6);text-align:center}
    .panorama-content .budgets h4{margin:0;font-size:14px;opacity:.8;font-weight:500;text-transform:uppercase;letter-spacing:.06em}
    .panorama-content .budgets__list{display:flex;flex-direction:column;gap:12px;max-height:46vh;overflow:auto}
    .panorama-content .budget-card{border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:12px 14px;width:100%;text-align:left;display:flex;flex-direction:column;gap:8px;cursor:pointer;background:linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02));box-shadow:0 10px 24px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.05);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);transition:transform .15s ease, box-shadow .2s ease;color:var(--txt-main,#EDEDEF)}
    .panorama-content .budget-card:active{transform:scale(.995)}
    .panorama-content .budget-card .row{display:flex;justify-content:space-between;align-items:center;font-size:13px}
    .panorama-content .budget-card .tag{color:#5DD39E;font-weight:700;letter-spacing:.01em}
    .panorama-content .budget-card .period{color:rgba(255,255,255,0.75)}
    .panorama-content .budget-card .progress{height:6px;background:rgba(255,255,255,.22);border-radius:6px;overflow:hidden;position:relative}
    .panorama-content .budget-card .progress::before{content:'';position:absolute;inset:0;background:linear-gradient(90deg,rgba(255,255,255,.05),rgba(255,255,255,0));pointer-events:none}
    .panorama-content .budget-card .progress .fill{height:100%;background:linear-gradient(90deg,#5DD39E,#3ecf8e);width:0;transition:width .35s ease}
    .panorama-content .budgets .empty{font-size:13px;text-align:center;margin-top:12px;opacity:.8}
    .panorama-content .budgets .empty.hidden{display:none}

    /* Light theme tweaks */
    html[data-theme="light"] .panorama-content{ color:#111; }
    html[data-theme="light"] .panorama-content .budget-card{ background:#ffffffec; border:1px solid rgba(0,0,0,0.10); box-shadow:0 6px 14px rgba(0,0,0,0.08); color:#111; }
    html[data-theme="light"] .panorama-content .budget-card .period{ color: rgba(0,0,0,0.6); }
    html[data-theme="light"] .panorama-content .budget-card .progress{ background: rgba(0,0,0,0.12); }
  `;
  document.head.appendChild(st);
}
