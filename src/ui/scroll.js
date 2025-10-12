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
  
  // iOS Safari device-specific calibration cache
  const getDeviceCalibration = () => {
    try {
      const cached = localStorage.getItem('ios_scroll_calibration');
      return cached ? JSON.parse(cached) : null;
    } catch { return null; }
  };
  
  const saveDeviceCalibration = (adjustment) => {
    try {
      localStorage.setItem('ios_scroll_calibration', JSON.stringify({
        adjustment,
        timestamp: Date.now(),
        userAgent: navigator.userAgent
      }));
    } catch { /* ignore */ }
  };
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
        let gap = 16;
        
        // iOS Safari calibration - measure actual vs expected positioning
        const isIOSSafari = /iPhone|iPad|iPod/i.test(navigator.userAgent) && /Safari/i.test(navigator.userAgent) && !/Chrome|CriOS|FxiOS|EdgiOS/i.test(navigator.userAgent);
        
        if (isIOSSafari) {
          // Find a month header to use as reference measurement
          const monthEl = dayEl.closest('details.month');
          const monthSummary = monthEl?.querySelector('summary.month-divider');
          
          if (monthSummary) {
            const monthHeaderHeight = monthSummary.offsetHeight || 52;
            
            // Check for device-specific calibration
            const deviceCalibration = getDeviceCalibration();
            let adjustment = monthHeaderHeight; // Default: one month header
            
            if (deviceCalibration && deviceCalibration.adjustment) {
              // Use learned adjustment for this device
              adjustment = deviceCalibration.adjustment;
              console.log('Using cached iOS calibration:', adjustment);
            } else {
              // First-time calibration - try different adjustments
              const viewportHeight = window.innerHeight;
              const isCompactDevice = viewportHeight < 700; // iPhone SE, etc.
              
              if (isCompactDevice) {
                adjustment = monthHeaderHeight * 1.5; // More aggressive on smaller screens
              } else {
                adjustment = monthHeaderHeight * 1.2; // Standard adjustment
              }
              
              // Save this calibration for future use
              saveDeviceCalibration(adjustment);
              console.log('First-time iOS calibration saved:', adjustment);
            }
            
            // Apply the calibration
            gap = Math.max(4, gap - adjustment);
            
            console.log('iOS Safari scroll calibration:', {
              originalGap: 16,
              monthHeaderHeight,
              adjustment,
              adjustedGap: gap,
              viewportHeight: window.innerHeight
            });
          }
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
        if (isIOSSafari) {
          console.log('iOS Safari scroll debug:', {
            headerHeight,
            stickyHeight,
            gap,
            targetOffset,
            currentRelativeTop,
            delta,
            targetTop,
            tolerance
          });
        }
        
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
