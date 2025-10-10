import { fmtCurrency, fmtNumber, parseCurrency, escHtml } from './utils/format.js';
// Import date helpers from utils. These provide reusable functions
// for ISO formatting, recurring calculations and card posting dates.
import {
  formatToISO as utilFormatToISO,
  todayISO as utilTodayISO,
  addYearsIso as utilAddYearsIso,
  isSameDayOfMonth as utilIsSameDayOfMonth,
  occursOn as utilOccursOn,
  postDateForCard
} from './utils/date.js';
// Import helpers to compute transaction grouping and date ranges. These
// functions encapsulate heavy logic that was previously embedded here.
import { initTxUtils } from './ui/transactionUtils.js';
// Import the transaction modal helpers. These functions reuse
// global state via window.__gastos to handle invoice payments and
// adding/editing transactions.
import {
  setupInvoiceHandlers,
  openPayInvoiceModal as openPayInvoiceModalMod,
  addTx as addTxMod
} from './ui/transactionModal.js';
import {
  DEFAULT_PROFILE,
  LEGACY_PROFILE_ID,
  PROFILE_DATA_KEYS,
  PROFILE_CACHE_KEYS,
  getRuntimeProfile,
  getCurrencyName,
  getCurrentProfileId,
  scopedCacheKey,
  scopedDbSegment
} from './utils/profile.js';
import { cacheGet, cacheSet, cacheRemove, cacheClearProfile } from './utils/cache.js';
import {
  appState,
  setStartBalance,
  setStartDate,
  setStartSet,
  setBootHydrated,
  setTransactions,
  getTransactions,
  setCards,
  getCards,
  subscribeState
} from './state/appState.js';

// Import hydration helpers. These encapsulate boot hydration logic and
// replace the inline implementations that existed in main.js.
import {
  resetHydration as hydrationReset,
  registerHydrationTarget as hydrationRegisterTarget,
  markHydrationTargetReady as hydrationTargetReady,
  completeHydration as hydrationComplete,
  isHydrating as hydrationIsInProgress,
} from './ui/hydration.js';

// Import card UI helpers. These functions encapsulate card rendering
// logic and remove the heavy implementations from this file. They
// operate on data passed via a context rather than closed‑over
// variables.
import {
  refreshMethods as cardRefreshMethods,
  renderCardList as cardRenderList,
} from './ui/cards.js';
// Import settings modal helper. This encapsulates rendering and behavior
// of the settings modal so that main.js remains focused on high level
// coordination rather than UI details.
import { setupSettings } from './ui/settings.js';

// Import the year selector factory. This module encapsulates all
// logic related to displaying and selecting years in the UI. See
// ./ui/yearSelector.js for details. We will instantiate it below
// and delegate year modal interactions to the returned API.
import { createYearSelector } from './ui/yearSelector.js';
// Import keyboard and scroll handlers. This sets up event listeners to
// prevent background scroll when modals are open and applies iOS
// keyboard fixes. It exposes a single initialiser.
import { initKeyboardAndScrollHandlers } from './ui/keyboard.js';

// Import sticky header and transaction form modules. These helpers
// encapsulate the month header behaviour and transaction form logic
// (value formatting, sign toggling and payment method switching),
// reducing the size of this file and isolating concerns.
import { initStickyHeader } from './ui/stickyHeader.js';
// Import transaction line factory. This module encapsulates the heavy
// rendering logic for individual transaction rows. By importing it here
// and wiring dependencies below, we avoid keeping the 250+ line
// `makeLine` implementation in this file.
import { initTransactionLine } from './ui/transactionLine.js';

// Additional helpers extracted from this file. These modules encapsulate
// complex logic for swipe gestures, scrolling, hydrating from cache and
// service worker registration. By importing them here and aliasing below,
// we avoid keeping their lengthy implementations in this file.
import { initSwipe as initSwipeMod } from './utils/swipe.js';
import { scrollTodayIntoView as scrollTodayIntoViewMod } from './ui/scroll.js';
import { hydrateCache as hydrateCacheMod } from './utils/hydrateCache.js';
import { setupServiceWorker } from './utils/serviceWorker.js';
// Import additional UI modules extracted from main.js. These modules
// encapsulate the heavy logic for planned transactions and recurrence
// deletion/editing to keep this file lean.
import { setupPlannedModal } from './ui/plannedModal.js';
import { setupRecurrenceHandlers } from './ui/recurrenceHandlers.js';
import { runBootstrap } from './ui/bootstrap.js';
import { setupEditTransaction } from './ui/editTransaction.js';
import { setupTransactionForm } from './ui/transactionForm.js';
import { renderCardSelectorHelper } from './ui/transactionForm.js';
import { initAccordion } from './ui/accordion.js';

// Import safe formatting and parsing utilities. These helpers encapsulate the
// fallback logic that was previously defined in this file.
import {
  safeFmtCurrency as _safeFmtCurrency,
  safeFmtNumber as _safeFmtNumber,
  safeParseCurrency as _safeParseCurrency
} from './utils/safeFormat.js';

// Import transaction record helpers.
import {
  normalizeTransactionRecord as _normalizeTransactionRecord,
  ensureCashCard as _ensureCashCard
} from './utils/txRecord.js';

// Import modal helper functions for keyboard scheduling and confirmation dialogs.
import {
  askMoveToToday as askMoveToTodayMod,
  askConfirmLogout as askConfirmLogoutMod,
  scheduleAfterKeyboard as scheduleAfterKeyboardMod,
  flushKeyboardDeferredTasks as flushKeyboardDeferredTasksMod
} from './ui/modalHelpers.js';

const state = appState;

// Expose centralized app state on the shared bridge early so modules
// that run during bootstrap (e.g., src/ui/bootstrap.js) can access it
// without triggering ReferenceErrors when main.js hasn't finished wiring
// all exports onto window.__gastos yet.
try { (window.__gastos = window.__gastos || {}).state = state; } catch (_) {}

let startInputRef = null;

// hydrationTargets, hydrationInProgress and timers are now managed
// within ui/hydration.js. Only reopenPlannedAfterEdit remains here.
let reopenPlannedAfterEdit = false;
const sameId = (a, b) => String(a ?? '') === String(b ?? '');

// Bind imported helpers to the names previously defined in this file. This
// allows existing code to call safeFmtCurrency, safeFmtNumber, etc. without
// pulling in the large inline implementations. The original functions are now
// wrappers that delegate to the imported implementations.
const safeFmtCurrency   = _safeFmtCurrency;
const safeFmtNumber     = _safeFmtNumber;
const safeParseCurrency = _safeParseCurrency;
const normalizeTransactionRecord = _normalizeTransactionRecord;
const ensureCashCard    = _ensureCashCard;
const scheduleAfterKeyboard = scheduleAfterKeyboardMod;
const flushKeyboardDeferredTasks = flushKeyboardDeferredTasksMod;
const askMoveToToday    = askMoveToTodayMod;
const askConfirmLogout  = askConfirmLogoutMod;

// Bind extracted helpers for swipe gestures and scrolling. These aliases
// allow existing code to call `initSwipe` and `scrollTodayIntoView` as
// before, while delegating to the implementations in the extracted modules.
const initSwipe = initSwipeMod;
const scrollTodayIntoView = scrollTodayIntoViewMod;

function normalizeISODate(input) {
  if (!input) return null;
  if (input instanceof Date) return input.toISOString().slice(0, 10);
  const str = String(input).trim();
  if (!str) return null;
  const match = str.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

// Hydration functions have moved to ui/hydration.js. The original
// implementation is removed from this file. Use hydrationReset() instead.

function registerHydrationTarget(key, enabled) {
  // Delegate to hydration module
  hydrationRegisterTarget(key, enabled);
}

function markHydrationTargetReady(key) {
  hydrationTargetReady(key);
}

function maybeCompleteHydration() {
  // Hydration completion is handled internally by the hydration module.
}

function completeHydration() {
  hydrationComplete();
}

function isHydrating() {
  return hydrationIsInProgress();
}

// Kick off initial hydration via the external module
hydrationReset();

const INITIAL_CASH_CARD = { name: 'Dinheiro', close: 0, due: 0 };
let transactions = [];
let cards = [INITIAL_CASH_CARD];
// Flag for mocking data while working on UI.
// Switch to `false` to reconnect to production Firebase.
const USE_MOCK = false;              // conectar ao Firebase (TESTE via config import)

// Year selector state
let VIEW_YEAR = new Date().getFullYear(); // Ano atual padrão

// ---------------------------------------------------------------------------
// Date helper wrappers
// ---------------------------------------------------------------------------
// Bind imported date utilities to names expected by the rest of this file.
// These wrappers close over `cards` so that posting dates are calculated
// correctly when new cards are added. The wrappers maintain the
// original API surface so existing calls like `formatToISO()` or
// `post(iso, method)` continue to work without modification.
const formatToISO = utilFormatToISO;
const todayISO    = utilTodayISO;
const addYearsIso = utilAddYearsIso;
const isSameDayOfMonth = utilIsSameDayOfMonth;
const occursOn    = (tx, iso) => utilOccursOn(tx, iso);
// `post` computes the invoice (post) date for a transaction based on its
// operation date and method. It delegates to utils/date.js and passes the
// current list of cards.
const post        = (iso, m) => postDateForCard(iso, m, cards);

// Expose todayISO on window for inline scripts that rely on it
try { window.todayISO = todayISO; } catch (_) {}

// Instantiate the year selector API. Pass in callbacks to get and set
// the current year, retrieve the transactions, and re-render the table.
// The object returned exposes methods like openYearModal(), closeYearModal(),
// selectYear(), and updateYearTitle() which we use below when
// wiring up event handlers. See ui/yearSelector.js for details.
const yearSelectorApi = createYearSelector({
  getViewYear: () => VIEW_YEAR,
  setViewYear: (year) => {
    VIEW_YEAR = year;
  },
  getTransactions: () => {
    try { return getTransactions ? getTransactions() : transactions; }
    catch { return transactions; }
  },
  renderTable: () => {
    try { return renderTable(); } catch (_) {}
  }
});

// Recorrência: Exclusão e Edição de recorrência
let pendingDeleteTxId = null;
let pendingDeleteTxIso = null;
let pendingEditTxId = null;
let pendingEditTxIso = null;
let pendingEditMode = null;

let profileListeners = [];
let startRealtimeFn = null;

function cleanupProfileListeners() {
  if (!profileListeners || !profileListeners.length) return;
  profileListeners.forEach(unsub => {
    try { typeof unsub === 'function' && unsub(); }
    catch (err) { console.warn('Listener cleanup failed', err); }
  });
  profileListeners = [];
}

// Aliases for imported safe format helpers (defined above).
// The real implementations are imported as _safeFmtCurrency/_safeFmtNumber
// and aliased earlier to avoid redeclaration.

function profileRef(key) {
  if (!firebaseDb || !PATH) return null;
  const segment = scopedDbSegment(key);
  return ref(firebaseDb, `${PATH}/${segment}`);
}

// Aliases for imported parse/tx helpers (implemented in utils).
// Use the previously imported _safeParseCurrency, _normalizeTransactionRecord
// and _ensureCashCard via the const bindings above.

// hydrateStateFromCache has been extracted to src/utils/hydrateCache.js. This
// wrapper delegates to the imported implementation. See hydrateCacheMod for
// details on how the state is hydrated from cache.
function hydrateStateFromCache(options = {}) {
  return hydrateCacheMod(options);
}

// scheduleAfterKeyboard and flushKeyboardDeferredTasks are implemented in
// ui/modalHelpers.js. These wrappers delegate to the imported versions.
// scheduleAfterKeyboard and flushKeyboardDeferredTasks are provided by
// the imported module `ui/modalHelpers.js` and aliased earlier.
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
// Modal Confirmar mover para hoje - refs
const confirmMoveModal = document.getElementById('confirmMoveModal');
const confirmMoveYes   = document.getElementById('confirmMoveYes');
const confirmMoveNo    = document.getElementById('confirmMoveNo');
const closeConfirmMove = document.getElementById('closeConfirmMove');
const confirmMoveText  = document.getElementById('confirmMoveText');
// Modal Confirmar sair da conta - refs
const confirmLogoutModal = document.getElementById('confirmLogoutModal');
const confirmLogoutYes   = document.getElementById('confirmLogoutYes');
const confirmLogoutNo    = document.getElementById('confirmLogoutNo');
const closeConfirmLogout = document.getElementById('closeConfirmLogout');
const confirmLogoutText  = document.getElementById('confirmLogoutText');
// Settings modal – refs
const settingsModalEl = document.getElementById('settingsModal');
const toggleThemeBtn = document.getElementById('toggleThemeBtn');
if (toggleThemeBtn) {
  toggleThemeBtn.onclick = () => {
    const html = document.documentElement;
    const current = html.getAttribute('data-theme');
    html.setAttribute('data-theme', current === 'light' ? 'dark' : 'light');
  };
}
const closeSettingsModalBtn = document.getElementById('closeSettingsModal');

// Instantiate settings modal behaviour. This sets up profile rendering,
// caching and sign‑out handling. It returns an API for opening and
// closing the modal which we delegate to below.
const settingsApi = setupSettings(settingsModalEl);

// Pay-invoice mode state
let isPayInvoiceMode = false;
let pendingInvoiceCtx = null; // { card, dueISO, remaining }

// askMoveToToday and askConfirmLogout are provided by the imported
// modalHelpers module and aliased earlier.
// Elements for Planejados modal
const openPlannedBtn = document.getElementById('openPlannedBtn');
const plannedModal   = document.getElementById('plannedModal');
const closePlannedModal = document.getElementById('closePlannedModal');
const plannedList    = document.getElementById('plannedList');

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
      headerSeg.dataset.selected = 'cards';
    }
  });
}
// ---------------- Settings (Ajustes) modal ----------------
function renderSettingsModal() {
  // Delegate to the settings API for rendering and ignore legacy implementation.
  return settingsApi.renderSettings();
}
// Settings modal stubs now delegate to the settings API. The API
// handles rendering the profile card and sign‑out button as well as
// showing/hiding the modal.
function openSettings() {
  settingsApi.openSettings();
}
function closeSettings() {
  settingsApi.closeSettings();
}
if (closeSettingsModalBtn) closeSettingsModalBtn.addEventListener('click', closeSettings);
if (settingsModalEl) settingsModalEl.addEventListener('click', (e)=>{ if (e.target === settingsModalEl) closeSettings(); });
// React to auth state updates and keep the modal content fresh
// When the auth state changes, update settings via the settings API
try { document.addEventListener('auth:state', () => { settingsApi.renderSettings(); }); } catch(_) {}

// Year selector event listeners
const yearSelector = document.getElementById('yearSelector');
const yearModal = document.getElementById('yearModal');
const closeYearModalBtn = document.getElementById('closeYearModal');

if (yearSelector) {
  // Clicking the year displays the modal via the year selector API
  yearSelector.addEventListener('click', () => {
    yearSelectorApi.openYearModal();
  });
  // Keyboard navigation: ArrowLeft / ArrowRight change year without opening
  yearSelector.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      yearSelectorApi.selectYear(VIEW_YEAR - 1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      yearSelectorApi.selectYear(VIEW_YEAR + 1);
    }
  });
  // Wheel support: scroll to change year (vertical wheel only)
  yearSelector.addEventListener('wheel', (e) => {
    if (e.deltaY === 0 || e.ctrlKey || e.metaKey || e.altKey) return;
    e.preventDefault();
    if (e.deltaY < 0) yearSelectorApi.selectYear(VIEW_YEAR + 1);
    else if (e.deltaY > 0) yearSelectorApi.selectYear(VIEW_YEAR - 1);
  }, { passive: false });
}

if (closeYearModalBtn) {
  closeYearModalBtn.addEventListener('click', () => {
    yearSelectorApi.closeYearModal();
  });
}

if (yearModal) {
  yearModal.addEventListener('click', (e) => {
    if (e.target === yearModal) yearSelectorApi.closeYearModal();
  });
}

// Bottom floating pill actions
const bottomPill = document.querySelector('.floating-pill');
if (bottomPill) {
  bottomPill.addEventListener('click', (e) => {
    const btn = e.target.closest('.pill-option');
    if (!btn) return;
    const action = btn.dataset.action;
    if (action === 'settings') {
      openSettings();
    }
  });
}

// --- Ensure Planned modal values are anchored to the right, regardless of DOM structure
// The planned modal alignment helpers have been removed. If required, the
// Planned modal module can implement its own alignment logic. These stub
// functions remain for backward compatibility.
function fixPlannedAlignment() {
  // no-op
}

const WDAY_LONG = {};

function expandPlannedDayLabels() {
  // no-op
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

// ---------------- Theme helpers ----------------
function getSystemPref() {
  try {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  } catch (_) { return 'dark'; }
}

function applyThemePreference(pref) {
  // pref: 'light' | 'dark' | 'system'
  let resolved = pref === 'system' ? getSystemPref() : pref;
  const root = document.documentElement;
  if (resolved === 'light') {
    root.classList.add('light');
    root.setAttribute('data-theme', 'light');
  } else {
    root.classList.remove('light');
    root.setAttribute('data-theme', 'dark');
  }
}

function initThemeFromStorage(){
  const saved = localStorage.getItem('ui:theme') || 'system';
  applyThemePreference(saved);
  // If system preference changes and user chose 'system', listen and update
  try {
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    mq.addEventListener && mq.addEventListener('change', () => {
      const current = localStorage.getItem('ui:theme') || 'system';
      if (current === 'system') applyThemePreference('system');
    });
  } catch (_) {}
}

// Initialize theme early
initThemeFromStorage();

/**
 * Apply a currency/profile by id.
 * - sets window.APP_PROFILE
 * - creates window.APP_FMT Intl.NumberFormat for currency
 * - persists choice to localStorage
 * - toggles UI bits controlled by profile.features (e.g., invoice parcel)
 */
function applyCurrencyProfile(profileId, options = {}){
  const { notify = false } = options;
  if (!window.CURRENCY_PROFILES) return;
  const p = window.CURRENCY_PROFILES[profileId] || Object.values(window.CURRENCY_PROFILES)[0];
  if (!p) return;
  resetHydration();
  window.APP_PROFILE = p;
  const profileDecimals = Number.isFinite(p.decimalPlaces) ? p.decimalPlaces : 2;
  try{
    window.APP_FMT = new Intl.NumberFormat(p.locale, { style: 'currency', currency: p.currency, minimumFractionDigits: profileDecimals, maximumFractionDigits: profileDecimals });
  }catch(e){
    window.APP_FMT = { format: v => (Number(v).toFixed(profileDecimals) + ' ' + p.currency) };
  }
  try{
    window.APP_NUM = new Intl.NumberFormat(p.locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: Math.max(profileDecimals, 2)
    });
  }catch(e){
    window.APP_NUM = { format: v => Number(v ?? 0).toFixed(profileDecimals) };
  }
  localStorage.setItem('ui:profile', p.id);

  // toggle invoice parcel row if present
  const invoiceRow = document.getElementById('invoiceParcelRow');
  if (invoiceRow){
    if (p.features && p.features.invoiceParcel === false){
      invoiceRow.style.display = 'none';
    } else {
      invoiceRow.style.display = '';
    }
  }

  // update placeholders that show currency examples
  const startInput = document.querySelector('.start-container .currency-input');
  if (startInput){
    const decimals = Number.isFinite(p.decimalPlaces) ? p.decimalPlaces : (DEFAULT_PROFILE.decimalPlaces ?? 2);
    try {
      const placeholderFmt = new Intl.NumberFormat(p.locale || DEFAULT_PROFILE.locale, {
        style: 'currency',
        currency: p.currency || DEFAULT_PROFILE.currency,
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      });
      startInput.placeholder = placeholderFmt.format(0);
    } catch (_) {
      const cur = p.currency || DEFAULT_PROFILE.currency;
      startInput.placeholder = `${cur} ${(0).toFixed(decimals)}`;
    }
    syncStartInputFromState();
  }

  const newStartDate = normalizeISODate(cacheGet('startDate', null));
  const newStartBalanceRaw = cacheGet('startBal', null);
  state.startDate = newStartDate;
  state.startBalance = (newStartDate == null && (newStartBalanceRaw === 0 || newStartBalanceRaw === '0'))
    ? null
    : newStartBalanceRaw;
  state.startSet = cacheGet('startSet', false);
  ensureStartSetFromBalance({ persist: false });
  syncStartInputFromState();

  if (notify && typeof showToast === 'function') {
    const label = p && p.name ? p.name : (profileId || 'perfil');
    showToast(`Moeda ajustada para ${label}`, 'success', 3600);
  }

  cleanupProfileListeners();
  const runAfterBoot = () => {
    try { hydrateStateFromCache(); } catch (err) { console.error('Failed to hydrate cache for profile', err); }
    if (typeof renderTxModal === 'function') {
      try { renderTxModal(); } catch (e) { console.error('renderTxModal failed after profile change', e); }
    }
    if (!USE_MOCK && typeof startRealtimeFn === 'function' && PATH) {
      startRealtimeFn().catch(err => {
        console.error('Failed to restart realtime after profile change', err);
      });
    }
  };
  if (typeof queueMicrotask === 'function') queueMicrotask(runAfterBoot);
  else Promise.resolve().then(runAfterBoot);
}

// Apply saved profile on load (if profiles are available)
try{
  const savedProfile = localStorage.getItem('ui:profile') || (window.CURRENCY_PROFILES ? Object.keys(window.CURRENCY_PROFILES)[0] : null);
  if (savedProfile) applyCurrencyProfile(savedProfile);
}catch(e){}


import { openDB } from 'https://unpkg.com/idb?module';
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";

import { getDatabase, ref, set, get, onValue } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

// Configuração do Firebase de TESTE (arquivo separado)
import { firebaseConfig } from './config/firebaseConfig.js';
import { AuthService } from './services/authService.js';

import { FirebaseService as FirebaseSvc } from './services/firebaseService.js';

// Initialize/Configure our Firebase service wrapper
try {
  FirebaseSvc.setMockMode(Boolean(USE_MOCK));
  if (!USE_MOCK && typeof FirebaseSvc.init === 'function') {
    FirebaseSvc.init(firebaseConfig).catch(err => { console.warn('FirebaseSvc.init failed', err); });
  }
} catch (e) { /* ignore init errors for now */ }

// Initialise the authentication service. Without calling init() the Auth
// module will not be ready and login.view.js will not behave correctly.
try {
  AuthService.init(firebaseConfig).catch(err => {
    console.warn('AuthService.init failed', err);
  });
} catch (e) {
  /* ignore */
}

// (Web Push removido)

// ---- IndexedDB (idb) key/value cache ----
const cacheDB = await openDB('gastos-cache', 1, {
  upgrade(db) {
    if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
  }
});
async function idbGet(k) { try { return await cacheDB.get('kv', k); } catch { return undefined; } }
async function idbSet(k, v) { try { await cacheDB.put('kv', v, k); } catch {} }
async function idbRemove(k) { try { await cacheDB.delete('kv', k); } catch {} }

if (typeof window !== 'undefined') {
  window.APP_CACHE_BACKING = {
    idbGet,
    idbSet,
    idbRemove
  };
}

/**
 * Initialize swipe-to-reveal actions on elements.
 * @param {ParentNode} root       Root element to listen on (e.g., document or specific container).
 * @param {string} wrapperSel     Selector for swipe wrapper (e.g., '.swipe-wrapper').
 * @param {string} actionsSel     Selector for swipe actions (e.g., '.swipe-actions').
 * @param {string} lineSel        Selector for the line to translate (e.g., '.op-line' or '.card-line').
 * @param {boolean} onceFlag      Name of global flag to prevent multiple inits.
 */
// initSwipe is implemented in utils/swipe.js and aliased above. See that module
// for the full implementation.

// Prevent toggling <details> when the user swipes the invoice header line
document.addEventListener('click', (e) => {
  const sum = e.target.closest('.invoice-header-line');
  if (!sum) return;
  const det = sum.closest('details.invoice');
  if (det && det.dataset.swiping === '1') {
    e.stopPropagation();
    e.preventDefault();
  }
}, true);

// Debug info for iOS PWA troubleshooting
const ua = navigator.userAgent.toLowerCase();
const isIOSDebug = /iphone|ipad|ipod/.test(ua);
const standaloneDebug = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || ('standalone' in navigator && navigator.standalone);

if (isIOSDebug && standaloneDebug) {
  console.log('🔧 iOS PWA Debug Info:');
  console.log('- User Agent:', navigator.userAgent);
  console.log('- Display Mode:', window.matchMedia ? window.matchMedia('(display-mode: standalone)').matches : 'unknown');
  console.log('- Navigator Standalone:', navigator.standalone);
  console.log('- Firebase Config:', firebaseConfig ? 'loaded' : 'missing');
  console.log('- Auth State:', window.Auth ? 'initialized' : 'pending');
  
  // iOS 26 viewport debugging
  console.log('📱 iOS 26 Viewport Info:');
  console.log('- window.innerHeight:', window.innerHeight);
  console.log('- window.outerHeight:', window.outerHeight);
  console.log('- screen.height:', screen.height);
  console.log('- visualViewport:', window.visualViewport ? {
    height: window.visualViewport.height,
    width: window.visualViewport.width,
    offsetTop: window.visualViewport.offsetTop
  } : 'not supported');
  
  // Check safe area support
  const testDiv = document.createElement('div');
  testDiv.style.cssText = 'position: fixed; top: env(safe-area-inset-top); left: env(safe-area-inset-left); visibility: hidden;';
  document.body.appendChild(testDiv);
  const computedStyle = getComputedStyle(testDiv);
  console.log('- Safe area insets:', {
    top: computedStyle.top,
    left: computedStyle.left,
    supported: computedStyle.top !== 'env(safe-area-inset-top)'
  });
  document.body.removeChild(testDiv);
  
  // Check viewport unit support
  const viewportSupport = {
    vh: CSS.supports('height', '100vh'),
    svh: CSS.supports('height', '100svh'),
    dvh: CSS.supports('height', '100dvh'),
    lvh: CSS.supports('height', '100lvh')
  };
  console.log('- Viewport units support:', viewportSupport);
  
  // Monitor auth state changes
  document.addEventListener('auth:state', (e) => {
    const user = e.detail && e.detail.user;
    console.log('🔧 iOS PWA Auth State:', user ? {
      email: user.email,
      uid: user.uid,
      emailVerified: user.emailVerified
    } : 'signed out');
  });
  
  // Monitor network status
  const logNetworkStatus = () => {
    console.log('🔧 iOS PWA Network:', navigator.onLine ? 'online' : 'offline');
  };
  logNetworkStatus();
  window.addEventListener('online', logNetworkStatus);
  window.addEventListener('offline', logNetworkStatus);
}

let PATH;
// Casa compartilhada (PROD atual) e e‑mails que devem enxergar esta Casa
const WID_CASA = 'orcamento365_9b8e04c5';
const CASA_EMAILS = ['icmbelchior@gmail.com','sarargjesus@gmail.com'];
function resolvePathForUser(user){
  if (!user) return null;
  const email = (user.email || '').toLowerCase();
  console.log('Resolving path for user:', email);
  if (CASA_EMAILS.includes(email)) {
    console.log('User mapped to shared workspace:', WID_CASA);
    return WID_CASA;
  }
  const personalPath = `users/${user.uid}`;
  console.log('User mapped to personal workspace:', personalPath);
  return personalPath;
}

const APP_VERSION = 'v1.4.9(b22)';

const METRICS_ENABLED = true;
const _bootT0 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
function logMetric(name, payload) {
  try {
    // Only log when DB ready and a workspace PATH is known (after auth)
    if (!METRICS_ENABLED || USE_MOCK || !firebaseDb || !PATH) return;
    if (window.Auth && !window.Auth.currentUser) return;
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
  const app  = (getApps().length ? getApp() : initializeApp(cfg));
  const db   = getDatabase(app);
  firebaseDb = db;

  // PATH será definido após o login (Casa para e‑mails definidos; pessoal para demais)

  // Auth is required; handled by auth.js (Google). No anonymous sign-in.

  // Wrapper: save marks as dirty and updates cache if offline
  save = async (k, v) => {
    if (!navigator.onLine) {
      // mark as dirty for later flush and cache locally for instant UI
      markDirty(k);
      if (k === 'tx') cacheSet('tx', v);
      if (k === 'cards') cacheSet('cards', v);
      if (k === 'startBal') cacheSet('startBal', v);
      if (k === 'startSet') cacheSet('startSet', v);
      return; // no remote write while offline
    }
    const remoteKey = scopedDbSegment(k);
    return set(ref(db, `${PATH}/${remoteKey}`), v);
  };
  load = async (k, d) => {
    const remoteKey = scopedDbSegment(k);
    const s = await get(ref(db, `${PATH}/${remoteKey}`));
    return s.exists() ? s.val() : d;
  };
} else {
  // Modo MOCK (LocalStorage)
  PATH = 'mock_365';
  try { FirebaseSvc.setPath(PATH); } catch (_) {}
  save = (k, v) => {
    const scoped = scopedCacheKey(k);
    localStorage.setItem(`${PATH}_${scoped}`, JSON.stringify(v));
  };
  load = async (k, d) => {
    const scoped = scopedCacheKey(k);
    const raw = localStorage.getItem(`${PATH}_${scoped}`);
    if (raw != null) return JSON.parse(raw);
    return d;
  };
}


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
  const allowed = ['tx','cards','startBal','startSet'];
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
    if (q.includes('startBal')) await save('startBal', state.startBalance);
    if (q.includes('startSet')) await save('startSet', state.startSet);
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
setStartBalance(null);
setStartDate(null);
setStartSet(false);
setBootHydrated(false);
const $=id=>document.getElementById(id);
const tbody=document.querySelector('#dailyTable tbody');
const wrapperEl = document.querySelector('.wrapper');
// Header element used by the sticky month header. It must be defined
// before initialising the sticky header helper. The helper will
// recalculate its height on resize events.
const headerEl  = document.querySelector('.app-header');
let wrapperScrollAnimation = null;
let wrapperScrollTop = 0;
let wrapperTodayAnchor = null;
let stickyMonthVisible = false;
let stickyMonthLabel = '';
let stickyHeightGuess = 52;
const txModalTitle = document.querySelector('#txModal h2');

// ---------------------------------------------------------------------------
// Initialise sticky month header
// ---------------------------------------------------------------------------
// Delegates month header logic to an external module to keep this file
// focused on high‑level orchestration. The helper will create and
// update a floating month label as the user scrolls through the list.
try {
  initStickyHeader({
    wrapperEl,
    headerEl,
    getViewYear: () => VIEW_YEAR,
    scheduleAfterKeyboard,
  });
} catch (_) {}

// Compute a consistent bottom reserve so the last day stops above the pseudo‑footer
// computeEndPad removido – espaço final constante pelo CSS

// Helper: sort transactions by opDate (YYYY-MM-DD) then by timestamp (ts) so UI is always chronological
function sortTransactions() {
  transactions.sort((a, b) => {
    const d = a.opDate.localeCompare(b.opDate);
    if (d !== 0) return d;
    // Fallback: compare timestamps when same date
    return (a.ts || '').localeCompare(b.ts || '');
  });
}

// Sanitize legacy transactions: ensure postDate/opDate/planned exist
function sanitizeTransactions(list) {
  let changed = false;
  const out = (list || []).map((t) => {
    if (!t) return t;
    const nt = { ...t };
    // Ensure opDate exists; fallback to date from ts
    if (!nt.opDate) {
      if (nt.ts) {
        try { nt.opDate = new Date(nt.ts).toISOString().slice(0, 10); } catch { nt.opDate = todayISO(); }
      } else {
        nt.opDate = todayISO();
      }
      changed = true;
    }
    // Ensure postDate exists; compute with card rule
    if (!nt.postDate) {
      const method = nt.method || 'Dinheiro';
      try { nt.postDate = post(nt.opDate, method); } catch { nt.postDate = nt.opDate; }
      changed = true;
    }
    // Ensure planned flag exists
    if (typeof nt.planned === 'undefined' && nt.opDate) {
      nt.planned = nt.opDate > todayISO();
      changed = true;
    }
    return nt;
  });
  return { list: out, changed };
}

// Revalida postDate e normaliza método de cartão para dados legados
function recomputePostDates() {
  if (!Array.isArray(cards) || !cards.length) return false;
  let changed = false;
  const norm = (s) => (s==null?'' : String(s)).normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
  const nonCash = cards.filter(c => c && c.name !== 'Dinheiro');
  const singleCardName = nonCash.length === 1 ? nonCash[0].name : null;

  const inferCardForTx = (tx) => {
    const m = tx.method || '';
    const mNorm = norm(m);
    if (mNorm === 'dinheiro') return null; // dinheiro não precisa mapear
    // se já corresponde a um cartão existente, retorna o nome canônico
    const found = cards.find(c => c && norm(c.name) === mNorm);
    if (found) return found.name;
    // tenta inferir pelo postDate esperado: qual cartão gera esse postDate a partir do opDate?
    if (tx.opDate && tx.postDate) {
      const candidates = nonCash.filter(c => post(tx.opDate, c.name) === tx.postDate);
      if (candidates.length === 1) return candidates[0].name;
    }
    // fallback seguro: se usuário só tem um cartão, assume-o apenas se método vier vazio/genérico
    if (singleCardName && (!m || mNorm === 'cartao' || mNorm === 'cartão')) return singleCardName;
    return null; // ambíguo: não altera
  };

  const newList = (getTransactions() || []).map(t => {
    if (!t) return t;
    const nt = { ...t };
    const inferred = inferCardForTx(nt);
    if (inferred && nt.method !== inferred) { nt.method = inferred; changed = true; }
    const isCash = norm(nt.method) === 'dinheiro';
    const isKnownCard = !isCash && cards.some(c => c && c.name === nt.method);
    const desired = isCash ? nt.opDate : (isKnownCard ? post(nt.opDate, nt.method) : nt.postDate);
    if (desired && nt.postDate !== desired) { nt.postDate = desired; changed = true; }
    return nt;
  });
  if (changed) setTransactions(newList);
  return changed;
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
    const formattedVal = safeFmtCurrency(valueNum);
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
  // Start realtime listeners only after user is authenticated
  const startRealtime = async () => {
    console.log('Starting realtime listeners for PATH:', PATH);
    cleanupProfileListeners();
    resetHydration();

    // Enhanced iOS PWA: Wait for redirect completion if needed
    const ua = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(ua);
    const standalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || ('standalone' in navigator && navigator.standalone);
    
    if (isIOS && standalone && window.Auth && window.Auth.waitForRedirect) {
      console.log('iOS PWA: Waiting for redirect completion before starting listeners');
      await window.Auth.waitForRedirect();
    }
    
    // Enhanced permission check with better fallback for iOS PWA
    try {
      const u = window.Auth && window.Auth.currentUser;
      if (u && PATH) {
        console.log('Testing access to PATH:', PATH, 'for user:', u.email);
        const testRef = ref(firebaseDb, `${PATH}/${scopedDbSegment('startBal')}`);
        try {
          await get(testRef);
          console.log('Access confirmed to PATH:', PATH);
        } catch (err) {
          console.error('Access denied to PATH:', PATH, 'Error:', err);
          if (err && (err.code === 'PERMISSION_DENIED' || err.code === 'permission-denied')) {
            const fallback = `users/${u.uid}`;
            console.log('Falling back to personal workspace:', fallback);
            if (PATH !== fallback) {
              PATH = fallback;
              console.log('PATH updated to fallback:', PATH);
              // For iOS PWA, add small delay to ensure auth state is stable
              if (isIOS && standalone) {
                await new Promise(resolve => setTimeout(resolve, 500));
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('Error during PATH verification:', err);
    }

    // Live listeners (Realtime DB)
    const txRef       = profileRef('tx');
    const cardsRef    = profileRef('cards');
    const balRef      = profileRef('startBal');
    const startDateRef= profileRef('startDate');
    const startSetRef = profileRef('startSet');

    const listeners = [];

    registerHydrationTarget('tx', !!txRef);
    registerHydrationTarget('cards', !!cardsRef);
    registerHydrationTarget('startBal', !!balRef);
    registerHydrationTarget('startDate', !!startDateRef);
    registerHydrationTarget('startSet', !!startSetRef);

  // initialize from cache first for instant UI
  hydrateStateFromCache();

    maybeCompleteHydration();

  // keep legacy module-level variables in sync with centralized app-state
  subscribeState((newState) => {
    try {
      const s = newState && newState.state ? newState.state : newState || {};
      if (Array.isArray(s.transactions) && s.transactions !== transactions) {
        transactions = s.transactions.slice();
        if (typeof window.onTransactionsUpdated === 'function') {
          try { window.onTransactionsUpdated(transactions); } catch (e) { console.error(e); }
        }
      }
      if (Array.isArray(s.cards) && s.cards !== cards) {
        cards = s.cards.slice();
        if (typeof window.onCardsUpdated === 'function') {
          try { window.onCardsUpdated(cards); } catch (e) { console.error(e); }
        }
      }
    } catch (err) {
      console.error('State subscription error', err);
    }
  });

  // Listen for tx changes (LWW merge per item)
  if (txRef) listeners.push(onValue(txRef, (snap) => {
    try {
    const raw  = snap.val() ?? [];
    const incoming = Array.isArray(raw) ? raw : Object.values(raw);

    // normalize helper
    const norm = normalizeTransactionRecord;

    const remote = (incoming || [])
      .filter(t => t)
      .map(norm);

    // If we're online and have no local pending changes for 'tx',
    // trust the server (support hard deletions). Otherwise, do LWW merge.
    const dirty = cacheGet('dirtyQueue', []);
    const hasPendingTx = Array.isArray(dirty) && dirty.includes('tx');

    if (navigator.onLine && !hasPendingTx) {
      // Source-of-truth: server. This allows deletions/resets from other clients to propagate.
  setTransactions(remote);
  transactions = getTransactions();
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
  setTransactions(Array.from(byId.values()));
  transactions = getTransactions();
    }

    // Sanitize legacy/malformed items
  const s = sanitizeTransactions(getTransactions());
  setTransactions(s.list);
  transactions = getTransactions();
    // Revalida postDate/método se cartões já conhecidos
    const fixed = recomputePostDates();
  cacheSet('tx', getTransactions());
    if (s.changed || fixed) {
      // Persist best-effort somente quando algo mudou localmente
      try { save('tx', transactions); } catch (_) {}
    }
    sortTransactions();
    renderTable();
    // Refresh Planned modal if it is visible
    if (plannedModal && !plannedModal.classList.contains('hidden')) {
      renderPlannedModal();
      fixPlannedAlignment();
      expandPlannedDayLabels();
    }
    } finally {
      markHydrationTargetReady('tx');
    }
  }));

  // Listen for card changes
  if (cardsRef) listeners.push(onValue(cardsRef, (snap) => {
    const raw  = snap.val() ?? [];
    const next = Array.isArray(raw) ? raw : Object.values(raw);
    try {
      if (JSON.stringify(next) === JSON.stringify(cacheGet('cards', []))) {
        markHydrationTargetReady('cards');
        return;
      }

      const updatedCards = Array.isArray(next) ? next : Object.values(next || {});
      if (!updatedCards.some(c => c && c.name === 'Dinheiro')) {
        updatedCards.unshift({ name: 'Dinheiro', close: 0, due: 0 });
      }
  setCards(updatedCards);
  try { cards = getCards(); } catch (_) { cards = updatedCards; }
  cacheSet('cards', updatedCards);
      // Revalida transações à luz do cadastro de cartões atual
      const fixed = recomputePostDates();
      if (fixed) { try { save('tx', transactions); } catch (_) {} cacheSet('tx', transactions); }
      refreshMethods();
      renderCardList();
      renderTable();
    } finally {
      markHydrationTargetReady('cards');
    }
  }));

  // Listen for balance changes
  if (balRef) listeners.push(onValue(balRef, (snap) => {
    const val = snap.exists() ? snap.val() : null;
    if (val === state.startBalance) {
      markHydrationTargetReady('startBal');
      return;
    }
    try {
      state.startBalance = val;
      cacheSet('startBal', state.startBalance);
      syncStartInputFromState();
      ensureStartSetFromBalance();
      initStart();
      renderTable();
    } finally {
      markHydrationTargetReady('startBal');
    }
  }));
  if (startDateRef) listeners.push(onValue(startDateRef, (snap) => {
    const raw = snap.exists() ? snap.val() : null;
    const normalized = normalizeISODate(raw);
    if (normalized === state.startDate) {
      markHydrationTargetReady('startDate');
      return;
    }
    try {
      state.startDate = normalized;
      try { cacheSet('startDate', state.startDate); } catch (_) {}
      if (normalized && normalized !== raw && typeof save === 'function' && PATH) {
        Promise.resolve().then(() => save('startDate', normalized)).catch(() => {});
      }
      ensureStartSetFromBalance({ persist: false, refresh: false });
      initStart();
      renderTable();
    } finally {
      markHydrationTargetReady('startDate');
    }
  }));
  // Listen for persisted startSet flag changes so remote clears/sets propagate
  if (startSetRef) listeners.push(onValue(startSetRef, (snap) => {
    const val = snap.exists() ? !!snap.val() : false;
    if (val === state.startSet) {
      markHydrationTargetReady('startSet');
      return;
    }
    try {
      state.startSet = val;
      try { cacheSet('startSet', state.startSet); } catch(_) {}
      initStart();
      renderTable();
    } finally {
      markHydrationTargetReady('startSet');
    }
  }));

  profileListeners = listeners;
  };
  startRealtimeFn = startRealtime;

  const readyUser = (window.Auth && window.Auth.currentUser) ? window.Auth.currentUser : null;
  if (readyUser) { 
    console.log('User already ready:', readyUser.email);
    PATH = resolvePathForUser(readyUser); 
    try { FirebaseSvc.setPath(PATH); } catch(_) {}
    startRealtimeFn && startRealtimeFn(); 
    // Recalcula a altura do header para usuário já logado
    setTimeout(() => { 
      try { 
        if (typeof recalculateHeaderOffset === 'function') recalculateHeaderOffset(); 
      } catch (_) {} 
    }, 100);
  } else {
    console.log('Waiting for auth state...');
    
    const h = (e) => {
      const u = e.detail && e.detail.user;
      console.log('Auth state event received:', u ? u.email : 'signed out');
      if (u) { 
        document.removeEventListener('auth:state', h); 
        PATH = resolvePathForUser(u); 
        try { FirebaseSvc.setPath(PATH); } catch(_) {}
        console.log('Starting realtime with PATH:', PATH);
        startRealtimeFn && startRealtimeFn(); 
        // Recalcula a altura do header agora que o usuário está logado e o header está visível
        setTimeout(() => { 
          try { 
            if (typeof recalculateHeaderOffset === 'function') recalculateHeaderOffset(); 
          } catch (_) {} 
        }, 100);
      } else {
        console.log('User signed out, clearing PATH');
        PATH = null;
        try { FirebaseSvc.setPath(null); } catch(_) {}
      }
    };
    document.addEventListener('auth:state', h);
  }
} else {
  resetHydration();
  // Fallback (mock) — carrega uma vez
  const [liveTx, liveCards, liveBal] = await Promise.all([
    load('tx', []),
    load('cards', cards),
    load('startBal', state.startBalance)
  ]);

  const hasLiveTx    = Array.isArray(liveTx)    ? liveTx.length    > 0 : liveTx    && Object.keys(liveTx).length    > 0;
  const hasLiveCards = Array.isArray(liveCards) ? liveCards.length > 0 : liveCards && Object.keys(liveCards).length > 0;

  const fixedTx = Array.isArray(liveTx) ? liveTx : Object.values(liveTx || {});

  setTransactions(cacheGet('tx', []));
  transactions = getTransactions();
  setCards(cacheGet('cards', [{name:'Dinheiro',close:0,due:0}]));
  try { cards = getCards(); } catch (_) { cards = cacheGet('cards', [{name:'Dinheiro',close:0,due:0}]); }
  setStartBalance(cacheGet('startBal', null));
  setStartDate(normalizeISODate(cacheGet('startDate', null)));
  // Same normalization for mock fallback
  if (state.startDate == null && (state.startBalance === 0 || state.startBalance === '0')) {
    state.startBalance = null;
    try { cacheSet('startBal', null); } catch (_) {}
  }

  if (hasLiveTx && JSON.stringify(fixedTx) !== JSON.stringify(cacheGet('tx', []))) {
    // apply server payload into state and cache
  setTransactions(fixedTx);
  transactions = getTransactions();
    cacheSet('tx', fixedTx);
    renderTable();
  }
  if (hasLiveCards && JSON.stringify(liveCards) !== JSON.stringify(cards)) {
    const updatedCards = Array.isArray(liveCards) ? liveCards : Object.values(liveCards || {});
    if (!updatedCards.some(c => c && c.name === 'Dinheiro')) updatedCards.unshift({ name:'Dinheiro', close:0, due:0 });
  setCards(updatedCards);
  try { cards = getCards(); } catch (_) { cards = updatedCards; }
    cacheSet('cards', updatedCards);
    refreshMethods(); renderCardList(); renderTable();
  }
  if (liveBal !== state.startBalance) {
    state.startBalance = liveBal;
    cacheSet('startBal', state.startBalance);
    initStart(); renderTable();
  }

  completeHydration();
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
  // Reset pay-invoice mode UI bits
  isPayInvoiceMode = false;
  pendingInvoiceCtx = null;
  if (txModal && txModal.dataset && txModal.dataset.mode) delete txModal.dataset.mode;
  const invoiceParcelRow = document.getElementById('invoiceParcelRow');
  const invoiceParcel = document.getElementById('invoiceParcel');
  if (invoiceParcelRow) invoiceParcelRow.style.display = 'none';
  if (invoiceParcel) invoiceParcel.checked = false;
}

/**
 * Toggle the visibility of the transaction modal.
 */
function toggleTxModal() {
  const isOpening = txModal.classList.contains('hidden');
  if (isOpening) {
    if (typeof window !== 'undefined' && typeof window.__unlockKeyboardGap === 'function') {
      try { window.__unlockKeyboardGap(); } catch (_) {}
    }
    if (!isEditing) {
      resetTxModal();
    }
    // Não travar o body; overlay já bloqueia a interação
  } else {
    // Restore scrolling
    // sem alterações no body
  }
  txModal.classList.toggle('hidden');
  // Rotate the floating button to indicate state
  if (openTxBtn) {
    openTxBtn.style.transform = isOpening ? 'rotate(45deg)' : 'rotate(0deg)';
  }
  if (isOpening) focusValueField();
  // Reflect global modal-open state (used by CSS to hide floating buttons/footer)
  updateModalOpenState();
  // Ao fechar o modal, sempre limpar estado de edição para evitar reabrir em modo editar
  if (!isOpening) {
    isEditing = null;
    pendingEditMode = null;
    pendingEditTxId = null;
    pendingEditTxIso = null;
    if (typeof window !== 'undefined' && typeof window.__unlockKeyboardGap === 'function') {
      try { window.__unlockKeyboardGap(); } catch (_) {}
    }
  }
}

function focusValueField() {
  const valInput = document.getElementById('value');
  if (!valInput) return;
  // Ensure numeric keypad attributes remain
  try {
    if (valInput.type !== 'tel') valInput.type = 'tel';
    valInput.setAttribute('inputmode', 'decimal');
  } catch (_) {}

  const shouldRespectExistingFocus = () => {
    const active = document.activeElement;
    if (!active || active === document.body || active === valInput) return false;
    try {
      if (typeof active.matches === 'function' && active.matches('input, select, textarea, button, [contenteditable="true"]')) {
        return true;
      }
    } catch (_) {}
    return false;
  };

  const doFocus = () => {
    if (txModal && txModal.classList.contains('hidden')) return;
    if (shouldRespectExistingFocus()) return;
    try {
      valInput.focus({ preventScroll: true });
      // Select all to start typing immediately
      if (typeof valInput.select === 'function') valInput.select();
    } catch (_) {}
  };
  // Multiple attempts to accommodate iOS timing quirks
  doFocus();
  setTimeout(doFocus, 80);
  setTimeout(doFocus, 200);
  requestAnimationFrame(doFocus);
}

// Attach event handlers if elements exist
if (openTxBtn) openTxBtn.onclick = () => {
  // O botão "+" sempre deve abrir em modo "Adicionar"
  isEditing = null;
  pendingEditMode = null;
  pendingEditTxId = null;
  pendingEditTxIso = null;
  if (txModal && txModal.classList.contains('hidden')) {
    resetTxModal();
  }
  toggleTxModal();
  // Try to focus within the user gesture
  focusValueField();
};

// Helper: apply/remove body class depending on whether any bottom-modal is open
function updateModalOpenState() {
  const open = !!document.querySelector('.bottom-modal:not(.hidden)');
  const root = document.documentElement || document.body;

  // Reflect modal-open state for CSS
  if (open) root.classList.add('modal-open'); else root.classList.remove('modal-open');

  // Only lock keyboard shift for the Transaction modal specifically
  const txModalEl = document.getElementById('txModal');
  const txOpen = !!(txModalEl && !txModalEl.classList.contains('hidden'));
  if (txOpen) root.classList.add('kb-lock-shift'); else root.classList.remove('kb-lock-shift');

  if (wrapperEl) {
    try {
    if (open) {
      wrapperScrollTop = wrapperEl.scrollTop || 0;
      wrapperEl.dataset.locked = '1';
      wrapperEl.style.overflow = 'hidden';
      wrapperEl.scrollTop = wrapperScrollTop;
    } else if (wrapperEl.dataset.locked) {
      delete wrapperEl.dataset.locked;
      wrapperEl.style.overflow = '';
      wrapperEl.scrollTop = wrapperScrollTop;
      }
    } catch (e) {
      console.error('updateModalOpenState lock/unlock failed', e);
    }
  }

  // Safari iOS fix: Force scroll state cleanup when all modals are closed
  // Fixes bug where accordion scroll becomes unresponsive after opening/closing modals
  if (!open && /Safari/i.test(navigator.userAgent) && /iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    setTimeout(() => {
      // Force a reflow to reset scroll state
      const wrapper = document.querySelector('.wrapper');
      if (wrapper) {
        const currentScrollTop = wrapper.scrollTop;
        wrapper.style.overflow = 'hidden';
        wrapper.offsetHeight; // Force reflow
        wrapper.style.overflow = 'auto';
        wrapper.scrollTop = currentScrollTop;
      }
    }, 50);
  }
}
if (closeTxModal) closeTxModal.onclick = toggleTxModal;
if (txModal) {
  txModal.onclick = (e) => {
    if (e.target === txModal) toggleTxModal();
  };
}
// Botão Home: centraliza o dia atual, mantendo-o colapsado
const homeBtn = document.getElementById('scrollTodayBtn');
//const settingsModalEl = document.getElementById('settingsModal');
const closeSettingsModal = document.getElementById('closeSettingsModal');
// scrollTodayIntoView is implemented in ui/scroll.js and aliased above. The
// click handler below delegates to that implementation.
if (homeBtn) homeBtn.addEventListener('click', scrollTodayIntoView);

// Bottom pill: Home/Ajustes
(function setupBottomPill(){
  const pill = document.querySelector('.floating-pill');
  if (!pill) return;
  const highlight = pill.querySelector('.pill-highlight');
  const options = pill.querySelectorAll('.pill-option');
  const setSelected = (key) => {
    pill.dataset.selected = key;
    options.forEach(b => b.setAttribute('aria-selected', b.dataset.action === key ? 'true' : 'false'));
  };
  const updateHighlight = () => {
    const sel = pill.querySelector('.pill-option[aria-selected="true"]');
    if (!sel || !highlight) return;
    const pr = pill.getBoundingClientRect();
    const sr = sel.getBoundingClientRect();
    const x = sr.left - pr.left - 6; // 6px padding left
    highlight.style.transform = `translateX(${Math.max(0,x)}px)`;
    highlight.style.width = `${sr.width}px`;
  };
  options.forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      setSelected(action); updateHighlight();
      if (action === 'home') {
        scrollTodayIntoView();
        closeSettings();
      } else if (action === 'settings') {
        // Use openSettings() which renders the theme selector (renderSettingsModal)
        openSettings();
        updateModalOpenState();
      }
    });
  });
  window.addEventListener('resize', updateHighlight);
  setTimeout(updateHighlight, 60);
})();

// Settings modal close handlers
if (closeSettingsModal) closeSettingsModal.onclick = () => { settingsApi.closeSettings(); };
if (settingsModalEl) settingsModalEl.onclick = (e) => { if (e.target === settingsModalEl) { settingsApi.closeSettings(); } };

const currency = (v) => safeFmtCurrency(v);
const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
// Palavras que caracterizam “salário”
const SALARY_WORDS = ['salário', 'salario', 'provento', 'rendimento', 'pagamento', 'paycheck', 'salary'];
const mobile = () => window.innerWidth <= 480;
const fmt = (d) => {
  const date = d instanceof Date ? d : new Date(d);
  return date.toLocaleDateString('pt-BR', mobile()
    ? { day: '2-digit', month: '2-digit' }
    : { day: '2-digit', month: '2-digit', year: 'numeric' }
  );
};

// Sticky month header logic has been moved to ui/stickyHeader.js

// Date helper functions have been moved to utils/date.js. See that module for
// formatToISO, todayISO, post, addYearsIso, isSameDayOfMonth and occursOn.



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
// Input formatting and payment method switching logic has been moved to
// ui/transactionForm.js. See that module for implementation details.
try {
  setupTransactionForm({
    valueInput: val,
    valueToggleButtons: document.querySelectorAll('.value-toggle button'),
    methodButtons: document.querySelectorAll('.switch-option'),
    hiddenSelect: document.getElementById('method'),
    cards,
    safeFmtNumber,
    safeFmtCurrency,
  });
} catch (_) {}

// Recorrência e Parcelas
const recurrence = $('recurrence');
const parcelasBlock = $('parcelasBlock');
const installments = $('installments');

// Invoice parcel elements: declare early so bindings exist before usage
const invoiceParcelCheckbox = document.getElementById('invoiceParcel');
const invoiceParcelRow = document.getElementById('invoiceParcelRow');
// Editing state (declare early so window.__gastos may reference it safely)
let isEditing = null;

// Notification helper: placed early so other modules can reference via window.__gastos
const notify = (msg, type = 'error') => {
  const t = document.getElementById('toast');
  if (!t) return;

  // Set the message
  t.textContent = msg;

  // choose icon for CSS ::before
  t.style.setProperty('--icon', type === 'error' ? '"\u2715"' : '"\u2713"');

  // Remove any previous type classes
  t.classList.remove('success', 'error');

  // Add the new type (defines background color)
  t.classList.add(type);

  // \u26a1\ufe0f Force a reflow so consecutive toasts restart the animation cleanly
  void t.offsetWidth;

  // Show the toast (opacity transition handled via CSS)
  t.classList.add('show');

  // Hide after 3\u202fs: first fade out, then drop the color class to avoid flicker
  setTimeout(() => {
    t.classList.remove('show');          // starts fade\u2011out (0.3\u202fs)
    // setTimeout(() => t.classList.remove(type), 300);
  }, 5000);
};

// Placeholder for the transaction row renderer factory. Initialized later
// via initTransactionLine(...) to avoid TDZ when `window.__gastos` is built.
let makeLine = null;
// Placeholder for addTx handler (initialized later via addTxMod)
let addTx = null;
if (typeof window !== 'undefined') window.addTx = addTx;

// Expose necessary state and helpers on a global object for the extracted
// modal logic. Without this assignment the extracted openPayInvoiceModal
// and addTx functions cannot access the DOM/state. See src/ui/transactionModal.js.
window.__gastos = {
  txModal,
  toggleTxModal,
  desc,
  val,
  safeFmtNumber,
  safeFmtCurrency,
  safeParseCurrency,
  date,
  hiddenSelect: document.getElementById('method'),
  methodButtons: document.querySelectorAll('.switch-option'),
  invoiceParcelRow: document.getElementById('invoiceParcelRow'),
  invoiceParcelCheckbox: document.getElementById('invoiceParcel'),
  installments,
  parcelasBlock,
  recurrence,
  txModalTitle,
  addBtn,
  todayISO,
  // State flags (to be kept in sync)
  isEditing,
  pendingEditMode,
  pendingEditTxIso,
  pendingEditTxId,
  isPayInvoiceMode,
  pendingInvoiceCtx,
  // Transaction data and helpers
  transactions,
  getTransactions,
  setTransactions,
  addTransaction,
  sameId,
  post,
  save,
  renderTable,
  safeRenderTable,
  showToast,
  notify,
  askMoveToToday,
  collectTxFormData,
  buildTransaction,
  finalizeTransaction,
  resetTxForm,
  // Additional references for planned modal and recurrence handling
  plannedModal,
  openPlannedBtn,
  closePlannedModal,
  plannedList,
  updateModalOpenState,
  makeLine,
  initSwipe,
  deleteRecurrenceModal,
  closeDeleteRecurrenceModal,
  deleteSingleBtn,
  deleteFutureBtn,
  deleteAllBtn,
  cancelDeleteRecurrence,
  editRecurrenceModal,
  closeEditRecurrenceModal,
  cancelEditRecurrence,
  editSingleBtn,
  editFutureBtn,
  editAllBtn,
  pendingDeleteTxId,
  pendingDeleteTxIso,
  pendingEditTxId,
  pendingEditTxIso,
  pendingEditMode,
  reopenPlannedAfterEdit,
  removeTransaction,
  setTransactions,
  save,
  renderTable,
  renderPlannedModal,
  renderCardSelectorHelper,
  showToast,
  // Expose scroll-related elements and helpers so that extracted modules
  // (e.g., ui/scroll.js) can access them via window.__gastos. These
  // properties should reflect the current values of the variables defined
  // above in this file.
  wrapperEl,
  stickyHeightGuess,
  animateWrapperScroll,
  hydrateStateFromCache,
  performResetAllData,
};

// Also expose performResetAllData globally for settings modal
window.performResetAllData = performResetAllData;

// Attach invoice parcel/installment handlers via extracted module
setupInvoiceHandlers();

// Initialise additional modal handlers. The functions imported above
// register their own event listeners and expose helper functions on
// `window.__gastos` so that the rest of the app can remain unaware
// of the underlying implementation details.
setupPlannedModal();
setupRecurrenceHandlers();

// Initialize edit transaction logic. This extracts the heavy editTx
// implementation into a separate module and exposes it via window.__gastos.
setupEditTransaction();

// --- Parcelamento desativado temporariamente ---
parcelasBlock.classList.add('hidden');
installments.value = '1';
installments.disabled = true;
// Não popula opções de parcelas e não exibe nem ativa nada relacionado a parcelas.
// Se selecionar recorrência, zera parcelas
recurrence.onchange = () => {
  if (recurrence.value !== '') installments.value = '1';
};
const cardName=$('cardName'),cardClose=$('cardClose'),cardDue=$('cardDue'),addCardBtn=$('addCardBtn'),cardList=$('cardList');
const startGroup=$('startGroup'),startInput=$('startInput'),setStartBtn=$('setStartBtn'),resetBtn=$('resetData');
if (startInput) startInputRef = startInput;

function syncStartInputFromState() {
  const input = startInputRef || document.getElementById('startInput');
  if (!input) return;
  if (!startInputRef && input) startInputRef = input;
  if (state.startBalance == null || Number.isNaN(Number(state.startBalance))) {
    input.value = '';
    return;
  }
  try {
    input.value = safeFmtCurrency(state.startBalance, { forceNew: true });
  } catch (_) {
    input.value = String(state.startBalance);
  }
}

function ensureStartSetFromBalance(options = {}) {
  const { persist = true, refresh = true } = options;
  if (state.startSet === true) return;
  if (state.startBalance == null || Number.isNaN(Number(state.startBalance))) return;
  state.startSet = true;
  try { cacheSet('startSet', true); } catch (_) {}
  if (persist && typeof save === 'function' && PATH) {
    Promise.resolve().then(() => save('startSet', true)).catch(() => {});
  }
  if (refresh) {
    try { initStart(); } catch (_) {}
  }
}

// Função reutilizável que executa o reset (confirm dentro da função por padrão)
async function performResetAllData(askConfirm = true) {
  if (askConfirm && !confirm('Deseja realmente APAGAR TODOS OS DADOS? Esta ação é irreversível.')) return;
  try {
    // Clear in-memory (via app-state)
    setTransactions([]);
    setCards([{ name: 'Dinheiro', close: 0, due: 0 }]);
    state.startBalance = null;
    state.startDate = null;
  state.startSet = false;
    syncStartInputFromState();

    // Clear caches (best-effort)
    try { cacheSet('tx', getTransactions()); } catch (_) {}
    try { cacheSet('cards', getCards()); } catch (_) {}
    try { cacheSet('startBal', state.startBalance); } catch (_) {}
    try { cacheSet('startDate', state.startDate); } catch (_) {}
    try { cacheSet('dirtyQueue', []); } catch (_) {}

    // Try persist (best effort)
    try { await save('tx', getTransactions()); } catch (_) {}
    try { await save('cards', getCards()); } catch (_) {}
    try { await save('startBal', state.startBalance); } catch (_) {}
    try { await save('startDate', state.startDate); } catch (_) {}
  try { cacheSet('startSet', false); } catch (_) {}
  try { await save('startSet', false); } catch (_) {}

    // Rerender
    refreshMethods(); renderCardList(); initStart(); renderTable();
    showToast('Todos os dados foram apagados.', 'success');
  } catch (err) {
    console.error('Erro ao limpar dados:', err);
    showToast('Erro ao apagar dados. Veja console.', 'error');
  }
}

// Mostra o botão original "Limpar tudo" no fim do acordeão (se existir) e anexa handler
if (resetBtn) {
  resetBtn.hidden = false;
  resetBtn.style.display = '';
  resetBtn.addEventListener('click', () => performResetAllData(true));
}

// Cria um botão flutuante fixo para "Limpar tudo" (sem tocar no HTML original)
(function createFloatingResetButton(){
  try {
    // Avoid creating multiple times
    if (document.getElementById('resetDataFloat')) return;
    const btn = document.createElement('button');
    btn.id = 'resetDataFloat';
    btn.type = 'button';
    btn.className = 'danger reset-float';
    btn.title = 'Limpar tudo';
    btn.textContent = 'Limpar tudo';
    // Inline styles to ensure visibility regardless of CSS
    Object.assign(btn.style, {
      position: 'fixed',
      left: '16px',
      bottom: '94px',
      zIndex: '10000',
      padding: '10px 12px',
      background: '#c53030',
      color: '#fff',
      border: 'none',
      borderRadius: '10px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
      cursor: 'pointer',
      fontWeight: '600'
    });

    btn.addEventListener('click', () => performResetAllData(true));

    // Only append when body is ready
    if (document.body) document.body.appendChild(btn);
    else window.addEventListener('load', () => { document.body.appendChild(btn); });
  } catch (_) {}
})();
// Auto-format initial balance input using the active currency profile
if (startInput) {
  startInput.addEventListener('input', () => {
    const digits = startInput.value.replace(/\D/g, '');
    if (!digits) {
      startInput.value = '';
      return;
    }
    const numberValue = parseInt(digits, 10) / 100;
    startInput.value = safeFmtCurrency(numberValue);
  });
}
const startContainer = document.querySelector('.start-container');
const dividerSaldo = document.getElementById('dividerSaldo');

const togglePlanned = async (id, iso) => {
  const master = transactions.find(x => sameId(x.id, id));
  const shouldRefreshPlannedModal = plannedModal && !plannedModal.classList.contains('hidden');
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
      // Pergunta se deve mover para hoje
      const today = todayISO();
      const fmt = (s) => `${s.slice(8,10)}/${s.slice(5,7)}`;
      // Pergunta somente para operações em Dinheiro; cartão sempre vai para a fatura
      let execIso = iso;
      try {
        if (master.method === 'Dinheiro' && iso !== today) {
          const move = await askMoveToToday();
          if (move) execIso = today;
        }
      } catch (_) {}
      // Create a standalone executed transaction for this occurrence
      const execTx = {
        id: Date.now(),
        parentId: master.id,
        desc: master.desc,
        val: master.val,
        method: master.method,
        opDate: execIso,
        postDate: post(execIso, master.method),
        recurrence: '',
        installments: 1,
        planned: false,
        ts: new Date().toISOString(),
        modifiedAt: new Date().toISOString()
      };
  try { addTransaction(execTx); } catch (_) { setTransactions((getTransactions()||[]).concat([execTx])); }
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
      // Somente Dinheiro pergunta para mover; Cartão não pergunta e não altera opDate
      if (master.method === 'Dinheiro') {
        try {
          if (iso !== today) {
            const move = await askMoveToToday();
            if (move) {
              master.opDate = today;
              master.postDate = today;
            }
          }
        } catch (_) {}
      }
      // update timestamp of payment to today
      master.ts = new Date().toISOString();
    }
    master.planned = !master.planned;
    if (!master.planned && master.method !== 'Dinheiro') {
      // Para cartões, calcula a fatura com base na opDate (possivelmente movida)
      master.postDate = post(master.opDate, master.method);
      const [, mm, dd] = master.postDate.split('-');
      toastMsg = `Movida para fatura de ${dd}/${mm}`;
    }
  }
  try { save('tx', getTransactions()); } catch (_) {}
  renderTable();
  if (shouldRefreshPlannedModal) {
    try { renderPlannedModal(); } catch (err) { console.error('renderPlannedModal failed', err); }
  }
  // restaura faturas que o usuário tinha expandido
  openInvoices.forEach(pd => {
    const det = document.querySelector(`details.invoice[data-pd="${pd}"]`);
    if (det) det.open = true;
  });

  // mostra o toast por último, já com a tela renderizada
  if (toastMsg) notify(toastMsg, 'success');
};

function openEditFlow(tx, iso) {
  if (!tx) return;
  const hasRecurrence = (() => {
    if (tx.recurrence && tx.recurrence.trim()) return true;
    if (tx.parentId) {
      const parent = transactions.find(p => p.id === tx.parentId);
      if (parent && parent.recurrence && parent.recurrence.trim()) return true;
    }
    for (const p of transactions) {
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
    reopenPlannedAfterEdit = !!(plannedModal && !plannedModal.classList.contains('hidden'));
    if (reopenPlannedAfterEdit) {
      plannedModal.classList.add('hidden');
      updateModalOpenState();
    }
    if (isDetachedOccurrence(tx)) pendingEditMode = null;
    editTx(id);
  };

  // helper to open recurrence modal safely
  const showRecurrenceModal = (id) => {
    pendingEditTxId  = id;
    pendingEditTxIso = iso || tx.opDate;
    reopenPlannedAfterEdit = !!(plannedModal && !plannedModal.classList.contains('hidden'));
    if (reopenPlannedAfterEdit) {
      plannedModal.classList.add('hidden');
      updateModalOpenState();
    }
    editRecurrenceModal.classList.remove('hidden');
    updateModalOpenState();
  };

  if (tx.recurrence || (hasRecurrence && !tx.recurrence && !tx.parentId)) {
    showRecurrenceModal(tx.id);
    return;
  }

  performEdit(tx.id);
}

// -----------------------------------------------------------------------------
// Transaction line renderer
//
// We replace the original `makeLine` implementation with a factory created
// by ui/transactionLine.js. This factory accepts all the external
// dependencies required to build a transaction row (data access,
// handlers, helpers). The resulting `makeLine` function is used
// wherever individual rows need to be rendered (e.g. in the planned
// modal and invoice contexts). Pulling this heavy logic into a module
// keeps main.js lean and focused on application coordination.
makeLine = initTransactionLine({
  getTransactions,
  transactions,
  togglePlanned,
  openEditFlow,
  delTx,
  sameId,
  occursOn,
  todayISO,
  safeFmtCurrency,
});

const openCardBtn=document.getElementById('openCardModal');
const cardModal=document.getElementById('cardModal');
const closeCardModal=document.getElementById('closeCardModal');

// Now that DOM refs and modal helpers are defined, run bootstrap logic
try { runBootstrap(); } catch (e) { console.warn('runBootstrap failed to start', e); }

function showCardModal(options = {}) {
  if (!cardModal) return;
  const fromSettings = options.fromSettings === true;

  if (fromSettings) {
    cardModal.dataset.origin = 'settings';
    cardModal.classList.add('from-settings');
    cardModal.classList.remove('from-settings-visible');
    cardModal.classList.remove('card-slide');
    cardModal.classList.remove('card-slide-visible');
    cardModal.classList.remove('hidden');
    void cardModal.offsetWidth;
    cardModal.classList.add('from-settings-visible');
  } else {
    cardModal.dataset.origin = 'default';
    cardModal.classList.remove('from-settings');
    cardModal.classList.remove('from-settings-visible');
    cardModal.classList.add('card-slide');
    cardModal.classList.remove('card-slide-visible');
    cardModal.classList.remove('hidden');
    void cardModal.offsetWidth;
    cardModal.classList.add('card-slide-visible');
  }

  updateModalOpenState();

  setTimeout(() => {
    try { renderCardList(); }
    catch (_) {}
  }, 0);
}

function hideCardModal() {
  if (!cardModal) return;
  cardModal.classList.add('hidden');
  cardModal.classList.remove('from-settings-visible');
  cardModal.classList.remove('card-slide-visible');
  if (!cardModal.dataset.origin || cardModal.dataset.origin !== 'settings') {
    cardModal.classList.remove('from-settings');
    setTimeout(() => {
      if (cardModal.classList.contains('hidden')) {
        cardModal.classList.remove('card-slide');
      }
    }, 320);
  } else {
    setTimeout(() => {
      if (cardModal.classList.contains('hidden')) {
        cardModal.classList.remove('from-settings');
      }
    }, 320);
  }
  delete cardModal.dataset.origin;
  updateModalOpenState();
}

function refreshMethods() {
  // Delegate to the card UI helper. Pass the method select and
  // current cards to avoid closing over outer variables. This keeps
  // the implementation lightweight while preserving the same API.
  cardRefreshMethods(met, cards);
}
// --- Card List Rendering (Refatorado) ---
function createCardSwipeActions(card) {
  // Stub – this implementation has moved to ui/cards.js. Any old
  // references to this function should be updated to use the
  // exported versions from that module. Returning null here
  // prevents runtime errors if called inadvertently.
  return null;
}

function createCardContent(card) {
  // Stub – moved to ui/cards.js. The returned value is unused here.
  return null;
}

function createCardListItem(card) {
  // Stub – moved to ui/cards.js. This local definition is retained to
  // satisfy existing references but does not perform any work.
  return null;
}

function renderCardList() {
  // Delegate to the card UI helper. Compose a context with the
  // required dependencies. This wrapper preserves the original API
  // signature while routing the heavy lifting to ui/cards.js.
  cardRenderList({
    cards,
    cardModal,
    cardListEl: cardList,
    initSwipe,
    getTransactions,
    setTransactions,
    transactions,
    save,
    refreshMethodsFn: refreshMethods,
    renderCardList: renderCardList,
    renderTable,
    met,
    post: (iso, method) => post(iso, method),
  });
}
// Helper: returns true if this record is a detached (single‑edited) occurrence
function isDetachedOccurrence(tx) {
  return !tx.recurrence && !!tx.parentId;
}

// (makeLine implementation moved to ui/transactionLine.js)
// swipe-init for operations is now handled via initSwipe at the end of the file.

function addCard(){const n=cardName.value.trim(),cl=+cardClose.value,du=+cardDue.value;if(!n||cl<1||cl>31||du<1||du>31||cl>=du||cards.some(c=>c.name===n)){alert('Dados inválidos');return;}cards.push({name:n,close:cl,due:du});cacheSet('cards', cards);save('cards',cards);refreshMethods();renderCardList();cardName.value='';cardClose.value='';cardDue.value='';}


// ---------- Pay Invoice Modal (reuse txModal) ----------
// The invoice handling logic has been extracted to src/ui/transactionModal.js.
// Define a wrapper around the imported function so existing calls remain valid.
// invoiceParcelCheckbox and invoiceParcelRow are declared earlier
function openPayInvoiceModal(cardName, dueISO, remaining, totalAbs, adjustedBefore) {
  return openPayInvoiceModalMod(cardName, dueISO, remaining, totalAbs, adjustedBefore);
}


// Localized addTx and helpers
addTx = async function() {
  return addTxMod();
};
if (typeof window !== 'undefined') window.addTx = addTx;
// collectTxFormData, buildTransaction, finalizeTransaction and resetTxForm were
// defined here when the transaction modal logic lived in main.js. They are no
// longer used because the entire add/edit flow has been extracted to
// ui/transactionModal.js. These no-op stubs remain for backward compatibility.
function collectTxFormData() {
  return null;
}
function buildTransaction() {
  return null;
}
async function finalizeTransaction() {
  // no-op
}
function resetTxForm() {
  // no-op
}

// generateOccurrences implementation removed; handled elsewhere

// Delete a transaction (with options for recurring rules)
// Delete a transaction (delegated to recurrenceHandlers.js)
function delTx(id, iso) {
  // Delegate deletion logic to the recurrenceHandlers module if available.
  const g = typeof window !== 'undefined' ? window.__gastos : undefined;
  if (g && typeof g.delTx === 'function') {
    return g.delTx(id, iso);
  }
  // Fallback: nothing to do if handler is missing.
}

function closeDeleteModal() {
  // Delegate close logic to recurrenceHandlers if present
  const g = typeof window !== 'undefined' ? window.__gastos : undefined;
  if (g && typeof g.closeDeleteModal === 'function') {
    return g.closeDeleteModal();
  }
}

// Modal handlers are assigned in recurrenceHandlers.js.  Stub assignments here to avoid duplicate listeners.


// Helper: find the master recurring rule for a given tx/iso
function findMasterRuleFor(tx, iso) {
  // Delegate to recurrenceHandlers.js if available
  const g = typeof window !== 'undefined' ? window.__gastos : undefined;
  if (g && typeof g.findMasterRuleFor === 'function') {
    return g.findMasterRuleFor(tx, iso);
  }
  return null;
}

// Recurrence deletion handlers are now attached in recurrenceHandlers.js

// Modal Editar Recorrência handlers
function closeEditModal() {
  editRecurrenceModal.classList.add('hidden');
  updateModalOpenState();
  if (reopenPlannedAfterEdit && plannedModal) {
    reopenPlannedAfterEdit = false;
    renderPlannedModal();
    plannedModal.classList.remove('hidden');
    updateModalOpenState();
  }
}
if (closeEditRecurrenceModal) closeEditRecurrenceModal.onclick = closeEditModal;
if (cancelEditRecurrence) cancelEditRecurrence.onclick = closeEditModal;
if (editRecurrenceModal) editRecurrenceModal.onclick = e => { if (e.target === editRecurrenceModal) closeEditModal(); };

if (editSingleBtn) editSingleBtn.onclick = () => {
  pendingEditMode = 'single';
  closeEditModal();
  editTx(pendingEditTxId);
};
if (editFutureBtn) editFutureBtn.onclick = () => {
  pendingEditMode = 'future';
  closeEditModal();
  editTx(pendingEditTxId);
};
if (editAllBtn) editAllBtn.onclick = () => {
  pendingEditMode = 'all';
  closeEditModal();
  editTx(pendingEditTxId);
};
const editTx = (id) => {
  const g = typeof window !== 'undefined' ? window.__gastos : undefined;
  if (g && typeof g.editTx === 'function') {
    return g.editTx(id);
  }
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

  const txs = getTransactions ? getTransactions() : transactions;
  const t = txs.find(x => x.id === id);
  if (!t) return;

  pendingEditTxId  = id;
  pendingEditTxIso = t.opDate;

  if (t.recurrence || t.parentId) {
    // recorrente → abre modal de escopo de edição
    editRecurrenceModal.classList.remove('hidden');
  } else {
    // não recorrente → vai direto para edição
    editTx(id);
  }

  e.preventDefault();
  e.stopPropagation();
});

function renderTable() {
  try { console.debug('renderTable: called, isHydrating =', isHydrating(), 'transactions.length =', (getTransactions ? getTransactions().length : transactions.length)); } catch(_) {}
  if (isHydrating()) {
    const accSk = document.getElementById('accordion');
    if (accSk) accSk.dataset.state = 'skeleton';
    try { console.debug('renderTable: skipping because isHydrating = true'); } catch(_) {}
    return;
  }
  clearTableContent();
  const acc = document.getElementById('accordion');
  if (acc) acc.dataset.state = 'skeleton';
  const groups = groupTransactionsByMonth();
  try { console.debug('renderTable: groups created, size =', groups.size); } catch(_) {}
  renderTransactionGroups(groups);
  if (acc) delete acc.dataset.state;
  
  // Tenta criar o sticky header após renderizar conteúdo
  setTimeout(() => {
    try { 
      if (typeof recalculateHeaderOffset === 'function') recalculateHeaderOffset(); 
    } catch (_) {}
  }, 100);
}

// Defensive render: avoids silent failures leaving the UI empty
function safeRenderTable(attempt = 1) {
  try {
    console.debug('safeRenderTable: called, attempt =', attempt);
    renderTable();
  } catch (err) {
    console.error('renderTable failed (attempt ' + attempt + '):', err);
    try { showToast('Erro ao renderizar. Tentando novamente…', 'error', 2500); } catch (_) {}
    if (attempt < 3) setTimeout(() => safeRenderTable(attempt + 1), 300);
  }
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
  const txs = getTransactions ? getTransactions() : transactions;
  for (const tx of txs) {
    // Usa postDate para agrupamento por mês, com fallback seguro
    const pd = tx.postDate || (tx.opDate && tx.method ? post(tx.opDate, tx.method) : tx.opDate);
    if (!pd || typeof pd.slice !== 'function') continue; // ignora itens malformados
    const key = pd.slice(0, 7); // YYYY-MM
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
  try { console.debug('renderTransactionGroups: about to call accordionApi.renderAccordion(), groups size =', groups.size); } catch(_) {}
  accordionApi.renderAccordion();
}


// -----------------------------------------------------------------------------
// Acordeão: mês → dia → fatura
// The helper function txByDate has been extracted to src/ui/transactionUtils.js
// to reduce the size of this file. See that module for the full logic.

// ---------------------------------------------------------------------------
// Initialize the accordion rendering API. This moves the heavy logic for
// building the month/day accordion into src/ui/accordion.js. The resulting
// object exposes a renderAccordion() method used to update the view.
// Initialize txByDate and calculateDateRange using the extracted utilities.
const { txByDate, calculateDateRange } = initTxUtils({
  cards,
  getTransactions,
  transactions,
  post,
  occursOn,
  todayISO,
  VIEW_YEAR
});

const accordionApi = initAccordion({
  acc: document.getElementById('accordion'),
  getTransactions,
  transactions,
  cards,
  state,
  calculateDateRange,
  VIEW_YEAR,
  txByDate,
  safeFmtCurrency,
  SALARY_WORDS,
});

// Debug: verify accordion API was initialized properly and check key dependencies
try { 
  console.debug('accordionApi initialized:', !!accordionApi, 'renderAccordion type:', typeof accordionApi?.renderAccordion);
  console.debug('accordion init deps - acc element:', !!document.getElementById('accordion'), 'getTransactions type:', typeof getTransactions, 'calculateDateRange type:', typeof calculateDateRange, 'txByDate type:', typeof txByDate);
} catch(_) {}

// ===================== YEAR SELECTOR =====================

const YEAR_SELECTOR_MIN = 1990;
const YEAR_SELECTOR_MAX = 3000;

// Detecta anos disponíveis nas transações
// Year selector helpers are now delegated to yearSelectorApi. These stubs
// preserve the original function names for backward compatibility.
function getAvailableYears() {
  return yearSelectorApi.getAvailableYears();
}

// Atualiza o título com o ano atual
function updateYearTitle() {
  return yearSelectorApi.updateYearTitle();
}

// Abre o modal de seleção de ano
function openYearModal() {
  return yearSelectorApi.openYearModal();
}

// Fecha o modal de seleção de ano
function closeYearModal() {
  return yearSelectorApi.closeYearModal();
}

// Seleciona um ano e atualiza a interface
function selectYear(year) {
  return yearSelectorApi.selectYear(year);
}

// Calcula o range real de datas baseado nas transações
// calculateDateRange previously contained heavy logic for determining the date
// range across all transactions and occurrences. This implementation has
// been extracted to src/ui/transactionUtils.js. The imported version is
// assigned via initTxUtils() at the top of this file.
// calculateDateRange moved to src/ui/transactionUtils.js. See that module for the full implementation.

// The running balance calculation and accordion rendering were moved to src/ui/accordion.js.
function buildRunningBalanceMap() {
  // Delegated to accordion module. Returns an empty map for compatibility.
  return new Map();
}
function renderAccordion() {
  // Delegates to accordionApi from accordion.js to render the accordion UI.
  return accordionApi.renderAccordion();
}
// Constrói um mapa de saldos contínuos dia-a-dia

// -----------------------------------------------------------------------------
// -----------------------------------------------------------------------------
// Accordion: month ▶ day ▶ invoice
// Shows every month (Jan–Dec) and every day (01–31),
// past months collapsed by default, current & future months open.
// -----------------------------------------------------------------------------

// initStart and start-balance handlers have been moved to bootstrap.js. The
// definition here delegates to the version exposed on window.__gastos.
function initStart() {
  const g = typeof window !== 'undefined' ? window.__gastos : undefined;
  if (g && typeof g.initStart === 'function') {
    return g.initStart();
  }
}

// Register the service worker and listen for sync events. The heavy
// implementation has been extracted to src/utils/serviceWorker.js. This
// call will register the SW unless USE_MOCK is true. It also passes
// flushQueue so that background sync events flush the queue.
setupServiceWorker({ USE_MOCK, flushQueue });
// Planejados modal handlers
// Planejados modal – subfunções auxiliares
function updatePlannedModalHeader() {
  // Implementation moved to src/ui/plannedModal.js
}

function preparePlannedList() {
  // Implementation moved to src/ui/plannedModal.js
}

function bindPlannedActions() {}

function renderPlannedModal() {}

// Ensure Planejados modal open/close handlers exist exactly once
// planned modal handlers are now set up via setupPlannedModal()
// Initialize swipe for operations (op-line)
initSwipe(document.body, '.swipe-wrapper', '.swipe-actions', '.op-line', 'opsSwipeInit');
// Initialize swipe for card list (card-line) only if the list root exists
if (cardList) initSwipe(cardList, '.swipe-wrapper', '.swipe-actions', '.card-line', 'cardsSwipeInit');
// Initialize swipe for invoice headers (summary)
initSwipe(document.body, '.swipe-wrapper', '.swipe-actions', '.invoice-header-line', 'invoiceSwipeInit');

// Initialize year selector title via the API
yearSelectorApi.updateYearTitle();
// Initialise keyboard and scroll handlers. This sets up global
// listeners to prevent background scroll when modals are open and
// applies iOS keyboard fixes.
initKeyboardAndScrollHandlers();
function animateWrapperScroll(targetTop) {
  if (!wrapperEl) return;
  if (wrapperScrollAnimation) return;

  const startTop = wrapperEl.scrollTop || 0;
  const distance = targetTop - startTop;
  if (Math.abs(distance) < 1) {
    wrapperEl.scrollTop = targetTop;
    wrapperTodayAnchor = targetTop;
    return;
  }

  const duration = 240;
  const startTime = performance.now();
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  const step = (now) => {
    const elapsed = now - startTime;
    const progress = Math.min(1, elapsed / duration);
    wrapperEl.scrollTop = startTop + distance * easeOutCubic(progress);
    if (progress < 1) {
      wrapperScrollAnimation = requestAnimationFrame(step);
    } else {
      wrapperScrollAnimation = null;
      wrapperEl.scrollTop = targetTop;
      wrapperTodayAnchor = targetTop;
    }
  };
  wrapperScrollAnimation = requestAnimationFrame(step);
}