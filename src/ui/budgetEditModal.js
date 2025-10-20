import { updateAdHocBudget } from '../services/budgetEditor.js';

function ensureStyles(){
  if (document.getElementById('budget-edit-styles')) return;
  const st = document.createElement('style');
  st.id = 'budget-edit-styles';
  st.textContent = `
    #budgetEditModal.bottom-modal{ z-index: 1200; }
    #budgetEditModal .bottom-modal-box{ max-width:480px; width:calc(100% - 8px); }
    #budgetEditModal .field{ display:flex; flex-direction:column; gap:6px; margin:8px 0; }
    #budgetEditModal label{ font-size:12px; opacity:.8 }
    #budgetEditModal input[type="text"],
    #budgetEditModal input[type="date"],
    #budgetEditModal input[type="number"]{
      padding:10px 12px; border-radius:10px; border:1px solid rgba(255,255,255,0.18); background:rgba(255,255,255,0.08); color:#EDEDEF;
    }
    html[data-theme="light"] #budgetEditModal input{ background:#fff; border:1px solid rgba(0,0,0,0.12); color:#111; }
    #budgetEditModal .row{ display:flex; gap:10px; }
    #budgetEditModal .row > .field{ flex:1 1 0 }
    #budgetEditModal .actions{ display:flex; justify-content:flex-end; gap:10px; margin-top:12px; }
    #budgetEditModal .actions button{ padding:10px 12px; border-radius:10px; border:1px solid rgba(255,255,255,0.18); background:#2b2b2e; color:#fff; cursor:pointer; }
    html[data-theme="light"] #budgetEditModal .actions button{ background:#f3f4f6; color:#111; border:1px solid rgba(0,0,0,0.08) }
  `;
  document.head.appendChild(st);
}

function el(id){ return document.getElementById(id); }

export function openEditBudgetModal(budget, ctx = {}){
  ensureStyles();
  let modal = el('budgetEditModal');
  if (!modal){
    modal = document.createElement('div');
    modal.id = 'budgetEditModal';
    modal.className = 'bottom-modal backdrop-blur hidden sheet-modal';
    modal.innerHTML = `
      <div class="bottom-modal-box">
        <div class="modal-drag"></div>
        <button class="modal-close-btn" id="closeBudgetEditModal" aria-label="Fechar">✕</button>
        <header class="sheet-header"><h2>Editar orçamento</h2></header>
        <div class="modal-content">
          <div class="field"><label>Tag</label><input id="be_tag" type="text" placeholder="#Mercado"></div>
          <div class="row">
            <div class="field"><label>Início</label><input id="be_start" type="date"></div>
            <div class="field"><label>Fim</label><input id="be_end" type="date"></div>
          </div>
          <div class="field"><label>Valor (reserva)</label><input id="be_value" type="number" step="0.01"></div>
          <div class="field"><label><input id="be_migrate" type="checkbox"> Migrar operações deste período para a nova tag</label></div>
          <div class="actions">
            <button id="be_cancel">Cancelar</button>
            <button id="be_save">Salvar</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.add('hidden'); });
    el('closeBudgetEditModal').onclick = () => modal.classList.add('hidden');
    el('be_cancel').onclick = () => modal.classList.add('hidden');
  }

  // Prefill
  const fmtISO = (d) => (d ? String(d).slice(0,10) : '');
  el('be_tag').value = String(budget.tag || '');
  el('be_start').value = fmtISO(budget.startDate);
  el('be_end').value = fmtISO(budget.endDate);
  el('be_value').value = Number(budget.initialValue || 0);
  el('be_migrate').checked = true;

  const showToast = (msg, type='success') => {
    try { window.__gastos?.showToast?.(msg, type); } catch(_){}
  };

  el('be_save').onclick = async () => {
    const tag = el('be_tag').value.trim().replace(/^#+/, '');
    const start = el('be_start').value;
    const end = el('be_end').value;
    const val = parseFloat(el('be_value').value);
    const migrate = el('be_migrate').checked;
    if (!tag){ showToast('Informe uma tag válida', 'error'); return; }
    if (start && end && start > end){ showToast('Período inválido', 'error'); return; }
    try {
      const res = updateAdHocBudget(budget, {
        tag,
        startDate: start,
        endDate: end,
        initialValue: isNaN(val) ? budget.initialValue : val,
      }, {
        migrateOps: migrate,
        getTransactions: () => (window.__gastos?.getTransactions?.() || []),
        setTransactions: (list) => { try { window.__gastos?.setTransactions?.(list); } catch(_){} },
      });
      if (res.updated){
        modal.classList.add('hidden');
        try { window.__gastos?.refreshPanorama?.(); } catch(_){}
        try { window.__gastos?.renderTable?.(); } catch(_){}
        showToast('Orçamento atualizado', 'success');
      } else {
        showToast('Nada foi alterado', 'warning');
      }
    } catch(err){
      console.warn('updateAdHocBudget failed', err);
      showToast('Falha ao salvar orçamento', 'error');
    }
  };

  modal.classList.remove('hidden');
}

export function openEditRecurringValueModal(budget){
  ensureStyles();
  let modal = document.getElementById('budgetRecurringModal');
  if (!modal){
    modal = document.createElement('div');
    modal.id = 'budgetRecurringModal';
    modal.className = 'bottom-modal backdrop-blur hidden sheet-modal';
    modal.innerHTML = `
      <div class="bottom-modal-box">
        <div class="modal-drag"></div>
        <button class="modal-close-btn" id="rv_close" aria-label="Fechar">✕</button>
        <header class="sheet-header"><h2>Editar valor do ciclo</h2></header>
        <div class="modal-content">
          <div class="field"><label>Valor do ciclo (reserva)</label><input id="rv_value" type="number" step="0.01"></div>
          <div class="actions">
            <button id="rv_cancel">Cancelar</button>
            <button id="rv_save">Salvar</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.add('hidden'); });
    modal.querySelector('#rv_close').onclick = () => modal.classList.add('hidden');
    modal.querySelector('#rv_cancel').onclick = () => modal.classList.add('hidden');
  }
  const valInput = modal.querySelector('#rv_value');
  if (valInput) valInput.value = Number(budget.initialValue || 0);
  const showToast = (m,t='success') => { try { window.__gastos?.showToast?.(m,t); } catch(_){} };
  modal.querySelector('#rv_save').onclick = async () => {
    const v = parseFloat(valInput.value);
    const { updateRecurringCycleValue } = await import('../services/budgetEditor.js');
    const res = updateRecurringCycleValue(budget, isNaN(v) ? budget.initialValue : v);
    if (res.updated){
      modal.classList.add('hidden');
      try { window.__gastos?.refreshPanorama?.(); } catch(_){}
      try { window.__gastos?.renderTable?.(); } catch(_){}
      showToast('Valor do ciclo atualizado');
    } else {
      showToast('Valor inválido', 'error');
    }
  };
  modal.classList.remove('hidden');
}
