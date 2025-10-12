/**
 * Provides a helper to initialize the edit transaction logic. The heavy
 * implementation of `editTx` has been extracted from main.js to reduce
 * its size. This function reads all necessary dependencies from
 * `window.__gastos`, avoiding a long parameter list. After calling
 * `setupEditTransaction()`, the `editTx` function will be attached to
 * `window.__gastos` and can be invoked via g.editTx(id).
 */

export function setupEditTransaction() {
  const g = (window.__gastos = window.__gastos || {});
  // Define editTx only once
  if (g.__editTxInit) return g.editTx;

  const {
    getTransactions,
    transactions,
    resetTxModal,
    desc,
    safeFmtNumber,
    met,
    renderCardSelectorHelper,
    cards,
    date,
    recurrence,
    installments,
    addBtn,
    txModalTitle,
    txModal,
    toggleTxModal
  } = g;

  /**
   * Opens the transaction modal pre-filled for editing the given id. The
   * function mirrors the original implementation from main.js but uses
   * dependencies sourced from the global state.
   * @param {number} id Transaction id to edit
   */
  function editTx(id) {
    const txs = (typeof getTransactions === 'function' ? getTransactions() : transactions) || [];
    const t = txs.find(x => x && x.id === id);
    if (!t) return;
    // Hard reset to avoid inheriting previous edit state
    if (typeof resetTxModal === 'function') resetTxModal();
    // 1) Description
    if (desc) desc.value = t.desc || '';
    // 2) Value + toggle expense/income
    const valInput = document.getElementById('value');
    if (valInput) {
      const signedVal = Number(t.val || 0);
      valInput.value = safeFmtNumber ? safeFmtNumber(signedVal, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }) : String(signedVal);
    }
    // Toggle the active button based on sign
    document.querySelectorAll('.value-toggle button').forEach(b => b.classList.remove('active'));
    const type = (Number(t.val || 0) < 0) ? 'expense' : 'income';
    const typeBtn = document.querySelector(`.value-toggle button[data-type="${type}"]`);
    if (typeBtn) typeBtn.classList.add('active');
    if (type !== 'expense' && valInput) {
      // Ensure positive numbers don't keep stray negatives
      valInput.value = valInput.value.replace(/^-/, '');
    }
    // 3) Payment method (pill + select + card radios)
    if (met) met.value = t.method;
    const methodSwitch  = document.querySelector('.method-switch');
    const cardSelectorEl= document.getElementById('cardSelector');
    document.querySelectorAll('.switch-option').forEach(b => b.classList.remove('active'));
    if (t.method === 'Dinheiro') {
      if (methodSwitch) methodSwitch.dataset.selected = 'Dinheiro';
      const cashBtn = document.querySelector('.switch-option[data-method="Dinheiro"]');
      if (cashBtn) cashBtn.classList.add('active');
      if (cardSelectorEl) { cardSelectorEl.innerHTML = ''; cardSelectorEl.hidden = true; }
    } else {
      if (methodSwitch) methodSwitch.dataset.selected = 'Cartão';
      const cardBtn = document.querySelector('.switch-option[data-method="Cartão"]');
      if (cardBtn) cardBtn.classList.add('active');
      // Render card options and mark the current card. Use helper to rebuild radio inputs.
      try {
        if (renderCardSelectorHelper) {
          renderCardSelectorHelper({ cards, hiddenSelect: document.getElementById('method') });
        }
      } catch (_) {}
      if (cardSelectorEl) {
        const sel = cardSelectorEl.querySelector(`input[name="cardChoice"][value="${CSS.escape(t.method)}"]`);
        if (sel) sel.checked = true;
        cardSelectorEl.hidden = false;
      }
    }
    // 4) Date respects pendingEditMode/pendingEditTxIso stored on g
    if (date) date.value = (g.pendingEditMode && g.pendingEditTxIso) ? g.pendingEditTxIso : t.opDate;
    // 5) Recurrence / installments
    if (recurrence) recurrence.value = t.recurrence || '';
    if (installments) installments.value = String(t.installments || 1);
    // 6) Update state and labels BEFORE opening modal
    g.isEditing = id;
    if (addBtn) addBtn.textContent = 'Salvar';
    if (txModalTitle) txModalTitle.textContent = 'Editar operação';
    // 7) Open modal only if hidden
    if (txModal && txModal.classList.contains('hidden')) {
      if (typeof toggleTxModal === 'function') toggleTxModal();
    }
    const vEl = document.getElementById('value');
    if (vEl && typeof vEl.focus === 'function') {
      vEl.focus();
      if (typeof vEl.select === 'function') vEl.select();
    }
  }
  // expose on global state and return
  g.editTx = editTx;
  g.__editTxInit = true;
  return editTx;
}