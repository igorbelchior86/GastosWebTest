import { fmtCurrency, fmtNumber, parseCurrency, escHtml } from './utils/format.js';
import { normalizeStartBalance } from './utils/startBalance.js';
import { formatToISO as utilFormatToISO,todayISO as utilTodayISO,addYearsIso as utilAddYearsIso,isSameDayOfMonth as utilIsSameDayOfMonth,occursOn as utilOccursOn,postDateForCard } from './utils/date.js';
import { initTxUtils } from './ui/transactionUtils.js';
import { setupInvoiceHandlers,openPayInvoiceModal as openPayInvoiceModalMod,addTx as addTxMod } from './ui/transactionModal.js';
import { DEFAULT_PROFILE,LEGACY_PROFILE_ID,PROFILE_DATA_KEYS,PROFILE_CACHE_KEYS,getRuntimeProfile,getCurrencyName,getCurrentProfileId,scopedCacheKey,scopedDbSegment } from './utils/profile.js';
import { cacheGet, cacheSet, cacheRemove, cacheClearProfile } from './utils/cache.js';
import { appState,setStartBalance,setStartDate,setStartSet,setBootHydrated,setTransactions,getTransactions,setCards,getCards,subscribeState } from './state/appState.js';

import { resetHydration as hydrationReset,registerHydrationTarget as hydrationRegisterTarget,markHydrationTargetReady as hydrationTargetReady,completeHydration as hydrationComplete,isHydrating as hydrationIsInProgress,maybeCompleteHydration as hydrationMaybeComplete } from './ui/hydration.js';

import { refreshMethods as cardRefreshMethods,renderCardList as cardRenderList } from './ui/cards.js';
import { setupSettings } from './ui/settings.js';

import { createYearSelector } from './ui/yearSelector.js';
import { initKeyboardAndScrollHandlers } from './ui/keyboard.js';

import { initStickyHeader } from './ui/stickyHeader.js';
import { initTransactionLine } from './ui/transactionLine.js';

import { initSwipe as initSwipeMod } from './utils/swipe.js';
import { scrollTodayIntoView as scrollTodayIntoViewMod } from './ui/scroll.js';
import { hydrateCache as hydrateCacheMod } from './utils/hydrateCache.js';
import { setupServiceWorker } from './utils/serviceWorker.js';
import { setupPlannedModal } from './ui/plannedModal.js';
import { setupRecurrenceHandlers } from './ui/recurrenceHandlers.js';
import { runBootstrap } from './ui/bootstrap.js';
import { setupEditTransaction } from './ui/editTransaction.js';
import { setupTransactionForm } from './ui/transactionForm.js';
import { renderCardSelectorHelper } from './ui/transactionForm.js';
import { initAccordion } from './ui/accordion.js';
import { initOfflineQueue } from './utils/offlineQueue.js';
import { initTransactionSanitize } from './utils/transactionSanitize.js';
import { resetTxModal as resetTxModalMod,updateModalOpenState as updateModalOpenStateMod,focusValueField as focusValueFieldMod } from './ui/txModalUtils.js';
import { applyCurrencyProfile as applyCurrencyProfileMod } from './utils/currencyProfile.js';
import { initThemeFromStorage } from './utils/theme.js';
import { initIOSDebug } from './utils/iosDebug.js';

//
import { setupMainEventHandlers } from './uiEventHandlers.js';
import { createOpenEditFlow } from './editFlowHelper.js';

//
import { showToast as showToastHelper,buildSaveToast as buildSaveToastHelper,syncStartInputFromState as syncStartInputFromStateHelper,createPerformResetAllData,createFloatingResetButton,createTogglePlanned,createShowCardModal,createHideCardModal,createRefreshMethods,createRenderCardList,createSafeRenderTable,groupTransactionsByMonth as groupTransactionsByMonthHelper,createAnimateWrapperScroll } from './main_helpers.js';
import { safeFmtCurrency as _safeFmtCurrency,safeFmtNumber as _safeFmtNumber,safeParseCurrency as _safeParseCurrency } from './utils/safeFormat.js';

import { normalizeTransactionRecord as _normalizeTransactionRecord,ensureCashCard as _ensureCashCard } from './utils/txRecord.js';
import { createStartRealtime } from './startRealtimeHelper.js';

import { askMoveToToday as askMoveToTodayMod,askConfirmLogout as askConfirmLogoutMod,askConfirmReset as askConfirmResetMod,scheduleAfterKeyboard as scheduleAfterKeyboardMod,flushKeyboardDeferredTasks as flushKeyboardDeferredTasksMod } from './ui/modalHelpers.js';

const state = appState;

try { (window.__gastos = window.__gastos || {}).state = state; } catch (_) {}

let startInputRef=null,reopenPlannedAfterEdit=false;
const sameId = (a, b) => String(a ?? '') === String(b ?? '');

const safeFmtCurrency   = _safeFmtCurrency;
const safeFmtNumber     = _safeFmtNumber;
const safeParseCurrency = _safeParseCurrency;
const normalizeTransactionRecord = _normalizeTransactionRecord;
const ensureCashCard    = _ensureCashCard;
const scheduleAfterKeyboard = scheduleAfterKeyboardMod;
const flushKeyboardDeferredTasks = flushKeyboardDeferredTasksMod;
const askMoveToToday    = askMoveToTodayMod;
const askConfirmLogout  = askConfirmLogoutMod;
const askConfirmReset   = askConfirmResetMod;

const resetTxModal       = resetTxModalMod;
const updateModalOpenState = updateModalOpenStateMod;
const focusValueField    = focusValueFieldMod;

let updatePendingBadge,markDirty,scheduleBgSync,tryFlushWithBackoff,queueTx,flushQueue;

const initSwipe = initSwipeMod;
const scrollTodayIntoView = scrollTodayIntoViewMod;

function normalizeISODate(input){if(!input)return null;if(input instanceof Date)return input.toISOString().slice(0,10);const str=String(input).trim();if(!str)return null;const match=str.match(/^(\d{4}-\d{2}-\d{2})/);return match?match[1]:null;}


function registerHydrationTarget(k,e){hydrationRegisterTarget(k,e);}function markHydrationTargetReady(k){hydrationTargetReady(k);}function maybeCompleteHydration(){hydrationMaybeComplete();}function completeHydration(){hydrationComplete();}function isHydrating(){return hydrationIsInProgress();}

hydrationReset();

const INITIAL_CASH_CARD = { name: 'Dinheiro', close: 0, due: 0 };
let transactions = [];
let cards = [INITIAL_CASH_CARD];
const USE_MOCK = false;

let VIEW_YEAR = new Date().getFullYear();

const formatToISO = utilFormatToISO;
const todayISO    = utilTodayISO;
const addYearsIso = utilAddYearsIso;
const isSameDayOfMonth = utilIsSameDayOfMonth;
const occursOn    = (tx, iso) => utilOccursOn(tx, iso);
const post        = (iso, m) => postDateForCard(iso, m, cards);

try { window.todayISO = todayISO; } catch (_) {}

const { sortTransactions, sanitizeTransactions, recomputePostDates } =
  initTransactionSanitize({ getTransactions, setTransactions, cards, post, todayISO });

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

let pendingDeleteTxId=null,pendingDeleteTxIso=null,pendingEditTxId=null,pendingEditTxIso=null,pendingEditMode=null;

let profileListeners=[];
let startRealtimeFn=null;

function cleanupProfileListeners() {
  if (!profileListeners || !profileListeners.length) return;
  profileListeners.forEach(unsub => {
    try { typeof unsub === 'function' && unsub(); }
    catch (err) { console.warn('Listener cleanup failed', err); }
  });
  profileListeners = [];
}


function profileRef(key) {
  if (!firebaseDb || !PATH) return null;
  const segment = scopedDbSegment(key);
  return ref(firebaseDb, `${PATH}/${segment}`);
}


function hydrateStateFromCache(options = {}) {
  return hydrateCacheMod(options);
}

const deleteRecurrenceModal=document.getElementById('deleteRecurrenceModal'),closeDeleteRecurrenceModal=document.getElementById('closeDeleteRecurrenceModal'),deleteSingleBtn=document.getElementById('deleteSingleBtn'),deleteFutureBtn=document.getElementById('deleteFutureBtn'),deleteAllBtn=document.getElementById('deleteAllBtn'),cancelDeleteRecurrence=document.getElementById('cancelDeleteRecurrence'),editRecurrenceModal=document.getElementById('editRecurrenceModal'),closeEditRecurrenceModal=document.getElementById('closeEditRecurrenceModal'),editSingleBtn=document.getElementById('editSingleBtn'),editFutureBtn=document.getElementById('editFutureBtn'),editAllBtn=document.getElementById('editAllBtn'),cancelEditRecurrence=document.getElementById('cancelEditRecurrence'),confirmMoveModal=document.getElementById('confirmMoveModal'),confirmMoveYes=document.getElementById('confirmMoveYes'),confirmMoveNo=document.getElementById('confirmMoveNo'),closeConfirmMove=document.getElementById('closeConfirmMove'),confirmMoveText=document.getElementById('confirmMoveText'),confirmLogoutModal=document.getElementById('confirmLogoutModal'),confirmLogoutYes=document.getElementById('confirmLogoutYes'),confirmLogoutNo=document.getElementById('confirmLogoutNo'),closeConfirmLogout=document.getElementById('closeConfirmLogout'),confirmLogoutText=document.getElementById('confirmLogoutText'),settingsModalEl=document.getElementById('settingsModal'),toggleThemeBtn=document.getElementById('toggleThemeBtn');
if (toggleThemeBtn) {
  toggleThemeBtn.onclick = () => {
    const html = document.documentElement;
    const current = html.getAttribute('data-theme');
    html.setAttribute('data-theme', current === 'light' ? 'dark' : 'light');
  };
}
const closeSettingsModalBtn = document.getElementById('closeSettingsModal');

const settingsApi = setupSettings(settingsModalEl);

let isPayInvoiceMode=false,pendingInvoiceCtx=null;

const openPlannedBtn=document.getElementById('openPlannedBtn'),plannedModal=document.getElementById('plannedModal'),closePlannedModal=document.getElementById('closePlannedModal'),plannedList=document.getElementById('plannedList'),headerSeg=document.querySelector('.header-seg');
function renderSettingsModal() {
  return settingsApi.renderSettings();
}
function openSettings() {
  settingsApi.openSettings();
}
function closeSettings() {
  settingsApi.closeSettings();
}
// Settings modal interactions are wired up in uiEventHandlers.js
try { document.addEventListener('auth:state', () => { settingsApi.renderSettings(); }); } catch(_) {}

const yearSelector=document.getElementById('yearSelector'),yearModal=document.getElementById('yearModal'),closeYearModalBtn=document.getElementById('closeYearModal');
// Year selector modal interactions are wired up in uiEventHandlers.js

// Button that scrolls the view to today.
const homeBtn=document.getElementById('scrollTodayBtn'),bottomPill=document.querySelector('.floating-pill');

function fixPlannedAlignment(){} const WDAY_LONG={}; function expandPlannedDayLabels(){}

const plannedBox = plannedModal ? plannedModal.querySelector('.bottom-modal-box') : null;

initThemeFromStorage();

/**
 * Apply a currency/profile by id.
 * - sets window.APP_PROFILE
 * - creates window.APP_FMT Intl.NumberFormat for currency
 * - persists choice to localStorage
 * - toggles UI bits controlled by profile.features (e.g., invoice parcel)
 */
function applyCurrencyProfile(profileId, options = {}) {
  return applyCurrencyProfileMod(profileId, options);
}

try{
  const savedProfile = localStorage.getItem('ui:profile') || (window.CURRENCY_PROFILES ? Object.keys(window.CURRENCY_PROFILES)[0] : null);
  if (savedProfile) applyCurrencyProfile(savedProfile);
}catch(e){}


//
import { setupIdbCache } from './idbHelper.js';
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";

import { getDatabase, ref, set, get, onValue } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

import { firebaseConfig } from './config/firebaseConfig.js';
import { AuthService } from './services/authService.js';

import { FirebaseService as FirebaseSvc } from './services/firebaseService.js';

try {
  FirebaseSvc.setMockMode(Boolean(USE_MOCK));
  if (!USE_MOCK && typeof FirebaseSvc.init === 'function') {
    FirebaseSvc.init(firebaseConfig).catch(err => { console.warn('FirebaseSvc.init failed', err); });
  }
} catch (e) { /* ignore init errors for now */ }

// AuthService is now initialized in globals.js to ensure it's ready before login.view.js loads
try {
  // Only initialize if not already done (globals.js should have done it)
  if (!AuthService.getCurrentUser && !window.Auth) {
    AuthService.init(firebaseConfig).catch(err => {
      console.warn('AuthService.init failed', err);
    });
  }
} catch (e) {
  /* ignore */
}


//
const { idbGet, idbSet, idbRemove } = await setupIdbCache();

/**
 * Initialize swipe-to-reveal actions on elements.
 * @param {ParentNode} root       Root element to listen on (e.g., document or specific container).
 * @param {string} wrapperSel     Selector for swipe wrapper (e.g., '.swipe-wrapper').
 * @param {string} actionsSel     Selector for swipe actions (e.g., '.swipe-actions').
 * @param {string} lineSel        Selector for the line to translate (e.g., '.op-line' or '.card-line').
 * @param {boolean} onceFlag      Name of global flag to prevent multiple inits.
 */

document.addEventListener('click', (e) => {
  const sum = e.target.closest('.invoice-header-line');
  if (!sum) return;
  const det = sum.closest('details.invoice');
  if (det && det.dataset.swiping === '1') {
    e.stopPropagation();
    e.preventDefault();
  }
}, true);

initIOSDebug(firebaseConfig);

let PATH;
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

const APP_VERSION = 'v1.4.9(b55)';

const METRICS_ENABLED = true;
const _bootT0 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
function logMetric(name, payload) {
  try {
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
window.addEventListener('load', () => {
  const now = (performance && performance.now) ? performance.now() : Date.now();
  logMetric('boot', { firstPaint_ms: Math.round(now - _bootT0) });
});
let save, load;
let firebaseDb;

if (!USE_MOCK) {
  const cfg = firebaseConfig;
  const app  = (getApps().length ? getApp() : initializeApp(cfg));
  const db   = getDatabase(app);
  firebaseDb = db;



  save = async (k, v) => {
    if (!navigator.onLine) {
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





setStartBalance(null);
setStartDate(null);
setStartSet(false);
setBootHydrated(false);
const $=id=>document.getElementById(id);
const tbody=document.querySelector('#dailyTable tbody'),wrapperEl=document.querySelector('.wrapper'),headerEl=document.querySelector('.app-header'),txModalTitle=document.querySelector('#txModal h2');let wrapperScrollAnimation=null,wrapperScrollTop=0,wrapperTodayAnchor=null,stickyMonthVisible=false,stickyMonthLabel='',stickyHeightGuess=52;

let recalculateHeaderOffset = () => {}; // default no-op
try {
  const stickyHeaderAPI = initStickyHeader({
    wrapperEl,
    headerEl,
    getViewYear: () => VIEW_YEAR,
    scheduleAfterKeyboard,
  });
  if (stickyHeaderAPI && typeof stickyHeaderAPI.recalculateHeaderOffset === 'function') {
    recalculateHeaderOffset = stickyHeaderAPI.recalculateHeaderOffset;
  }
} catch (_) {}



const showToast = (...args) => showToastHelper(...args);

const buildSaveToast = (tx) => buildSaveToastHelper(tx, {
  safeFmtCurrency,
  post: (iso, method) => post(iso, method),
  todayISO,
  documentRef: document
});

// Replace the inline syncStartInputFromState with a helper call. By binding
// state, inputRef and formatting functions here we avoid referring directly to
// module‑scoped variables within the helper.
const syncStartInputFromState = () =>
  syncStartInputFromStateHelper({ state, inputRef: startInputRef, safeFmtCurrency, documentRef: document });

// Create placeholders for functions that will be bound using helper factories.
// They are declared as 'let' so that they can be reassigned later once the
// relevant DOM elements and state have been initialised.
let refreshMethods = () => {};
let renderCardList = () => {};
let showCardModal = () => {};
let hideCardModal = () => {};
let togglePlanned = async () => {};
let performResetAllData = async () => {};
const renderPlannedModal = () => window.__gastos?.renderPlannedModal?.();
// Provide a safe table renderer that automatically retries on failure.
const safeRenderTable = createSafeRenderTable({ renderTable, showToast });

// Use the helper for grouping transactions by month. We wrap it in a function
// to supply dynamic dependencies such as the post date calculator.
const groupTransactionsByMonth = () =>
  groupTransactionsByMonthHelper({
    sortTransactions,
    getTransactions,
    transactions,
    post: (iso, method) => post(iso, method),
  });

// Placeholder for animateWrapperScroll, initialised to a no‑op. It will be
// rebound later with the proper scrolling context.
let animateWrapperScroll = (targetTop) => {
  console.log('PLACEHOLDER animateWrapperScroll called - NO ANIMATION!');
  if (!wrapperEl) return;
  if (wrapperScrollAnimation) return;
  wrapperEl.scrollTop = targetTop;
  wrapperTodayAnchor = targetTop;
};

// Placeholder for openEditFlow. The real implementation will be bound
// via createOpenEditFlow later in the startup sequence.
let openEditFlow;


if (!USE_MOCK) {
  // Build the realtime listener using a helper. The returned function encapsulates
  // the complex logic for subscribing to Firebase database changes and updating
  // local state. It receives accessors and mutators for mutable values such as
  // PATH, transactions and cards so that updates inside the helper reflect back
  // into this module.
  const startRealtime = createStartRealtime({
    getPath: () => PATH,
    setPath: (val) => { PATH = val; },
    cleanupProfileListeners,
    resetHydration: hydrationReset,
    firebaseDb,
    ref,
    get,
    scopedDbSegment,
    profileRef,
    registerHydrationTarget,
    hydrateStateFromCache,
    maybeCompleteHydration,
    subscribeState,
    getTransactions,
    setTransactions,
    transactionsRef: {
      get: () => transactions,
      set: (val) => { transactions = val; }
    },
    getCards: () => {
      try { return getCards(); } catch (_) { return cards; }
    },
    setCards,
    cardsRef: {
      get: () => cards,
      set: (val) => { cards = val; }
    },
    state,
    normalizeTransactionRecord,
    cacheGet,
    cacheSet,
    onValue,
    sanitizeTransactions,
    recomputePostDates,
    save,
    sortTransactions,
    renderTable,
    plannedModal,
    renderPlannedModal,
    fixPlannedAlignment,
    expandPlannedDayLabels,
    markHydrationTargetReady,
    setStartBalance,
    setStartDate,
    normalizeISODate,
    refreshMethodsFn: () => refreshMethods(),
    renderCardListFn: () => renderCardList(),
    initStart,
    load,
    completeHydration,
    recalculateHeaderOffset,
    syncStartInputFromState,
    ensureStartSetFromBalance,
    profileListenersRef: {
      get: () => profileListeners,
      set: (val) => { profileListeners = val; }
    }
  });
  startRealtimeFn = startRealtime;

  const readyUser = (window.Auth && window.Auth.currentUser) ? window.Auth.currentUser : null;
  if (readyUser) { 
    console.log('User already ready:', readyUser.email);
    PATH = resolvePathForUser(readyUser); 
    try { FirebaseSvc.setPath(PATH); } catch(_) {}
    startRealtimeFn && startRealtimeFn(); 
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
  hydrationReset();
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
  if (state.startDate == null && (state.startBalance === 0 || state.startBalance === '0')) {
    setStartBalance(null, { emit: false });
    try { cacheSet('startBal', null); } catch (_) {}
  }

  if (hasLiveTx && JSON.stringify(fixedTx) !== JSON.stringify(cacheGet('tx', []))) {
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
  const nextStartBal = normalizeStartBalance(liveBal);
  const currentStartBal = normalizeStartBalance(state.startBalance);
  if (nextStartBal !== currentStartBal) {
    setStartBalance(nextStartBal, { emit: false });
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

/**
 * Toggle the visibility of the transaction modal.
 */
function toggleTxModal(){
  const isOpening=txModal.classList.contains('hidden');
  if(isOpening){
    if(typeof window!=='undefined'&&typeof window.__unlockKeyboardGap==='function'){
      try{window.__unlockKeyboardGap();}catch(_){}
    }
    // Only reset modal if not in editing mode
    const g = window.__gastos;
    if(!isEditing && !g?.isEditing){resetTxModal();}
  }
  txModal.classList.toggle('hidden');
  if(openTxBtn)openTxBtn.style.transform=isOpening?'rotate(45deg)':'rotate(0deg)';
  const g = window.__gastos;
  if(isOpening && !isEditing && !g?.isEditing)focusValueField();
  
  // Update modal state with iOS scroll fix
  if(!isOpening){
    updateModalOpenState();
    // Simple iOS Safari scroll unlock gambiarra
    if(/iPhone|iPad|iPod/i.test(navigator.userAgent)){
      setTimeout(() => {
        const wrapper = document.querySelector('.wrapper');
        if(wrapper && wrapper.scrollTop !== undefined){
          // Micro nudge to wake up Safari scroll system
          const scroll = wrapper.scrollTop;
          wrapper.scrollTo(0, scroll + 0.1);
          wrapper.scrollTo(0, scroll);
        }
      }, 50);
    }
    isEditing=null;
    pendingEditMode=null;
    pendingEditTxId=null;
    pendingEditTxIso=null;
    if(typeof window!=='undefined'&&typeof window.__unlockKeyboardGap==='function'){
      try{window.__unlockKeyboardGap();}catch(_){}
    }
  } else {
    updateModalOpenState();
  }
}


if(openTxBtn)openTxBtn.onclick=()=>{
  isEditing=null;pendingEditMode=null;pendingEditTxId=null;pendingEditTxIso=null;
  if(txModal&&txModal.classList.contains('hidden')){resetTxModal();}
  toggleTxModal();
  focusValueField();
};

if(closeTxModal)closeTxModal.onclick=toggleTxModal;if(txModal)txModal.onclick=e=>{if(e.target===txModal)toggleTxModal();};
// Bottom pill navigation and scroll/home/settings interactions are wired up in uiEventHandlers.js

// Settings modal interactions are wired up via uiEventHandlers.js

const currency=v=>safeFmtCurrency(v),meses=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'],SALARY_WORDS=['salário','salario','provento','rendimento','pagamento','paycheck','salary'],mobile=()=>window.innerWidth<=480,fmt=d=>{const date=d instanceof Date?d:new Date(d);return date.toLocaleDateString('pt-BR',mobile()?{day:'2-digit',month:'2-digit'}:{day:'2-digit',month:'2-digit',year:'numeric'});};





const desc=$('desc'),val=$('value'),met=$('method'),date=$('opDate'),addBtn=$('addBtn');if(addBtn&&!addBtn.dataset.toastSaveHook){addBtn.dataset.toastSaveHook='1';addBtn.addEventListener('click',()=>{const label=(addBtn.textContent||'').toLowerCase();if(!label.includes('adicion'))return;setTimeout(()=>{if(!Array.isArray(transactions)||!transactions.length)return;let latest=null;for(const t of transactions){if(!latest||(t.ts||'')>(latest.ts||''))latest=t;}if(!latest)return;try{showToast(buildSaveToast(latest),'success');}catch(_){}} ,0);},{capture:true});}
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

const recurrence=$('recurrence'),parcelasBlock=$('parcelasBlock'),installments=$('installments'),invoiceParcelCheckbox=document.getElementById('invoiceParcel'),invoiceParcelRow=document.getElementById('invoiceParcelRow');let isEditing=null;

const notify=(msg,type='error')=>{const t=document.getElementById('toast');if(!t)return;t.textContent=msg;t.style.setProperty('--icon',type==='error'?'\u2715':'\u2713');t.classList.remove('success','error');t.classList.add(type);void t.offsetWidth;t.classList.add('show');setTimeout(()=>{t.classList.remove('show');},5000);};

let makeLine=null,addTx=null;if(typeof window!=='undefined')window.addTx=addTx;

window.__gastos={txModal,toggleTxModal,desc,val,safeFmtNumber,safeFmtCurrency,safeParseCurrency,date,hiddenSelect:document.getElementById('method'),methodButtons:document.querySelectorAll('.switch-option'),invoiceParcelRow:document.getElementById('invoiceParcel'),invoiceParcelCheckbox:document.getElementById('invoiceParcel'),installments,parcelasBlock,recurrence,txModalTitle,addBtn,todayISO,isEditing,pendingEditMode,pendingEditTxIso,pendingEditTxId,isPayInvoiceMode,pendingInvoiceCtx,transactions,getTransactions,setTransactions,addTransaction,sameId,post,save,load,renderTable,safeRenderTable,showToast,notify,askMoveToToday,askConfirmLogout,askConfirmReset,plannedModal,openPlannedBtn,closePlannedModal,plannedList,updateModalOpenState,makeLine,initSwipe,deleteRecurrenceModal,closeDeleteRecurrenceModal,deleteSingleBtn,deleteFutureBtn,deleteAllBtn,cancelDeleteRecurrence,editRecurrenceModal,closeEditRecurrenceModal,cancelEditRecurrence,editSingleBtn,editFutureBtn,editAllBtn,pendingDeleteTxId,pendingDeleteTxIso,pendingEditTxId,pendingEditTxIso,pendingEditMode,reopenPlannedAfterEdit,removeTransaction,renderPlannedModal,renderCardSelectorHelper,wrapperEl,stickyHeightGuess,animateWrapperScroll,hydrateStateFromCache,performResetAllData,yearSelectorApi,getViewYear:()=>VIEW_YEAR,addTx:null};

window.performResetAllData = performResetAllData;
window.safeRenderTable = safeRenderTable;
window.refreshMethods = refreshMethods;
window.renderCardList = renderCardList;
window.initStart = initStart;
window.ensureStartSetFromBalance = ensureStartSetFromBalance;
window.askConfirmLogout = askConfirmLogout;
window.askConfirmReset = askConfirmReset;

try {
  const offlineApi = initOfflineQueue({
    cacheGet,
    cacheSet,
    save,
    state,
    getTransactions,
    setTransactions,
    cards,
    renderTable,
    showToast,
    USE_MOCK
  });
  updatePendingBadge   = offlineApi.updatePendingBadge;
  markDirty            = offlineApi.markDirty;
  scheduleBgSync       = offlineApi.scheduleBgSync;
  tryFlushWithBackoff  = offlineApi.tryFlushWithBackoff;
  queueTx              = offlineApi.queueTx;
  flushQueue           = offlineApi.flushQueue;
} catch (e) { console.error('initOfflineQueue failed', e); }

setupInvoiceHandlers();

setupPlannedModal();
setupRecurrenceHandlers();

setupEditTransaction();

parcelasBlock.classList.add('hidden');
installments.value = '1';
installments.disabled = true;
recurrence.onchange = () => {
  if (recurrence.value !== '') installments.value = '1';
};
const cardName=$('cardName'),cardClose=$('cardClose'),cardDue=$('cardDue'),addCardBtn=$('addCardBtn'),cardList=$('cardList');
const startGroup=$('startGroup'),startInput=$('startInput'),setStartBtn=$('setStartBtn'),resetBtn=$('resetData');
if (startInput) startInputRef = startInput;


function ensureStartSetFromBalance(o={}){const{persist=true,refresh=true}=o;if(state.startSet===true||state.startBalance==null||Number.isNaN(Number(state.startBalance)))return;state.startSet=true;try{cacheSet('startSet',true);}catch(_){ }if(persist&&typeof save==='function'&&PATH){Promise.resolve().then(()=>save('startSet',true)).catch(()=>{});}if(refresh){try{initStart();}catch(_){}}}


if(resetBtn){resetBtn.hidden=false;resetBtn.style.display='';resetBtn.addEventListener('click',()=>performResetAllData(true));}
if(startInput){startInput.addEventListener('input',()=>{const digits=startInput.value.replace(/\D/g,'');if(!digits){startInput.value='';return;}const numberValue=parseInt(digits,10)/100;startInput.value=safeFmtCurrency(numberValue);});}
const startContainer=document.querySelector('.start-container'),dividerSaldo=document.getElementById('dividerSaldo');



// Bind openEditFlow using the editFlow helper. The returned function
// utilises getters/setters to interact with state and DOM elements
// defined in this module. This must occur before initTransactionLine
// is called so that the transaction line helpers receive a valid
// openEditFlow implementation.
try {
  openEditFlow = createOpenEditFlow({
    transactionsRef: {
      get: () => {
        try { return getTransactions ? getTransactions() : transactions; }
        catch { return transactions; }
      },
      set: (val) => { transactions = val; }
    },
    occursOn,
    plannedModal,
    editRecurrenceModal,
    updateModalOpenState,
    reopenPlannedAfterEditRef: {
      get: () => reopenPlannedAfterEdit,
      set: (val) => { reopenPlannedAfterEdit = val; }
    },
    pendingEditModeRef: {
      get: () => pendingEditMode,
      set: (val) => { pendingEditMode = val; }
    },
    pendingEditTxIdRef: {
      get: () => pendingEditTxId,
      set: (val) => { pendingEditTxId = val; }
    },
    pendingEditTxIsoRef: {
      get: () => pendingEditTxIso,
      set: (val) => { pendingEditTxIso = val; }
    },
    isDetachedOccurrence,
    editTx: (id) => {
      const g = typeof window !== 'undefined' ? window.__gastos : undefined;
      if (g && typeof g.editTx === 'function') {
        return g.editTx(id);
      }
    }
  });
} catch (err) {
  console.error('Failed to bind openEditFlow via editFlowHelper:', err);
}



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
window.__gastos.makeLine = makeLine;

const openCardBtn=document.getElementById('openCardModal');
const cardModal=document.getElementById('cardModal');
const closeCardModal=document.getElementById('closeCardModal');

try { runBootstrap(); } catch (e) { console.warn('runBootstrap failed to start', e); }

// After the bootstrap completes, initialise helper-based implementations for
// various routines that were previously defined inline in this file. These
// assignments rebind the placeholders declared earlier (refreshMethods,
// renderCardList, showCardModal, hideCardModal, togglePlanned,
// performResetAllData, animateWrapperScroll) to concrete implementations
// using the extracted helpers. Wrapping in a try/catch prevents errors
// here from derailing application startup.
try {
  refreshMethods = createRefreshMethods({
    cardRefreshMethods,
    met,
    cards
  });
  renderCardList = createRenderCardList({
    cardRenderList,
    cards,
    cardModal,
    cardList,
    initSwipe,
    getTransactions,
    setTransactions,
    transactions,
    save,
    refreshMethods,
    met,
    post: (iso, method) => post(iso, method)
  });
  showCardModal = createShowCardModal({
    cardModal,
    updateModalOpenState,
    renderCardList
  });
  hideCardModal = createHideCardModal({
    cardModal,
    updateModalOpenState
  });
  togglePlanned = createTogglePlanned({
    transactions,
    sameId,
    plannedModal,
    askMoveToToday,
    getTransactions,
    setTransactions,
    post: (iso, method) => post(iso, method),
    todayISO,
    save,
    renderTable,
    renderPlannedModal,
    notify
  });
  performResetAllData = createPerformResetAllData({
    setTransactions,
    setCards,
    state,
    cacheSet,
    getTransactions,
    getCards,
    save,
    refreshMethods: () => refreshMethods(),
    renderCardList: () => renderCardList(),
    initStart,
    renderTable,
    showToast,
    syncStartInputFromState
  });
  // Expose the new reset routine globally so existing code can invoke it.
  try { window.performResetAllData = performResetAllData; } catch (_) {}
  // Create a floating reset button via the helper.
  createFloatingResetButton({ performResetAllData });
  
  // Add card modal functions to window.__gastos after they're created
  try { 
    window.__gastos.showCardModal = showCardModal;
    window.__gastos.hideCardModal = hideCardModal;
  } catch (_) {}
  // Rebind the scroll animation helper. Use getters/setters so that
  // assignments inside the helper update module‑level variables.
  console.log('Rebinding animateWrapperScroll function');
  animateWrapperScroll = createAnimateWrapperScroll({
    wrapperEl,
    get wrapperScrollAnimation() { return wrapperScrollAnimation; },
    set wrapperScrollAnimation(val) { wrapperScrollAnimation = val; },
    get wrapperTodayAnchor() { return wrapperTodayAnchor; },
    set wrapperTodayAnchor(val) { wrapperTodayAnchor = val; },
  });
  console.log('animateWrapperScroll rebound:', typeof animateWrapperScroll);
  // CRITICAL: Update the global context to use the new animated function
  if (window.__gastos) {
    window.__gastos.animateWrapperScroll = animateWrapperScroll;
    console.log('Updated window.__gastos.animateWrapperScroll to animated version');
  }
} catch (err) {
  console.error('Helper binding failed:', err);
}

function isDetachedOccurrence(tx){return !tx.recurrence&&!!tx.parentId;}


function addCard(){const n=cardName.value.trim(),cl=+cardClose.value,du=+cardDue.value;if(!n||cl<1||cl>31||du<1||du>31||cl>=du||cards.some(c=>c.name===n)){alert('Dados inválidos');return;}cards.push({name:n,close:cl,due:du});cacheSet('cards', cards);save('cards',cards);refreshMethods();renderCardList();cardName.value='';cardClose.value='';cardDue.value='';}


function openPayInvoiceModal(cardName,dueISO,remaining,totalAbs,adjustedBefore){return openPayInvoiceModalMod(cardName,dueISO,remaining,totalAbs,adjustedBefore);}


addTx=async()=>addTxMod();
if (typeof window !== 'undefined') window.addTx = addTx;
// Update the global context with the real addTx function
if (window.__gastos) window.__gastos.addTx = addTx;
// Removed unused transaction form helper stubs (collectTxFormData, buildTransaction, finalizeTransaction, resetTxForm)


function delTx(id,iso){const g=typeof window!=='undefined'?window.__gastos:undefined;if(g&&typeof g.delTx==='function')return g.delTx(id,iso);}

function closeDeleteModal(){const g=typeof window!=='undefined'?window.__gastos:undefined;if(g&&typeof g.closeDeleteModal==='function')return g.closeDeleteModal();}



function findMasterRuleFor(tx,iso){const g=typeof window!=='undefined'?window.__gastos:undefined;if(g&&typeof g.findMasterRuleFor==='function')return g.findMasterRuleFor(tx,iso);return null;}


function closeEditModal(){editRecurrenceModal.classList.add('hidden');updateModalOpenState();if(reopenPlannedAfterEdit&&plannedModal){reopenPlannedAfterEdit=false;window.__gastos?.renderPlannedModal?.();plannedModal.classList.remove('hidden');updateModalOpenState();}}
if(closeEditRecurrenceModal)closeEditRecurrenceModal.onclick=closeEditModal;
if(cancelEditRecurrence)cancelEditRecurrence.onclick=closeEditModal;
if(editRecurrenceModal)editRecurrenceModal.onclick=e=>{if(e.target===editRecurrenceModal)closeEditModal();};
if(editSingleBtn)editSingleBtn.onclick=()=>{pendingEditMode='single';closeEditModal();editTx(pendingEditTxId);};
if(editFutureBtn)editFutureBtn.onclick=()=>{pendingEditMode='future';closeEditModal();editTx(pendingEditTxId);};
if(editAllBtn)editAllBtn.onclick=()=>{pendingEditMode='all';closeEditModal();editTx(pendingEditTxId);};
const editTx=id=>{const g=typeof window!=='undefined'?window.__gastos:undefined;if(g&&typeof g.editTx==='function')return g.editTx(id);};

document.addEventListener('click',e=>{const editEl=e.target.closest('.icon-edit,[data-action="edit"]');if(!editEl)return;const container=editEl.closest('.op-item,.op-line,.swipe-wrapper')||document;const txEl=container.querySelector('[data-tx-id]');const id=txEl?Number(txEl.dataset.txId):null;if(!id)return;const txs=getTransactions?getTransactions():transactions;const t=txs.find(x=>x.id===id);if(!t)return;pendingEditTxId=id;pendingEditTxIso=t.opDate;if(t.recurrence||t.parentId){editRecurrenceModal.classList.remove('hidden');}else{editTx(id);}e.preventDefault();e.stopPropagation();});

function renderTable(){
  const hydrating=isHydrating();
  console.log('renderTable: starting, isHydrating =', hydrating);
  clearTableContent();
  const acc=document.getElementById('accordion');
  
  // Atualizar flag de skeleton antes de reconstruir o DOM para evitar inserir placeholders quando já temos dados reais.
  if(hydrating){
    console.log('renderTable: hydrating, ensuring skeleton state');
    if(acc) acc.dataset.state='skeleton';
  } else {
    console.log('renderTable: NOT hydrating, clearing skeleton state before render if needed');
    if(acc && acc.dataset.state){
      console.log('renderTable: removing stale skeleton state before render, previous value:', acc.dataset.state);
      delete acc.dataset.state;
    }
  }
  
  const groups=groupTransactionsByMonth();
  renderTransactionGroups(groups);
  
  if(hydrating){
    console.log('renderTable: still hydrating after render, skeleton state remains');
  }
  
  setTimeout(()=>{
    try{
      if(typeof recalculateHeaderOffset==='function') recalculateHeaderOffset();
    } catch(_) {}
  }, 100);
}


function clearTableContent(){if(typeof tbody!=='undefined'&&tbody)tbody.innerHTML='';}


function renderTransactionGroups(groups){accordionApi.renderAccordion();}



const { txByDate, calculateDateRange } = initTxUtils({
  cards,
  getTransactions,
  transactions,
  post,
  occursOn,
  todayISO,
  VIEW_YEAR,
  getViewYear: () => VIEW_YEAR
});

const accordionApi = initAccordion({
  acc: document.getElementById('accordion'),
  getTransactions,
  transactions,
  cards,
  state,
  calculateDateRange,
  VIEW_YEAR,
  getViewYear: () => VIEW_YEAR,
  txByDate,
  safeFmtCurrency,
  SALARY_WORDS,
  makeLine,
});

// Renderizar o accordion imediatamente (com shimmer nos valores durante hidratação)
renderTable();



const YEAR_SELECTOR_MIN = 1990;
const YEAR_SELECTOR_MAX = 3000;

// Unused yearSelector and accordion wrapper functions removed; call yearSelectorApi.* or accordionApi.* directly


function initStart(){const g=typeof window!=='undefined'?window.__gastos:undefined;if(g&&typeof g.initStart==='function')return g.initStart();}

setupServiceWorker({ USE_MOCK, flushQueue });

initSwipe(document.body, '.swipe-wrapper', '.swipe-actions', '.op-line', 'opsSwipeInit');
if (cardList) initSwipe(cardList, '.swipe-wrapper', '.swipe-actions', '.card-line', 'cardsSwipeInit');
initSwipe(document.body, '.swipe-wrapper', '.swipe-actions', '.invoice-header-line', 'invoiceSwipeInit');

yearSelectorApi.updateYearTitle();
initKeyboardAndScrollHandlers();

// Wire up UI event handlers using the extracted module. Only pass
// references that should be managed by the helper; omit others
// (e.g., openTxBtn) so that existing logic remains unaffected.
try {
  setupMainEventHandlers({
    headerSeg,
    openPlannedBtn,
    yearSelector,
    yearSelectorApi,
    closeYearModalBtn,
    yearModal,
    bottomPill,
    renderPlannedModal,
    fixPlannedAlignment,
    expandPlannedDayLabels,
    plannedModal,
    plannedBox,
    plannedList,
    openTxBtn: null,
    closeTxModal: null,
    txModal: null,
    toggleTxModal: null,
    homeBtn,
    scrollTodayIntoView,
    openSettings,
    closeSettings,
    settingsModalEl,
    closeSettingsModalBtn,
    updateModalOpenState,
  });
} catch (err) {
  console.error('Failed to setup main event handlers:', err);
}
