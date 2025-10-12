// login.view.js – Fullscreen login overlay with shimmer logo + Google button

const ID = 'loginOverlay';

function ensureOverlay() {
  let el = document.getElementById(ID);
  if (el) return el;
  el = document.createElement('div');
  el.id = ID;
  el.className = 'login-overlay hidden';
  el.innerHTML = `
    <div class="login-box">
      <div class="login-center">
        <h1 class="login-logo shimmer">Gastos <span>+</span></h1>
        <p class="login-tag shimmer">Finança simplificada</p>
      </div>
      <div class="login-actions">
        <button id="googleBtn" class="login-google" aria-label="Continuar com Google">
          <span class="g-badge" aria-hidden>G</span>
          <span>Continuar com Google</span>
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(el);
  const btn = el.querySelector('#googleBtn');
  if (btn) btn.addEventListener('click', async () => {
    btn.disabled = true;
    
    // iOS PWA specific handling
    const ua = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(ua);
    const standalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || ('standalone' in navigator && navigator.standalone);
    
    if (isIOS && standalone) {
      console.log('iOS PWA: Starting Google sign-in...');
      btn.innerHTML = `
        <span class="g-badge" aria-hidden>⟳</span>
        <span>Autenticando...</span>
      `;
    }
    
    try { 
      await window.Auth?.signInWithGoogle(); 
      
      // For iOS PWA, button will be re-enabled by auth state change
      if (!(isIOS && standalone)) {
        btn.disabled = false;
      }
    }
    catch (e) {
      btn.disabled = false;
      btn.innerHTML = `
        <span class="g-badge" aria-hidden>G</span>
        <span>Continuar com Google</span>
      `;
      console.error('Login error:', e);
      
      // Show inline error
      const msg = (e && e.code) ? e.code.replace('auth/','Auth: ') : 'Falha no login';
      showError(el, msg);
    }
  });
  return el;
}

function show() {
  const el = ensureOverlay();
  el.classList.remove('hidden');
  requestAnimationFrame(() => el.classList.add('visible'));
  console.log('LoginView: Login shown');
}

function hide() {
  const el = document.getElementById(ID);
  if (!el) return;
  el.classList.remove('visible');
  setTimeout(() => el.classList.add('hidden'), 180);
  console.log('LoginView: Login hidden');
}

// Check if user was previously authenticated
function hasPreviousAuth() {
  try {
    // Check Firebase Auth persistence keys that indicate previous successful login
    const keys = Object.keys(localStorage);
    const hasFirebaseAuth = keys.some(key => 
      key.startsWith('firebase:authUser:') || 
      key.includes('firebase:host:')
    );
    
    // Also check IndexedDB-based persistence (for non-iOS PWA)
    const hasIndexedDBAuth = keys.some(key => 
      key.startsWith('firebaseLocalStorageDb#') ||
      key.includes('firebase-heartbeat')
    );
    
    console.log('LoginView: Previous auth check -', { hasFirebaseAuth, hasIndexedDBAuth });
    return hasFirebaseAuth || hasIndexedDBAuth;
  } catch (e) {
    console.warn('LoginView: Error checking previous auth:', e);
    return false;
  }
}

// React to auth state
function hookAuth() {
  // Check for previous authentication before showing login
  const hadPreviousAuth = hasPreviousAuth();
  console.log('LoginView: Had previous auth:', hadPreviousAuth);
  
  const update = (user) => {
    console.log('LoginView: Auth state update -', user ? user.email : 'signed out');
    
    if (!user || user.isAnonymous) {
      // Only show login immediately if this is truly the first time
      if (!hadPreviousAuth) {
        show();
        hideMainApp();
      } else {
        // User had previous auth but state not ready yet - keep skeleton visible
        console.log('LoginView: Previous auth detected, keeping skeleton visible during restoration...');
        // Don't hide app here - keep skeleton visible
        
        // Give Firebase time to restore auth state
        setTimeout(() => {
          // If still no user after waiting, then show login
          const currentUser = window.Auth ? window.Auth.currentUser : null;
          if (!currentUser || currentUser.isAnonymous) {
            console.log('LoginView: Auth not restored after timeout, showing login');
            hideMainApp();
            show();
          }
        }, 1500); // Wait 1.5 seconds for auth restoration
      }
    } else {
      // User authenticated - reset button state and show main app
      const btn = document.querySelector('#googleBtn');
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `
          <span class="g-badge" aria-hidden>G</span>
          <span>Continuar com Google</span>
        `;
      }
      hide();
      // Show main app after successful auth
      showMainApp();
    }
  };
  
  if (window.Auth && typeof window.Auth.onReady === 'function') {
    window.Auth.onReady(update);
    update(window.Auth.currentUser);
  } else {
    // Wait for auth init event
    const onInit = () => {
      document.removeEventListener('auth:init', onInit);
      if (window.Auth) {
        window.Auth.onReady(update);
        update(window.Auth.currentUser);
      }
    };
    document.addEventListener('auth:init', onInit);
  }
}

// App visibility management
function hideMainApp() {
  const wrapper = document.querySelector('.wrapper');
  const header = document.querySelector('header, .app-header');
  const floatingPill = document.querySelector('.floating-pill');
  const floatingAddButton = document.querySelector('.floating-add-button');
  
  if (wrapper) wrapper.style.display = 'none';
  if (header) header.style.display = 'none';
  if (floatingPill) floatingPill.style.display = 'none';
  if (floatingAddButton) floatingAddButton.style.display = 'none';
  
  console.log('LoginView: Main app hidden');
}

function showMainApp() {
  const wrapper = document.querySelector('.wrapper');
  const header = document.querySelector('header, .app-header');
  const floatingPill = document.querySelector('.floating-pill');
  const floatingAddButton = document.querySelector('.floating-add-button');
  
  console.log('LoginView: showMainApp - elements found:', {
    wrapper: !!wrapper,
    header: !!header, 
    floatingPill: !!floatingPill,
    floatingAddButton: !!floatingAddButton
  });
  
  if (wrapper) {
    wrapper.style.display = '';
    wrapper.classList.remove('app-hidden');
  }
  if (header) header.style.display = '';
  if (floatingPill) floatingPill.style.display = '';
  if (floatingAddButton) floatingAddButton.style.display = '';
  
  console.log('LoginView: Main app shown');
}

// Offline hint: disable button when navigator.offLine
function hookOnline() {
  const setState = () => {
    const btn = document.querySelector('#googleBtn');
    if (!btn) return;
    btn.disabled = !navigator.onLine;
    btn.classList.toggle('offline', !navigator.onLine);
    if (!navigator.onLine) btn.title = 'Sem conexão'; else btn.removeAttribute('title');
  };
  window.addEventListener('online', setState);
  window.addEventListener('offline', setState);
  setState();
}

// Public API
window.LoginView = { show, hide, showMainApp, hideMainApp };

// Boot - Only hide main app immediately if no previous auth
const hadPreviousAuth = hasPreviousAuth();
if (!hadPreviousAuth) {
  hideMainApp(); // Hide app only if this is the first time
  show(); // Show login immediately for first-time users
} else {
  console.log('LoginView: Previous auth detected, showing skeleton app during auth restoration');
  // Show skeleton app immediately when previous auth is detected
  showMainApp();
}
hookAuth();
hookOnline();

// iOS PWA specific: Additional auth state check after page load
const ua = navigator.userAgent.toLowerCase();
const isIOS = /iphone|ipad|ipod/.test(ua);
const standalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || ('standalone' in navigator && navigator.standalone);

if (isIOS && standalone) {
  console.log('LoginView: iOS PWA detected, setting up enhanced auth monitoring');
  
  // Listen for auth errors specifically
  document.addEventListener('auth:error', (e) => {
    console.error('LoginView: Auth error received:', e.detail);
    const btn = document.querySelector('#googleBtn');
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `
        <span class="g-badge" aria-hidden>G</span>
        <span>Continuar com Google</span>
      `;
    }
    show();
  });
}

// Error helper
function showError(root, text){
  let bar = root.querySelector('.login-error');
  if (!bar) {
    bar = document.createElement('div');
    bar.className = 'login-error';
    root.querySelector('.login-actions').prepend(bar);
  }
  bar.textContent = text || 'Falha no login';
}
