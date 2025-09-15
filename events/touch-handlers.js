// ============================================================================
// 👆 TOUCH EVENT HANDLERS MODULE
// ============================================================================
// Gerencia eventos de touch, gestos e interações móveis
// FASE 5 refatoração - modularizando event handlers

/**
 * TouchEventHandlers - Gerencia eventos de touch e gestos
 * 
 * Responsabilidades:
 * - Touch events (touchstart, touchmove, touchend)
 * - Swipe gestures
 * - Tap/double tap
 * - Pinch/zoom gestures
 * - Mobile-specific interactions
 */
export class TouchEventHandlers {
  static _initialized = false;
  static _listeners = new Map();
  static _touchState = {
    startX: 0,
    startY: 0,
    endX: 0,
    endY: 0,
    startTime: 0,
    endTime: 0,
    isTracking: false
  };
  static _swipeThreshold = 50; // pixels
  static _tapTimeThreshold = 300; // ms

  /**
   * Inicializa todos os event handlers de touch
   */
  static init() {
    if (this._initialized) return;

    try {
      this.setupTouchEvents();
      this.setupSwipeGestures();
      this.setupTapGestures();
      this.setupModalTouchEvents();
      this._initialized = true;
      console.log('TouchEventHandlers inicializados');
    } catch (error) {
      console.error('Erro ao inicializar TouchEventHandlers:', error);
    }
  }

  /**
   * Configura eventos básicos de touch
   */
  static setupTouchEvents() {
    // Touch events no documento
    this.addListener(document, 'touchstart', (e) => {
      this.handleTouchStart(e);
    }, 'documentTouchStart');

    this.addListener(document, 'touchmove', (e) => {
      this.handleTouchMove(e);
    }, 'documentTouchMove');

    this.addListener(document, 'touchend', (e) => {
      this.handleTouchEnd(e);
    }, 'documentTouchEnd');

    this.addListener(document, 'touchcancel', (e) => {
      this.handleTouchCancel(e);
    }, 'documentTouchCancel');
  }

  /**
   * Configura gestos de swipe
   */
  static setupSwipeGestures() {
    // Swipe nos containers principais
    const mainContainer = document.getElementById('main-container');
    if (mainContainer) {
      this.setupSwipeForElement(mainContainer, 'mainContainer');
    }

    const transactionsList = document.getElementById('transactionsList');
    if (transactionsList) {
      this.setupSwipeForElement(transactionsList, 'transactionsList');
    }

    // Swipe em modais
    const modals = document.querySelectorAll('.modal');
    modals.forEach((modal, index) => {
      this.setupSwipeForElement(modal, `modal-${index}`);
    });
  }

  /**
   * Configura swipe para um elemento específico
   * @param {HTMLElement} element - Elemento para configurar swipe
   * @param {string} id - ID único para tracking
   */
  static setupSwipeForElement(element, id) {
    if (!element) return;

    let touchStartData = null;

    const handleStart = (e) => {
      const touch = e.touches[0];
      touchStartData = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
        element: element
      };
    };

    const handleEnd = (e) => {
      if (!touchStartData) return;

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartData.x;
      const deltaY = touch.clientY - touchStartData.y;
      const deltaTime = Date.now() - touchStartData.time;

      // Verifica se é um swipe válido
      if (Math.abs(deltaX) > this._swipeThreshold && deltaTime < 500) {
        const direction = deltaX > 0 ? 'right' : 'left';
        this.handleSwipe(element, direction, { deltaX, deltaY, deltaTime });
      }

      touchStartData = null;
    };

    this.addListener(element, 'touchstart', handleStart, `${id}-swipeStart`);
    this.addListener(element, 'touchend', handleEnd, `${id}-swipeEnd`);
  }

  /**
   * Configura gestos de tap
   */
  static setupTapGestures() {
    // Double tap para zoom/reset
    this.addListener(document, 'touchend', (e) => {
      this.handleTapGesture(e);
    }, 'tapGesture');
  }

  /**
   * Configura eventos de touch para modais
   */
  static setupModalTouchEvents() {
    // Pull to close nos modais
    const modals = document.querySelectorAll('.modal');
    modals.forEach((modal, index) => {
      this.setupModalPullToClose(modal, `modal-pull-${index}`);
    });
  }

  /**
   * Configura pull-to-close para modal
   * @param {HTMLElement} modal - Modal element
   * @param {string} id - ID único
   */
  static setupModalPullToClose(modal, id) {
    if (!modal) return;

    let startY = 0;
    let currentY = 0;
    let isDragging = false;

    const handleStart = (e) => {
      const touch = e.touches[0];
      startY = touch.clientY;
      isDragging = true;
      modal.style.transition = 'none';
    };

    const handleMove = (e) => {
      if (!isDragging) return;

      const touch = e.touches[0];
      currentY = touch.clientY;
      const deltaY = currentY - startY;

      // Só permite movimento para baixo
      if (deltaY > 0) {
        const translateY = Math.min(deltaY, 300);
        modal.style.transform = `translateY(${translateY}px)`;
        
        // Aplica opacidade baseada no movimento
        const opacity = Math.max(0.3, 1 - (translateY / 300));
        modal.style.opacity = opacity;
      }
    };

    const handleEnd = (e) => {
      if (!isDragging) return;
      isDragging = false;

      const deltaY = currentY - startY;
      modal.style.transition = '';

      // Se moveu mais que 100px para baixo, fecha o modal
      if (deltaY > 100) {
        this.closeModalWithAnimation(modal);
      } else {
        // Retorna à posição original
        modal.style.transform = '';
        modal.style.opacity = '';
      }
    };

    this.addListener(modal, 'touchstart', handleStart, `${id}-pullStart`);
    this.addListener(modal, 'touchmove', handleMove, `${id}-pullMove`);
    this.addListener(modal, 'touchend', handleEnd, `${id}-pullEnd`);
  }

  // ============================================================================
  // TOUCH EVENT HANDLERS
  // ============================================================================

  /**
   * Manipula início do touch
   * @param {TouchEvent} e - Evento de touch
   */
  static handleTouchStart(e) {
    const touch = e.touches[0];
    this._touchState.startX = touch.clientX;
    this._touchState.startY = touch.clientY;
    this._touchState.startTime = Date.now();
    this._touchState.isTracking = true;

    // Dispara evento custom
    this.dispatchTouchEvent('touchStartTracked', {
      x: touch.clientX,
      y: touch.clientY,
      target: e.target
    });
  }

  /**
   * Manipula movimento do touch
   * @param {TouchEvent} e - Evento de touch
   */
  static handleTouchMove(e) {
    if (!this._touchState.isTracking) return;

    const touch = e.touches[0];
    
    // Atualiza posição atual
    this._touchState.endX = touch.clientX;
    this._touchState.endY = touch.clientY;

    // Calcula delta
    const deltaX = touch.clientX - this._touchState.startX;
    const deltaY = touch.clientY - this._touchState.startY;

    // Dispara evento custom
    this.dispatchTouchEvent('touchMoveTracked', {
      x: touch.clientX,
      y: touch.clientY,
      deltaX,
      deltaY,
      target: e.target
    });
  }

  /**
   * Manipula fim do touch
   * @param {TouchEvent} e - Evento de touch
   */
  static handleTouchEnd(e) {
    if (!this._touchState.isTracking) return;

    const touch = e.changedTouches[0];
    this._touchState.endX = touch.clientX;
    this._touchState.endY = touch.clientY;
    this._touchState.endTime = Date.now();

    // Calcula deltas e duração
    const deltaX = this._touchState.endX - this._touchState.startX;
    const deltaY = this._touchState.endY - this._touchState.startY;
    const duration = this._touchState.endTime - this._touchState.startTime;

    // Dispara evento custom
    this.dispatchTouchEvent('touchEndTracked', {
      x: touch.clientX,
      y: touch.clientY,
      deltaX,
      deltaY,
      duration,
      target: e.target
    });

    // Reset do estado
    this._touchState.isTracking = false;
  }

  /**
   * Manipula cancelamento do touch
   * @param {TouchEvent} e - Evento de touch
   */
  static handleTouchCancel(e) {
    this._touchState.isTracking = false;
    
    this.dispatchTouchEvent('touchCancelTracked', {
      target: e.target
    });
  }

  // ============================================================================
  // GESTURE HANDLERS
  // ============================================================================

  /**
   * Manipula gesture de swipe
   * @param {HTMLElement} element - Elemento onde ocorreu o swipe
   * @param {string} direction - Direção do swipe (left/right)
   * @param {Object} data - Dados do swipe
   */
  static handleSwipe(element, direction, data) {
    console.log(`Swipe ${direction} detectado em:`, element);

    // Dispara evento custom
    this.dispatchTouchEvent('swipeDetected', {
      element,
      direction,
      ...data
    });

    // Lida com swipes específicos
    if (element.classList.contains('modal')) {
      this.handleModalSwipe(element, direction);
    } else if (element.id === 'transactionsList') {
      this.handleTransactionListSwipe(direction);
    } else if (element.id === 'main-container') {
      this.handleMainContainerSwipe(direction);
    }
  }

  /**
   * Manipula swipe em modais
   * @param {HTMLElement} modal - Modal element
   * @param {string} direction - Direção do swipe
   */
  static handleModalSwipe(modal, direction) {
    if (direction === 'right') {
      // Swipe right para fechar modal
      this.closeModalWithAnimation(modal);
    }
  }

  /**
   * Manipula swipe na lista de transações
   * @param {string} direction - Direção do swipe
   */
  static handleTransactionListSwipe(direction) {
    if (direction === 'left') {
      // Swipe left para próxima página/filtro
      if (typeof nextPage === 'function') {
        nextPage();
      }
    } else if (direction === 'right') {
      // Swipe right para página anterior
      if (typeof previousPage === 'function') {
        previousPage();
      }
    }
  }

  /**
   * Manipula swipe no container principal
   * @param {string} direction - Direção do swipe
   */
  static handleMainContainerSwipe(direction) {
    if (direction === 'left') {
      // Swipe left para abrir menu lateral (se existir)
      if (typeof openSideMenu === 'function') {
        openSideMenu();
      }
    } else if (direction === 'right') {
      // Swipe right para voltar/fechar menu
      if (typeof closeSideMenu === 'function') {
        closeSideMenu();
      }
    }
  }

  /**
   * Manipula gestos de tap
   * @param {TouchEvent} e - Evento de touch
   */
  static handleTapGesture(e) {
    const now = Date.now();
    const touch = e.changedTouches[0];
    
    // Verifica se é um tap rápido
    if (this._touchState.endTime - this._touchState.startTime < this._tapTimeThreshold) {
      const deltaX = Math.abs(this._touchState.endX - this._touchState.startX);
      const deltaY = Math.abs(this._touchState.endY - this._touchState.startY);
      
      // Movimento mínimo para ser considerado tap
      if (deltaX < 10 && deltaY < 10) {
        this.dispatchTouchEvent('tapDetected', {
          x: touch.clientX,
          y: touch.clientY,
          target: e.target
        });
      }
    }
  }

  // ============================================================================
  // ANIMATION HELPERS
  // ============================================================================

  /**
   * Fecha modal com animação
   * @param {HTMLElement} modal - Modal para fechar
   */
  static closeModalWithAnimation(modal) {
    modal.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-out';
    modal.style.transform = 'translateY(100%)';
    modal.style.opacity = '0';

    setTimeout(() => {
      // Usa o sistema de modais se disponível
      if (typeof modalManager !== 'undefined' && modalManager.close) {
        modalManager.close(modal.id);
      } else if (typeof closeModal === 'function') {
        closeModal(modal.id);
      } else {
        modal.style.display = 'none';
      }
      
      // Reset dos estilos
      modal.style.transform = '';
      modal.style.opacity = '';
      modal.style.transition = '';
    }, 300);
  }

  // ============================================================================
  // EVENT UTILITIES
  // ============================================================================

  /**
   * Dispara evento custom de touch
   * @param {string} eventName - Nome do evento
   * @param {Object} detail - Detalhes do evento
   */
  static dispatchTouchEvent(eventName, detail) {
    const event = new CustomEvent(eventName, { detail });
    document.dispatchEvent(event);
  }

  /**
   * Adiciona event listener com tracking
   * @param {HTMLElement} element - Elemento
   * @param {string} event - Tipo de evento
   * @param {Function} handler - Handler function
   * @param {string} id - ID para tracking
   */
  static addListener(element, event, handler, id) {
    if (!element) return;

    element.addEventListener(event, handler, { passive: false });
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
    this._initialized = false;
  }

  /**
   * Configura threshold para swipe
   * @param {number} threshold - Threshold em pixels
   */
  static setSwipeThreshold(threshold) {
    this._swipeThreshold = threshold;
  }

  /**
   * Configura threshold para tap
   * @param {number} threshold - Threshold em ms
   */
  static setTapTimeThreshold(threshold) {
    this._tapTimeThreshold = threshold;
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
      touchState: { ...this._touchState },
      swipeThreshold: this._swipeThreshold,
      tapTimeThreshold: this._tapTimeThreshold
    };
  }
}

// Para uso global (compatibilidade)
if (typeof window !== 'undefined') {
  window.TouchEventHandlers = TouchEventHandlers;
}