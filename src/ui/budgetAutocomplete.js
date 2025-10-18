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
      const start = formatDayMonthShort((b.startDate || '').slice(0,10));
      const end = formatDayMonthShort((b.endDate || '').slice(0,10));
      const remaining = safeFmt(Math.max(0, Number(b.initialValue || 0) - Number(b.spentValue || 0)));
      el.innerHTML = `
        <div class="row top">
          <span class="tag">${b.tag}</span>
          <span class="remaining">Restam: ${remaining}</span>
        </div>
        <div class="row sub">${start} a ${end}</div>
      `;
      el.onclick = () => {
        try {
          const api = window.__gastos || {};
          if (typeof api.setPendingBudgetTag === 'function') {
            api.setPendingBudgetTag(b.tag, b);
            // Keep focus on description so user can type right away
            try { descInput && descInput.focus(); } catch (_) {}
          } else {
            insertTagIntoDesc(b.tag);
          }
        } catch (_) {
          insertTagIntoDesc(b.tag);
        }
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
    // Match the description input width exactly for visual alignment
    panel.style.width = `${r.width}px`;
    // Mirror the input border radius/border to avoid mismatch
    try {
      const cs = getComputedStyle(descInput);
      if (cs && cs.borderRadius) panel.style.borderRadius = cs.borderRadius;
      if (cs && cs.borderWidth && cs.borderStyle && cs.borderColor) {
        panel.style.border = `${cs.borderWidth} ${cs.borderStyle} ${cs.borderColor}`;
      }
    } catch (_) {}
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
      .budget-autocomplete{position:absolute;z-index:9999;box-sizing:border-box;background:#2b2b2e;border:1px solid #3e3e40;border-radius:14px;box-shadow:0 10px 24px rgba(0,0,0,0.28);padding:6px;max-height:220px;overflow:auto}
      .budget-autocomplete.hidden{display:none}
      .budget-ac-item{display:flex;flex-direction:column;gap:4px;padding:12px;border-radius:10px;color:#fff;cursor:pointer}
      .budget-ac-item + .budget-ac-item{border-top:1px solid rgba(255,255,255,0.08); margin-top:4px;}
      .budget-ac-item:hover{background:#323235}
      .budget-ac-item .row.top{display:flex;justify-content:space-between;align-items:center}
      .budget-ac-item .tag{color:#5DD39E;font-weight:700}
      .budget-ac-item .remaining{font-weight:700}
      .budget-ac-item .row.sub{color:#B3B3B3;font-size:12px}
      html[data-theme="light"] .budget-autocomplete{background:#ffffff;border:1px solid rgba(0,0,0,0.10);box-shadow:0 6px 14px rgba(0,0,0,0.08);}
      html[data-theme="light"] .budget-ac-item{color:#111}
      html[data-theme="light"] .budget-ac-item + .budget-ac-item{border-top:1px solid rgba(0,0,0,0.08)}
      html[data-theme="light"] .budget-ac-item:hover{background:rgba(0,0,0,0.06)}
    `;
    document.head.appendChild(st);
  }

  const safeFmt = (v) => {
    try { return (window.__gastos?.safeFmtCurrency || ((n)=>String(n)))(Number(v)||0); } catch (_) { return String(v); }
  };

  function formatDayMonthShort(iso) {
    if (!iso) return '';
    try {
      const date = new Date(`${iso}T00:00:00`);
      const day = String(date.getDate()).padStart(2, '0');
      let mon = date.toLocaleDateString('pt-BR', { month: 'short' });
      mon = (mon || '').replace('.', '');
      mon = mon.charAt(0).toUpperCase() + mon.slice(1);
      return `${day} de ${mon}`;
    } catch (_) { return iso; }
  }

  descInput.addEventListener('focus', () => {
    // Do not open if a budget pill is already selected
    if (window.__gastos && window.__gastos.pendingBudgetTag) return;
    refreshAndOpen();
  });
  descInput.addEventListener('input', () => {
    if (window.__gastos && window.__gastos.pendingBudgetTag) return; // keep dropdown closed while pill is active
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
