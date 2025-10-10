/**
 * Provides a helper to scroll the current day into view. The logic was
 * originally part of main.js but has been extracted here to reduce its
 * footprint. The function relies on state and helpers exposed via
 * `window.__gastos` to avoid passing a long parameter list. Before using
 * this function, ensure that the necessary properties are available on
 * the global object (see main.js for details).
 */
export function scrollTodayIntoView() {
  const g = typeof window !== 'undefined' ? window.__gastos || {} : {};
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
    const wrap = wrapperEl;
    if (!wrap) return;
    let dayEl = document.querySelector(`details.day[data-key="d-${iso}"]`);
    if (!dayEl) {
      showToast('Dia atual não encontrado', 'error');
      return;
    }
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
        const gap = 16;
        const targetOffset = headerHeight + stickyHeight + gap;
        const wrapRect = wrap.getBoundingClientRect();
        const dayRect = dayEl.getBoundingClientRect();
        const currentRelativeTop = dayRect.top - wrapRect.top;
        if (Math.abs(currentRelativeTop - targetOffset) < 2 && wrapperScrollAnimation === null) {
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
        animateWrapperScroll(targetTop);
      } catch (err) {
        console.error('scrollTodayIntoView compute failed', err);
      }
    });
  } catch (err) {
    console.error('scrollTodayIntoView failed', err);
  }
}