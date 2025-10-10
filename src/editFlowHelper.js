// editFlowHelper.js
//
// The openEditFlow function originally lived in main.js. It contains
// non‑trivial logic around determining whether an edit should target a
// single transaction or recur across related transactions. To reduce
// main.js’s footprint, this module exports a factory that binds
// openEditFlow to an external context. The context exposes getters
// and setters for mutable state and references to DOM elements and
// helper functions.

/**
 * Create a bound openEditFlow function.
 *
 * @param {Object} ctx
 * @param {Object} ctx.transactionsRef            Ref with get/set to access the transactions array.
 * @param {Function} ctx.occursOn                Function (tx, iso) => boolean, to check recurrence occurrence.
 * @param {?Element} ctx.plannedModal            The planned transactions modal.
 * @param {?Element} ctx.editRecurrenceModal     Modal shown when editing recurring transactions.
 * @param {Function} ctx.updateModalOpenState    Function to update global modal open state.
 * @param {Object} ctx.reopenPlannedAfterEditRef Ref with get/set for reopenPlannedAfterEdit boolean.
 * @param {Object} ctx.pendingEditModeRef        Ref with get/set for pending edit mode string.
 * @param {Object} ctx.pendingEditTxIdRef        Ref with get/set for pending edit transaction ID.
 * @param {Object} ctx.pendingEditTxIsoRef       Ref with get/set for pending edit transaction ISO date.
 * @param {Function} ctx.isDetachedOccurrence    Determines if a transaction is detached from a recurrence.
 * @param {Function} ctx.editTx                  Callback to trigger the actual edit flow on a transaction.
 * @returns {Function} openEditFlow bound to the provided context.
 */
export function createOpenEditFlow(ctx) {
  const {
    transactionsRef,
    occursOn,
    plannedModal,
    editRecurrenceModal,
    updateModalOpenState,
    reopenPlannedAfterEditRef,
    pendingEditModeRef,
    pendingEditTxIdRef,
    pendingEditTxIsoRef,
    isDetachedOccurrence,
    editTx,
  } = ctx;
  return function openEditFlow(tx, iso) {
    if (!tx) return;
    // Determine whether related recurrences exist by comparing
    // description/method/value across transactions.
    const txs = transactionsRef.get();
    const hasRecurrence = (() => {
      if (tx.recurrence && tx.recurrence.trim()) return true;
      if (tx.parentId) {
        const parent = txs.find(p => p.id === tx.parentId);
        if (parent && parent.recurrence && parent.recurrence.trim()) return true;
      }
      for (const p of txs) {
        if (!p.recurrence || !p.recurrence.trim()) continue;
        if (!occursOn(p, iso)) continue;
        const sameMethod = (p.method || '') === (tx.method || '');
        const sameDesc   = (p.desc || '') === (tx.desc || '');
        const sameVal    = Math.abs(Number(p.val || 0) - Number(tx.val || 0)) < 0.005;
        if (sameMethod && (sameDesc || sameVal)) return true;
      }
      return false;
    })();

    const performEdit = (id) => {
      const reopen = plannedModal && !plannedModal.classList.contains('hidden');
      reopenPlannedAfterEditRef.set(!!reopen);
      if (reopen) {
        plannedModal.classList.add('hidden');
        updateModalOpenState && updateModalOpenState();
      }
      if (isDetachedOccurrence(tx)) pendingEditModeRef.set(null);
      editTx(id);
    };

    const showRecurrenceModal = (id) => {
      pendingEditTxIdRef.set(id);
      pendingEditTxIsoRef.set(iso || tx.opDate);
      const reopen = plannedModal && !plannedModal.classList.contains('hidden');
      reopenPlannedAfterEditRef.set(!!reopen);
      if (reopen) {
        plannedModal.classList.add('hidden');
        updateModalOpenState && updateModalOpenState();
      }
      if (editRecurrenceModal) {
        editRecurrenceModal.classList.remove('hidden');
      }
      updateModalOpenState && updateModalOpenState();
    };

    if (tx.recurrence || (hasRecurrence && !tx.recurrence && !tx.parentId)) {
      showRecurrenceModal(tx.id);
      return;
    }
    performEdit(tx.id);
  };
}