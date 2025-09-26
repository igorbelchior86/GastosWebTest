// Lightweight Firebase service wrapper for GastosWebTest
// Provides init, mock mode, simple load/save and realtime listener helpers.
// This is intentionally small and defensive to allow incremental migration from main.js.

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getDatabase, ref, set, get, onValue } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";
import { scopedDbSegment } from "../utils/profile-utils.js";

let firebaseApp = null;
let firebaseDb = null;
let PATH = null; // workspace path (set by consumer after auth)
let useMock = false;

// Simple localStorage-backed mock helpers
async function mockLoad(key, defaultValue) {
  try {
    const storeKey = `${PATH || 'mock'}_${key}`;
    const raw = localStorage.getItem(storeKey);
    return raw != null ? JSON.parse(raw) : defaultValue;
  } catch (_) { return defaultValue; }
}

async function mockSave(key, value) {
  try {
    const storeKey = `${PATH || 'mock'}_${key}`;
    localStorage.setItem(storeKey, JSON.stringify(value));
  } catch (_) {}
}

/**
 * Initialize Firebase if not already initialized.
 * idempotent.
 */
export async function init(config) {
  try {
    if (!config && getApps().length) {
      firebaseApp = getApp();
    } else if (config) {
      firebaseApp = (getApps().length ? getApp() : initializeApp(config));
    }
    if (firebaseApp) {
      firebaseDb = getDatabase(firebaseApp);
    }
  } catch (err) {
    console.error('Firebase init failed', err);
    throw err;
  }
}

export function setPath(p) {
  PATH = p;
}

export function setMockMode(enabled = true) {
  useMock = !!enabled;
}

/**
 * Load a key from remote or mock persistence. Default value returned if missing.
 */
export async function load(key, defaultValue = null) {
  if (useMock || !firebaseDb) return mockLoad(key, defaultValue);
  try {
    const remoteKey = scopedDbSegment(key);
    const s = await get(ref(firebaseDb, `${PATH}/${remoteKey}`));
    return s.exists() ? s.val() : defaultValue;
  } catch (err) {
    console.warn('firebase.load failed, falling back to mock', err);
    return mockLoad(key, defaultValue);
  }
}

/**
 * Save a key to remote or mock persistence.
 */
export async function save(key, value) {
  if (useMock || !firebaseDb) return mockSave(key, value);
  try {
    const remoteKey = scopedDbSegment(key);
    return set(ref(firebaseDb, `${PATH}/${remoteKey}`), value);
  } catch (err) {
    console.warn('firebase.save failed, will mark dirty', err);
    // For safety, persist locally
    await mockSave(key, value);
    throw err;
  }
}

/**
 * Create a database ref for a profile-scoped key. Returns null if DB not available.
 */
export function profileRef(key) {
  if (!firebaseDb || !PATH) return null;
  const segment = scopedDbSegment(key);
  return ref(firebaseDb, `${PATH}/${segment}`);
}

/**
 * Start realtime listeners for core keys.
 * handlers: { tx: fn, cards: fn, startBal: fn, startDate: fn, startSet: fn }
 * Returns a stop() function that removes all listeners.
 */
export async function startListeners(handlers = {}) {
  if (useMock || !firebaseDb) {
    // Nothing to attach in mock mode; consumer should use load() initially
    return () => {};
  }
  const subs = [];
  try {
    const keys = ['tx','cards','startBal','startDate','startSet'];
    for (const k of keys) {
      const h = handlers[k] || null;
      const r = profileRef(k);
      if (r && typeof h === 'function') {
        const unsub = onValue(r, (snap) => { try { h(snap); } catch (e) { console.error('handler error', e); } });
        if (typeof unsub === 'function') subs.push(unsub);
      }
    }
  } catch (err) { console.error('startListeners failed', err); }
  return () => { subs.forEach(u => { try { u(); } catch(_) {} }); };
}

// Dirty queue helpers (simple localStorage-backed queue)
function readDirty() {
  try { return JSON.parse(localStorage.getItem('dirtyQueue') || '[]'); } catch (_) { return []; }
}
function writeDirty(arr) {
  try { localStorage.setItem('dirtyQueue', JSON.stringify(arr || [])); } catch (_) {}
}

export function markDirty(kind) {
  const allowed = ['tx','cards','startBal','startSet'];
  if (!allowed.includes(kind)) return;
  const q = readDirty();
  if (!q.includes(kind)) q.push(kind);
  writeDirty(q);
}

export function getDirtyQueue() { return readDirty(); }

/**
 * Flush dirty queue by saving the listed collections.
 * This tries remote first and falls back to local persistence on error.
 */
export async function flushQueue() {
  const q = readDirty();
  if (!q.length) return;
  // optimistic clear
  writeDirty([]);
  try {
    for (const k of q) {
      const cached = await mockLoad(k, null);
      await save(k, cached);
    }
  } catch (err) {
    console.error('flushQueue failed', err);
    // restore flags
    const cur = readDirty();
    writeDirty([...new Set([...(q || []), ...(cur || [])])]);
    throw err;
  }
}

export async function scheduleBgSync() {
  try {
    if (useMock) return;
    if (!('serviceWorker' in navigator) || !('SyncManager' in window)) return;
    const reg = await navigator.serviceWorker.ready;
    await reg.sync.register('sync-tx');
  } catch (_) {}
}

// Expose for debugging
export const FirebaseSvc = {
  init,
  setPath,
  setMockMode,
  load,
  save,
  profileRef,
  startListeners,
  markDirty,
  getDirtyQueue,
  flushQueue,
  scheduleBgSync
};

if (typeof window !== 'undefined') window.FirebaseSvc = FirebaseSvc;
