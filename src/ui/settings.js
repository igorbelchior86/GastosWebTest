/*
 * Settings modal helpers
 *
 * This module encapsulates rendering of the Settings modal, including
 * fetching the user's profile from Firebase Auth (when available),
 * caching it locally, and wiring up the sign‑out button. To use it,
 * call `setupSettings` with the modal element. It returns an object
 * containing `openSettings`, `closeSettings` and `renderSettings`.
 */

import { cacheGet, cacheSet } from '../utils/cache.js';

/**
 * Apply theme preference to the document
 */
function applyThemePreference(pref) {
  // pref: 'light' | 'dark' | 'system'
  const getSystemPref = () => {
    try {
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    } catch (_) { 
      return 'dark'; 
    }
  };
  
  let resolved = pref === 'system' ? getSystemPref() : pref;
  const root = document.documentElement;
  if (resolved === 'light') {
    root.classList.add('light');
    root.setAttribute('data-theme', 'light');
  } else {
    root.classList.remove('light');
    root.setAttribute('data-theme', 'dark');
  }
}

/**
 * Set up the settings modal. This attaches event handlers to render
 * the profile, persist it to cache, and handle sign out. It also
 * listens for `auth:state` events to re‑render the profile when the
 * authentication state changes.
 *
 * @param {HTMLElement} settingsModalEl The root element of the settings modal
 * @returns {{ openSettings: Function, closeSettings: Function, renderSettings: Function }}
 */
export function setupSettings(settingsModalEl) {
  if (!settingsModalEl) {
    return {
      openSettings: () => {},
      closeSettings: () => {},
      renderSettings: () => {}
    };
  }

  /**
   * Retrieve the user profile from Firebase Auth if available. Falls
   * back to null if Auth is not initialised or no user is logged in.
   *
   * @returns {{ name: string, email: string, photo: string } | null}
   */
  function getProfileFromAuth() {
    try {
      const user = window.Auth && window.Auth.currentUser;
      if (!user) return null;
      return {
        name: user.displayName || '',
        email: user.email || '',
        photo: user.photoURL || ''
      };
    } catch {
      return null;
    }
  }

  /**
   * Persist the profile into local cache. A no‑op on failure.
   *
   * @param {object|null} profile User profile to persist
   */
  function persistProfile(profile) {
    try {
      cacheSet('profile', profile);
    } catch {
      /* ignore */
    }
  }

  /**
   * Load a cached profile from local storage if present.
   *
   * @returns {object|null} cached profile or null
   */
  function loadCachedProfile() {
    try {
      return cacheGet('profile', null);
    } catch {
      return null;
    }
  }

  /**
   * Render the contents of the settings modal. This builds the
   * profile card and sign‑out button. It uses the cached profile
   * or falls back to the Auth user. After rendering, the logout
   * button is wired up to sign out and hide the modal.
   */
  function renderSettings() {
    const box = settingsModalEl.querySelector('.modal-content');
    if (!box) return;
    let profile = getProfileFromAuth();
    if (profile && profile.email) persistProfile(profile);
    if (!profile) profile = loadCachedProfile() || { name: '', email: '', photo: '' };
    const avatarImg = profile.photo ? `<img src="${profile.photo}" alt="Avatar"/>` : '';
    const sub = profile.email || '';
    const cardHTML = `
      <div class="settings-card">
        <div class="settings-profile">
          <div class="settings-avatar">${avatarImg}</div>
          <div class="settings-names">
            <div class="settings-name">${(profile.name || '')}</div>
            <div class="settings-sub">${sub}</div>
          </div>
        </div>
      </div>`;
    // Get current theme preference
    const savedTheme = localStorage.getItem('ui:theme') || 'system';
    
    const listHTML = `
      <h3 class="settings-section-title">Personalização</h3>
      <div class="settings-theme-card">
        <div class="theme-row">
          <button class="theme-btn" data-theme="light" aria-pressed="${savedTheme === 'light' ? 'true' : 'false'}">Claro</button>
          <button class="theme-btn" data-theme="dark" aria-pressed="${savedTheme === 'dark' ? 'true' : 'false'}">Escuro</button>
          <button class="theme-btn" data-theme="system" aria-pressed="${savedTheme === 'system' ? 'true' : 'false'}">Sistema</button>
        </div>
        <div class="settings-item settings-link">
          <div class="left">Portugal (EUR)</div>
          <div class="right">›</div>
        </div>
      </div>
      
      <h3 class="settings-section-title">Financeiro</h3>
      <div class="settings-list">
        <div class="settings-item settings-link">
          <div class="left">Cartões</div>
          <div class="right">›</div>
        </div>
      </div>
      
      <h3 class="settings-section-title">Sobre</h3>
      <div class="settings-list">
        <div class="settings-item">
          <div class="version-number">v1.4.9(a61)</div>
        </div>
        <div class="settings-item danger">
          <button id="resetDataBtn" class="settings-cta">
            <div class="left">Apagar Todos os Dados</div>
          </button>
        </div>
      </div>
      
      <div class="settings-list">
        <div class="settings-item danger">
          <button id="logoutBtn" class="settings-cta">
            <div class="left">
              <span class="settings-icon icon-logout"></span>
              Sair da conta
            </div>
          </button>
        </div>
      </div>`;
    box.innerHTML = cardHTML + listHTML;
    
    // Theme selector event listeners
    box.querySelectorAll('.theme-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const theme = btn.dataset.theme;
        localStorage.setItem('ui:theme', theme);
        
        // Apply theme immediately
        applyThemePreference(theme);
        
        // Update aria-pressed state
        box.querySelectorAll('.theme-btn').forEach(b => b.setAttribute('aria-pressed', 'false'));
        btn.setAttribute('aria-pressed', 'true');
      });
    });
    
    // Reset data button
    const resetBtn = box.querySelector('#resetDataBtn');
    if (resetBtn) {
      resetBtn.onclick = async () => {
        if (confirm('Deseja realmente APAGAR TODOS OS DADOS? Esta ação é irreversível.')) {
          try {
            // Call the global reset function if available
            if (typeof window.performResetAllData === 'function') {
              await window.performResetAllData(false); // false = don't ask confirm again
            }
            settingsModalEl.classList.add('hidden');
            if (typeof window.updateModalOpenState === 'function') {
              window.updateModalOpenState();
            }
          } catch (err) {
            console.error('Reset failed:', err);
          }
        }
      };
    }
    
    // Logout button
    const logoutBtn = box.querySelector('#logoutBtn');
    if (logoutBtn) {
      logoutBtn.onclick = async () => {
        try {
          if (window.Auth && typeof window.Auth.signOut === 'function') {
            await window.Auth.signOut();
          }
        } catch {
          /* ignore */
        }
        // Clear cached profile
        try {
          cacheSet('profile', null);
        } catch {
          /* ignore */
        }
        // Hide modal and restore page scroll state
        settingsModalEl.classList.add('hidden');
        if (typeof window.updateModalOpenState === 'function') {
          window.updateModalOpenState();
        }
      };
    }
  }

  /**
   * Show the settings modal. Renders the content before making it
   * visible and updating the modal open state.
   */
  function openSettings() {
    renderSettings();
    settingsModalEl.classList.remove('hidden');
    if (typeof window.updateModalOpenState === 'function') {
      window.updateModalOpenState();
    }
  }

  /**
   * Hide the settings modal and restore page scroll state. Does not
   * modify the modal content.
   */
  function closeSettings() {
    settingsModalEl.classList.add('hidden');
    if (typeof window.updateModalOpenState === 'function') {
      window.updateModalOpenState();
    }
  }

  // When the auth state changes (user signs in/out), re‑render the
  // settings to reflect the new user profile
  function onAuthState() {
    try {
      renderSettings();
    } catch {
      /* ignore */
    }
  }
  document.addEventListener('auth:state', onAuthState);

  // Expose functions. The caller can call openSettings() and closeSettings()
  return {
    openSettings,
    closeSettings,
    renderSettings
  };
}