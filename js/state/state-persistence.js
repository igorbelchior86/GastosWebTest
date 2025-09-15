// ============================================================================
// 🔄 STATE PERSISTENCE BRIDGE
// ============================================================================
// Conecta AppState com StorageManager para persistência automática
// FASE 2 refatoração - integração entre estado e storage

import { appState } from './app-state.js';
import { storageManager } from './storage-manager.js';

/**
 * StatePersistenceBridge - Conecta estado com persistência
 * 
 * Responsabilidades:
 * - Carregar estado inicial do storage
 * - Salvar mudanças automaticamente
 * - Sincronizar com storage remoto
 * - Gerenciar ciclo de vida da persistência
 */
export class StatePersistenceBridge {
  constructor(state = appState, storage = storageManager) {
    this.state = state;
    this.storage = storage;
    this.isInitialized = false;
    this.autoSaveEnabled = true;
    this.saveDebounceMs = 500;
    this.saveTimeouts = new Map();
    
    // Bind methods
    this.initialize = this.initialize.bind(this);
    this.saveState = this.saveState.bind(this);
    this.loadState = this.loadState.bind(this);
    this._handleStateChange = this._handleStateChange.bind(this);
  }

  // ============================================================================
  // 🚀 INICIALIZAÇÃO
  // ============================================================================

  /**
   * Inicializa a ponte entre estado e persistência
   */
  async initialize() {
    if (this.isInitialized) return;
    
    try {
      // Carregar estado inicial
      await this.loadState();
      
      // Configurar auto-save
      if (this.autoSaveEnabled) {
        this._setupAutoSave();
      }
      
      this.isInitialized = true;
      console.log('📊 State persistence bridge initialized');
      
    } catch (error) {
      console.error('Erro ao inicializar state persistence bridge:', error);
      throw error;
    }
  }

  /**
   * Configura salvamento automático
   * @private
   */
  _setupAutoSave() {
    // Subscribir para mudanças no estado
    this.state.subscribe(this._handleStateChange);
  }

  /**
   * Handle mudanças no estado para auto-save
   * @private
   */
  _handleStateChange(type, data) {
    if (!this.autoSaveEnabled) return;
    
    // Debounce para evitar muitos saves
    if (this.saveTimeouts.has(type)) {
      clearTimeout(this.saveTimeouts.get(type));
    }
    
    const timeout = setTimeout(() => {
      this._saveStateType(type);
      this.saveTimeouts.delete(type);
    }, this.saveDebounceMs);
    
    this.saveTimeouts.set(type, timeout);
  }

  // ============================================================================
  // 💾 OPERAÇÕES DE PERSISTÊNCIA
  // ============================================================================

  /**
   * Carrega estado completo do storage
   */
  async loadState() {
    try {
      const [transactions, cards, startBalance] = await Promise.all([
        this.storage.load('tx', []),
        this.storage.load('cards', [{ name: 'Dinheiro', close: 0, due: 0 }]),
        this.storage.load('startBal', 0)
      ]);
      
      // Aplicar dados carregados ao estado
      this.state.setTransactions(Array.isArray(transactions) ? transactions : []);
      this.state.setCards(Array.isArray(cards) ? cards : [{ name: 'Dinheiro', close: 0, due: 0 }]);
      this.state.setStartBalance(Number(startBalance) || 0);
      
      console.log('📥 Estado carregado do storage:', {
        transactions: this.state.getTransactions().length,
        cards: this.state.getCards().length,
        startBalance: this.state.getStartBalance()
      });
      
    } catch (error) {
      console.error('Erro ao carregar estado:', error);
      // Continuar com valores padrão em caso de erro
    }
  }

  /**
   * Salva estado completo no storage
   */
  async saveState() {
    try {
      await Promise.all([
        this.storage.save('tx', this.state.getTransactions()),
        this.storage.save('cards', this.state.getCards()),
        this.storage.save('startBal', this.state.getStartBalance())
      ]);
      
      console.log('💾 Estado salvo no storage');
      
    } catch (error) {
      console.error('Erro ao salvar estado:', error);
      throw error;
    }
  }

  /**
   * Salva apenas um tipo específico de estado
   * @private
   */
  async _saveStateType(type) {
    try {
      switch (type) {
        case 'transactions':
          await this.storage.save('tx', this.state.getTransactions());
          break;
        case 'cards':
          await this.storage.save('cards', this.state.getCards());
          break;
        case 'startBalance':
          await this.storage.save('startBal', this.state.getStartBalance());
          break;
      }
    } catch (error) {
      console.warn(`Erro ao salvar ${type}:`, error);
    }
  }

  // ============================================================================
  // ⚙️ CONFIGURAÇÃO E CONTROLE
  // ============================================================================

  /**
   * Habilita/desabilita auto-save
   */
  setAutoSave(enabled) {
    this.autoSaveEnabled = enabled;
    
    if (!enabled) {
      // Limpar timeouts pendentes
      this.saveTimeouts.forEach(timeout => clearTimeout(timeout));
      this.saveTimeouts.clear();
    } else if (this.isInitialized) {
      this._setupAutoSave();
    }
  }

  /**
   * Define intervalo de debounce para auto-save
   */
  setSaveDebounce(ms) {
    this.saveDebounceMs = Math.max(100, ms);
  }

  /**
   * Força salvamento imediato
   */
  async forceSave() {
    // Cancelar salvamentos pendentes
    this.saveTimeouts.forEach(timeout => clearTimeout(timeout));
    this.saveTimeouts.clear();
    
    // Salvar imediatamente
    await this.saveState();
  }

  // ============================================================================
  // 🔄 SINCRONIZAÇÃO
  // ============================================================================

  /**
   * Sincroniza com storage remoto (Firebase)
   */
  async syncWithRemote() {
    if (!this.storage.isOnline) {
      console.log('📡 Offline - sincronização adiada');
      return false;
    }
    
    try {
      // Tentar flush da queue offline primeiro
      await this.storage.flushOfflineQueue();
      
      // Recarregar dados remotos se necessário
      // (implementar lógica de merge se houver conflitos)
      
      console.log('🔄 Sincronização com remoto concluída');
      return true;
      
    } catch (error) {
      console.error('Erro na sincronização:', error);
      return false;
    }
  }

  // ============================================================================
  // 📊 INFORMAÇÕES E DEBUG
  // ============================================================================

  /**
   * Obtém estatísticas da persistência
   */
  getStats() {
    return {
      isInitialized: this.isInitialized,
      autoSaveEnabled: this.autoSaveEnabled,
      saveDebounceMs: this.saveDebounceMs,
      pendingSaves: this.saveTimeouts.size,
      state: this.state.getStats(),
      storage: this.storage.getStats()
    };
  }

  /**
   * Obtém estado de sincronização
   */
  getSyncStatus() {
    return {
      isOnline: this.storage.isOnline,
      offlineQueueSize: this.storage.getOfflineQueue().length,
      lastSync: this.lastSyncTime || null,
      pendingSaves: Array.from(this.saveTimeouts.keys())
    };
  }

  // ============================================================================
  // 🛠️ UTILITÁRIOS
  // ============================================================================

  /**
   * Reseta estado e storage (útil para testes)
   */
  async reset() {
    // Parar auto-save
    this.setAutoSave(false);
    
    // Limpar estado
    this.state.setTransactions([]);
    this.state.setCards([{ name: 'Dinheiro', close: 0, due: 0 }]);
    this.state.setStartBalance(0);
    
    // Limpar storage
    await this.storage.clearCache();
    
    // Reinicializar
    this.isInitialized = false;
    await this.initialize();
  }

  /**
   * Cria backup do estado atual
   */
  createBackup() {
    return {
      timestamp: Date.now(),
      data: this.state.getSnapshot(),
      stats: this.getStats()
    };
  }

  /**
   * Restaura estado de um backup
   */
  async restoreFromBackup(backup) {
    if (!backup.data) {
      throw new Error('Backup inválido');
    }
    
    // Parar auto-save temporariamente
    const wasAutoSave = this.autoSaveEnabled;
    this.setAutoSave(false);
    
    try {
      // Restaurar estado
      this.state.setTransactions(backup.data.transactions || []);
      this.state.setCards(backup.data.cards || [{ name: 'Dinheiro', close: 0, due: 0 }]);
      this.state.setStartBalance(backup.data.startBalance || 0);
      
      // Salvar no storage
      await this.saveState();
      
      console.log('✅ Estado restaurado do backup');
      
    } finally {
      // Restaurar auto-save
      this.setAutoSave(wasAutoSave);
    }
  }
}

// Instância global
export const statePersistence = new StatePersistenceBridge();

// Para debug no console
if (typeof window !== 'undefined') {
  window.StatePersistenceBridge = StatePersistenceBridge;
  window.statePersistence = statePersistence;
}