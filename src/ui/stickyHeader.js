/*
 * Sticky month header module
 *
 * This module encapsulates all logic related to the sticky month header
 * that appears at the top of the transaction list when scrolling.
 * It avoids closing over global state by accepting required DOM elements
 * and helpers via its configuration parameter.
 *
 * Usage:
 *   import { initStickyHeader } from './ui/stickyHeader.js';
 *   initStickyHeader({
 *     wrapperEl: document.querySelector('.wrapper'),
 *     headerEl: document.querySelector('.app-header'),
 *     getViewYear: () => VIEW_YEAR, // function returning the current view year
 *     scheduleAfterKeyboard, // helper that defers execution while a virtual keyboard is open
 *   });
 */

export function initStickyHeader({
  wrapperEl,
  headerEl,
  getViewYear,
  scheduleAfterKeyboard,
} = {}) {
  if (typeof document === 'undefined') return;
  // Default to no‑op functions if helpers are missing
  const getYear = typeof getViewYear === 'function' ? getViewYear : () => {
    // If no callback is provided, attempt to read from the first month divider
    const det = document.querySelector('details.month');
    if (det && det.dataset && det.dataset.key) {
      const parts = det.dataset.key.split('-');
      const yr = Number(parts[0]);
      if (!Number.isNaN(yr)) return yr;
    }
    const now = new Date();
    return now.getFullYear();
  };
  const defer = typeof scheduleAfterKeyboard === 'function' ? scheduleAfterKeyboard : (fn) => fn();

  // Internal state
  let stickyMonth = null;
  let stickyMonthVisible = false;
  let stickyMonthLabel = '';
  const STICKY_VISIBLE = 18;
  // Compute an initial header offset; will be recalculated on resize
  let HEADER_OFFSET = headerEl ? (headerEl.getBoundingClientRect().height || 58) : 58;

  // Create the sticky month element on demand
  function createStickyMonth() {
    if (stickyMonth) return;
    stickyMonth = document.createElement('div');
    stickyMonth.className = 'sticky-month';
    stickyMonth.style.top = (HEADER_OFFSET - STICKY_VISIBLE) + 'px';
    document.body.appendChild(stickyMonth);
  }

  // Recalculate header height and reposition the sticky header
  function recalculateHeaderOffset() {
    if (!headerEl) return;
    // Avoid recalculating while a virtual keyboard is open
    try {
      if (document.documentElement?.dataset?.vvKb === '1') {
        defer(recalculateHeaderOffset);
        return;
      }
    } catch (_) {}
    const h = headerEl.getBoundingClientRect().height;
    if (h > 30) {
      HEADER_OFFSET = h;
      if (!stickyMonth) createStickyMonth();
      if (stickyMonth) {
        stickyMonth.style.top = (HEADER_OFFSET - STICKY_VISIBLE) + 'px';
        updateStickyMonth();
      }
    }
  }

  // Update the sticky month label based on scroll position
  function updateStickyMonth() {
    if (!stickyMonth) return;
    let label = '';
    let lastDiv = null;
    const divs = document.querySelectorAll('summary.month-divider');
    divs.forEach((div) => {
      const rect = div.getBoundingClientRect();
      // pick the last divider whose top is above the header
      if (rect.top <= HEADER_OFFSET) {
        label = div.textContent.replace(/\s+/g, ' ').trim();
        lastDiv = div;
      }
    });
    if (label) {
      let monthText = '';
      try {
        if (lastDiv) {
          const det = lastDiv.closest('details.month');
          if (det && det.dataset && det.dataset.key) {
            const parts = det.dataset.key.split('-');
            const mIdx = Number(parts[1]);
            const yr = getYear();
            if (!Number.isNaN(mIdx)) {
              const dt = new Date(yr, mIdx, 1);
              monthText = dt.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
              if (monthText && monthText.length) monthText = monthText.charAt(0).toUpperCase() + monthText.slice(1);
            }
          }
        }
      } catch (_) {}
      // Fallback: use the first word from label if monthText is empty
      if (!monthText) monthText = label.split(/\s+/)[0];
      if (!stickyMonthVisible || stickyMonthLabel !== monthText) {
        stickyMonth.textContent = monthText;
        if (!stickyMonthVisible) stickyMonth.classList.add('visible');
        stickyMonthVisible = true;
        stickyMonthLabel = monthText;
      }
    } else if (stickyMonthVisible) {
      stickyMonth.classList.remove('visible');
      stickyMonthVisible = false;
      stickyMonthLabel = '';
    }
  }

  // Attach event listeners for scrolling and resizing
  function attachListeners() {
    if (typeof window === 'undefined') return;
    window.addEventListener('resize', recalculateHeaderOffset);
    if (wrapperEl) {
      wrapperEl.addEventListener('scroll', updateStickyMonth);
    } else {
      window.addEventListener('scroll', updateStickyMonth);
    }
    // Observe DOM changes to month dividers so header can recalc
    const observer = new MutationObserver(() => {
      const hasDividers = document.querySelectorAll('summary.month-divider').length > 0;
      if (hasDividers) {
        setTimeout(() => recalculateHeaderOffset(), 50);
      }
    });
    const target = wrapperEl || document.querySelector('#dailyTable tbody')?.parentElement || document.body;
    observer.observe(target, { childList: true, subtree: true });
  }

  // Initialise
  createStickyMonth();
  recalculateHeaderOffset();
  attachListeners();
  // Perform an initial update after DOM is ready
  setTimeout(updateStickyMonth, 0);
}