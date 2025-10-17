import { cacheGet, cacheSet } from '../utils/cache.js';
import { scopedCacheKey } from '../utils/profile.js';

const BUDGET_STORAGE_KEY = 'budgets';
const VALID_STATUSES = new Set(['active', 'closed']);
const VALID_TYPES = new Set(['ad-hoc', 'recurring']);

let inMemoryCache = null;

function getScopedKey() {
  return scopedCacheKey(BUDGET_STORAGE_KEY);
}

function safeIsoDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);
  }
  return null;
}

function safeIsoDateTime(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) return trimmed;
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      return `${trimmed.slice(0, 10)}T00:00:00.000Z`;
    }
  }
  return null;
}

function normalizeNumber(value, fallback = 0) {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return numeric;
}

function normalizeString(value) {
  if (typeof value !== 'string') return '';
  return value.trim();
}

function normalizeBudget(rawBudget) {
  if (!rawBudget || typeof rawBudget !== 'object') return null;

  const id = normalizeString(rawBudget.id);
  const tag = normalizeString(rawBudget.tag);
  if (!id || !tag) return null;

  const status = VALID_STATUSES.has(rawBudget.status) ? rawBudget.status : 'active';
  const budgetType = VALID_TYPES.has(rawBudget.budgetType) ? rawBudget.budgetType : 'ad-hoc';
  const startDate = safeIsoDate(rawBudget.startDate);
  const endDate = safeIsoDate(rawBudget.endDate);
  const recurrenceId = normalizeString(rawBudget.recurrenceId) || null;
  const triggerTxId = normalizeString(rawBudget.triggerTxId) || null;
  const triggerTxIso = safeIsoDate(rawBudget.triggerTxIso);

  return {
    id,
    tag,
    budgetType,
    startDate,
    endDate,
    initialValue: normalizeNumber(rawBudget.initialValue),
    reservedValue: normalizeNumber(rawBudget.reservedValue),
    spentValue: normalizeNumber(rawBudget.spentValue),
    status,
    recurrenceId,
    lastUpdated: safeIsoDateTime(rawBudget.lastUpdated) || new Date().toISOString(),
    triggerTxId,
    triggerTxIso,
  };
}

function ensureCache(budgets) {
  inMemoryCache = Array.isArray(budgets) ? budgets.slice() : [];
  return inMemoryCache;
}

export function loadBudgets() {
  if (Array.isArray(inMemoryCache)) {
    return inMemoryCache.slice();
  }
  let stored = [];
  try {
    stored = cacheGet(BUDGET_STORAGE_KEY, []);
    if (!Array.isArray(stored)) stored = [];
  } catch {
    stored = [];
  }
  const normalized = stored
    .map(normalizeBudget)
    .filter(Boolean);
  return ensureCache(normalized).slice();
}

export function saveBudgets(nextBudgets) {
  const serialized = Array.isArray(nextBudgets)
    ? nextBudgets.map(normalizeBudget).filter(Boolean)
    : [];
  ensureCache(serialized);
  try {
    cacheSet(BUDGET_STORAGE_KEY, serialized);
  } catch {
    /* ignore storage errors */
  }
  return inMemoryCache.slice();
}

export function findActiveByTag(tag) {
  const target = normalizeString(tag);
  if (!target) return null;
  const budgets = loadBudgets();
  return budgets.find((budget) => budget.tag === target && budget.status === 'active') || null;
}

export function resetBudgetCache() {
  inMemoryCache = null;
}

export function getBudgetStorageKey() {
  return getScopedKey();
}
