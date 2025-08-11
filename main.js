// Recorrência: Exclusão e Edição de recorrência
let pendingDeleteTxId = null;
let pendingDeleteTxIso = null;
let pendingEditTxId = null;
let pendingEditTxIso = null;
let pendingEditMode = null;
// Modal Excluir Recorrência - refs
const deleteRecurrenceModal = document.getElementById('deleteRecurrenceModal');
const closeDeleteRecurrenceModal = document.getElementById('closeDeleteRecurrenceModal');
const deleteSingleBtn = document.getElementById('deleteSingleBtn');
const deleteFutureBtn = document.getElementById('deleteFutureBtn');
const deleteAllBtn = document.getElementById('deleteAllBtn');
const cancelDeleteRecurrence = document.getElementById('cancelDeleteRecurrence');
// Modal Editar Recorrência - refs
const editRecurrenceModal = document.getElementById('editRecurrenceModal');
const closeEditRecurrenceModal = document.getElementById('closeEditRecurrenceModal');
const editSingleBtn = document.getElementById('editSingleBtn');
const editFutureBtn = document.getElementById('editFutureBtn');
const editAllBtn = document.getElementById('editAllBtn');
const cancelEditRecurrence = document.getElementById('cancelEditRecurrence');
// Elements for Planejados modal
const openPlannedBtn = document.getElementById('openPlannedBtn');
const plannedModal   = document.getElementById('plannedModal');
const closePlannedModal = document.getElementById('closePlannedModal');
const plannedList    = document.getElementById('plannedList');

// --- Planned modal helpers/guards ---
function hidePlannedModal() {
  if (!plannedModal) return;
  plannedModal.classList.add('hidden');
}

// Close when clicking backdrop (outside the sheet)
if (plannedModal && !plannedModal.dataset.backdropHooked) {
  plannedModal.dataset.backdropHooked = '1';
  plannedModal.addEventListener('click', (e) => {
    if (e.target === plannedModal) hidePlannedModal();
  });
}

// Close before opening other modals (edit/delete) to avoid overlap
if (plannedModal && plannedList && !plannedList.dataset.editCloseHooked) {
  plannedList.dataset.editCloseHooked = '1';
  plannedModal.addEventListener(
    'click',
    (e) => {
      const t = /** @type {HTMLElement} */ (e.target);
      const hit = t.closest('.swipe-actions .edit, .swipe-actions .delete, button[data-action="edit"], button[data-action="delete"], .icon-edit, .icon-delete');
      if (hit) hidePlannedModal();
    },
    { capture: true }
  );
}

// Also wire the X button
if (closePlannedModal && !closePlannedModal.dataset.closeHooked) {
  closePlannedModal.dataset.closeHooked = '1';
  closePlannedModal.addEventListener('click', hidePlannedModal);
}

// Header segmented control → delega para os botões originais
const headerSeg = document.querySelector('.header-seg');
if (headerSeg) {
  headerSeg.addEventListener('click', (e) => {
    const btn = e.target.closest('.seg-option');
    if (!btn) return;
    const action = btn.dataset.action;
    if (action === 'planned' && openPlannedBtn) {
      headerSeg.dataset.selected = 'planned';
      openPlannedBtn.click();
    } else if (action === 'cards') {
      const openCardBtn = document.getElementById('openCardModal');
      if (openCardBtn) {
        headerSeg.dataset.selected = 'cards';
        openCardBtn.click();
      }
    }
  });
}

// --- Ensure Planned modal values are anchored to the right, regardless of DOM structure
function normalizeLabelWidths(liElements) {
  // Calculates the maximum width of all label-wrapper elements and returns it
  let maxWidth = 0;
  liElements.forEach(li => {
    const label = li.querySelector('.label-wrapper');
    if (label) {
      label.style.width = ''; // reset before measuring
      const w = label.offsetWidth;
      if (w > maxWidth) maxWidth = w;
    }
  });
  return maxWidth;
}

function adjustValueSpacing(liElements) {
  // Adjusts the padding-right of .value-wrapper based on value content
  liElements.forEach(li => {
    const valueWrap = li.querySelector('.value-wrapper');
    const value = li.querySelector('.value');
    if (valueWrap && value) {
      // Example: set padding-right based on value width plus a margin
      valueWrap.style.paddingRight = (value.offsetWidth + 24) + 'px';
    }
  });
}

function applyUniformLabelWidth(maxWidth, liElements) {
  // Applies the same width to all label-wrapper elements
  liElements.forEach(li => {
    const label = li.querySelector('.label-wrapper');
    if (label) {
      label.style.width = maxWidth + 'px';
    }
  });
}

function fixPlannedAlignment() {
  if (!plannedList) return;
  // Only act if the Planned modal is visible
  if (plannedModal && plannedModal.classList.contains('hidden')) return;

  const liElements = plannedList.querySelectorAll('li');
  // 1. Normalize label widths
  const maxWidth = normalizeLabelWidths(liElements);
  // 2. Adjust value spacing
  adjustValueSpacing(liElements);
  // 3. Apply uniform label width
  applyUniformLabelWidth(maxWidth, liElements);
}

// --- Expand weekday labels to long form inside Planned modal ---
const WDAY_LONG = {
  'dom.': 'Domingo',
  'seg.': 'Segunda-feira',
  'ter.': 'Terça-feira',
  'qua.': 'Quarta-feira',
  'qui.': 'Quinta-feira',
  'sex.': 'Sexta-feira',
  'sáb.': 'Sábado',
  'sab.': 'Sábado'
};

function expandPlannedDayLabels() {
  if (!plannedModal) return;
  // Look for common containers used as day headers inside the Planned modal
  const nodes = plannedModal.querySelectorAll('.modal-content .subheader, .modal-content .planned-date, .modal-content h3, .modal-content div');
  nodes.forEach(el => {
    const raw = (el.textContent || '').trim();
    // Match patterns like "Qua., 16/07" or "qui., 24/07"
    const m = raw.match(/^([A-Za-zÀ-ÿ]{3,4}\.)\s*,?\s*(.*)$/);
    if (!m) return;
    const abbr = m[1].toLowerCase();
    const rest = m[2] || '';
    const full = WDAY_LONG[abbr];
    if (full) {
      el.textContent = rest ? `${full}, ${rest}` : full;
    }
  });
}

// Hooks: on open button click, after modal transition, and whenever list mutates
if (openPlannedBtn) {
  openPlannedBtn.addEventListener('click', () => setTimeout(() => {
    renderPlannedModal();
    fixPlannedAlignment();
    expandPlannedDayLabels();
  }, 0));
}

const plannedBox = plannedModal ? plannedModal.querySelector('.bottom-modal-box') : null;
if (plannedBox) {
  plannedBox.addEventListener('transitionend', (e) => {
    if (e.propertyName === 'transform') {
      fixPlannedAlignment();
      expandPlannedDayLabels();
    }
  });
}

if (plannedList) {
  const mo = new MutationObserver(() => { fixPlannedAlignment(); expandPlannedDayLabels(); });
  mo.observe(plannedList, { childList: true, subtree: true });
}

import { openDB } from 'https://unpkg.com/idb?module';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.3.1/firebase-app.js";

import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.3.1/firebase-auth.js";
import { getDatabase, ref, set, get, onValue } from "https://www.gstatic.com/firebasejs/10.3.1/firebase-database.js";

// Configuração do Firebase de TESTE (arquivo separado)

import { firebaseConfig } from './firebase.test.config.js';

// (Web Push removido)

// ---- IndexedDB (idb) key/value cache ----
const cacheDB = await openDB('gastos-cache', 1, {
  upgrade(db) {
    if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
  }
});
async function idbGet(k) { try { return await cacheDB.get('kv', k); } catch { return undefined; } }
async function idbSet(k, v) { try { await cacheDB.put('kv', v, k); } catch {} }

/**
 * Initialize swipe-to-reveal actions on elements.
 * @param {ParentNode} root       Root element to listen on (e.g., document or specific container).
 * @param {string} wrapperSel     Selector for swipe wrapper (e.g., '.swipe-wrapper').
 * @param {string} actionsSel     Selector for swipe actions (e.g., '.swipe-actions').
 * @param {string} lineSel        Selector for the line to translate (e.g., '.op-line' or '.card-line').
 * @param {boolean} onceFlag      Name of global flag to prevent multiple inits.
 */
function initSwipe(root, wrapperSel, actionsSel, lineSel, onceFlag) {
  if (window[onceFlag]) return;
  let startX = 0;
  root.addEventListener('touchstart', e => {
    const wrap = e.target.closest(wrapperSel);
    if (!wrap) return;
    startX = e.touches[0].clientX;
    wrap.dataset.startX = startX;
    const line = wrap.querySelector(lineSel);
    const m = new WebKitCSSMatrix(getComputedStyle(line).transform);
    wrap.dataset.offset = m.m41 || 0;
  }, { passive: true });
  root.addEventListener('touchmove', e => {
    const wrap = e.target.closest(wrapperSel);
    if (!wrap) return;
    const start = parseFloat(wrap.dataset.startX || 0);
    const offset = parseFloat(wrap.dataset.offset || 0);
    const diff   = start - e.touches[0].clientX;
    const line   = wrap.querySelector(lineSel);
    const actions= wrap.querySelector(actionsSel);
    const actW   = actions.offsetWidth;
    line.style.transition = 'none';
    let newTx = offset - diff;
    newTx = Math.max(Math.min(newTx, 0), -actW);
    line.style.transform = `translateX(${newTx}px)`;
    actions.style.opacity = Math.abs(newTx) / actW;
  }, { passive: true });
  root.addEventListener('touchend', e => {
    const wrap = e.target.closest(wrapperSel);
    if (!wrap) return;
    const start  = parseFloat(wrap.dataset.startX || 0);
    const offset = parseFloat(wrap.dataset.offset || 0);
    const diff   = start - e.changedTouches[0].clientX;
    const line   = wrap.querySelector(lineSel);
    const actions= wrap.querySelector(actionsSel);
    const actW   = actions.offsetWidth;
    let finalTx  = offset - diff;
    const shouldOpen = Math.abs(finalTx) > actW / 2;
    finalTx = shouldOpen ? -actW : 0;
    line.style.transition = '';
    line.style.transform  = `translateX(${finalTx}px)`;
    actions.style.opacity = shouldOpen ? 1 : 0;
    if (typeof navigator.vibrate === 'function') {
      navigator.vibrate(30);
    }
    // collapse others
    document.querySelectorAll(lineSel).forEach(l=>{
      if(l!==line){l.style.transform='translateX(0)';}
    });
    document.querySelectorAll(actionsSel).forEach(a=>{
      if(a!==actions){a.style.opacity=0;}
    });
  }, { passive: true });
  window[onceFlag] = true;
}

let PATH;

// Flag for mocking data while working on UI.  
// Switch to `false` to reconnect to production Firebase.
const USE_MOCK = false;              // conectar ao Firebase PROD
const APP_VERSION = '1.4.7';
const METRICS_ENABLED = true;
const _bootT0 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
function logMetric(name, payload) {
  try {
    if (!METRICS_ENABLED || USE_MOCK || !firebaseDb) return;
    const key = `${PATH}/metrics/${name}/${Date.now()}_${Math.random().toString(36).slice(2)}`;
    set(ref(firebaseDb, key), {
      ...payload,
      appVersion: APP_VERSION,
      ua: navigator.userAgent,
      ts: new Date().toISOString()
    });
  } catch (_) {}
}
// Log boot timing once the page fully loads
window.addEventListener('load', () => {
  const now = (performance && performance.now) ? performance.now() : Date.now();
  logMetric('boot', { firstPaint_ms: Math.round(now - _bootT0) });
});
let save, load;
let firebaseDb;

if (!USE_MOCK) {
  // Seleciona config conforme ambiente
  const cfg = firebaseConfig;
  const app  = initializeApp(cfg);
  const db   = getDatabase(app);
  firebaseDb = db;

  // Mesmo caminho de DB para ambos os ambientes
  PATH = 'orcamento365_9b8e04c5';

  const auth = getAuth(app);
  await signInAnonymously(auth);

  // Wrapper: save marks as dirty and updates cache if offline
  save = async (k, v) => {
    if (!navigator.onLine) {
      // mark as dirty for later flush and cache locally for instant UI
      markDirty(k);
      if (k === 'tx') cacheSet('tx', v);
      if (k === 'cards') cacheSet('cards', v);
      if (k === 'startBal') cacheSet('startBal', v);
      return; // no remote write while offline
    }
    return set(ref(db, `${PATH}/${k}`), v);
  };
  load = async (k, d) => {
    const s = await get(ref(db, `${PATH}/${k}`));
    return s.exists() ? s.val() : d;
  };
} else {
  // Modo MOCK (LocalStorage)
  PATH = 'mock_365';
  save = (k, v) => localStorage.setItem(`${PATH}_${k}`, JSON.stringify(v));
  load = async (k, d) =>
    JSON.parse(localStorage.getItem(`${PATH}_${k}`)) ?? d;
}


// Cache local (LocalStorage+IDB) p/ boot instantâneo, com fallback/hydrate
const cacheGet  = (k, d) => {
  try {
    const ls = localStorage.getItem(`cache_${k}`);
    if (ls != null) return JSON.parse(ls);
  } catch {}
  // Fallback: fetch from IDB asynchronously and warm localStorage
  (async () => {
    const v = await idbGet(`cache_${k}`);
    if (v !== undefined) localStorage.setItem(`cache_${k}`, JSON.stringify(v));
  })();
  return d;
};
const cacheSet  = (k, v) => {
  localStorage.setItem(`cache_${k}`, JSON.stringify(v));
  idbSet(`cache_${k}`, v);
};

// ---------------- Offline queue helpers (generalized) ----------------
// We track which collections are "dirty" while offline: 'tx', 'cards', 'startBal'.
function updatePendingBadge() {
  const syncBtn = document.getElementById('syncNowBtn');
  if (!syncBtn) return;
  const q = cacheGet('dirtyQueue', []);
  syncBtn.textContent = q.length ? `⟳ (${q.length})` : '⟳';
}

// Marks a collection as dirty so we know to flush it later.
function markDirty(kind) {
  const allowed = ['tx','cards','startBal'];
  if (!allowed.includes(kind)) return;
  const q = cacheGet('dirtyQueue', []);
  if (!q.includes(kind)) q.push(kind);
  cacheSet('dirtyQueue', q);
  updatePendingBadge();
  scheduleBgSync();
}

// ---- Background Sync registration (Android/Chrome) + retry loop (iOS/Safari) ----
async function scheduleBgSync() {
  try {
    if (USE_MOCK) return;
    if (!('serviceWorker' in navigator)) return;
    if (!('SyncManager' in window)) return; // iOS/Safari will skip
    const reg = await navigator.serviceWorker.ready;
    await reg.sync.register('sync-tx');
  } catch (_) {
    // ignore; fallbacks below handle retries
  }
}

let _retryTimer = null;
let _retryDelay = 5000; // start 5s, cap 60s
async function tryFlushWithBackoff() {
  if (!navigator.onLine) return;
  await flushQueue();
  const stillDirty = (cacheGet('dirtyQueue', []) || []).length > 0;
  if (stillDirty) {
    clearTimeout(_retryTimer);
    _retryTimer = setTimeout(tryFlushWithBackoff, Math.min(_retryDelay *= 2, 60000));
  } else {
    _retryDelay = 5000;
  }
}

// iOS-friendly triggers: when app regains focus/visibility or BFCache restores the page
window.addEventListener('focus', () => { if (navigator.onLine) tryFlushWithBackoff(); });
document.addEventListener('visibilitychange', () => { if (!document.hidden && navigator.onLine) tryFlushWithBackoff(); });
window.addEventListener('pageshow', (e) => { if (navigator.onLine && (!e.persisted || true)) tryFlushWithBackoff(); });
// Also when coming online, schedule bg sync (Android) and kick retries
window.addEventListener('online', () => { scheduleBgSync(); tryFlushWithBackoff(); });

// Backwards-compatible: queueTx() now just marks 'tx' as dirty.
async function queueTx(/* tx object ignored */) {
  markDirty('tx');
}

// Flushes all dirty collections to Firebase and clears the dirty flags.
async function flushQueue() {
  const q = cacheGet('dirtyQueue', []);
  if (!q.length) return;

  // optimistic clear; restore on failure
  cacheSet('dirtyQueue', []);

  try {
    if (q.includes('tx'))       await save('tx', transactions);
    if (q.includes('cards'))    await save('cards', cards);
    if (q.includes('startBal')) await save('startBal', startBalance);
  } catch (err) {
    console.error('flushQueue failed:', err);
    // Put back flags so we retry later (union of previous + current)
    const cur = cacheGet('dirtyQueue', []);
    cacheSet('dirtyQueue', [...new Set([...q, ...cur])]);
    return;
  }
  updatePendingBadge();
  renderTable();
}

// Auto-flush when back online and toggle offline indicator
// --- Offline/Online Toast notifications (register once on app load) ---
(function () {
  let _offlineOnlineListenersRegistered = false;
  function registerOfflineOnlineToasts() {
    if (_offlineOnlineListenersRegistered) return;
    window.addEventListener('offline', () => {
      showToast("Você está offline", 'error', 5000);
    });
    window.addEventListener('online', () => {
      showToast("Conexão restabelecida", 'success', 5000);
    });
    _offlineOnlineListenersRegistered = true;
  }
  // Register at startup
  registerOfflineOnlineToasts();
})();


// Load transactions/cards/balance: now with realtime listeners if not USE_MOCK
let transactions;
let cards;
let startBalance;
const $=id=>document.getElementById(id);
const tbody=document.querySelector('#dailyTable tbody');
const wrapperEl = document.querySelector('.wrapper');
const txModalTitle = document.querySelector('#txModal h2');

// Helper: sort transactions by opDate (YYYY-MM-DD) then by timestamp (ts) so UI is always chronological
function sortTransactions() {
  transactions.sort((a, b) => {
    const d = a.opDate.localeCompare(b.opDate);
    if (d !== 0) return d;
    // Fallback: compare timestamps when same date
    return (a.ts || '').localeCompare(b.ts || '');
  });
}

// --- Toast helper ---
const showToast = (msg, type = 'error', duration = 3000) => {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.style.setProperty('--icon', type === 'error' ? '"✕"' : '"✓"');
  t.classList.remove('success', 'error');
  t.classList.add(type === 'success' ? 'success' : 'error');
  // restart animation
  void t.offsetWidth;
  t.classList.add('show');
  setTimeout(() => { t.classList.remove('show'); }, duration);
};
function buildSaveToast(tx) {
  try {
    const valueNum = typeof tx.val === 'number' ? tx.val : Number((tx.val || '0').toString().replace(/[^0-9.-]/g, ''));
    const formattedVal = valueNum.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const isCard = tx.method && tx.method !== 'Dinheiro';
    const hasOpDate = !!tx.opDate;
    const renderIso = tx.postDate || (hasOpDate && tx.method ? post(tx.opDate, tx.method) : null);

    if (isCard && renderIso && !tx.planned && (!hasOpDate || renderIso !== tx.opDate)) {
      const [, mm, dd] = renderIso.split('-');
      return `${formattedVal} salva na fatura de ${dd}/${mm}`;
    }
    if (!tx.recurrence) {
      const iso = hasOpDate ? tx.opDate : todayISO();
      return `${formattedVal} salvo em ${iso.slice(8,10)}/${iso.slice(5,7)}`;
    }
    const recSel = document.getElementById('recurrence');
    const recText = recSel ? (recSel.options[recSel.selectedIndex].text || '').toLowerCase() : 'recorrente';
    return `${formattedVal} salvo (${recText})`;
  } catch {
    return 'Transação salva';
  }
}
// ---- Migration: normalize legacy transactions ----
// (moved inside block below)

// ---------------------------------------------------------------------------
// Load transactions/cards/balances with realtime listeners or fallback to mock
// ---------------------------------------------------------------------------

if (!USE_MOCK) {
  // Live listeners (Realtime DB)
  const txRef    = ref(firebaseDb, `${PATH}/tx`);
  const cardsRef = ref(firebaseDb, `${PATH}/cards`);
  const balRef   = ref(firebaseDb, `${PATH}/startBal`);

  // initialize from cache first for instant UI
  transactions = cacheGet('tx', []);
  transactions = transactions.map(t => ({
    ...t,
    method: (t.method && t.method.toLowerCase() === 'dinheiro') ? 'Dinheiro' : t.method,
    recurrence: t.recurrence ?? '',
    installments: t.installments ?? 1,
    parentId: t.parentId ?? null
  }));
  sortTransactions();
  cards = cacheGet('cards', [{name:'Dinheiro',close:0,due:0}]);
  startBalance = cacheGet('startBal', null);

  // Listen for tx changes (LWW merge per item)
  onValue(txRef, (snap) => {
    const raw  = snap.val() ?? [];
    const incoming = Array.isArray(raw) ? raw : Object.values(raw);

    // normalize helper
    const norm = (t) => ({
      ...t,
      method: (t.method && t.method.toLowerCase() === 'dinheiro') ? 'Dinheiro' : t.method,
      recurrence: t.recurrence ?? '',
      installments: t.installments ?? 1,
      parentId: t.parentId ?? null
    });

    const remote = (incoming || []).map(norm);

    // If we're online and have no local pending changes for 'tx',
    // trust the server (support hard deletions). Otherwise, do LWW merge.
    const dirty = cacheGet('dirtyQueue', []);
    const hasPendingTx = Array.isArray(dirty) && dirty.includes('tx');

    if (navigator.onLine && !hasPendingTx) {
      // Source-of-truth: server. This allows deletions/resets from other clients to propagate.
      transactions = remote;
    } else {
      // Merge: keep local edits that haven't been flushed yet; remote wins on conflicts by timestamp
      const local = (transactions || []).map(norm);
      const byId = new Map(local.map(t => [t.id, t]));
      for (const r of remote) {
        const l = byId.get(r.id);
        if (!l) { byId.set(r.id, r); continue; }
        const lt = Date.parse(l.modifiedAt || l.ts || 0);
        const rt = Date.parse(r.modifiedAt || r.ts || 0);
        if (rt >= lt) byId.set(r.id, r);
      }
      transactions = Array.from(byId.values());
    }

    cacheSet('tx', transactions);
    sortTransactions();
    renderTable();
    // Refresh Planned modal if it is visible
    if (plannedModal && !plannedModal.classList.contains('hidden')) {
      renderPlannedModal();
      fixPlannedAlignment();
      expandPlannedDayLabels();
}
  });

  // Listen for card changes
  onValue(cardsRef, (snap) => {
    const raw  = snap.val() ?? [];
    const next = Array.isArray(raw) ? raw : Object.values(raw);
    if (JSON.stringify(next) === JSON.stringify(cards)) return;

    cards = next;
    if (!cards.some(c => c.name === 'Dinheiro')) {
      cards.unshift({ name: 'Dinheiro', close: 0, due: 0 });
    }
    cacheSet('cards', cards);
    refreshMethods();
    renderCardList();
    renderTable();
  });

  // Listen for balance changes
  onValue(balRef, (snap) => {
    const val = snap.exists() ? snap.val() : null;
    if (val === startBalance) return;
    startBalance = val;
    cacheSet('startBal', startBalance);
    initStart();
    renderTable();
  });
} else {
  // Fallback (mock) — carrega uma vez
  const [liveTx, liveCards, liveBal] = await Promise.all([
    load('tx', []),
    load('cards', cards),
    load('startBal', startBalance)
  ]);

  const hasLiveTx    = Array.isArray(liveTx)    ? liveTx.length    > 0 : liveTx    && Object.keys(liveTx).length    > 0;
  const hasLiveCards = Array.isArray(liveCards) ? liveCards.length > 0 : liveCards && Object.keys(liveCards).length > 0;

  const fixedTx = Array.isArray(liveTx) ? liveTx : Object.values(liveTx || {});

  transactions = cacheGet('tx', []);
  cards = cacheGet('cards', [{name:'Dinheiro',close:0,due:0}]);
  startBalance = cacheGet('startBal', null);

  if (hasLiveTx && JSON.stringify(fixedTx) !== JSON.stringify(transactions)) {
    transactions = fixedTx;
    cacheSet('tx', transactions);
    renderTable();
  }
  if (hasLiveCards && JSON.stringify(liveCards) !== JSON.stringify(cards)) {
    cards = liveCards;
    if (!cards.some(c => c.name === 'Dinheiro')) cards.unshift({ name:'Dinheiro', close:0, due:0 });
    cacheSet('cards', cards);
    refreshMethods(); renderCardList(); renderTable();
  }
  if (liveBal !== startBalance) {
    startBalance = liveBal;
    cacheSet('startBal', startBalance);
    initStart(); renderTable();
  }
}
const openTxBtn = document.getElementById('openTxModal');
const txModal   = document.getElementById('txModal');
const closeTxModal = document.getElementById('closeTxModal');

/**
 * Reset the fields and state of the transaction modal.
 */
function resetTxModal() {
  // Clear text fields and date
  const descInput = document.getElementById('desc');
  const valueInput = document.getElementById('value');
  const dateInput = document.getElementById('opDate');
  if (descInput) descInput.value = '';
  if (valueInput) valueInput.value = '';
  if (dateInput) dateInput.value = todayISO();
  // Reset expense/income toggles
  document.querySelectorAll('.value-toggle button').forEach(btn => btn.classList.remove('active'));
  // Reset method switch to Dinheiro
  document.querySelectorAll('.switch-option').forEach(btn => btn.classList.remove('active'));
  const defaultBtn = document.querySelector('.switch-option[data-method="Dinheiro"]');
  if (defaultBtn) defaultBtn.classList.add('active');
  const hiddenSelect = document.getElementById('method');
  if (hiddenSelect) hiddenSelect.value = 'Dinheiro';
  const methodSwitch = document.querySelector('.method-switch');
  if (methodSwitch) methodSwitch.dataset.selected = 'Dinheiro';
  // Clear card selector
  const cardSelectorEl = document.getElementById('cardSelector');
  if (cardSelectorEl) {
    cardSelectorEl.innerHTML = '';
    cardSelectorEl.hidden = true;
  }
  // Reset recurrence and installments
  const recurrenceSelect = document.getElementById('recurrence');
  if (recurrenceSelect) recurrenceSelect.value = '';
  const parcelaBlock = document.getElementById('parcelasBlock');
  if (parcelaBlock) parcelaBlock.classList.add('hidden');
  const instSelect = document.getElementById('installments');
  if (instSelect) instSelect.value = '1';
  // Reset modal title and button
  const modalHeader = document.querySelector('#txModal h2');
  if (modalHeader) modalHeader.textContent = 'Lançar operação';
  const addBtnEl = document.getElementById('addBtn');
  if (addBtnEl) addBtnEl.textContent = 'Adicionar';
}

/**
 * Toggle the visibility of the transaction modal.
 */
function toggleTxModal() {
  const isOpening = txModal.classList.contains('hidden');
  if (isOpening) {
    if (!isEditing) {
      resetTxModal();
    }
    // Prevent background scrolling when modal is open
    if (document.body) document.body.style.overflow = 'hidden';
    if (wrapperEl) wrapperEl.style.overflow = 'hidden';
  } else {
    // Restore scrolling
    if (document.body) document.body.style.overflow = '';
    if (wrapperEl) wrapperEl.style.overflow = '';
  }
  txModal.classList.toggle('hidden');
  // Rotate the floating button to indicate state
  if (openTxBtn) {
    openTxBtn.style.transform = isOpening ? 'rotate(45deg)' : 'rotate(0deg)';
  }
  if (isOpening) {
    const valInput = document.getElementById('value');
    if (valInput) {
      valInput.focus();
      valInput.select();
    }
  }
}

// Attach event handlers if elements exist
// Helper: sair do modo edição e limpar o formulário
function _cancelEditingAndReset() {
  try { if (typeof isEditing !== 'undefined') isEditing = false; } catch (_) {}
  resetTxModal();
}

// Abrir sempre como "novo": garante formulário zerado
if (openTxBtn) {
  openTxBtn.onclick = () => {
    try { if (typeof isEditing !== 'undefined') isEditing = false; } catch (_) {}
    resetTxModal();
    if (txModal.classList.contains('hidden')) toggleTxModal();
  };
}

// Fechar (X) encerra edição e limpa estado
if (closeTxModal) {
  closeTxModal.onclick = () => {
    _cancelEditingAndReset();
    if (!txModal.classList.contains('hidden')) toggleTxModal();
  };
}

// Clique no backdrop também encerra edição e limpa
if (txModal) {
  txModal.onclick = (e) => {
    if (e.target === txModal) {
      _cancelEditingAndReset();
      toggleTxModal();
    }
  };
}
// (Web Push removido)
// Block background scrolling via touch/wheel when tx modal is open
document.addEventListener('touchmove', (e) => {
  if (!txModal.classList.contains('hidden')) e.preventDefault();
}, { passive: false });
document.addEventListener('wheel', (e) => {
  if (!txModal.classList.contains('hidden')) e.preventDefault();
}, { passive: false });




const currency=v=>v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const meses=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
// Palavras que caracterizam “salário”
const SALARY_WORDS = ['salário', 'salario', 'provento', 'rendimento', 'pagamento', 'paycheck', 'salary'];
const mobile=()=>window.innerWidth<=480;
const fmt=d=>d.toLocaleDateString('pt-BR',mobile()?{day:'2-digit',month:'2-digit'}:{day:'2-digit',month:'2-digit',year:'numeric'});

// ---------------------------------------------------------------------------
// Sticky month header  (Safari/iOS não suporta <summary> sticky)
// ---------------------------------------------------------------------------
const headerEl      = document.querySelector('.app-header');
const HEADER_OFFSET = headerEl ? headerEl.getBoundingClientRect().height : 58;
const STICKY_VISIBLE = 18;
const stickyMonth     = document.createElement('div');
stickyMonth.className = 'sticky-month';
stickyMonth.style.top = (HEADER_OFFSET - STICKY_VISIBLE) + 'px';
document.body.appendChild(stickyMonth);

// Recalcula altura do header em rotação / resize
window.addEventListener('resize', () => {
  const h = headerEl.getBoundingClientRect().height;
  stickyMonth.style.top = (h - STICKY_VISIBLE) + 'px';
});

function updateStickyMonth() {
  let label = '';
  const divs = document.querySelectorAll('summary.month-divider');
  divs.forEach(div => {
    const rect = div.getBoundingClientRect();
    // choose the last divider whose top passed the header
    if (rect.top <= HEADER_OFFSET) {
      label = div.textContent.replace(/\s+/g, ' ').trim();
    }
  });
  if (label) {
    // Exibe apenas o nome do mês (primeira palavra do label)
    const mesApenas = label.split(/\s+/)[0];
    stickyMonth.textContent = mesApenas;
    stickyMonth.classList.add('visible');
  } else {
    stickyMonth.classList.remove('visible');
  }
}

window.addEventListener('scroll', updateStickyMonth);

// --- Date helpers ---
/**
 * Formats a Date object to YYYY-MM-DD (ISO) in local time.
 * @param {Date} date
 * @returns {string}
 */
function formatToISO(date) {
  // Adjust for local timezone before formatting
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().split('T')[0];
}

// Retorna YYYY-MM-DD no fuso local (corrige o shift do toISOString em UTC)
const todayISO = () => formatToISO(new Date());
// expose todayISO to global for inline scripts
window.todayISO = todayISO;

// Função para calcular o postDate de cartões corretamente (nova lógica)
const post = (iso, m) => {
  if (m === 'Dinheiro') return iso;
  const c = cards.find(x => x.name === m);
  if (!c) return iso;
  // Usa dayjs para facilitar manipulação de datas
  // Se não houver dayjs, implementa lógica equivalente
  const [y, mo, d] = iso.split('-').map(Number);
  const closingDay = c.close;
  const dueDay = c.due;
  const txDay = d;
  let invoiceMonth = mo - 1; // JS Date/Month é 0-based
  let invoiceYear = y;
  if (txDay > closingDay) {
    // entra na fatura do mês seguinte
    if (invoiceMonth === 11) {
      invoiceMonth = 0;
      invoiceYear += 1;
    } else {
      invoiceMonth += 1;
    }
  }
  // Monta data de vencimento da fatura (YYYY-MM-DD)
  const pad = n => String(n).padStart(2, '0');
  // Use formatToISO to ensure correct formatting (even though string concat is safe here)
  return formatToISO(new Date(invoiceYear, invoiceMonth, dueDay));
};

const addYearsIso  = (iso, n) => {
  const d = new Date(iso);
  d.setFullYear(d.getFullYear() + n);
  return formatToISO(d);
};


// ---- Recurrence rule helpers ----
function isSameDayOfMonth(baseIso, testIso, monthInterval) {
  const [by, bm, bd] = baseIso.split('-').map(Number);
  const [ty, tm, td] = testIso.split('-').map(Number);
  if (td !== bd) return false;
  const monthsDiff = (ty - by) * 12 + (tm - bm);
  return monthsDiff % monthInterval === 0;
}

function occursOn(tx, iso) {
  // Exclude single exceptions
  if (tx.exceptions && tx.exceptions.includes(iso)) return false;
  // Exclude dates on or after recurrence end
  if (tx.recurrenceEnd && iso >= tx.recurrenceEnd) return false;
  if (!tx.recurrence) return false;
  if (iso < tx.opDate) return false;
  const baseDate = new Date(tx.opDate);
  const testDate = new Date(iso);
  const diffDays = Math.floor((testDate - baseDate) / 864e5);
  switch (tx.recurrence) {
    case 'D':  return true;
    case 'W':  return diffDays % 7  === 0;
    case 'BW': return diffDays % 14 === 0;
    case 'M':  return isSameDayOfMonth(tx.opDate, iso, 1);
    case 'Q':  return isSameDayOfMonth(tx.opDate, iso, 3);
    case 'S':  return isSameDayOfMonth(tx.opDate, iso, 6);
    case 'Y': {
      // Use formatToISO to compare only date parts (ignoring time zone issues)
      const bd = baseDate;
      const td = testDate;
      return bd.getDate() === td.getDate() && bd.getMonth() === td.getMonth();
    }
    default:   return false;
  }
}



const desc=$('desc'),val=$('value'),met=$('method'),date=$('opDate'),addBtn=$('addBtn');
// Toast pós‑salvar baseado na transação realmente criada
if (addBtn && !addBtn.dataset.toastSaveHook) {
  addBtn.dataset.toastSaveHook = '1';
  // Usa captura para executar antes de possíveis stopPropagation
  addBtn.addEventListener('click', () => {
    const label = (addBtn.textContent || '').toLowerCase();
    // Somente quando é "Adicionar" (não em edição/salvar)
    if (!label.includes('adicion')) return;
    // Defer para permitir que a tx seja criada e inserida em `transactions`
    setTimeout(() => {
      if (!Array.isArray(transactions) || !transactions.length) return;
      // Escolhe a transação com maior timestamp (ts)
      let latest = null;
      for (const t of transactions) {
        if (!latest || (t.ts || '') > (latest.ts || '')) latest = t;
      }
      if (!latest) return;
      try { showToast(buildSaveToast(latest), 'success'); } catch (_) {}
    }, 0);
  }, { capture: true });
}
// Auto-format value input as BRL currency while typing
val.type = 'text';  // ensure it's text for formatting
val.addEventListener('input', () => {
  // Remove all non-digit characters
  const digits = val.value.replace(/\D/g, '');
  // On first digit typed, automatically highlight the expense (red) toggle
  if (digits.length === 1) {
    document.querySelectorAll('.value-toggle button').forEach(b => b.classList.remove('active'));
    document.querySelector('.value-toggle button[data-type="expense"]').classList.add('active');
  }
  if (!digits) {
    val.value = '';
    return;
  }
  // Parse as cents and format
  const numberValue = parseInt(digits, 10) / 100;
  // Check toggle for sign
  const activeToggle = document.querySelector('.value-toggle button.active');
  let formatted = numberValue.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  if (activeToggle && activeToggle.dataset.type === 'expense') {
    formatted = '-' + formatted.replace(/^-/, '');
  } else {
    formatted = formatted.replace(/^-/, '');
  }
  val.value = formatted;
});

const valueToggles = document.querySelectorAll('.value-toggle button');
valueToggles.forEach(btn => {
  btn.addEventListener('click', () => {
    valueToggles.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    // Reformat current value preserving sign choice
    const digits = val.value.replace(/\D/g, '');
    if (!digits) {
      val.value = '';
      return;
    }
    const numberValue = parseInt(digits, 10) / 100;
    let formatted = numberValue.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    if (btn.dataset.type === 'expense') {
      formatted = '-' + formatted.replace(/^-/, '');
    } else {
      formatted = formatted.replace(/^-/, '');
    }
    val.value = formatted;
  });
});

// pill-switch for Dinheiro vs Cartão
const methodButtons = document.querySelectorAll('.switch-option');
const hiddenSelect = document.getElementById('method');
methodButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    methodButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const selectedMethod = btn.dataset.method;
    hiddenSelect.value = selectedMethod;
    btn.closest('.method-switch').dataset.selected = selectedMethod;
    const cardSelector = document.getElementById('cardSelector');
    if (selectedMethod === 'Cartão') {
      renderCardSelector();
      cardSelector.hidden = false;
    } else {
      // clear any previously rendered cards and hide selector
      cardSelector.innerHTML = '';
      cardSelector.hidden = true;
    }
  });
});
// initialize hidden select to match default active
const initialMethod = document.querySelector('.switch-option.active').dataset.method;
hiddenSelect.value = initialMethod;
document.querySelector('.method-switch').dataset.selected = initialMethod;
// Also show/hide card selector on load
const cardSelector = document.getElementById('cardSelector');
if (initialMethod === 'Cartão') {
  renderCardSelector();
  cardSelector.hidden = false;
} else {
  cardSelector.hidden = true;
}

function renderCardSelector() {
  const container = document.getElementById('cardSelector');
  container.innerHTML = '';
  // Only render cards that are not 'Dinheiro'
  cards
    .filter(c => c.name !== 'Dinheiro')
    .forEach(c => {
      const label = document.createElement('label');
      label.style.flex = '1';
      label.innerHTML = `
        <input type="radio" name="cardChoice" value="${c.name}">
        ${c.name}
      `;
      container.appendChild(label);
    });
  // auto-select first card
  const first = container.querySelector('input[name="cardChoice"]');
  if (first) {
    first.checked = true;
    hiddenSelect.value = first.value;
  }
  // listen for changes
  container.querySelectorAll('input[name="cardChoice"]').forEach(radio => {
    radio.addEventListener('change', () => hiddenSelect.value = radio.value);
  });
}

// Recorrência e Parcelas
const recurrence = $('recurrence');
const parcelasBlock = $('parcelasBlock');
const installments = $('installments');

// --- Parcelamento desativado temporariamente ---
parcelasBlock.classList.add('hidden');
installments.value = '1';
installments.disabled = true;
// Não popula opções de parcelas e não exibe nem ativa nada relacionado a parcelas.
// Se selecionar recorrência, zera parcelas
recurrence.onchange = () => {
  if (recurrence.value !== '') installments.value = '1';
};
let isEditing = null;
const cardName=$('cardName'),cardClose=$('cardClose'),cardDue=$('cardDue'),addCardBtn=$('addCardBtn'),cardList=$('cardList');
const startGroup=$('startGroup'),startInput=$('startInput'),setStartBtn=$('setStartBtn'),resetBtn=$('resetData');
// Enable and handle the "Limpar tudo" button
if (resetBtn) {
  resetBtn.hidden = false;
  resetBtn.addEventListener('click', () => {
    if (!confirm('Atenção: ao limpar todos os dados, serão apagadas todas as transações, cartões e o saldo inicial permanentemente. Deseja continuar?')) return;

    // Clear all data
    transactions = [];
    cards = [{ name: 'Dinheiro', close: 0, due: 0 }];
    startBalance = null;

    // Clear caches
    cacheSet('tx', transactions);
    cacheSet('cards', cards);
    cacheSet('startBal', startBalance);

    // Persist
    save('tx', transactions);
    save('cards', cards);
    save('startBal', startBalance);

    // UI
    if (typeof refreshMethods === 'function') refreshMethods();
    if (typeof renderCardList === 'function') renderCardList();
    if (typeof initStart === 'function') initStart();
    renderTable();
  });
}
// Auto-format initial balance input as BRL currency
if (startInput) {
  startInput.addEventListener('input', () => {
    const digits = startInput.value.replace(/\D/g, '');
    if (!digits) {
      startInput.value = '';
      return;
    }
    const numberValue = parseInt(digits, 10) / 100;
    startInput.value = numberValue.toLocaleString('pt-BR', {
      style: 'currency', currency: 'BRL'
    });
  });
}
const startContainer = document.querySelector('.start-container');
const dividerSaldo = document.getElementById('dividerSaldo');

const notify = (msg, type = 'error') => {
  const t = document.getElementById('toast');
  if (!t) return;

  // Set the message
  t.textContent = msg;

  // choose icon for CSS ::before
  t.style.setProperty('--icon', type === 'error' ? '"✕"' : '"✓"');

  // Remove any previous type classes
  t.classList.remove('success', 'error');

  // Add the new type (defines background color)
  t.classList.add(type);

  // ⚡️ Force a reflow so consecutive toasts restart the animation cleanly
  void t.offsetWidth;

  // Show the toast (opacity transition handled via CSS)
  t.classList.add('show');

  // Hide after 3 s: first fade out, then drop the color class to avoid flicker
  setTimeout(() => {
    t.classList.remove('show');          // starts fade‑out (0.3 s)
    // setTimeout(() => t.classList.remove(type), 300);
  }, 5000);
};

const togglePlanned = (id, iso) => {
  const master = transactions.find(x => x.id === id);
  // ← memoriza quais faturas estavam abertas
  const openInvoices = Array.from(
    document.querySelectorAll('details.invoice[open]')
  ).map(el => el.dataset.pd);
  let toastMsg = null;
  if (!master) return;
  if (master.recurrence) {
    master.exceptions = master.exceptions || [];
    if (!master.exceptions.includes(iso)) {
      master.exceptions.push(iso);
      // Create a standalone executed transaction for this occurrence
      const execTx = {
        id: Date.now(),
        parentId: master.id,
        desc: master.desc,
        val: master.val,
        method: master.method,
        opDate: iso,
        postDate: post(iso, master.method),
        recurrence: '',
        installments: 1,
        planned: false,
        ts: new Date().toISOString(),
        modifiedAt: new Date().toISOString()
      };
      transactions.push(execTx);
      // Exibe toast quando a ocorrência recorrente vai para a fatura (cartão)
      if (execTx.method !== 'Dinheiro') {
        const [, mm, dd] = execTx.postDate.split('-');
        toastMsg = `Movida para fatura de ${dd}/${mm}`;
      }
    }
  } else {
    // If un-planning an expired transaction, adjust based on method
    if (master.planned) {
      const today = todayISO();
      if (master.method === 'Dinheiro') {
        // cash payments move to today
        master.opDate = today;
        master.postDate = today;
      }
      // update timestamp of payment to today
      master.ts = new Date().toISOString();
    }
    master.planned = !master.planned;
    if (!master.planned && master.method !== 'Dinheiro') {
      master.postDate = post(master.opDate, master.method);      // move para a fatura
      const [, mm, dd] = master.postDate.split('-');
      toastMsg = `Movida para fatura de ${dd}/${mm}`;
    }
  }
  save('tx', transactions);
  renderTable();
  // restaura faturas que o usuário tinha expandido
  openInvoices.forEach(pd => {
    const det = document.querySelector(`details.invoice[data-pd="${pd}"]`);
    if (det) det.open = true;
  });

  // mostra o toast por último, já com a tela renderizada
  if (toastMsg) notify(toastMsg, 'success');
};

const openCardBtn=document.getElementById('openCardModal');
const cardModal=document.getElementById('cardModal');
const closeCardModal=document.getElementById('closeCardModal');

function refreshMethods(){met.innerHTML='';cards.forEach(c=>{const o=document.createElement('option');o.value=c.name;o.textContent=c.name;met.appendChild(o);});}
// --- Card List Rendering (Refatorado) ---
function createCardSwipeActions(card) {
  const actions = document.createElement('div');
  actions.className = 'swipe-actions';

  // Edit SVG icon
  const editBtn = document.createElement('button');
  editBtn.className = 'icon edit';
  editBtn.style.padding = '0';
  editBtn.style.background = 'none';
  editBtn.style.border = 'none';
  editBtn.style.cursor = 'pointer';
  const editIconDiv = document.createElement('div');
  editIconDiv.className = 'icon-action icon-edit';
  editBtn.appendChild(editIconDiv);
  editBtn.addEventListener('click', () => {
    const newName  = prompt('Nome do cartão', card.name)?.trim();
    if (!newName) return;
    const newClose = parseInt(prompt('Dia de fechamento (1-31)', card.close), 10);
    const newDue   = parseInt(prompt('Dia de vencimento (1-31)', card.due), 10);
    if (
      isNaN(newClose) || isNaN(newDue) ||
      newClose < 1 || newClose > 31 ||
      newDue   < 1 || newDue   > 31 ||
      newClose >= newDue
    ) { alert('Dados inválidos'); return; }
    if (newName !== card.name && cards.some(c => c.name === newName)) {
      alert('Já existe cartão com esse nome'); return;
    }
    const oldName = card.name;
    card.name  = newName;
    card.close = newClose;
    card.due   = newDue;
    transactions.forEach(t => {
      if (t.method === oldName) {
        t.method   = newName;
        t.postDate = post(t.opDate, newName);
      }
    });
    save('cards', cards);
    save('tx', transactions);
    refreshMethods();
    renderCardList();
    renderTable();
  });
  actions.appendChild(editBtn);

  // Delete SVG icon
  const delBtn = document.createElement('button');
  delBtn.className = 'icon danger delete';
  delBtn.style.padding = '0';
  delBtn.style.background = 'none';
  delBtn.style.border = 'none';
  delBtn.style.cursor = 'pointer';
  const delIconDiv = document.createElement('div');
  delIconDiv.className = 'icon-action icon-delete';
  delBtn.appendChild(delIconDiv);
  delBtn.addEventListener('click', () => {
    if (!confirm('Excluir cartão?')) return;
    cards = cards.filter(x => x.name !== card.name);
    save('cards', cards);
    refreshMethods();
    renderCardList();
    renderTable();
  });
  actions.appendChild(delBtn);

  return actions;
}

function createCardContent(card) {
  const content = document.createElement('div');
  content.className = 'card-content card-line';
  content.innerHTML = `
    <b>${card.name}</b>
    <div class="card-detail">
      <span class="card-icon">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff" xmlns="http://www.w3.org/2000/svg">
          <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1 .9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1 -.9-2-2-2zm0 16H5V9h14v11z"/>
        </svg>
      </span>
      <span class="card-label">Fechamento</span>
      <span class="card-value">${card.close}</span>
    </div>
    <div class="card-detail">
      <span class="card-icon">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 20c4.41 0 8-3.59 8-8s-3.59-8 -8-8 -8 3.59 -8 8 3.59 8 8 8zm0-14c3.31 0 6 2.69 6 6s-2.69 6 -6 6 -6-2.69 -6-6 2.69-6 6-6zm.5 3H11v5l4.25 2.52 .75-1.23 -3.5-2.04V9z"/>
        </svg>
      </span>
      <span class="card-label">Vencimento</span>
      <span class="card-value">${card.due}</span>
    </div>
  `;
  return content;
}

function createCardListItem(card) {
  const li = document.createElement('li');
  const wrap = document.createElement('div');
  wrap.className = 'swipe-wrapper';

  const actions = createCardSwipeActions(card);
  const content = createCardContent(card);

  wrap.appendChild(actions);
  wrap.appendChild(content);
  li.appendChild(wrap);
  return li;
}

function renderCardList() {
  cardList.innerHTML = '';
  cards
    .filter(card => card.name !== 'Dinheiro')
    .forEach(card => {
      const li = createCardListItem(card);
      cardList.appendChild(li);
    });
  // swipe-init for cards is now handled via initSwipe at the end of the file.
}
// Helper: returns true if this record is a detached (single‑edited) occurrence
function isDetachedOccurrence(tx) {
  return !tx.recurrence && !!tx.parentId;
}

function makeLine(tx, disableSwipe = false) {
  // Create swipe wrapper
  const wrap = document.createElement('div');
  wrap.className = 'swipe-wrapper';

  // Create actions container
  const actions = document.createElement('div');
  actions.className = 'swipe-actions';

  // Edit button
  const editBtn = document.createElement('button');
  editBtn.className = 'icon edit';
  editBtn.textContent = '';
  const editIconDiv = document.createElement('div');
  editIconDiv.className = 'icon-action icon-edit';
  editBtn.appendChild(editIconDiv);
  editBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    // master or dynamically recurring occurrence
    const t = tx;
    const hasRecurrence = (() => {
      if (typeof t.recurrence === 'string' && t.recurrence.trim() !== '') return true;
      if (t.parentId) {
        const master = transactions.find(p => p.id === t.parentId);
        if (master && typeof master.recurrence === 'string' && master.recurrence.trim() !== '') return true;
      }
      for (const p of transactions) {
        if (typeof p.recurrence === 'string' && p.recurrence.trim() !== '') {
          if (occursOn(p, t.opDate)) {
            if (p.desc === t.desc || p.val === t.val) return true;
          }
        }
      }
      return false;
    })();
    if (t.recurrence || (hasRecurrence && !t.recurrence && !t.parentId)) {
      pendingEditTxId  = t.id;
      pendingEditTxIso = t.opDate;
      editRecurrenceModal.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
      wrapperEl.style.overflow     = 'hidden';
      return;
    }
    if (isDetachedOccurrence(t)) {
      pendingEditMode = null;
      editTx(t.id);
      return;
    }
    editTx(t.id);
  });
  actions.appendChild(editBtn);

  // Delete button
  const delBtn = document.createElement('button');
  delBtn.className = 'icon danger delete';
  delBtn.textContent = '';
  const delIconDiv = document.createElement('div');
  delIconDiv.className = 'icon-action icon-delete';
  delBtn.appendChild(delIconDiv);
  delBtn.onclick = () => {
    const t = tx;
    const hasRecurrence = (() => {
      if (typeof t.recurrence === 'string' && t.recurrence.trim() !== '') return true;
      if (t.parentId) {
        const master = transactions.find(p => p.id === t.parentId);
        if (master && typeof master.recurrence === 'string' && master.recurrence.trim() !== '') return true;
      }
      for (const p of transactions) {
        if (typeof p.recurrence === 'string' && p.recurrence.trim() !== '') {
          if (occursOn(p, t.opDate)) {
            if (p.desc === t.desc || p.val === t.val) return true;
          }
        }
      }
      return false;
    })();
    if (hasRecurrence) {
      delTx(t.id, t.opDate);
    } else {
      if (confirm('Deseja excluir esta operação?')) {
        transactions = transactions.filter(x => x.id !== t.id);
        save('tx', transactions);
        renderTable();
        notify('Operação excluída!', 'success');
      }
    }
  };
  actions.appendChild(delBtn);

  // Operation line
  const d = document.createElement('div');
  d.className = 'op-line';
  d.dataset.txId = tx.id;

  // Build content
  const topRow = document.createElement('div');
  topRow.className = 'op-main';
  const left = document.createElement('div');
  left.className = 'op-left';

  // --- Planned modal disables swipe, needs different structure ---
  if (disableSwipe === true) {
    // If planned, build checkbox and label
    if (tx.planned) {
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'plan-check';
      checkbox.name = 'planned';
      checkbox.onchange = () => togglePlanned(tx.id, tx.opDate);
      const labelWrapper = document.createElement('span');
      labelWrapper.textContent = tx.desc;
      // Patch: append checkbox then labelWrapper directly (no span wrapper)
      left.appendChild(checkbox);
      left.appendChild(labelWrapper);
    } else {
      const descNode = document.createElement('span');
      descNode.textContent = tx.desc;
      left.appendChild(descNode);
    }
    // Recurrence icon
    const t = tx;
    const hasRecurrence = (() => {
      if (typeof t.recurrence === 'string' && t.recurrence.trim() !== '') return true;
      if (t.parentId) {
        const master = transactions.find(p => p.id === t.parentId);
        if (master && typeof master.recurrence === 'string' && master.recurrence.trim() !== '') return true;
      }
      for (const p of transactions) {
        if (typeof p.recurrence === 'string' && p.recurrence.trim() !== '') {
          if (occursOn(p, t.opDate)) {
            if (p.desc === t.desc || p.val === t.val) return true;
          }
        }
      }
      return false;
    })();
    if (hasRecurrence) {
      const recIcon = document.createElement('span');
      recIcon.className = 'icon-repeat';
      recIcon.title = 'Recorrência';
      left.appendChild(recIcon);
    }
    if (!left.querySelector('.icon-repeat')) {
      const t = tx;
      const hasRecurrenceFinal =
        (typeof t.recurrence === 'string' && t.recurrence.trim() !== '') ||
        (t.parentId && transactions.some(p =>
          p.id === t.parentId &&
          typeof p.recurrence === 'string' &&
          p.recurrence.trim() !== ''
        ));
      if (hasRecurrenceFinal) {
        const recIc = document.createElement('span');
        recIc.className = 'icon-repeat';
        left.insertBefore(recIc, left.firstChild);
      }
    }
  } else {
    // Default structure (swipe enabled)
    if (tx.planned) {
      const chk = document.createElement('input');
      chk.type = 'checkbox';
      chk.className = 'plan-check';
      chk.name = 'planned';
      chk.onchange = () => togglePlanned(tx.id, tx.opDate);
      left.appendChild(chk);
    }
    const descNode = document.createElement('span');
    descNode.textContent = tx.desc;
    left.appendChild(descNode);
    // Recurrence icon
    const t = tx;
    const hasRecurrence = (() => {
      if (typeof t.recurrence === 'string' && t.recurrence.trim() !== '') return true;
      if (t.parentId) {
        const master = transactions.find(p => p.id === t.parentId);
        if (master && typeof master.recurrence === 'string' && master.recurrence.trim() !== '') return true;
      }
      for (const p of transactions) {
        if (typeof p.recurrence === 'string' && p.recurrence.trim() !== '') {
          if (occursOn(p, t.opDate)) {
            if (p.desc === t.desc || p.val === t.val) return true;
          }
        }
      }
      return false;
    })();
    if (hasRecurrence) {
      const recIcon = document.createElement('span');
      recIcon.className = 'icon-repeat';
      recIcon.title = 'Recorrência';
      left.appendChild(recIcon);
    }
    if (!left.querySelector('.icon-repeat')) {
      const t = tx;
      const hasRecurrenceFinal =
        (typeof t.recurrence === 'string' && t.recurrence.trim() !== '') ||
        (t.parentId && transactions.some(p =>
          p.id === t.parentId &&
          typeof p.recurrence === 'string' &&
          p.recurrence.trim() !== ''
        ));
      if (hasRecurrenceFinal) {
        const recIc = document.createElement('span');
        recIc.className = 'icon-repeat';
        left.insertBefore(recIc, left.firstChild);
      }
    }
  }

  const right = document.createElement('div');
  right.className = 'op-right';
  const value = document.createElement('span');
  value.className = 'value';
  value.textContent = `R$ ${(tx.val < 0 ? '-' : '')}${Math.abs(tx.val).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  if (tx.val < 0) {
    value.classList.add('negative');
  } else {
    value.classList.add('positive');
  }
  right.appendChild(value);
  topRow.appendChild(left);
  topRow.appendChild(right);
  d.appendChild(topRow);

  // Timestamp & method
  const ts = document.createElement('div');
  ts.className = 'timestamp';
  const [y, mo, da] = tx.opDate.split('-').map(Number);
  const dateObj = new Date(y, mo - 1, da);
  const dateStr = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  const methodLabel = tx.method === 'Dinheiro' ? 'Dinheiro' : `Cartão ${tx.method}`;
  if (tx.planned) {
    ts.textContent = `${dateStr} - ${methodLabel}`;
  } else if (tx.opDate === todayISO()) {
    const timeStr = new Date(tx.ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });
    ts.textContent = timeStr;
  } else {
    ts.textContent = dateStr;
  }
  d.appendChild(ts);

  // Assemble wrapper and return
  wrap.appendChild(actions);
  wrap.appendChild(d);
  return wrap;
}
// swipe-init for operations is now handled via initSwipe at the end of the file.

function addCard(){const n=cardName.value.trim(),cl=+cardClose.value,du=+cardDue.value;if(!n||cl<1||cl>31||du<1||du>31||cl>=du||cards.some(c=>c.name===n)){alert('Dados inválidos');return;}cards.push({name:n,close:cl,due:du});cacheSet('cards', cards);save('cards',cards);refreshMethods();renderCardList();cardName.value='';cardClose.value='';cardDue.value='';}


// Localized addTx and helpers
async function addTx() {
  // Edit mode
  if (isEditing !== null) {
    // (mantém lógica de edição original)
    const t = transactions.find(x => x.id === isEditing);
    if (!t) {
      console.error('Transaction not found for editing:', isEditing);
      // reset edit state
      pendingEditMode = null;
      isEditing = null;
      addBtn.textContent = 'Adicionar';
      txModalTitle.textContent = 'Lançar operação';
      toggleTxModal();
      return;
    }
    const newDesc    = desc.value.trim();
    let newVal = parseFloat(val.value.replace(/\./g, '').replace(/,/g, '.')) || 0;
    const activeType = document.querySelector('.value-toggle button.active').dataset.type;
    if (activeType === 'expense') newVal = -Math.abs(newVal);
    const newMethod  = met.value;
    const newOpDate  = date.value;
    const newPostDate = post(newOpDate, newMethod);
    const newRecurrence  = recurrence.value;
    const newInstallments = parseInt(installments.value, 10) || 1;

    switch (pendingEditMode) {
      case 'single':
        // Exception for this occurrence
        t.exceptions = t.exceptions || [];
        if (!t.exceptions.includes(pendingEditTxIso)) {
          t.exceptions.push(pendingEditTxIso);
        }
        // Create standalone edited transaction
        transactions.push({
          id: Date.now(),
          parentId: t.parentId || t.id,
          desc: newDesc,
          val: newVal,
          method: newMethod,
          opDate: newOpDate,
          postDate: newPostDate,
          recurrence: '',
          installments: 1,
          planned: newOpDate > todayISO(),
          ts: new Date().toISOString(),
          modifiedAt: new Date().toISOString()
        });
        break;
      case 'future':
        // End original series at this occurrence
        t.recurrenceEnd = pendingEditTxIso;
        // Create new series starting from this occurrence
        transactions.push({
          id: Date.now(),
          parentId: null,
          desc: newDesc,
          val: newVal,
          method: newMethod,
          opDate: pendingEditTxIso,
          postDate: newPostDate,
          recurrence: newRecurrence,
          installments: newInstallments,
          planned: pendingEditTxIso > todayISO(),
          ts: new Date().toISOString(),
          modifiedAt: new Date().toISOString()
        });
        break;
      case 'all': {
        {
          /* —— EDITAR TODAS ——  
             Apenas altera a REGRA‑MESTRE, preservando todas as ocorrências
             passadas.  Se o registro clicado for uma ocorrência gerada,
             subimos para o pai; caso contrário usamos o próprio. */
          const master = t.parentId
            ? transactions.find(tx => tx.id === t.parentId)
            : t;
          if (master) {
            master.desc         = newDesc;
            master.val          = newVal;
            master.method       = newMethod;
            // Mantemos opDate original; só recalculamos postDate conforme novo método
            master.postDate     = post(master.opDate, newMethod);
            master.recurrence   = recurrence.value;
            master.installments = parseInt(installments.value, 10) || 1;
            master.modifiedAt   = new Date().toISOString();
          }
        }
        break;
      }
      default:
        // Fallback: modify just this entry
        t.desc       = newDesc;
        t.val        = newVal;
        t.method     = newMethod;
        t.opDate     = newOpDate;
        t.postDate   = newPostDate;
        t.recurrence   = newRecurrence;
        t.installments = newInstallments;
        // Ajusta flag planned caso a data da operação ainda não tenha ocorrido
        t.planned      = t.opDate > todayISO();
        t.modifiedAt = new Date().toISOString();
    }
    // Reset editing state
    pendingEditMode    = null;
    pendingEditTxId    = null;
    pendingEditTxIso   = null;
    isEditing          = null;
    addBtn.textContent = 'Adicionar';
    txModalTitle.textContent = 'Lançar operação';
    save('tx', transactions);
    renderTable();
    toggleTxModal();
    // Custom edit confirmation toast
    const formattedVal = parseFloat(val.value.replace(/\./g, '').replace(/,/g, '.'))
      .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const recValue = recurrence.value;
    let toastMsg;
    if (!recValue) {
      // Edição de operação única
      const opDateVal = date.value; // formato YYYY-MM-DD
      toastMsg = `Edição: ${formattedVal} em ${opDateVal.slice(8,10)}/${opDateVal.slice(5,7)}`;
    } else {
      // Edição de recorrência
      const recText = recurrence.options[recurrence.selectedIndex].text.toLowerCase();
      toastMsg = `Edição: ${formattedVal} (${recText})`;
    }
    showToast(toastMsg, 'success');
    return;
  }

  // Adição normal
  if (startBalance === null) {
    showToast('Defina o saldo inicial primeiro (pode ser 0).');
    return;
  }
  const formData = collectTxFormData();
  if (!formData) return;
  const tx = buildTransaction(formData);
  const _promise = finalizeTransaction(tx); // fire-and-forget
  resetTxForm();                            // fecha o modal já
  _promise.catch(err => console.error('finalizeTransaction failed:', err));
}

// 1. Coleta os dados do formulário e valida
function collectTxFormData() {
  const d = desc.value.trim();
  let v = parseFloat(val.value.replace(/\./g, '').replace(/,/g, '.')) || 0;
  const activeType = document.querySelector('.value-toggle button.active').dataset.type;
  if (activeType === 'expense') v = -Math.abs(v);
  const m = met.value;
  const iso = date.value;
  const recur = recurrence.value;
  // Parcelamento desativado: sempre 1
  const inst = 1;
  if (!d || isNaN(v) || !iso) {
    alert('Complete os campos');
    return null;
  }
  return {
    desc: d,
    val: v,
    method: m,
    opDate: iso,
    recurrence: recur,
    installments: inst
  };
}

// 2. Monta o objeto transação final
function buildTransaction(data) {
  return {
    id: Date.now(),
    parentId: null,
    desc: data.desc,
    val: data.val,
    method: data.method,
    opDate: data.opDate,
    postDate: post(data.opDate, data.method),
    recurrence: data.recurrence,
    installments: 1,
    planned: data.opDate > todayISO(),
    ts: new Date().toISOString(),
    modifiedAt: new Date().toISOString()
  };
}

// 3. Adiciona ao array global, salva e renderiza
async function finalizeTransaction(tx) {
  let batch = tx.recurrence ? [tx] : [tx];

  // Atualiza UI/estado imediatamente
  transactions.push(...batch);
  sortTransactions();
  cacheSet('tx', transactions);

  try {
    if (!navigator.onLine) {
      for (const t of batch) await queueTx(t);
      updatePendingBadge();
      renderTable();
      showToast('Offline: transação salva na fila', 'error');
      return;
    }

    // Online: enfileira sem aguardar e faz flush em background
    for (const t of batch) queueTx(t); // fire-and-forget
    flushQueue().catch(err => console.error('flushQueue (async) failed:', err));

    updatePendingBadge();
    renderTable();
    save('tx', transactions);
  } catch (e) {
    console.error('finalizeTransaction error:', e);
  }
}

// 4. Fecha modal, toast de sucesso e limpa campos
function resetTxForm() {
  desc.value = '';
  val.value  = '';
  date.value = todayISO();
  toggleTxModal();
  // Custom save confirmation toast
  const v = 0; // valor já limpo, mas podemos mostrar mensagem genérica
  // Recupera última transação para mensagem
  let last = transactions[transactions.length - 1];
  let formattedVal = last && typeof last.val === 'number'
    ? last.val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : '';
  const recValue = recurrence.value;
  let toastMsg;
  if (!recValue && last) {
    const opDateVal = last.opDate; // formato YYYY-MM-DD
    toastMsg = `${formattedVal} salvo em ${opDateVal.slice(8,10)}/${opDateVal.slice(5,7)}`;
  } else if (last) {
    const recText = recurrence.options[recurrence.selectedIndex].text.toLowerCase();
    toastMsg = `${formattedVal} salvo (${recText})`;
  } else {
    toastMsg = `Transação salva`;
  }
  showToast(toastMsg, 'success');
}

// Função auxiliar para gerar recorrências
function generateOccurrences(baseTx) {
  const recur = baseTx.recurrence;
  if (!recur) return [];
  const occurrences = [];
  const parentId = baseTx.id;
  // Limita a 12 ocorrências (exemplo: 1 ano) para evitar explosão
  let max = 12;
  let d = new Date(baseTx.opDate);
  for (let i = 1; i < max; i++) {
    // Avança data conforme recorrência
    switch(recur) {
      case 'D': d.setDate(d.getDate() + 1); break;
      case 'W': d.setDate(d.getDate() + 7); break;
      case 'BW': d.setDate(d.getDate() + 14); break;
      case 'M': d.setMonth(d.getMonth() + 1); break;
      case 'Q': d.setMonth(d.getMonth() + 3); break;
      case 'S': d.setMonth(d.getMonth() + 6); break;
      case 'Y': d.setFullYear(d.getFullYear() + 1); break;
      default: break;
    }
    const nextIso = d.toISOString().slice(0, 10);
    // Calcula postDate com a regra de cartão
    let postDate = post(nextIso, baseTx.method);
    occurrences.push({
      ...baseTx,
      id: parentId + i,
      parentId,
      opDate: nextIso,
      postDate: postDate,
      planned: postDate > todayISO(),
      ts: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
      recurrence: '',
      installments: 1
    });
  }
  return occurrences;
}
// Função utilitária para buscar cartão por id (caso não exista)
function getCardById(id) {
  if (!id) return null;
  // Tenta encontrar cartão pelo campo id, ou pelo nome (fallback)
  return cards.find(c => c.id === id || c.name === id) || null;
}

// Função utilitária para formatar data ISO (YYYY-MM-DD)
function formatDateISO(date) {
  if (!(date instanceof Date)) return '';
  return date.toISOString().slice(0,10);
}

// Delete a transaction (with options for recurring rules)
function delTx(id, iso) {
  const t = transactions.find(x => x.id === id);
  if (!t) return;

  // Se NÃO for recorrente (nem ocorrência destacada), exclui direto
  if (!t.recurrence && !t.parentId) {
    transactions = transactions.filter(x => x.id !== id);
    save('tx', transactions);
    renderTable();
    showToast('Operação excluída.', 'success');
    return;
  }

  // Recorrente → abre modal de escopo
  pendingDeleteTxId = id;
  pendingDeleteTxIso = iso || t.opDate;
  deleteRecurrenceModal.classList.remove('hidden');
  if (document.body) document.body.style.overflow = 'hidden';
  if (wrapperEl) wrapperEl.style.overflow = 'hidden';
}

function closeDeleteModal() {
  deleteRecurrenceModal.classList.add('hidden');
  if (document.body) document.body.style.overflow = '';
  if (wrapperEl) wrapperEl.style.overflow = '';
  pendingDeleteTxId = null;
  pendingDeleteTxIso = null;
}

// Modal handlers
closeDeleteRecurrenceModal.onclick = closeDeleteModal;
cancelDeleteRecurrence.onclick = closeDeleteModal;
deleteRecurrenceModal.onclick = e => { if (e.target === deleteRecurrenceModal) closeDeleteModal(); };

deleteSingleBtn.onclick = () => {
  const tx = transactions.find(t => t.id === pendingDeleteTxId);
  if (!tx) { closeDeleteModal(); return; }
  tx.exceptions = tx.exceptions || [];
  tx.exceptions.push(pendingDeleteTxIso);
  save('tx', transactions);
  renderTable();
  closeDeleteModal();
  showToast('Ocorrência excluída!', 'success');
};
deleteFutureBtn.onclick = () => {
  const tx = transactions.find(t => t.id === pendingDeleteTxId);
  if (!tx) { closeDeleteModal(); return; }
  tx.recurrenceEnd = pendingDeleteTxIso;
  save('tx', transactions);
  renderTable();
  closeDeleteModal();
  showToast('Esta e futuras excluídas!', 'success');
};
deleteAllBtn.onclick = () => {
  // Remove both master rule and any occurrences with parentId
  transactions = transactions.filter(t => t.id !== pendingDeleteTxId && t.parentId !== pendingDeleteTxId);
  save('tx', transactions);
  renderTable();
  closeDeleteModal();
  showToast('Todas as recorrências excluídas!', 'success');
};

// Modal Editar Recorrência handlers
function closeEditModal() {
  editRecurrenceModal.classList.add('hidden');
  if (document.body) document.body.style.overflow = '';
  if (wrapperEl) wrapperEl.style.overflow = '';
}
closeEditRecurrenceModal.onclick = closeEditModal;
cancelEditRecurrence.onclick = closeEditModal;
editRecurrenceModal.onclick = e => { if (e.target === editRecurrenceModal) closeEditModal(); };

editSingleBtn.onclick = () => {
  pendingEditMode = 'single';
  closeEditModal();
  editTx(pendingEditTxId);
};
editFutureBtn.onclick = () => {
  pendingEditMode = 'future';
  closeEditModal();
  editTx(pendingEditTxId);
};
editAllBtn.onclick = () => {
  pendingEditMode = 'all';
  closeEditModal();
  editTx(pendingEditTxId);
};
const editTx = id => {
  const t = transactions.find(x => x.id === id);
  if (!t) return;

  // 1) Hard reset para não herdar estado da edição anterior
  if (typeof resetTxModal === 'function') resetTxModal();

  // 2) Descrição
  desc.value = t.desc || '';

  // 3) Valor + toggle despesa/receita
  const valInput = document.getElementById('value');
  if (valInput) {
    const abs = Math.abs(Number(t.val || 0));
    valInput.value = abs.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  document.querySelectorAll('.value-toggle button').forEach(b => b.classList.remove('active'));
  const type = (Number(t.val || 0) < 0) ? 'expense' : 'income';
  const typeBtn = document.querySelector(`.value-toggle button[data-type="${type}"]`);
  if (typeBtn) typeBtn.classList.add('active');
  if (type === 'expense' && valInput) {
    valInput.value = '-' + valInput.value.replace(/^-/, '');
  }

  // 4) Método de pagamento (pill + select + radios do cartão)
  met.value = t.method;
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
    // Renderiza as opções de cartão e marca o cartão da transação
    if (typeof renderCardSelector === 'function') renderCardSelector();
    if (cardSelectorEl) {
      const sel = cardSelectorEl.querySelector(`input[name="cardChoice"][value="${CSS.escape(t.method)}"]`);
      if (sel) sel.checked = true;
      cardSelectorEl.hidden = false;
    }
  }

  // 5) Data (respeita pendingEditMode/pendingEditTxIso)
  date.value = (pendingEditMode && pendingEditTxIso) ? pendingEditTxIso : t.opDate;

  // 6) Recorrência / parcelas
  recurrence.value = t.recurrence || '';
  installments.value = String(t.installments || 1);

  // 7) Estado e rótulos
  isEditing = id;
  addBtn.textContent = 'Salvar';
  txModalTitle.textContent = 'Editar operação';

  // 8) Abre o modal apenas se estiver fechado (evita fechar sem querer)
  if (txModal.classList.contains('hidden')) {
    toggleTxModal();
  }
  const vEl = document.getElementById('value');
  if (vEl) { vEl.focus(); vEl.select(); }
};

// ===== Hook único para EDITAR: decide entre modal de escopo (recorrente) ou edição direta =====
document.addEventListener('click', (e) => {
  const editEl = e.target.closest('.icon-edit, [data-action="edit"]');
  if (!editEl) return;

  // tenta obter o id a partir do elemento da linha
  const container = editEl.closest('.op-item, .op-line, .swipe-wrapper') || document;
  const txEl = container.querySelector('[data-tx-id]');
  const id = txEl ? Number(txEl.dataset.txId) : null;
  if (!id) return;

  const t = transactions.find(x => x.id === id);
  if (!t) return;

  pendingEditTxId  = id;
  pendingEditTxIso = t.opDate;

  if (t.recurrence || t.parentId) {
    // recorrente → abre modal de escopo de edição
    editRecurrenceModal.classList.remove('hidden');
    if (document.body) document.body.style.overflow = 'hidden';
    if (wrapperEl) wrapperEl.style.overflow = 'hidden';
  } else {
    // não recorrente → vai direto para edição
    editTx(id);
  }

  e.preventDefault();
  e.stopPropagation();
});

function renderTable() {
  clearTableContent();
  const groups = groupTransactionsByMonth();
  renderTransactionGroups(groups);
}

// 1. NÃO limpe o #accordion aqui para preservar estado; apenas zere o tableBody (legacy).
function clearTableContent() {
  // Preserva o estado do acordeão; a limpeza/recálculo é feita dentro de renderAccordion().
  if (typeof tbody !== 'undefined' && tbody) {
    tbody.innerHTML = '';
  }
}

// 2. Agrupa as transações globais por mês (YYYY-MM) e retorna um Map ordenado por data.
function groupTransactionsByMonth() {
  // Agrupa transações por mês (YYYY-MM)
  const groups = new Map();
  sortTransactions();
  for (const tx of transactions) {
    // Usa postDate para agrupamento por mês
    const key = tx.postDate.slice(0, 7); // YYYY-MM
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(tx);
  }
  // Ordena o Map por chave (YYYY-MM), decrescente (mais recente primeiro)
  return new Map([...groups.entries()].sort((a, b) => b[0].localeCompare(a[0])));
}

// 3. Recebe o Map agrupado e itera renderizando os meses em ordem decrescente, usando renderAccordion
function renderTransactionGroups(groups) {
  // Aqui, para manter compatibilidade com a UI, apenas chama renderAccordion
  // que já monta o acordeão por mês/dia/fatura, usando os dados globais.
  // Se desejar, pode passar os grupos para renderAccordion para customização.
  renderAccordion();
}


// -----------------------------------------------------------------------------
// Acordeão: mês → dia → fatura
// -----------------------------------------------------------------------------
// -----------------------------------------------------------------------------
// Accordion: month ▶ day ▶ invoice
// Shows every month (Jan–Dec) and every day (01–31),
// past months collapsed by default, current & future months open.
// -----------------------------------------------------------------------------
function renderAccordion() {
  const acc = document.getElementById('accordion');
  if (!acc) return;
  // Salva quais <details> estão abertos antes de recriar
  const openKeys = Array.from(acc.querySelectorAll('details[open]'))
                        .map(d => d.dataset.key || '');
  // Preserve which invoice panels are open
  const openInvoices = Array.from(
    acc.querySelectorAll('details.invoice[open]')
  ).map(d => d.dataset.pd);
  acc.innerHTML = '';

  const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const currency = v => v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const curMonth = new Date().getMonth();   // 0‑based

  // Helper para criar o header da fatura do cartão
  function createCardInvoiceHeader(cardName, cardTotalAmount) {
    const invSum = document.createElement('summary');
    // Ajuste de formatação: se valor negativo, exibe como R$ -valor
    let formattedTotal;
    if (cardTotalAmount < 0) {
      formattedTotal = `R$ -${Math.abs(cardTotalAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    } else {
      formattedTotal = `R$ ${cardTotalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    }
    invSum.innerHTML = `
      <span class="invoice-label">Fatura – ${cardName}</span>
      <span class="invoice-total">${formattedTotal}</span>
    `;
    return invSum;
  }

  // Helper para calcular a data de vencimento (YYYY-MM-DD) do cartão para determinado mês/ano
  function getCardDueDateKey(card, year, month) {
    // card.due: dia do vencimento
    // month: 0-based
    // year: full year
    const pad = n => String(n).padStart(2, '0');
    return `${year}-${pad(month + 1)}-${pad(card.due)}`;
  }

  // Helper para obter todas as transações de um cartão para o mês/ano da data
  function getAllTransactionsOnCard(cardName, year, month) {
    const txs = [];
    const targetMonth = month;           // 0‑based
    const targetYear  = year;

    // Define a 60‑day window that comfortably spans:
    // • todo o mês alvo
    // • o intervalo entre o fechamento do cartão do mês anterior
    //   e a data de vencimento da fatura do mês alvo.
    const windowStart = new Date(targetYear, targetMonth - 1, 1); // 1.º dia do mês anterior
    const windowEnd   = new Date(targetYear, targetMonth + 1, 0); // último dia do mês seguinte

    // Percorre todas as transações já persistidas
    transactions.forEach(tx => {
      if (tx.method !== cardName) return;

      // 1. Operações únicas --------------------------------------------
      if (!tx.recurrence) {
        const pd = new Date(tx.postDate);
        if (pd.getFullYear() === targetYear && pd.getMonth() === targetMonth) {
          txs.push(tx);
        }
        return;          // done
      }

      // 2. Operações recorrentes ---------------------------------------
      // Gera ocorrências apenas dentro da janela de 60 dias para performance.
      for (let d = new Date(windowStart); d <= windowEnd; d.setDate(d.getDate() + 1)) {
        const iso = d.toISOString().slice(0, 10);
        if (!occursOn(tx, iso)) continue;

        const pd  = post(iso, cardName);
        const pdDate = new Date(pd);
        if (pdDate.getFullYear() === targetYear && pdDate.getMonth() === targetMonth) {
          txs.push({
            ...tx,
            opDate: iso,           // dia real da compra
            postDate: pd,          // dia de vencimento da fatura
            planned: iso > todayISO()
          });
        }
      }
    });

    // Exibe na fatura apenas transações que já foram executadas
    return txs.filter(t => !t.planned);
  }

  // Helper to get all transactions of a specific ISO date
  const txByDate = iso => {
  const list = [];
  const today = todayISO();

  // ================= NON-RECURRING =================
  transactions.forEach(t => {
    if (t.recurrence) return;            // só não-recorrentes aqui
    if (t.opDate !== iso) return;        // renderiza sempre no opDate

    if (t.method !== 'Dinheiro') {
      // CARTÃO
      if (t.planned) {
        // planejada → aparece no dia lançado (opDate)
        list.push(t);
      } else {
        // executada → NÃO aparece no dia; vai só para a fatura (postDate)
      }
    } else {
      // DINHEIRO → aparece sempre no opDate (planejada ou executada)
      list.push(t);
    }
  });

  // ================= RECURRING RULES =================
  transactions
    .filter(t => t.recurrence)
    .forEach(master => {
      if (!occursOn(master, iso)) return; // materializa somente a ocorrência do dia

      const pd = post(iso, master.method);
      const plannedFlag = iso > today;    // futuro → planejada; passado/hoje → executada

      if (master.method !== 'Dinheiro') {
        // CARTÃO recorrente
        if (plannedFlag) {
          // planejada → aparece no opDate
          list.push({
            ...master,
            opDate: iso,
            postDate: pd,
            planned: true,
            recurrence: ''
          });
        } else {
          // executada → NÃO aparece no dia; vai só para a fatura no postDate
        }
      } else {
        // DINHEIRO recorrente → sempre aparece no opDate (planejada/executada)
        list.push({
          ...master,
          opDate: iso,
          postDate: post(iso, 'Dinheiro'),
          planned: plannedFlag,
          recurrence: ''
        });
      }
    });

  // Ordem cronológica estável (por opDate e ts)
  list.sort((a, b) => {
    const dateCmp = a.opDate.localeCompare(b.opDate);
    if (dateCmp !== 0) return dateCmp;
    return (a.ts || '').localeCompare(b.ts || '');
  });

  return list;
  };

  let runningBalance = startBalance || 0;          // saldo acumulado
  for (let mIdx = 0; mIdx < 12; mIdx++) {
    const nomeMes = new Date(2025, mIdx).toLocaleDateString('pt-BR', { month: 'long' });
    // Build month container
    const mDet = document.createElement('details');
    mDet.className = 'month';
    mDet.dataset.key = `m-${mIdx}`;   // identifica o mês
    const isOpen = mIdx >= curMonth;
    mDet.open = openKeys.includes(mDet.dataset.key) || isOpen;
    // Month total = sum of all tx in that month
    const monthTotal = transactions
      .filter(t => new Date(t.postDate).getMonth() === mIdx)
      .reduce((s,t) => s + t.val, 0);
    // Cabeçalho flutuante dos meses
    const mSum = document.createElement('summary');
    mSum.className = 'month-divider';

    const monthActual = transactions
      .filter(t => {
        const pd = new Date(t.postDate);
        return pd.getMonth() === mIdx && !t.planned;
      })
      .reduce((s, t) => s + t.val, 0);

    const monthPlanned = transactions
      .filter(t => {
        const pd = new Date(t.postDate);
        return pd.getMonth() === mIdx && t.planned;
      })
      .reduce((s, t) => s + t.val, 0);

    let metaLabel = '';
    let metaValue = '';

    if (mIdx < curMonth) { // meses passados
      metaLabel = 'Saldo final:';
      metaValue = currency(monthActual);
    } else if (mIdx === curMonth) { // mês corrente
      metaLabel = 'Saldo atual:';
      metaValue = currency(monthActual);
    } else { // meses futuros
      metaLabel = 'Saldo projetado:';
      metaValue = currency(monthActual + monthPlanned);
    }

    mSum.innerHTML = `
      <div class="month-row">
        <span class="month-name">${nomeMes.toUpperCase()}</span>
      </div>
      <div class="month-meta">
        <span class="meta-label">${metaLabel}</span>
        <span class="meta-value">${metaValue}</span>
      </div>`;

    mDet.appendChild(mSum);

    // Garante o número correto de dias em cada mês
    const daysInMonth = new Date(2025, mIdx + 1, 0).getDate();
    let monthEndBalanceForHeader;
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(2025, mIdx, d);
      const iso = formatToISO(dateObj);
      const dayTx = txByDate(iso);

      // === DAILY IMPACT (novas regras) — TABELA: só cálculo, sem UI ===
const invoicesByCard = {};
const addToGroup = (cardName, tx) => {
  if (!invoicesByCard[cardName]) invoicesByCard[cardName] = [];
  invoicesByCard[cardName].push(tx);
};

// Não-recorrentes de cartão: vencem hoje
transactions.forEach(t => {
  if (t.method !== 'Dinheiro' && !t.recurrence && t.postDate === iso) {
    addToGroup(t.method, t);
  }
});

// Recorrentes de cartão: varre 60 dias p/ trás por ocorrências cujo postDate == hoje
const _scanStart = new Date(iso);
_scanStart.setDate(_scanStart.getDate() - 60);
for (const master of transactions.filter(t => t.recurrence && t.method !== 'Dinheiro')) {
  for (let d2 = new Date(_scanStart); d2 <= new Date(iso); d2.setDate(d2.getDate() + 1)) {
    const occIso = d2.toISOString().slice(0, 10);
    if (!occursOn(master, occIso)) continue;
    const pd = post(occIso, master.method);
    if (pd === iso) {
      addToGroup(master.method, {
        ...master,
        opDate: occIso,
        postDate: iso,
        planned: false,
        recurrence: ''
      });
    }
  }
}

// 1) Dinheiro impacta o saldo no dia da operação
const cashImpact = dayTx
  .filter(t => t.method === 'Dinheiro')
  .reduce((s, t) => s + t.val, 0);

// 2) Cartões impactam somente via total da fatura no vencimento
const invoiceTotals = {};
Object.keys(invoicesByCard).forEach(card => {
  invoiceTotals[card] = invoicesByCard[card].reduce((s, t) => s + t.val, 0);
});
const cardImpact = Object.values(invoiceTotals).reduce((s, v) => s + v, 0);

const dayTotal = cashImpact + cardImpact;
      runningBalance += dayTotal;                           // atualiza saldo acumulado
      const dow = dateObj.toLocaleDateString('pt-BR', { weekday: 'long', timeZone: 'America/Sao_Paulo' });
      const dDet = document.createElement('details');
      dDet.dataset.has = String(dayTx.length > 0);
      dDet.className = 'day';
      dDet.dataset.key = `d-${iso}`;    // identifica o dia YYYY‑MM‑DD
      dDet.open = openKeys.includes(dDet.dataset.key);
      const today = todayISO();
      if (iso === today) dDet.classList.add('today');
      const dSum = document.createElement('summary');
      dSum.className = 'day-summary';
      const saldoFormatado = runningBalance < 0
        ? `R$ -${Math.abs(runningBalance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
        : `R$ ${runningBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
      const baseLabel = `${String(d).padStart(2,'0')} - ${dow.charAt(0).toUpperCase() + dow.slice(1)}`;
      const hasCardDue = cards.some(card => card.due === d);
      const hasSalary  = dayTx.some(t =>
        SALARY_WORDS.some(w => t.desc.toLowerCase().includes(w))
      );

      const labelParts = [baseLabel];
      if (hasCardDue) labelParts.push('<span class="icon-invoice"></span>');
      if (hasSalary)  labelParts.push('<span class="icon-salary"></span>');

      const labelWithDue = labelParts.join('');
      dSum.innerHTML = `<span>${labelWithDue}</span><span class="day-balance" style="margin-left:auto">${saldoFormatado}</span>`;
      if (runningBalance < 0) dDet.classList.add('negative');
      dDet.appendChild(dSum);

      // Seção de planejados (apenas se houver planejados)
      const plannedOps = dayTx
        .filter(t => t.planned)
        .sort((a, b) => {
          const dateCmp = a.opDate.localeCompare(b.opDate);
          if (dateCmp !== 0) return dateCmp;
          return (a.ts || '').localeCompare(b.ts || '');
        });

      // === INVOICE UI (vencendo hoje) ===
      // Remove restos de render anteriores
      (dDet.querySelectorAll && dDet.querySelectorAll('details.invoice').forEach(n => n.remove()));

      Object.keys(invoicesByCard).forEach(cardName => {
        const det = document.createElement('details');
        det.className = 'invoice';
        det.dataset.pd = iso; // YYYY-MM-DD (vencimento)

        // Cabeçalho padrão da fatura
        det.appendChild(createCardInvoiceHeader(cardName, invoiceTotals[cardName] || 0));

        // Itens da fatura (apenas visual; o saldo usa somente o total)
        invoicesByCard[cardName]
          .filter(t => !t.planned)
          .forEach(t => det.appendChild(makeLine(t)));
        dDet.appendChild(det);
      });
      if (plannedOps.length) {
        const plannedSection = document.createElement('div');
        plannedSection.className = 'planned-cash';
        const plannedHeader = document.createElement('div');
        plannedHeader.className = 'planned-header';
        plannedHeader.textContent = 'Planejados:';
        plannedSection.appendChild(plannedHeader);
        const plannedList = document.createElement('ul');
        plannedList.className = 'planned-list';
        plannedSection.appendChild(plannedList);

        plannedOps.forEach(t => {
          const li = document.createElement('li');
          li.appendChild(makeLine(t));
          plannedList.appendChild(li);
        });

        dDet.appendChild(plannedSection);
      }


      // Seção de executados em dinheiro (apenas se houver)
      const cashExec = dayTx.filter(t => t.method.toLowerCase() === 'dinheiro' && !t.planned);
      if (cashExec.length) {
        const executedCash = document.createElement('div');
        executedCash.className = 'executed-cash';
        const execHeader = document.createElement('div');
        execHeader.className = 'executed-header';
        execHeader.textContent = 'Executados:';
        executedCash.appendChild(execHeader);
        const execList = document.createElement('ul');
        execList.className = 'executed-list';

        cashExec.forEach(t => {
          const li = document.createElement('li');
          li.appendChild(makeLine(t));
          execList.appendChild(li);
        });

        executedCash.appendChild(execList);
        dDet.appendChild(executedCash);
      }

      mDet.appendChild(dDet);
    }

// --- Atualiza o preview do mês com base no último dia visível ---
monthEndBalanceForHeader = runningBalance; // saldo do último dia do mês
const headerPreviewLabel = (mIdx < curMonth) ? 'Saldo final' : 'Saldo planejado';

    // Atualiza o summary do mês (cabeçalho do accordion)
    const labelEl = mSum.querySelector('.meta-label');
    const valueEl = mSum.querySelector('.meta-value');
    if (labelEl) labelEl.textContent = headerPreviewLabel + ':';
    if (valueEl) valueEl.textContent = currency(monthEndBalanceForHeader);

    // (month summary já foi adicionado no topo; não adicionar novamente)
    acc.appendChild(mDet);

    // Cria linha meta como elemento independente
    const metaLine = document.createElement('div');
    metaLine.className = 'month-meta';
    const previewLabel = (mIdx < curMonth) ? 'Saldo final:' : 'Saldo planejado:';
    metaLine.innerHTML = `<span>| ${previewLabel}</span><strong>${currency(monthEndBalanceForHeader)}</strong>`;
    // Clique em "Saldo final" também expande/colapsa o mês
    metaLine.addEventListener('click', () => {
      mDet.open = !mDet.open;
    });

    // Se o mês estiver fechado (collapsed), exibe metaLine abaixo de mDet
    if (!mDet.open) {
      acc.appendChild(metaLine);
    }

    // Atualiza visibilidade ao expandir/fechar
    mDet.addEventListener('toggle', () => {
      if (mDet.open) {
        if (metaLine.parentElement === acc) {
          acc.removeChild(metaLine);
        }
      } else {
        acc.insertBefore(metaLine, mDet.nextSibling);
      }
    });
  }
  // Restore open state for invoice panels
  openInvoices.forEach(pd => {
    acc.querySelectorAll(`details.invoice[data-pd="${pd}"]`).forEach(inv => inv.open = true);
  });
  updateStickyMonth();
}

function initStart() {
  const showStart = startBalance === null && transactions.length === 0;
  // exibe ou oculta todo o container de saldo inicial
  startContainer.style.display = showStart ? 'block' : 'none';
  dividerSaldo.style.display = showStart ? 'block' : 'none';
  // (mantém linha antiga para compatibilidade)
  startGroup.style.display = showStart ? 'flex' : 'none';
  // mantém o botão habilitado; a função addTx impede lançamentos
  addBtn.classList.toggle('disabled', showStart);
}
setStartBtn.addEventListener('click', () => {
  const raw = startInput.value || '';
  // remove tudo que não for dígito
  const digits = raw.replace(/\D/g, '');
  if (!digits) {
    alert('Valor inválido');
    return;
  }
  // interpreta como centavos
  const numberValue = parseInt(digits, 10) / 100;
  if (isNaN(numberValue)) {
    alert('Valor inválido');
    return;
  }
  // salva o novo saldo e renderiza novamente
  startBalance = numberValue;
  cacheSet('startBal', startBalance);
  save('startBal', startBalance);
  initStart();
  renderTable();
});

addCardBtn.onclick=addCard;addBtn.onclick=addTx;
openCardBtn.onclick = () => {
  if (document.body) document.body.style.overflow = 'hidden';   // bloqueia scroll de fundo
  if (wrapperEl) wrapperEl.style.overflow = 'hidden';      // bloqueia scroll no container principal
  cardModal.classList.remove('hidden');
};
closeCardModal.onclick = () => {
  if (document.body) document.body.style.overflow = '';
  if (wrapperEl) wrapperEl.style.overflow = '';
  cardModal.classList.add('hidden');
};
cardModal.onclick = e => {
  if (e.target === cardModal) {
    if (document.body) document.body.style.overflow = '';
    if (wrapperEl) wrapperEl.style.overflow = '';
    cardModal.classList.add('hidden');
  }
};

 (async () => {
    // Instancia todos os botões “Adicionar” a partir do template
  document.querySelectorAll('[data-add-btn-container]').forEach(container => {
    const tpl = document.getElementById('add-button-template');
    const btn = tpl.content.cloneNode(true).firstElementChild;
    const targetId = container.dataset.targetId;
    if (targetId) btn.id = targetId;
    container.appendChild(btn);
  });
  date.value = todayISO();
  // Renderiza imediatamente com dados em cache
  refreshMethods();
  renderCardList();
  initStart();
  renderTable();
  // exibe conteúdo após carregar dados localmente
  document.querySelector('.wrapper').classList.remove('app-hidden');

  const [liveTx, liveCards, liveBal] = await Promise.all([
    load('tx', []),
    load('cards', cards),
    load('startBal', startBalance)
  ]);

  const hasLiveTx    = Array.isArray(liveTx)    ? liveTx.length    > 0 : liveTx    && Object.keys(liveTx).length    > 0;
  const hasLiveCards = Array.isArray(liveCards) ? liveCards.length > 0 : liveCards && Object.keys(liveCards).length > 0;

  // Converte objeto → array se necessário
  const fixedTx = Array.isArray(liveTx) ? liveTx : Object.values(liveTx || {});

  if (hasLiveTx && JSON.stringify(fixedTx) !== JSON.stringify(transactions)) {
    transactions = fixedTx;
    cacheSet('tx', transactions);
    renderTable();
  }
  if (hasLiveCards && JSON.stringify(liveCards) !== JSON.stringify(cards)) {
    cards = liveCards;
    if(!cards.some(c=>c.name==='Dinheiro'))cards.unshift({name:'Dinheiro',close:0,due:0});
    cacheSet('cards', cards);
    refreshMethods(); renderCardList(); renderTable();
  }
  if (liveBal !== startBalance) {
    startBalance = liveBal;
    cacheSet('startBal', startBalance);
    initStart(); renderTable();
  }
  // exibe versão
  const verEl = document.getElementById('version');
  if (verEl) verEl.textContent = `v${APP_VERSION}`;
  // se online, tenta esvaziar fila pendente
  if (navigator.onLine) flushQueue();
})();

// Service Worker registration and sync event (disabled in mock mode)
if (!USE_MOCK && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js');
  navigator.serviceWorker.addEventListener('message', event => {
    if (event.data?.type === 'sync-tx') flushQueue();
  });
}
// Planejados modal handlers
// Planejados modal – subfunções auxiliares
function updatePlannedModalHeader() {
  // Define título, botão de fechar e demais elementos do cabeçalho do modal Planejados
  // (No HTML já existe: <h2>Planejados</h2> e <button id="closePlannedModal"...>)
  // Aqui pode-se garantir que o título está correto e o botão de fechar visível.
  const plannedModal = document.getElementById('plannedModal');
  if (!plannedModal) return;
  const h2 = plannedModal.querySelector('h2');
  if (h2) h2.textContent = 'Planejados';
  const closeBtn = plannedModal.querySelector('#closePlannedModal');
  if (closeBtn) closeBtn.style.display = '';
}

function preparePlannedList() {
  plannedList.innerHTML = '';

  // Agrupa por data
  const plannedByDate = {};
  const add = (tx) => {
    const key = tx.opDate;
    if (!plannedByDate[key]) plannedByDate[key] = [];
    plannedByDate[key].push(tx);
  };

  const today = todayISO();

  // 1) Planejados já salvos (a partir de hoje)
  for (const tx of transactions) {
    if (!tx) continue;
    if (tx.planned && tx.opDate && tx.opDate >= today) add(tx);
  }

  // 2) Filhas de recorrência projetadas para os próximos 90 dias
  const DAYS_AHEAD = 90;
  for (const master of transactions) {
    if (!master || !master.recurrence) continue;

    for (let i = 1; i <= DAYS_AHEAD; i++) {           // começa em amanhã; hoje nasce executada
      const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() + i);
      const iso = typeof formatToISO === 'function' ? formatToISO(d) : d.toISOString().slice(0,10);
      if (!occursOn(master, iso)) continue;

      // evita duplicata se já houver planejado nesse dia
      const dup = (plannedByDate[iso] || []).some(t =>
        (t.parentId && t.parentId === master.id) ||
        ((t.desc||'')===(master.desc||'') && (t.method||'')===(master.method||'') &&
         Math.abs(Number(t.val||0))===Math.abs(Number(master.val||0)))
      );
      if (dup) continue;

      add({
        ...master,
        id: `${master.id || 'r'}_${iso}`,
        parentId: master.id || null,
        opDate: iso,
        postDate: post(iso, master.method),
        planned: true,
        recurrence: master.recurrence,   // mantém ícone de recorrência
      });
    }
  }

  // 3) Ordena e renderiza mantendo o DOM atual
  const sortedDates = Object.keys(plannedByDate).sort();
  for (const date of sortedDates) {
    const group = plannedByDate[date].sort((a,b)=>(a.ts||'').localeCompare(b.ts||''));

    const dateObj = new Date(date+'T00:00');
    const dateLabel = dateObj.toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'2-digit'});
    const groupHeader = document.createElement('h3');
    groupHeader.textContent = `${dateLabel.charAt(0).toUpperCase()}${dateLabel.slice(1)}`;
    plannedList.appendChild(groupHeader);

    for (const tx of group) plannedList.appendChild(makeLine(tx, true)); // sem wrapper extra
  }
}

function bindPlannedActions() {
  // Adiciona interações como gestos de swipe, botões "Hoje"/"Adiar", e event listeners relacionados ao Planejados modal.
  // (No momento, não há ações extras além do checkbox, mas se houver, adicione aqui.)
  // Exemplo: inicializar swipe ou outros listeners no plannedList, se necessário.
  // (No modal Planejados, os listeners de checkbox já são definidos inline; se houver mais, adicionar aqui.)
}

function renderPlannedModal() {
  updatePlannedModalHeader();
  preparePlannedList();
  bindPlannedActions();
}

// Ensure Planejados modal open/close handlers exist exactly once
if (!window.plannedHandlersInit) {
  openPlannedBtn.onclick = () => {
    document.body.style.overflow = 'hidden';
    if (wrapperEl) wrapperEl.style.overflow = 'hidden';
    plannedModal.classList.remove('hidden');
    renderPlannedModal();         // Atualiza sempre ao abrir
  };
  closePlannedModal.onclick = () => {
    document.body.style.overflow = '';
    if (wrapperEl) wrapperEl.style.overflow = '';
    plannedModal.classList.add('hidden');
  };
  plannedModal.onclick = e => {
    if (e.target === plannedModal) {
      document.body.style.overflow = '';
      if (wrapperEl) wrapperEl.style.overflow = '';
      plannedModal.classList.add('hidden');
    }
  };
  window.plannedHandlersInit = true;
}
// Initialize swipe for operations (op-line)
initSwipe(document.body, '.swipe-wrapper', '.swipe-actions', '.op-line', 'opsSwipeInit');
// Initialize swipe for card list (card-line)
initSwipe(cardList,      '.swipe-wrapper', '.swipe-actions', '.card-line', 'cardsSwipeInit');
