/**
 * Handles deletion of recurring transactions. This module wires up the
 * "Excluir recorrência" modal and provides helpers to delete a single
 * occurrence, future occurrences, or an entire recurring rule. The
 * heavy deletion logic has been extracted from main.js to reduce its
 * size. All dependencies (DOM elements, transaction helpers and state)
 * are pulled from the global `window.__gastos` object to avoid
 * requiring long parameter lists.
 */

export function setupRecurrenceHandlers() {
  const g = (window.__gastos = window.__gastos || {});
  if (g.__recurrenceHandlersInit) return;

  const {
    deleteRecurrenceModal,
    closeDeleteRecurrenceModal,
    cancelDeleteRecurrence,
    deleteSingleBtn,
    deleteFutureBtn,
    deleteAllBtn,
    getTransactions,
    transactions,
    removeTransaction,
    setTransactions,
    save,
    renderTable,
    plannedModal,
    renderPlannedModal,
    sameId,
    occursOn,
    post,
    showToast,
  } = g;

  /**
   * Hides the delete recurrence modal and clears pending deletion state.
   */
  function closeDeleteModal() {
    if (deleteRecurrenceModal) deleteRecurrenceModal.classList.add('hidden');
    g.pendingDeleteTxId = null;
    g.pendingDeleteTxIso = null;
  }

  /**
   * Locates the master recurring rule for a given transaction on a
   * particular date. If the transaction itself is a master rule it is
   * returned; if it has a parentId the parent is returned. Otherwise
   * the function heuristically searches for a rule that would occur on
   * the same date and matches the description/method/value of the
   * supplied transaction.
   *
   * @param {Object} tx A transaction or occurrence
   * @param {string} iso ISO date (YYYY-MM-DD)
   * @returns {Object|null} The master rule or null if none found
   */
  function findMasterRuleFor(tx, iso) {
    if (!tx) return null;
    if (tx.recurrence && tx.recurrence.trim() !== '') return tx;
    if (tx.parentId) {
      const txs = typeof getTransactions === 'function' ? getTransactions() : transactions || [];
      const parent = txs.find(p => sameId ? sameId(p.id, tx.parentId) : (g.sameId && g.sameId(p.id, tx.parentId)));
      if (parent) return parent;
    }
    const txs = typeof getTransactions === 'function' ? getTransactions() : transactions || [];
    for (const p of txs) {
      if (!p.recurrence || !p.recurrence.trim()) continue;
      const occurs = typeof occursOn === 'function' ? occursOn(p, iso) : (g.occursOn && g.occursOn(p, iso));
      if (!occurs) continue;
      const sameMethod = (p.method || '') === (tx.method || '');
      const sameDesc = (p.desc || '') === (tx.desc || '');
      const sameVal = Math.abs(Number(p.val || 0) - Number(tx.val || 0)) < 0.005;
      if (sameMethod && (sameDesc || sameVal)) return p;
    }
    return null;
  }

  /**
   * Deletes a transaction or opens the recurrence scope modal. If the
   * transaction is neither recurring nor a child occurrence it is
   * removed immediately. Otherwise, deletion options (single/future/all)
   * are presented in the delete modal.
   *
   * @param {number} id The transaction id
   * @param {string} iso Optional date for the occurrence
   */
  function delTx(id, iso) {
    const txs = typeof getTransactions === 'function' ? getTransactions() : transactions || [];
    const t = txs.find(x => sameId ? sameId(x.id, id) : (g.sameId && g.sameId(x.id, id)));
    if (!t) return;
    // Non-recurring and not a detached occurrence: delete immediately
    if (!t.recurrence && !t.parentId) {
      try { removeTransaction && removeTransaction(id); } catch (_) {
        if (typeof setTransactions === 'function') setTransactions((getTransactions() || []).filter(x => !(sameId ? sameId(x.id, id) : (g.sameId && g.sameId(x.id, id)))));
      }
      try { save && save('tx', getTransactions()); } catch (_) {}
      if (typeof renderTable === 'function') renderTable();
      if (plannedModal && !plannedModal.classList.contains('hidden')) {
        try { renderPlannedModal && renderPlannedModal(); } catch (err) { console.error('renderPlannedModal failed', err); }
      }
      if (typeof showToast === 'function') showToast('Operação excluída.', 'success');
      return;
    }
    // Recurring: store context and show modal
    g.pendingDeleteTxId = id;
    g.pendingDeleteTxIso = iso || t.opDate;
    if (deleteRecurrenceModal) deleteRecurrenceModal.classList.remove('hidden');
  }

  // Assign modal-level close handlers
  if (closeDeleteRecurrenceModal) closeDeleteRecurrenceModal.onclick = closeDeleteModal;
  if (cancelDeleteRecurrence) cancelDeleteRecurrence.onclick = closeDeleteModal;
  if (deleteRecurrenceModal) {
    deleteRecurrenceModal.onclick = (e) => {
      if (e.target === deleteRecurrenceModal) closeDeleteModal();
    };
  }

  // Handler for deleting a single occurrence
  if (deleteSingleBtn) {
    deleteSingleBtn.onclick = () => {
      const txs = typeof getTransactions === 'function' ? getTransactions() : transactions || [];
      const tx = txs.find(t => sameId ? sameId(t.id, g.pendingDeleteTxId) : (g.sameId && g.sameId(t.id, g.pendingDeleteTxId)));
      const iso = g.pendingDeleteTxIso;
      const refreshPlanned = plannedModal && !plannedModal.classList.contains('hidden');
      if (!tx) { closeDeleteModal(); return; }
      const master = findMasterRuleFor(tx, iso);
      if (master) {
        master.exceptions = master.exceptions || [];
        if (!master.exceptions.includes(iso)) master.exceptions.push(iso);
        // Remove any materialized child occurrence on this exact date
        try {
          const child = (getTransactions() || []).find(x =>
            (sameId ? sameId(x.parentId, master.id) : (g.sameId && g.sameId(x.parentId, master.id))) && x.opDate === iso
          );
          if (child) removeTransaction && removeTransaction(child.id);
        } catch (_) {
          if (typeof setTransactions === 'function') setTransactions((getTransactions() || []).filter(x => !((sameId ? sameId(x.parentId, master.id) : (g.sameId && g.sameId(x.parentId, master.id))) && x.opDate === iso)));
        }
        if (typeof showToast === 'function') showToast('Ocorrência excluída!', 'success');
      } else {
        // Fallback: not a recurring item → delete directly
        try { removeTransaction && removeTransaction(tx.id); } catch (_) {
          if (typeof setTransactions === 'function') setTransactions((getTransactions() || []).filter(x => !(sameId ? sameId(x.id, tx.id) : (g.sameId && g.sameId(x.id, tx.id)))));
        }
        if (typeof showToast === 'function') showToast('Operação excluída.', 'success');
      }
      try { save && save('tx', getTransactions()); } catch (_) {}
      if (typeof renderTable === 'function') renderTable();
      if (refreshPlanned) {
        try { renderPlannedModal && renderPlannedModal(); } catch (err) { console.error('renderPlannedModal failed', err); }
      }
      closeDeleteModal();
    };
  }

  // Handler for deleting this and future occurrences
  if (deleteFutureBtn) {
    deleteFutureBtn.onclick = () => {
      const txs = typeof getTransactions === 'function' ? getTransactions() : transactions || [];
      const tx = txs.find(t => sameId ? sameId(t.id, g.pendingDeleteTxId) : (g.sameId && g.sameId(t.id, g.pendingDeleteTxId)));
      const iso = g.pendingDeleteTxIso;
      const refreshPlanned = plannedModal && !plannedModal.classList.contains('hidden');
      if (!tx) { closeDeleteModal(); return; }
      const master = findMasterRuleFor(tx, iso);
      if (master) {
        master.recurrenceEnd = iso;
        if (typeof showToast === 'function') showToast('Esta e futuras excluídas!', 'success');
      } else {
        // fallback: not a recurrence → delete only this occurrence
        try { removeTransaction && removeTransaction(tx.id); } catch (_) {
          if (typeof setTransactions === 'function') setTransactions((getTransactions() || []).filter(x => !(sameId ? sameId(x.id, tx.id) : (g.sameId && g.sameId(x.id, tx.id)))));
        }
        if (typeof showToast === 'function') showToast('Operação excluída.', 'success');
      }
      try { save && save('tx', getTransactions()); } catch (_) {}
      if (typeof renderTable === 'function') renderTable();
      if (refreshPlanned) {
        try { renderPlannedModal && renderPlannedModal(); } catch (err) { console.error('renderPlannedModal failed', err); }
      }
      closeDeleteModal();
    };
  }

  // Handler for deleting all occurrences (master rule and children)
  if (deleteAllBtn) {
    deleteAllBtn.onclick = () => {
      const txs = typeof getTransactions === 'function' ? getTransactions() : transactions || [];
      const tx = txs.find(t => sameId ? sameId(t.id, g.pendingDeleteTxId) : (g.sameId && g.sameId(t.id, g.pendingDeleteTxId)));
      if (!tx) { closeDeleteModal(); return; }
      const master = findMasterRuleFor(tx, g.pendingDeleteTxIso) || tx;
      const refreshPlanned = plannedModal && !plannedModal.classList.contains('hidden');
      try {
        // Remove master and any child occurrences
        if (removeTransaction) removeTransaction(master.id);
        const children = (getTransactions() || []).filter(t => sameId ? sameId(t.parentId, master.id) : (g.sameId && g.sameId(t.parentId, master.id)));
        for (const c of children) { if (removeTransaction) removeTransaction(c.id); }
      } catch (_) {
        if (typeof setTransactions === 'function') setTransactions((getTransactions() || []).filter(t => !((sameId ? sameId(t.id, master.id) : (g.sameId && g.sameId(t.id, master.id))) || (sameId ? sameId(t.parentId, master.id) : (g.sameId && g.sameId(t.parentId, master.id))))));
      }
      try { save && save('tx', getTransactions()); } catch (_) {}
      if (typeof renderTable === 'function') renderTable();
      if (refreshPlanned) {
        try { renderPlannedModal && renderPlannedModal(); } catch (err) { console.error('renderPlannedModal failed', err); }
      }
      closeDeleteModal();
      if (typeof showToast === 'function') showToast('Todas as recorrências excluídas!', 'success');
    };
  }

  // Expose helpers on the global state
  g.closeDeleteModal = closeDeleteModal;
  g.delTx = delTx;
  g.findMasterRuleFor = findMasterRuleFor;
  g.__recurrenceHandlersInit = true;
}