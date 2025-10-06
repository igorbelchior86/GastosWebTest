// =======================================================
// Transactions Utility Functions
// Refatoradas a partir de main.js
// =======================================================

import { getTransactions, setTransactions } from "../state/app-state.js";

// Pure utility: sort an array of transactions and return a new sorted array.
// If `txs` is omitted, operate on `getTransactions()` for backward compatibility
export function sortTransactions(txs) {
  const source = Array.isArray(txs)
    ? txs.slice()
    : (typeof getTransactions === 'function' ? (getTransactions() || []).slice() : (window.transactions || []).slice());

  const sorted = source.sort((a, b) => {
    const d = (a.opDate || '').localeCompare(b.opDate || '');
    if (d !== 0) return d;
    return (a.ts || '').localeCompare(b.ts || '');
  });

  // If caller didn't provide txs (backward compatibility), persist result
  if (!Array.isArray(txs)) {
    try { setTransactions(sorted); } catch (_) {}
    if (window.transactions) window.transactions = sorted;
  }
  return sorted;
}

// Pure utility: sanitize a list of transactions (normalize minimal issues)
// Returns an object { list, changed } when called in the legacy style
export function sanitizeTransactions(list) {
  // If list is omitted, run full legacy sanitizer against current state and
  // return { list, changed } for compatibility with main.js callers.
  if (!Array.isArray(list)) {
    const current = (typeof getTransactions === 'function' ? getTransactions() || [] : window.transactions || []).slice();
    // replicate legacy behavior (ensure opDate/postDate/planned)
    let changed = false;
    const out = current.map((t) => {
      if (!t) return t;
      const nt = { ...t };
      if (!nt.opDate) {
        if (nt.ts) {
          try { nt.opDate = new Date(nt.ts).toISOString().slice(0, 10); } catch { nt.opDate = (new Date()).toISOString().slice(0,10); }
        } else {
          nt.opDate = (new Date()).toISOString().slice(0,10);
        }
        changed = true;
      }
      if (!nt.postDate) {
        try { nt.postDate = nt.opDate; } catch { nt.postDate = nt.opDate; }
        changed = true;
      }
      if (typeof nt.planned === 'undefined' && nt.opDate) {
        nt.planned = nt.opDate > (new Date()).toISOString().slice(0,10);
        changed = true;
      }
      return nt;
    });
    return { list: out, changed };
  }

  // Pure branch: dedupe by id and return array
  const unique = new Map();
  list.forEach((tx) => {
    if (!tx || !tx.id) return;
    unique.set(tx.id, tx);
  });
  return Array.from(unique.values());
}

// Group transactions by month (pure). If `txs` omitted, uses current snapshot.
export function groupTransactionsByMonth(txs) {
  const source = Array.isArray(txs) ? txs : (typeof getTransactions === 'function' ? (getTransactions() || []) : (window.transactions || []));
  const grouped = {};
  source.forEach((tx) => {
    const month = (tx && tx.postDate ? tx.postDate.substring(0,7) : (tx && tx.opDate ? tx.opDate.substring(0,7) : 'unknown')) || 'unknown';
    if (!grouped[month]) grouped[month] = [];
    grouped[month].push(tx);
  });
  return grouped;
}
