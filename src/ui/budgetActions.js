import { removeAdHocBudget, closeRecurringBudget, endRecurrence } from '../services/budgetEditor.js';
import { askConfirmDelete } from './modalHelpers.js';

function ensureStyles(){
  if (document.getElementById('budget-actions-styles')) return;
  const st = document.createElement('style');
  st.id = 'budget-actions-styles';
  st.textContent = `
    .budget-actions-btn{ position:absolute; top:8px; right:8px; width:28px; height:28px; border-radius:8px; background:rgba(0,0,0,0.18); color:#fff; display:flex; align-items:center; justify-content:center; cursor:pointer; border:1px solid rgba(255,255,255,0.18); }
    html[data-theme="light"] .budget-actions-btn{ background:#f3f4f6; color:#111; border:1px solid rgba(0,0,0,0.08); }
    .budget-actions-menu{ position:absolute; right:8px; top:40px; min-width:180px; background:#1f1f23; color:#EDEDEF; border:1px solid rgba(255,255,255,0.08); border-radius:10px; box-shadow:0 10px 24px rgba(0,0,0,0.28); z-index:9999; overflow:hidden; }
    .budget-actions-menu.hidden{ display:none }
    .budget-actions-menu button{ display:block; width:100%; text-align:left; padding:10px 12px; background:transparent; color:inherit; border:none; cursor:pointer; }
    .budget-actions-menu button:hover{ background:rgba(255,255,255,0.06); }
    html[data-theme="light"] .budget-actions-menu{ background:#fff; color:#111; border:1px solid rgba(0,0,0,0.08); box-shadow:0 10px 24px rgba(0,0,0,0.12); }
    html[data-theme="light"] .budget-actions-menu button:hover{ background:rgba(0,0,0,0.04); }
  `;
  document.head.appendChild(st);
}

export function attachBudgetActions(cardEl, budget, ctx = {}){
  try{ ensureStyles(); } catch(_){}
  if (!cardEl || !budget) return;
  // Avoid duplicate buttons
  if (cardEl.querySelector(':scope > .budget-actions-btn')) return;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'budget-actions-btn';
  btn.title = 'Ações';
  btn.textContent = '⋯';
  cardEl.style.position = cardEl.style.position || 'relative';
  cardEl.appendChild(btn);

  const menu = document.createElement('div');
  menu.className = 'budget-actions-menu hidden';
  cardEl.appendChild(menu);

  const addItem = (label, handler) => {
    const it = document.createElement('button');
    it.textContent = label;
    it.onclick = async (e) => {
      e.stopPropagation();
      menu.classList.add('hidden');
      try{ await handler(); } catch(err){ console.warn('[budgetActions] action failed', err); }
      try{ typeof ctx.afterChange === 'function' && ctx.afterChange(); } catch(_){}
    };
    menu.appendChild(it);
  };

  const afterChange = () => {
    try { ctx.refreshBudgets && ctx.refreshBudgets(); } catch(_){}
    try { window.__gastos?.refreshPanorama?.(); } catch(_){}
    try { window.__gastos?.renderTable?.(); } catch(_){}
  };

  const commonCtx = {
    getTransactions: () => (window.__gastos?.getTransactions?.() || []),
    setTransactions: (list) => { try { window.__gastos?.setTransactions?.(list); } catch(_){} },
  };

  if (budget.budgetType === 'ad-hoc'){
    addItem('Editar', async () => {
      const mod = await import('./budgetEditModal.js');
      mod.openEditBudgetModal(budget, { afterChange });
    });
    addItem('Excluir', async () => {
      try {
        const ok = await askConfirmDelete(`orçamento "${budget.tag}"`);
        if (!ok) return;
      } catch (_) { /* fallback to proceed */ }
      await removeAdHocBudget(budget, { unlinkOps: true, ...commonCtx });
    });
    addItem('Histórico', async () => {
      try { window.__gastos?.showBudgetHistory?.(budget.tag); } catch(_){}
    });
  } else if (budget.budgetType === 'recurring'){
    addItem('Editar valor do ciclo', async () => {
      const mod = await import('./budgetEditModal.js');
      mod.openEditRecurringValueModal(budget);
    });
    addItem('Fechar ciclo', async () => {
      try {
        const ok = await askConfirmDelete(`fechar o ciclo do orçamento "${budget.tag}"`);
        if (!ok) return;
      } catch (_) {}
      await closeRecurringBudget(budget);
    });
    addItem('Encerrar recorrência', async () => {
      try {
        const ok = await askConfirmDelete(`encerrar a recorrência do orçamento "${budget.tag}"`);
        if (!ok) return;
      } catch (_) {}
      await endRecurrence(budget, commonCtx);
    });
    addItem('Histórico', async () => {
      try { window.__gastos?.showBudgetHistory?.(budget.tag); } catch(_){}
    });
  }

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    menu.classList.toggle('hidden');
  });
  document.addEventListener('click', (e) => {
    if (!menu.contains(e.target) && e.target !== btn){ menu.classList.add('hidden'); }
  });

  // Provide external refresh hook
  ctx.afterChange = ctx.afterChange || afterChange;
}

// Swipe-based actions, matching the transaction line pattern
export function attachBudgetSwipe(cardEl, budget, ctx = {}){
  if (!cardEl || !budget) return;
  // If already wrapped, skip
  if (cardEl.parentElement && cardEl.parentElement.classList.contains('swipe-wrapper')) return;
  const parent = cardEl.parentElement;
  const wrap = document.createElement('div');
  wrap.className = 'swipe-wrapper';
  const actions = document.createElement('div');
  actions.className = 'swipe-actions';
  // Compose action buttons
  const mkBtn = (iconClass, handler, title = '') => {
    const b = document.createElement('button');
    b.className = 'icon';
    const i = document.createElement('div');
    i.className = `icon-action ${iconClass}`;
    b.appendChild(i);
    if (title) { b.title = title; b.setAttribute('aria-label', title); }
    b.addEventListener('click', (e) => { e.stopPropagation(); handler && handler(); });
    return b;
  };

  const refresh = () => {
    try { ctx.refreshBudgets && ctx.refreshBudgets(); } catch(_){}
    try { window.__gastos?.refreshPanorama?.(); } catch(_){}
    try { window.__gastos?.renderTable?.(); } catch(_){}
  };
  const commonCtx = {
    getTransactions: () => (window.__gastos?.getTransactions?.() || []),
    setTransactions: (l) => { try { window.__gastos?.setTransactions?.(l); } catch(_){} },
  };

  if (budget.budgetType === 'ad-hoc'){
    actions.appendChild(mkBtn('icon-edit', async () => {
      const mod = await import('./budgetEditModal.js');
      mod.openEditBudgetModal(budget, { afterChange: refresh });
    }, 'Editar orçamento'));
    actions.appendChild(mkBtn('icon-delete', async () => {
      try {
        const ok = await askConfirmDelete(`orçamento "${budget.tag}"`);
        if (!ok) return;
      } catch (_) {}
      const { removeAdHocBudget } = await import('../services/budgetEditor.js');
      await removeAdHocBudget(budget, { unlinkOps: true, ...commonCtx });
      refresh();
    }, 'Excluir orçamento'));
  } else if (budget.budgetType === 'recurring'){
    actions.appendChild(mkBtn('icon-edit', async () => {
      const mod = await import('./budgetEditModal.js');
      mod.openEditRecurringValueModal(budget);
    }, 'Editar valor do ciclo'));
    actions.appendChild(mkBtn('icon-delete', async () => {
      try {
        const ok = await askConfirmDelete(`encerrar a recorrência do orçamento "${budget.tag}"`);
        if (!ok) return;
      } catch (_) {}
      const { endRecurrence } = await import('../services/budgetEditor.js');
      await endRecurrence(budget, commonCtx); refresh();
    }, 'Encerrar recorrência'));
  }

  // Build structure: wrap -> cardEl + actions
  parent && parent.insertBefore(wrap, cardEl);
  wrap.appendChild(actions);
  wrap.appendChild(cardEl);
}
