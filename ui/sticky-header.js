// ============================================================================
// 📌 STICKY HEADER MANAGER
// ============================================================================
// Sistema de sticky header extraído do main.js
// FASE 2 refatoração - componentes UI independentes

/**
 * Sticky Header Manager class
 * Manages a sticky month header that shows the current visible month
 * during scrolling (Safari/iOS doesn't support sticky <summary>)
 */
export class StickyHeaderManager {
  constructor(options = {}) {
    // Configuration
    this.headerSelector = options.headerSelector || '.app-header';
    this.monthDividerSelector = options.monthDividerSelector || 'summary.month-divider';
    this.stickyClassName = options.stickyClassName || 'sticky-month';
    this.visibleClassName = options.visibleClassName || 'visible';
    this.stickyVisibleOffset = options.stickyVisibleOffset || 18;
    this.wrapperSelector = options.wrapperSelector || null; // null = use window
    
    // State
    this.headerEl = null;
    this.wrapperEl = null;
    this.stickyElement = null;
    this.headerOffset = 58; // default
    this.isCreated = false;
    this.observer = null;
    
    // Bound methods to preserve context
    this.handleScroll = this.handleScroll.bind(this);
    this.handleResize = this.handleResize.bind(this);
    this.handleMutations = this.handleMutations.bind(this);
    
    this.init();
  }

  /**
   * Initialize the sticky header system
   */
  init() {
    this.headerEl = document.querySelector(this.headerSelector);
    this.wrapperEl = this.wrapperSelector ? document.querySelector(this.wrapperSelector) : null;
    
    this.calculateHeaderOffset();
    this.setupEventListeners();
    this.setupMutationObserver();
  }

  /**
   * Calculate header offset height
   */
  calculateHeaderOffset() {
    if (!this.headerEl) return;
    
    const height = this.headerEl.getBoundingClientRect().height;
    
    // Only create and position sticky when header has real height (> 30px)
    if (height > 30) {
      this.headerOffset = height;
      
      // Create sticky if it doesn't exist
      if (!this.stickyElement) {
        this.createStickyElement();
      }
      
      // Update position
      if (this.stickyElement) {
        this.updateStickyPosition();
        // Update sticky immediately after recalculating
        this.updateStickyContent();
      }
    }
  }

  /**
   * Create the sticky header element
   */
  createStickyElement() {
    if (this.isCreated) return; // Already created
    
    this.stickyElement = document.createElement('div');
    this.stickyElement.className = this.stickyClassName;
    this.updateStickyPosition();
    document.body.appendChild(this.stickyElement);
    this.isCreated = true;
  }

  /**
   * Update sticky element position
   */
  updateStickyPosition() {
    if (!this.stickyElement) return;
    this.stickyElement.style.top = (this.headerOffset - this.stickyVisibleOffset) + 'px';
  }

  /**
   * Update sticky header content based on scroll position
   */
  updateStickyContent() {
    // Don't do anything if sticky header hasn't been created yet
    if (!this.stickyElement) return;
    
    let currentMonthLabel = '';
    const monthDividers = document.querySelectorAll(this.monthDividerSelector);
    
    monthDividers.forEach(divider => {
      const rect = divider.getBoundingClientRect();
      // Choose the last divider whose top passed the header
      if (rect.top <= this.headerOffset) {
        currentMonthLabel = divider.textContent.replace(/\s+/g, ' ').trim();
      }
    });
    
    if (currentMonthLabel) {
      // Show only the month name (first word of the label)
      const monthOnly = currentMonthLabel.split(/\s+/)[0];
      this.stickyElement.textContent = monthOnly;
      this.stickyElement.classList.add(this.visibleClassName);
    } else {
      this.stickyElement.classList.remove(this.visibleClassName);
    }
  }

  /**
   * Handle scroll events
   */
  handleScroll() {
    this.updateStickyContent();
  }

  /**
   * Handle resize events
   */
  handleResize() {
    this.calculateHeaderOffset();
  }

  /**
   * Handle DOM mutations (when month dividers are added)
   */
  handleMutations(mutations) {
    // When new elements are added, the header might have changed size
    const hasMonthDividers = document.querySelectorAll(this.monthDividerSelector).length > 0;
    if (hasMonthDividers) {
      setTimeout(() => this.calculateHeaderOffset(), 50);
    }
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Scroll listener
    const scrollTarget = this.wrapperEl || window;
    scrollTarget.addEventListener('scroll', this.handleScroll);
    
    // Resize listener
    window.addEventListener('resize', this.handleResize);
  }

  /**
   * Setup mutation observer to detect when month dividers are added
   */
  setupMutationObserver() {
    this.observer = new MutationObserver(this.handleMutations);
    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Force update sticky header
   */
  forceUpdate() {
    this.calculateHeaderOffset();
    this.updateStickyContent();
  }

  /**
   * Get sticky element
   * @returns {HTMLElement|null}
   */
  getStickyElement() {
    return this.stickyElement;
  }

  /**
   * Check if sticky header is visible
   * @returns {boolean}
   */
  isVisible() {
    return this.stickyElement && this.stickyElement.classList.contains(this.visibleClassName);
  }

  /**
   * Get current header offset height
   * @returns {number}
   */
  getHeaderOffset() {
    return this.headerOffset;
  }

  /**
   * Show sticky header
   */
  show() {
    if (this.stickyElement) {
      this.stickyElement.style.display = 'block';
    }
  }

  /**
   * Hide sticky header
   */
  hide() {
    if (this.stickyElement) {
      this.stickyElement.style.display = 'none';
    }
  }

  /**
   * Destroy sticky header and cleanup
   */
  destroy() {
    // Remove event listeners
    const scrollTarget = this.wrapperEl || window;
    scrollTarget.removeEventListener('scroll', this.handleScroll);
    window.removeEventListener('resize', this.handleResize);
    
    // Disconnect observer
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    
    // Remove element
    if (this.stickyElement && this.stickyElement.parentNode) {
      this.stickyElement.parentNode.removeChild(this.stickyElement);
    }
    
    // Reset state
    this.stickyElement = null;
    this.isCreated = false;
  }
}

// Create global instance with default configuration
export const stickyHeader = new StickyHeaderManager();

// =============================================================================
// 🔗 GLOBAL COMPATIBILITY
// =============================================================================
// Expose functions globally for backwards compatibility

if (typeof window !== 'undefined') {
  window.stickyHeaderManager = stickyHeader;
  
  // Legacy function names for backwards compatibility
  window.updateStickyMonth = () => stickyHeader.updateStickyContent();
  window.createStickyMonth = () => stickyHeader.createStickyElement();
  window.recalculateHeaderOffset = () => stickyHeader.calculateHeaderOffset();
}