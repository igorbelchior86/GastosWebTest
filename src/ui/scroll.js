/**
 * Provides a helper to scroll the current day into view. The logic was
 * originally part of main.js but has been extracted here to reduce its
 * footprint. The function relies on state and helpers exposed via
 * `window.__gastos` to avoid passing a long parameter list. Before using
 * this function, ensure that the necessary properties are available on
 * the global object (see main.js for details).
 */
export function scrollTodayIntoView() {
  console.log('scrollTodayIntoView called');
  const g = typeof window !== 'undefined' ? window.__gastos || {} : {};
  console.log('window.__gastos:', g);
  const todayISO = g.todayISO || (() => {
    // fallback: ISO date for today
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });
  const wrapperEl = g.wrapperEl;
  if (!wrapperEl) return;
  const animateWrapperScroll = g.animateWrapperScroll || (() => {});
  let { wrapperScrollAnimation, wrapperTodayAnchor, stickyHeightGuess } = g;
  const showToast = g.showToast || (() => {});
  try {
    const iso = typeof todayISO === 'function' ? todayISO() : todayISO;
    const targetYear = Number.parseInt(String(iso).slice(0, 4), 10);
    const getRetryCount = () => {
      const v = g && typeof g.__scrollTodayRetry === 'number' ? g.__scrollTodayRetry : 0;
      return Number.isFinite(v) ? v : 0;
    };
    const markRetry = () => {
      if (!g) return 0;
      const next = getRetryCount() + 1;
      g.__scrollTodayRetry = next;
      return next;
    };
    const resetRetry = () => {
      if (g) g.__scrollTodayRetry = 0;
    };
    const wrap = wrapperEl;
    if (!wrap) return;
    let dayEl = document.querySelector(`details.day[data-key="d-${iso}"]`);
    if (!dayEl) {
      const selector = g.yearSelectorApi;
      const currentYear = typeof g.getViewYear === 'function'
        ? g.getViewYear()
        : (selector && typeof selector.getViewYear === 'function' ? selector.getViewYear() : null);
      const canSwitchYear = selector && typeof selector.selectYear === 'function';
      const retryCount = getRetryCount();
      if (
        canSwitchYear &&
        Number.isFinite(targetYear) &&
        currentYear !== targetYear &&
        retryCount < 2
      ) {
        markRetry();
        selector.selectYear(targetYear);
        requestAnimationFrame(() => {
          scrollTodayIntoView();
        });
        return;
      }
      resetRetry();
      showToast('Dia atual não encontrado', 'error');
      return;
    }
    resetRetry();
    const monthEl = dayEl.closest('details.month');
    if (monthEl && !monthEl.open) {
      monthEl.open = true;
      requestAnimationFrame(() => scrollTodayIntoView());
      return;
    }
    if (dayEl.open) {
      dayEl.open = false;
      requestAnimationFrame(() => scrollTodayIntoView());
      return;
    }
    if (wrapperScrollAnimation) return;
    requestAnimationFrame(() => {
      try {
        const header = document.querySelector('.app-header');
        const headerHeight = header ? header.offsetHeight || 0 : 0;
        const sticky = document.querySelector('.sticky-month');
        if (sticky) {
          const measured = sticky.offsetHeight || stickyHeightGuess || 0;
          if (measured > 0) stickyHeightGuess = measured;
        }
        const stickyHeight = stickyHeightGuess || 0;
        // Reserve space for a floating footer if defined via CSS custom property
        const footerReserve = parseInt(
          getComputedStyle(document.documentElement).getPropertyValue('--floating-footer-height') || '0',
          10
        );
        // Simple fixed offset approach - no complex calculations
        const isIOSSafari = /iPhone|iPad|iPod/i.test(navigator.userAgent) && /Safari/i.test(navigator.userAgent) && !/Chrome|CriOS|FxiOS|EdgiOS/i.test(navigator.userAgent);
        
        let gap;
        
        if (isIOSSafari) {
          // Fixed pixel distance from sticky header for iOS Safari
          // Adjust this value to get perfect positioning:
          // - Increase = further from header (more gap)  
          // - Decrease = closer to header (less gap)
          gap = 20; // Current: 20px from sticky header
          console.log('iOS Safari: Using fixed offset -', gap + 'px from sticky header');
        } else {
          // Standard gap for other browsers  
          gap = 16;
        }
        
        const targetOffset = headerHeight + stickyHeight + gap;
        const wrapRect = wrap.getBoundingClientRect();
        const dayRect = dayEl.getBoundingClientRect();
        const currentRelativeTop = dayRect.top - wrapRect.top;
        
        // More lenient tolerance for iOS Safari due to sub-pixel positioning differences
        const tolerance = isIOSSafari ? 5 : 2;
        
        if (Math.abs(currentRelativeTop - targetOffset) < tolerance && wrapperScrollAnimation === null) {
          return;
        }
        const delta = currentRelativeTop - targetOffset;
        const maxScroll = Math.max(0, wrap.scrollHeight - wrap.clientHeight);
        let targetTop = (wrap.scrollTop || 0) + delta;
        targetTop = Math.max(0, Math.min(targetTop, Math.max(0, maxScroll - footerReserve)));
        if (
          wrapperTodayAnchor != null &&
          Math.abs(wrapperTodayAnchor - targetTop) < 2 &&
          !wrapperScrollAnimation
        ) {
          return;
        }
        // Debug logging for position analysis
        console.log('Scroll positioning:', {
          browser: isIOSSafari ? 'iOS Safari' : 'Other',
          headerHeight,
          stickyHeight, 
          gap,
          targetOffset,
          finalPosition: `${gap}px from sticky header`
        });
        
        console.log('About to call animateWrapperScroll with targetTop:', targetTop, 'animateWrapperScroll type:', typeof animateWrapperScroll);
        animateWrapperScroll(targetTop);
      } catch (err) {
        console.error('scrollTodayIntoView compute failed', err);
      }
    });
  } catch (err) {
    console.error('scrollTodayIntoView failed', err);
  }
}
