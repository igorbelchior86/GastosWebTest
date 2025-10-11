/*
 * Keyboard and scroll behaviour helpers
 *
 * On iOS devices the virtual keyboard can cause layout issues by
 * resizing the viewport and leaving blank space below the page. This
 * module centralises the logic for detecting when modals are open,
 * preventing background scroll while a modal is active, and applying
 * workarounds for keyboard offsets. To use, import
 * `initKeyboardAndScrollHandlers` and invoke it once on page load.
 */

export function initKeyboardAndScrollHandlers() {
  // Determine whether any modal is currently open. A modal is
  // considered open if a `.bottom-modal` element exists without the
  // `hidden` class. This selector mirrors the usage in the original
  // implementation.
  function anyModalOpen() {
    return !!document.querySelector('.bottom-modal:not(.hidden)');
  }

  // Check if an element is inside a scrollable region within a modal.
  // If so, scroll events should propagate naturally within the modal
  // content rather than being blocked at the page level. This helper
  // examines ancestors up to the modal content container.
  function isInScrollableModal(el) {
    const content = el && el.closest ? el.closest('.bottom-modal .modal-content') : null;
    if (!content) return false;
    let node = el;
    while (node && node !== content.parentElement) {
      const style = window.getComputedStyle(node);
      const oy = style.overflowY;
      if ((oy === 'auto' || oy === 'scroll') && node.scrollHeight > node.clientHeight) {
        return true;
      }
      node = node.parentElement;
    }
    // fallback: treat .modal-content as scrollable if it overflows
    return content && content.scrollHeight > content.clientHeight;
  }

  // Track whether a modal was previously open to detect when one
  // closes. This is used to trigger a scroll state reset on iOS.
  let lastModalState = false;

  // When modals are closed on iOS Safari, the page can get stuck in
  // a weird scroll state. This function resets the scroll container
  // after a modal closes by toggling overflow styles.
  function resetScrollStateIfNeeded() {
    const currentModalState = anyModalOpen();
    if (lastModalState && !currentModalState) {
      // Modal was just closed - force scroll cleanup for Safari iOS
      if (/Safari/i.test(navigator.userAgent) && /iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        setTimeout(() => {
          const wrapper = document.querySelector('.wrapper');
          if (wrapper) {
            const currentScrollTop = wrapper.scrollTop;
            wrapper.style.overflow = 'hidden';
            wrapper.offsetHeight; // force reflow
            wrapper.style.overflow = 'auto';
            wrapper.scrollTop = currentScrollTop;
          }
        }, 50);
      }
    }
    lastModalState = currentModalState;
  }

  // Prevent background scrolling when a modal is open. Allow
  // scrolling inside modal content if the target is within a scrollable
  // container. Also reset scroll state as modals open/close.
  document.addEventListener('touchmove', (e) => {
    resetScrollStateIfNeeded();
    if (!anyModalOpen()) return;
    const target = e.target;
    if (isInScrollableModal(target)) return;
    e.preventDefault();
  }, { passive: false });

  document.addEventListener('wheel', (e) => {
    resetScrollStateIfNeeded();
    if (!anyModalOpen()) return;
    const target = e.target;
    if (isInScrollableModal(target)) return;
    e.preventDefault();
  }, { passive: false });

  // Atualiza a variável CSS `--viewport-height` com a altura visível
  // atual. Essa medida acompanha o `visualViewport` sempre que o
  // teclado aparece ou desaparece, sem aplicar transforms no `html`.
  const updateViewportHeight = () => {
    const height = window.visualViewport?.height || window.innerHeight;
    if (!height) return;
    const root = document.documentElement;
    if (!root) return;
    root.style.setProperty('--viewport-height', `${Math.round(height)}px`);
  };

  updateViewportHeight();
  window.addEventListener('resize', updateViewportHeight);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', updateViewportHeight);
    window.visualViewport.addEventListener('scroll', updateViewportHeight);
  }
}
