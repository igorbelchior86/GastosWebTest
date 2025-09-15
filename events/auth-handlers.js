// ============================================================================
// 🔐 AUTH EVENT HANDLERS MODULE
// ============================================================================
// Gerencia eventos relacionados à autenticação e estado do usuário
// FASE 5 refatoração - modularizando event handlers

/**
 * AuthEventHandlers - Gerencia eventos de autenticação
 * 
 * Responsabilidades:
 * - Auth state changes
 * - Login/logout events
 * - User session events
 * - Auth-related UI updates
 */
export class AuthEventHandlers {
  static _initialized = false;
  static _listeners = new Map();
  static _authStateCallbacks = new Set();

  /**
   * Inicializa todos os event handlers de auth
   */
  static init() {
    if (this._initialized) return;

    try {
      this.setupAuthStateListener();
      this.setupLoginHandlers();
      this.setupLogoutHandlers();
      this.setupUserSessionHandlers();
      this._initialized = true;
      console.log('AuthEventHandlers inicializados');
    } catch (error) {
      console.error('Erro ao inicializar AuthEventHandlers:', error);
    }
  }

  /**
   * Configura listener para mudanças de estado de auth
   */
  static setupAuthStateListener() {
    if (typeof window.Auth !== 'undefined' && window.Auth.onAuthStateChanged) {
      const handler = (user) => {
        this.handleAuthStateChange(user);
      };

      try {
        window.Auth.onAuthStateChanged(handler);
        this._listeners.set('authStateChanged', { type: 'auth', handler });
      } catch (error) {
        console.warn('Não foi possível configurar auth state listener:', error);
      }
    }

    // Custom auth state events
    this.addListener(document, 'auth:login', (e) => {
      this.handleLoginEvent(e.detail);
    }, 'authLogin');

    this.addListener(document, 'auth:logout', () => {
      this.handleLogoutEvent();
    }, 'authLogout');

    this.addListener(document, 'auth:state', (e) => {
      this.handleCustomAuthState(e.detail);
    }, 'authState');
  }

  /**
   * Configura handlers para login
   */
  static setupLoginHandlers() {
    // Login button
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
      this.addListener(loginBtn, 'click', () => {
        this.handleLoginClick();
      }, 'loginBtn');
    }

    // Google login button
    const googleLoginBtn = document.getElementById('googleLoginBtn');
    if (googleLoginBtn) {
      this.addListener(googleLoginBtn, 'click', () => {
        this.handleGoogleLogin();
      }, 'googleLoginBtn');
    }

    // Login form submit
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      this.addListener(loginForm, 'submit', (e) => {
        e.preventDefault();
        this.handleLoginFormSubmit(e);
      }, 'loginForm');
    }
  }

  /**
   * Configura handlers para logout
   */
  static setupLogoutHandlers() {
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      this.addListener(logoutBtn, 'click', () => {
        this.handleLogoutClick();
      }, 'logoutBtn');
    }

    // Settings logout
    const settingsLogoutBtn = document.querySelector('[data-action="logout"]');
    if (settingsLogoutBtn) {
      this.addListener(settingsLogoutBtn, 'click', () => {
        this.handleLogoutClick();
      }, 'settingsLogoutBtn');
    }
  }

  /**
   * Configura handlers para sessão do usuário
   */
  static setupUserSessionHandlers() {
    // Window focus - check auth state
    this.addListener(window, 'focus', () => {
      this.handleWindowFocus();
    }, 'windowFocus');

    // Page visibility change
    this.addListener(document, 'visibilitychange', () => {
      if (!document.hidden) {
        this.handlePageVisible();
      }
    }, 'visibilityChange');

    // Before unload - save auth state
    this.addListener(window, 'beforeunload', () => {
      this.handleBeforeUnload();
    }, 'beforeUnload');
  }

  // ============================================================================
  // AUTH STATE HANDLERS
  // ============================================================================

  /**
   * Manipula mudanças no estado de autenticação
   * @param {Object} user - Objeto do usuário ou null
   */
  static handleAuthStateChange(user) {
    console.log('Auth state changed:', user ? 'logged in' : 'logged out');
    
    try {
      // Atualiza UI baseado no estado
      this.updateAuthUI(user);
      
      // Notifica callbacks registrados
      this._authStateCallbacks.forEach(callback => {
        try {
          callback(user);
        } catch (error) {
          console.error('Erro em auth state callback:', error);
        }
      });

      // Dispara evento custom
      const event = new CustomEvent('auth:stateChanged', {
        detail: { user, isAuthenticated: !!user }
      });
      document.dispatchEvent(event);

      // Chama função global se existir (compatibilidade)
      if (typeof handleAuthStateChange === 'function') {
        handleAuthStateChange(user);
      }
    } catch (error) {
      console.error('Erro ao processar mudança de auth state:', error);
    }
  }

  /**
   * Manipula evento de login personalizado
   * @param {Object} detail - Detalhes do login
   */
  static handleLoginEvent(detail) {
    console.log('Login event received:', detail);
    
    if (typeof onUserLogin === 'function') {
      onUserLogin(detail);
    }
  }

  /**
   * Manipula evento de logout
   */
  static handleLogoutEvent() {
    console.log('Logout event received');
    
    if (typeof onUserLogout === 'function') {
      onUserLogout();
    }
  }

  /**
   * Manipula estado de auth personalizado
   * @param {Object} detail - Detalhes do estado
   */
  static handleCustomAuthState(detail) {
    console.log('Custom auth state:', detail);
    
    // Atualiza settings modal se necessário
    if (typeof renderSettingsModal === 'function') {
      renderSettingsModal();
    }
  }

  // ============================================================================
  // LOGIN HANDLERS
  // ============================================================================

  /**
   * Manipula click no botão de login
   */
  static handleLoginClick() {
    try {
      if (typeof initiateLogin === 'function') {
        initiateLogin();
      } else if (typeof window.Auth !== 'undefined' && window.Auth.signIn) {
        window.Auth.signIn();
      }
    } catch (error) {
      console.error('Erro ao iniciar login:', error);
      this.showAuthError('Erro ao iniciar login');
    }
  }

  /**
   * Manipula login com Google
   */
  static handleGoogleLogin() {
    try {
      if (typeof loginWithGoogle === 'function') {
        loginWithGoogle();
      } else if (typeof window.Auth !== 'undefined' && window.Auth.signInWithGoogle) {
        window.Auth.signInWithGoogle();
      }
    } catch (error) {
      console.error('Erro ao fazer login com Google:', error);
      this.showAuthError('Erro ao fazer login com Google');
    }
  }

  /**
   * Manipula submit do form de login
   * @param {Event} e - Evento de submit
   */
  static handleLoginFormSubmit(e) {
    const formData = new FormData(e.target);
    const email = formData.get('email');
    const password = formData.get('password');

    try {
      if (typeof loginWithEmail === 'function') {
        loginWithEmail(email, password);
      } else if (typeof window.Auth !== 'undefined' && window.Auth.signInWithEmailAndPassword) {
        window.Auth.signInWithEmailAndPassword(email, password);
      }
    } catch (error) {
      console.error('Erro ao fazer login:', error);
      this.showAuthError('Erro ao fazer login');
    }
  }

  // ============================================================================
  // LOGOUT HANDLERS
  // ============================================================================

  /**
   * Manipula click no botão de logout
   */
  static handleLogoutClick() {
    try {
      if (typeof initiateLogout === 'function') {
        initiateLogout();
      } else if (typeof window.Auth !== 'undefined' && window.Auth.signOut) {
        window.Auth.signOut();
      }
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      this.showAuthError('Erro ao fazer logout');
    }
  }

  // ============================================================================
  // SESSION HANDLERS
  // ============================================================================

  /**
   * Manipula quando a janela recebe foco
   */
  static handleWindowFocus() {
    // Verifica se o usuário ainda está autenticado
    try {
      if (typeof checkAuthState === 'function') {
        checkAuthState();
      } else if (typeof window.Auth !== 'undefined' && window.Auth.getCurrentUser) {
        const user = window.Auth.getCurrentUser();
        this.handleAuthStateChange(user);
      }
    } catch (error) {
      console.warn('Erro ao verificar auth state no focus:', error);
    }
  }

  /**
   * Manipula quando a página fica visível
   */
  static handlePageVisible() {
    // Similar ao window focus
    this.handleWindowFocus();
  }

  /**
   * Manipula antes da página ser fechada
   */
  static handleBeforeUnload() {
    // Salva estado de auth se necessário
    try {
      if (typeof saveAuthState === 'function') {
        saveAuthState();
      }
    } catch (error) {
      console.warn('Erro ao salvar auth state:', error);
    }
  }

  // ============================================================================
  // UI UPDATES
  // ============================================================================

  /**
   * Atualiza UI baseado no estado de autenticação
   * @param {Object} user - Usuário ou null
   */
  static updateAuthUI(user) {
    const isAuthenticated = !!user;
    
    // Atualiza elementos de login/logout
    const loginElements = document.querySelectorAll('[data-auth="login"]');
    const logoutElements = document.querySelectorAll('[data-auth="logout"]');
    const authElements = document.querySelectorAll('[data-auth="authenticated"]');

    loginElements.forEach(el => {
      el.style.display = isAuthenticated ? 'none' : '';
    });

    logoutElements.forEach(el => {
      el.style.display = isAuthenticated ? '' : 'none';
    });

    authElements.forEach(el => {
      el.style.display = isAuthenticated ? '' : 'none';
    });

    // Atualiza informações do usuário
    if (user) {
      this.updateUserInfo(user);
    } else {
      this.clearUserInfo();
    }
  }

  /**
   * Atualiza informações do usuário na UI
   * @param {Object} user - Objeto do usuário
   */
  static updateUserInfo(user) {
    const userNameElements = document.querySelectorAll('[data-user="name"]');
    const userEmailElements = document.querySelectorAll('[data-user="email"]');
    const userPhotoElements = document.querySelectorAll('[data-user="photo"]');

    userNameElements.forEach(el => {
      el.textContent = user.displayName || user.email || 'Usuário';
    });

    userEmailElements.forEach(el => {
      el.textContent = user.email || '';
    });

    userPhotoElements.forEach(el => {
      if (user.photoURL) {
        el.src = user.photoURL;
        el.style.display = '';
      } else {
        el.style.display = 'none';
      }
    });
  }

  /**
   * Limpa informações do usuário da UI
   */
  static clearUserInfo() {
    const userElements = document.querySelectorAll('[data-user]');
    userElements.forEach(el => {
      if (el.tagName === 'IMG') {
        el.style.display = 'none';
      } else {
        el.textContent = '';
      }
    });
  }

  /**
   * Mostra erro de autenticação
   * @param {string} message - Mensagem de erro
   */
  static showAuthError(message) {
    // Tenta usar sistema de notificações se disponível
    if (typeof showNotification === 'function') {
      showNotification(message, 'error');
    } else {
      console.error('Auth Error:', message);
      alert(message); // Fallback básico
    }
  }

  // ============================================================================
  // CALLBACK MANAGEMENT
  // ============================================================================

  /**
   * Registra callback para mudanças de auth state
   * @param {Function} callback - Função callback
   */
  static onAuthStateChange(callback) {
    this._authStateCallbacks.add(callback);
    
    // Retorna função para remover o callback
    return () => {
      this._authStateCallbacks.delete(callback);
    };
  }

  // ============================================================================
  // UTILITÁRIOS DE EVENT LISTENERS
  // ============================================================================

  /**
   * Adiciona event listener com tracking
   * @param {HTMLElement} element - Elemento
   * @param {string} event - Tipo de evento
   * @param {Function} handler - Handler function
   * @param {string} id - ID para tracking
   */
  static addListener(element, event, handler, id) {
    if (!element) return;

    element.addEventListener(event, handler);
    this._listeners.set(id, { element, event, handler });
  }

  /**
   * Remove event listener específico
   * @param {string} id - ID do listener
   */
  static removeListener(id) {
    const listener = this._listeners.get(id);
    if (listener) {
      listener.element.removeEventListener(listener.event, listener.handler);
      this._listeners.delete(id);
    }
  }

  /**
   * Remove todos os event listeners
   */
  static removeAllListeners() {
    this._listeners.forEach((listener, id) => {
      listener.element.removeEventListener(listener.event, listener.handler);
    });
    this._listeners.clear();
    this._authStateCallbacks.clear();
    this._initialized = false;
  }

  /**
   * Obtém informações de debug
   * @returns {Object} Info de debug
   */
  static getDebugInfo() {
    return {
      initialized: this._initialized,
      activeListeners: Array.from(this._listeners.keys()),
      listenerCount: this._listeners.size,
      authCallbacks: this._authStateCallbacks.size
    };
  }
}

// Para uso global (compatibilidade)
if (typeof window !== 'undefined') {
  window.AuthEventHandlers = AuthEventHandlers;
}