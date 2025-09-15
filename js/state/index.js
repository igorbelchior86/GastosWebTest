// ============================================================================
// 📊 STATE MODULE INDEX
// ============================================================================
// Ponto de entrada unificado para o sistema de estado
// FASE 2 refatoração - centralização de estado

export { AppState, appState } from './app-state.js';
export { StorageManager, storageManager } from './storage-manager.js';
export { StatePersistenceBridge, statePersistence } from './state-persistence.js';

/**
 * Inicializa todo o sistema de estado
 * Deve ser chamado na inicialização da aplicação
 */
export async function initializeState() {
  try {
    console.log('📊 Inicializando sistema de estado...');
    
    // Importar dinâmicamente para evitar problemas de ordem
    const { statePersistence } = await import('./state-persistence.js');
    
    // Inicializar persistência (que por sua vez inicializa estado e storage)
    await statePersistence.initialize();
    
    console.log('✅ Sistema de estado inicializado com sucesso');
    return true;
    
  } catch (error) {
    console.error('❌ Erro ao inicializar sistema de estado:', error);
    throw error;
  }
}

/**
 * Obtém referência para o estado principal da aplicação
 * Use esta função em vez de importar appState diretamente
 */
export function getAppState() {
  const { appState } = require('./app-state.js');
  return appState;
}

/**
 * Obtém referência para o gerenciador de storage
 * Use esta função em vez de importar storageManager diretamente
 */
export function getStorageManager() {
  const { storageManager } = require('./storage-manager.js');
  return storageManager;
}

/**
 * Utilitário para aguardar inicialização completa
 */
export function waitForStateInitialization(timeout = 5000) {
  return new Promise((resolve, reject) => {
    const checkInterval = 100;
    const maxAttempts = timeout / checkInterval;
    let attempts = 0;
    
    const check = () => {
      attempts++;
      
      // Verificar se já foi inicializado
      if (typeof window !== 'undefined' && window.statePersistence?.isInitialized) {
        resolve(true);
        return;
      }
      
      // Timeout
      if (attempts >= maxAttempts) {
        reject(new Error('Timeout aguardando inicialização do estado'));
        return;
      }
      
      // Tentar novamente
      setTimeout(check, checkInterval);
    };
    
    check();
  });
}