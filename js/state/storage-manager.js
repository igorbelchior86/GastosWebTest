// ============================================================================
// 💾 STORAGE MANAGER
// ============================================================================
// Sistema de persistência e cache para o estado da aplicação
// FASE 2 refatoração - extraído do main.js

/**
 * StorageManager - Gerencia persistência local e remota dos dados
 * 
 * Responsabilidades:
 * - Gerenciar cache local (IndexedDB/localStorage)
 * - Sincronizar com Firebase quando online
 * - Implementar queue offline para operações pendentes
 * - Prover fallbacks para diferentes tipos de storage
 */
export class StorageManager {
  constructor(options = {}) {
    this.useFirebase = options.useFirebase !== false;
    this.useIndexedDB = options.useIndexedDB !== false;
    this.cachePrefix = options.cachePrefix || 'gastos:';
    
    // Queue para operações offline
    this.offlineQueue = [];
    this.isOnline = navigator.onLine;
    
    // Referencias para cache
    this.cacheDB = null;
    
    // Bind methods
    this.save = this.save.bind(this);
    this.load = this.load.bind(this);
    this.flushOfflineQueue = this.flushOfflineQueue.bind(this);
    
    // Inicializar listeners
    this._setupOnlineListeners();
    this._initializeCache();
  }

  // ============================================================================
  // 💾 INTERFACE PRINCIPAL DE PERSISTÊNCIA
  // ============================================================================

  /**
   * Salva dados localmente e remotamente
   * @param {string} key - Chave dos dados
   * @param {*} data - Dados a serem salvos
   * @param {Object} options - Opções de salvamento
   * @returns {Promise<boolean>} True se salvou com sucesso
   */
  async save(key, data, options = {}) {
    const { localOnly = false, skipCache = false } = options;
    
    try {
      // Sempre salvar no cache local primeiro
      if (!skipCache) {
        await this._saveToCache(key, data);
      }
      
      // Se offline ou localOnly, adicionar à queue
      if (!this.isOnline || localOnly) {
        if (!localOnly) {
          this._addToOfflineQueue('save', key, data);
        }
        return true;
      }
      
      // Tentar salvar remotamente se online
      if (this.useFirebase && typeof window !== 'undefined' && window.save) {
        try {
          await window.save(key, data);
          return true;
        } catch (error) {
          console.warn('Erro ao salvar remotamente, adicionando à queue:', error);
          this._addToOfflineQueue('save', key, data);
          return true;
        }
      }
      
      return true;
    } catch (error) {
      console.error('Erro ao salvar:', error);
      throw error;
    }
  }

  /**
   * Carrega dados do cache local ou remoto
   * @param {string} key - Chave dos dados
   * @param {*} defaultValue - Valor padrão se não encontrar
   * @param {Object} options - Opções de carregamento
   * @returns {Promise<*>} Dados carregados ou valor padrão
   */
  async load(key, defaultValue = null, options = {}) {
    const { localOnly = false, skipCache = false } = options;
    
    try {
      // Tentar carregar do cache local primeiro
      if (!skipCache) {
        const cachedData = await this._loadFromCache(key);
        if (cachedData !== null) {
          return cachedData;
        }
      }
      
      // Se offline ou localOnly, retornar valor padrão
      if (!this.isOnline || localOnly) {
        return defaultValue;
      }
      
      // Tentar carregar remotamente se online
      if (this.useFirebase && typeof window !== 'undefined' && window.load) {
        try {
          const remoteData = await window.load(key, defaultValue);
          
          // Salvar no cache para próximas consultas
          if (remoteData !== defaultValue && !skipCache) {
            await this._saveToCache(key, remoteData);
          }
          
          return remoteData;
        } catch (error) {
          console.warn('Erro ao carregar remotamente:', error);
          return defaultValue;
        }
      }
      
      return defaultValue;
    } catch (error) {
      console.error('Erro ao carregar:', error);
      return defaultValue;
    }
  }

  /**
   * Remove dados do cache e remoto
   * @param {string} key - Chave dos dados
   * @param {Object} options - Opções de remoção
   * @returns {Promise<boolean>} True se removeu com sucesso
   */
  async remove(key, options = {}) {
    const { localOnly = false } = options;
    
    try {
      // Remover do cache local
      await this._removeFromCache(key);
      
      // Se offline ou localOnly, adicionar à queue
      if (!this.isOnline || localOnly) {
        if (!localOnly) {
          this._addToOfflineQueue('remove', key, null);
        }
        return true;
      }
      
      // Tentar remover remotamente se online
      if (this.useFirebase && typeof window !== 'undefined' && window.remove) {
        try {
          await window.remove(key);
          return true;
        } catch (error) {
          console.warn('Erro ao remover remotamente:', error);
          this._addToOfflineQueue('remove', key, null);
          return true;
        }
      }
      
      return true;
    } catch (error) {
      console.error('Erro ao remover:', error);
      throw error;
    }
  }

  // ============================================================================
  // 🔄 SISTEMA DE QUEUE OFFLINE
  // ============================================================================

  /**
   * Adiciona operação à queue offline
   * @private
   */
  _addToOfflineQueue(operation, key, data) {
    this.offlineQueue.push({
      operation,
      key,
      data,
      timestamp: Date.now()
    });
    
    // Salvar queue no localStorage
    this._saveQueueToLocalStorage();
  }

  /**
   * Processa queue offline quando voltar online
   */
  async flushOfflineQueue() {
    if (!this.isOnline || this.offlineQueue.length === 0) {
      return;
    }
    
    const queue = [...this.offlineQueue];
    this.offlineQueue = [];
    
    for (const item of queue) {
      try {
        switch (item.operation) {
          case 'save':
            if (typeof window !== 'undefined' && window.save) {
              await window.save(item.key, item.data);
            }
            break;
          case 'remove':
            if (typeof window !== 'undefined' && window.remove) {
              await window.remove(item.key);
            }
            break;
        }
      } catch (error) {
        console.warn('Erro ao processar item da queue:', error);
        // Re-adicionar à queue se falhar
        this.offlineQueue.push(item);
      }
    }
    
    // Atualizar queue no localStorage
    this._saveQueueToLocalStorage();
  }

  /**
   * Salva queue no localStorage
   * @private
   */
  _saveQueueToLocalStorage() {
    try {
      localStorage.setItem(
        this.cachePrefix + 'offline_queue',
        JSON.stringify(this.offlineQueue)
      );
    } catch (error) {
      console.warn('Erro ao salvar queue no localStorage:', error);
    }
  }

  /**
   * Carrega queue do localStorage
   * @private
   */
  _loadQueueFromLocalStorage() {
    try {
      const queueData = localStorage.getItem(this.cachePrefix + 'offline_queue');
      if (queueData) {
        this.offlineQueue = JSON.parse(queueData);
      }
    } catch (error) {
      console.warn('Erro ao carregar queue do localStorage:', error);
      this.offlineQueue = [];
    }
  }

  // ============================================================================
  // 🗄️ CACHE LOCAL (IndexedDB + localStorage fallback)
  // ============================================================================

  /**
   * Inicializa sistema de cache
   * @private
   */
  async _initializeCache() {
    if (this.useIndexedDB && typeof window !== 'undefined' && 'indexedDB' in window) {
      try {
        // Tentar usar IndexedDB (assumindo que openDB já existe no main.js)
        if (typeof window.openDB === 'function') {
          this.cacheDB = await window.openDB('gastos-cache', 1);
        }
      } catch (error) {
        console.warn('Erro ao inicializar IndexedDB, usando localStorage:', error);
      }
    }
    
    // Carregar queue offline
    this._loadQueueFromLocalStorage();
  }

  /**
   * Salva no cache local
   * @private
   */
  async _saveToCache(key, data) {
    try {
      // Tentar IndexedDB primeiro
      if (this.cacheDB && typeof window !== 'undefined' && window.cacheSet) {
        await window.cacheSet(key, data);
        return;
      }
      
      // Fallback para localStorage
      localStorage.setItem(
        this.cachePrefix + key,
        JSON.stringify({
          data,
          timestamp: Date.now()
        })
      );
    } catch (error) {
      console.warn('Erro ao salvar no cache:', error);
    }
  }

  /**
   * Carrega do cache local
   * @private
   */
  async _loadFromCache(key) {
    try {
      // Tentar IndexedDB primeiro
      if (this.cacheDB && typeof window !== 'undefined' && window.cacheGet) {
        const cached = await window.cacheGet(key);
        if (cached !== null) return cached;
      }
      
      // Fallback para localStorage
      const cached = localStorage.getItem(this.cachePrefix + key);
      if (cached) {
        const parsed = JSON.parse(cached);
        return parsed.data;
      }
      
      return null;
    } catch (error) {
      console.warn('Erro ao carregar do cache:', error);
      return null;
    }
  }

  /**
   * Remove do cache local
   * @private
   */
  async _removeFromCache(key) {
    try {
      // Tentar IndexedDB primeiro
      if (this.cacheDB && typeof window !== 'undefined' && window.cacheDelete) {
        await window.cacheDelete(key);
      }
      
      // Remover do localStorage também
      localStorage.removeItem(this.cachePrefix + key);
    } catch (error) {
      console.warn('Erro ao remover do cache:', error);
    }
  }

  // ============================================================================
  // 🌐 LISTENERS DE CONECTIVIDADE
  // ============================================================================

  /**
   * Configura listeners para mudanças de conectividade
   * @private
   */
  _setupOnlineListeners() {
    if (typeof window === 'undefined') return;
    
    window.addEventListener('online', () => {
      this.isOnline = true;
      // Processar queue quando voltar online
      setTimeout(() => this.flushOfflineQueue(), 1000);
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  // ============================================================================
  // 📊 MÉTODOS DE INFORMAÇÃO
  // ============================================================================

  /**
   * Obtém estatísticas do storage
   */
  getStats() {
    return {
      isOnline: this.isOnline,
      queueSize: this.offlineQueue.length,
      useFirebase: this.useFirebase,
      useIndexedDB: this.useIndexedDB,
      hasIndexedDB: !!this.cacheDB
    };
  }

  /**
   * Obtém itens da queue offline
   */
  getOfflineQueue() {
    return [...this.offlineQueue];
  }

  /**
   * Limpa cache local
   */
  async clearCache() {
    try {
      // Limpar IndexedDB
      if (this.cacheDB && typeof window !== 'undefined' && window.cacheClear) {
        await window.cacheClear();
      }
      
      // Limpar localStorage
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.cachePrefix)) {
          localStorage.removeItem(key);
        }
      });
      
      // Limpar queue
      this.offlineQueue = [];
      
      return true;
    } catch (error) {
      console.error('Erro ao limpar cache:', error);
      return false;
    }
  }
}

// Instância global (será migrada futuramente para dependency injection)
export const storageManager = new StorageManager();

// Para debug no console
if (typeof window !== 'undefined') {
  window.StorageManager = StorageManager;
  window.storageManager = storageManager;
}