import { loadBudgets } from '../services/budgetStorage.js';
import { recomputeBudget } from '../services/budgetCalculations.js';

export function setupBudgetAutocomplete(ctx = {}) {
  const {
    txModal = document.getElementById('txModal'),
    descInput = document.getElementById('desc'),
    getTransactions = () => (window.__gastos?.getTransactions?.() || []),
    isBudgetsEnabled = () => (window.__gastos?.isBudgetsFeatureEnabled?.() || false),
  } = ctx || {};

  if (!txModal || !descInput) return;

  ensureStyles();

  const panel = document.createElement('div');
  panel.className = 'budget-autocomplete hidden';
  panel.setAttribute('role', 'listbox');
  panel.addEventListener('mousedown', (e) => e.preventDefault());
  txModal.appendChild(panel);

  let open = false;

  function close() {
    open = false;
    panel.classList.add('hidden');
    panel.innerHTML = '';
  }

  function openWith(items) {
    if (!Array.isArray(items) || items.length === 0) { close(); return; }
    panel.innerHTML = '';
    items.forEach((b) => {
      const el = document.createElement('div');
      el.className = 'budget-ac-item';
      const start = (b.startDate || '').slice(8,10) + '/' + (b.startDate || '').slice(5,7);
      const end = (b.endDate || '').slice(8,10) + '/' + (b.endDate || '').slice(5,7);
      const initial = safeFmt(b.initialValue);
      const remaining = safeFmt(Math.max(0, Number(b.initialValue || 0) - Number(b.spentValue || 0)));
      el.innerHTML = `<span class="tag">${b.tag}</span><span class="values">${remaining} / ${initial} <small>(${start}–${end})</small></span>`;
      el.onclick = () => {
        insertTagIntoDesc(b.tag);
        close();
      };
      panel.appendChild(el);
    });
    positionPanel();
    open = true;
    panel.classList.remove('hidden');
  }

  function insertTagIntoDesc(tag) {
    if (!descInput) return;
    const cur = descInput.value || '';
    const has = cur.includes(tag);
    if (has) return; // already present
    const space = cur && !/^\s/.test(cur) ? ' ' : '';
    descInput.value = `${tag}${space}${cur}`.trim();
    try { descInput.dispatchEvent(new Event('input', { bubbles: true })); } catch (_) {}
  }

  function positionPanel() {
    if (!descInput) return;
    const r = descInput.getBoundingClientRect();
    const host = txModal.getBoundingClientRect();
    const top = r.bottom - host.top + 6;
    const left = r.left - host.left;
    panel.style.top = `${top}px`;
    panel.style.left = `${left}px`;
    panel.style.width = `${Math.max(220, r.width)}px`;
  }

  function listActiveBudgets() {
    const budgets = (loadBudgets() || []).filter(b => b && b.status === 'active');
    const txs = getTransactions();
    return budgets.map(b => recomputeBudget({ ...b }, txs) || b);
  }

  function refreshAndOpen() {
    if (!isBudgetsEnabled()) return;
    try {
      const items = listActiveBudgets();
      openWith(items);
    } catch (_) {}
  }

  function ensureStyles() {
    if (document.getElementById('budget-ac-styles')) return;
    const st = document.createElement('style');
    st.id = 'budget-ac-styles';
    st.textContent = `
      .budget-autocomplete{position:absolute;z-index:9999;background:#252527;border:1px solid #3e3e40;border-radius:8px;box-shadow:0 6px 18px rgba(0,0,0,0.25);padding:6px;max-height:220px;overflow:auto}
      .budget-autocomplete.hidden{display:none}
      .budget-ac-item{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:8px 10px;border-radius:6px;color:#fff;cursor:pointer}
      .budget-ac-item:hover{background:#2f2f31}
      .budget-ac-item .tag{color:#5DD39E;font-weight:600}
      .budget-ac-item .values{color:#B3B3B3;font-size:12px}
    `;
    document.head.appendChild(st);
  }

  const safeFmt = (v) => {
    try { return (window.__gastos?.safeFmtCurrency || ((n)=>String(n)))(Number(v)||0); } catch (_) { return String(v); }
  };

  descInput.addEventListener('focus', () => {
    refreshAndOpen();
  });
  descInput.addEventListener('input', () => {
    if (!open) return;
    positionPanel();
  });
  window.addEventListener('resize', () => { if (open) positionPanel(); });
  txModal.addEventListener('click', (e) => {
    if (panel.contains(e.target)) return;
    if (e.target === descInput) return;
    close();
  });
}

