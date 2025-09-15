// ============================================================================
// 🎨 THEME MANAGER
// ============================================================================
// Sistema de gestão de temas extraído do main.js
// FASE 2 refatoração - componentes UI independentes

/**
 * Theme Manager class - handles theme switching and persistence
 * Supports light, dark, and system preference
 */
export class ThemeManager {
  constructor() {
    this.themes = ['light', 'dark', 'system'];
    this.storageKey = 'ui:theme';
    this.defaultTheme = 'system';
    
    // Bind methods to preserve context
    this.handleSystemPreferenceChange = this.handleSystemPreferenceChange.bind(this);
    
    // Initialize theme on creation
    this.init();
  }

  /**
   * Get system color scheme preference
   * @returns {string} 'light' or 'dark'
   */
  getSystemPreference() {
    try {
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    } catch (_) { 
      return 'dark'; 
    }
  }

  /**
   * Apply theme to document
   * @param {string} theme - 'light', 'dark', or 'system'
   */
  applyTheme(theme) {
    // Resolve 'system' to actual preference
    const resolvedTheme = theme === 'system' ? this.getSystemPreference() : theme;
    const root = document.documentElement;
    
    if (resolvedTheme === 'light') {
      root.classList.add('light');
      root.setAttribute('data-theme', 'light');
    } else {
      root.classList.remove('light');
      root.setAttribute('data-theme', 'dark');
    }

    // Dispatch event for other components
    window.dispatchEvent(new CustomEvent('themeChanged', {
      detail: { theme, resolvedTheme }
    }));
  }

  /**
   * Get current theme from storage
   * @returns {string} Current theme preference
   */
  getCurrentTheme() {
    return localStorage.getItem(this.storageKey) || this.defaultTheme;
  }

  /**
   * Set theme and persist to storage
   * @param {string} theme - Theme to set
   */
  setTheme(theme) {
    if (!this.themes.includes(theme)) {
      console.warn(`Invalid theme: ${theme}. Valid themes:`, this.themes);
      return;
    }

    localStorage.setItem(this.storageKey, theme);
    this.applyTheme(theme);
  }

  /**
   * Toggle between light and dark themes
   * If current is system, toggles to opposite of current system preference
   */
  toggleTheme() {
    const current = this.getCurrentTheme();
    let newTheme;

    if (current === 'system') {
      // Toggle to opposite of current system preference
      newTheme = this.getSystemPreference() === 'light' ? 'dark' : 'light';
    } else {
      newTheme = current === 'light' ? 'dark' : 'light';
    }

    this.setTheme(newTheme);
  }

  /**
   * Handle system preference changes when user has 'system' selected
   */
  handleSystemPreferenceChange() {
    const currentTheme = this.getCurrentTheme();
    if (currentTheme === 'system') {
      this.applyTheme('system');
    }
  }

  /**
   * Initialize theme system
   */
  init() {
    // Apply saved theme
    const savedTheme = this.getCurrentTheme();
    this.applyTheme(savedTheme);

    // Listen for system preference changes
    try {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', this.handleSystemPreferenceChange);
      }
    } catch (_) {
      console.warn('Could not set up system theme preference listener');
    }
  }

  /**
   * Setup theme toggle button
   * @param {string} buttonId - ID of the toggle button element
   */
  setupToggleButton(buttonId) {
    const button = document.getElementById(buttonId);
    if (!button) {
      console.warn(`Theme toggle button not found: ${buttonId}`);
      return;
    }

    button.onclick = () => this.toggleTheme();
  }

  /**
   * Setup theme selection buttons in settings
   * @param {string} containerSelector - CSS selector for button container
   * @param {string} buttonSelector - CSS selector for theme buttons
   */
  setupThemeButtons(containerSelector = '.theme-row', buttonSelector = '.theme-btn') {
    const container = document.querySelector(containerSelector);
    if (!container) {
      console.warn(`Theme buttons container not found: ${containerSelector}`);
      return;
    }

    const buttons = container.querySelectorAll(buttonSelector);
    if (!buttons.length) {
      console.warn(`No theme buttons found with selector: ${buttonSelector}`);
      return;
    }

    const currentTheme = this.getCurrentTheme();

    // Helper to update button visual states
    const updateButtonStates = (activeTheme) => {
      buttons.forEach(button => {
        const theme = button.dataset.theme;
        const isActive = theme === activeTheme;
        button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        button.classList.toggle('active', isActive);
      });
    };

    // Initialize button states
    updateButtonStates(currentTheme);

    // Add click handlers
    buttons.forEach(button => {
      button.addEventListener('click', () => {
        const selectedTheme = button.dataset.theme;
        this.setTheme(selectedTheme);
        updateButtonStates(selectedTheme);
      });
    });

    // Listen for theme changes from other sources
    window.addEventListener('themeChanged', (event) => {
      updateButtonStates(event.detail.theme);
    });
  }

  /**
   * Get resolved theme (what's actually applied to DOM)
   * @returns {string} 'light' or 'dark'
   */
  getResolvedTheme() {
    const current = this.getCurrentTheme();
    return current === 'system' ? this.getSystemPreference() : current;
  }

  /**
   * Check if current theme is dark
   * @returns {boolean}
   */
  isDark() {
    return this.getResolvedTheme() === 'dark';
  }

  /**
   * Check if current theme is light
   * @returns {boolean}
   */
  isLight() {
    return this.getResolvedTheme() === 'light';
  }

  /**
   * Cleanup event listeners
   */
  destroy() {
    try {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', this.handleSystemPreferenceChange);
      }
    } catch (_) {}
  }
}

// Create global instance
export const themeManager = new ThemeManager();

// =============================================================================
// 🔗 GLOBAL COMPATIBILITY
// =============================================================================
// Expose functions globally for backwards compatibility

if (typeof window !== 'undefined') {
  window.themeManager = themeManager;
  
  // Legacy function names for backwards compatibility
  window.getSystemPref = () => themeManager.getSystemPreference();
  window.applyThemePreference = (theme) => themeManager.applyTheme(theme);
  window.initThemeFromStorage = () => themeManager.init();
}