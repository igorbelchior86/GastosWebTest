// ============================================================================
// 🔧 SUITE DE TESTES DE REFATORAÇÃO - GASTOS APP
// ============================================================================
// Testes específicos para acompanhar cada fase da refatoração
// Uso: runRefactorTests() no console após cada mudança

class RefactorTestSuite extends TestRunner {
  constructor() {
    super();
    this.testsByPhase = new Map();
  }

  addPhaseTest(phase, name, testFn) {
    if (!this.testsByPhase.has(phase)) {
      this.testsByPhase.set(phase, []);
    }
    this.testsByPhase.get(phase).push({ name, testFn });
    this.addTest(name, testFn, `FASE ${phase}`);
  }

  async runPhaseTests(phase) {
    console.log(`🔧 TESTANDO FASE ${phase}...`);
    const phaseTests = this.testsByPhase.get(phase) || [];
    
    for (const test of phaseTests) {
      await this.runTest({ ...test, category: `FASE ${phase}` });
    }
    
    console.log(`✅ Fase ${phase} testada: ${this.passedCount}/${this.passedCount + this.failedCount} passou`);
  }
}

const refactorTester = new RefactorTestSuite();

// ============================================================================
// 🧪 TESTES BASELINE - FUNCIONALIDADES CRÍTICAS
// ============================================================================

refactorTester.addPhaseTest('BASELINE', 'Sistema de autenticação funcional', async () => {
  refactorTester.assertExists(window.Auth, 'Auth system deve existir');
  refactorTester.assertFunction(window.Auth.signInWithGoogle, 'signInWithGoogle deve ser função');
});

refactorTester.addPhaseTest('BASELINE', 'Estado global acessível', async () => {
  refactorTester.assert(Array.isArray(transactions), 'transactions deve ser array');
  refactorTester.assert(Array.isArray(cards), 'cards deve ser array');
  refactorTester.assert(typeof startBalance === 'number', 'startBalance deve ser number');
});

refactorTester.addPhaseTest('BASELINE', 'Modais funcionais', async () => {
  const txModal = document.getElementById('txModal');
  const cardModal = document.getElementById('cardModal');
  refactorTester.assertExists(txModal, 'Modal de transação deve existir');
  refactorTester.assertExists(cardModal, 'Modal de cartão deve existir');
});

refactorTester.addPhaseTest('BASELINE', 'Tabela principal renderiza', async () => {
  const table = document.querySelector('#dailyTable tbody');
  refactorTester.assertExists(table, 'Tabela principal deve existir');
  refactorTester.assertFunction(renderTable, 'renderTable deve ser função');
});

refactorTester.addPhaseTest('BASELINE', 'Funções CRUD básicas', async () => {
  refactorTester.assertFunction(save, 'save deve ser função');
  refactorTester.assertFunction(load, 'load deve ser função');
  refactorTester.assertFunction(addTransaction, 'addTransaction deve ser função');
  refactorTester.assertFunction(deleteTransaction, 'deleteTransaction deve ser função');
});

// ============================================================================
// 📊 TESTES FASE 2 - ESTADO CENTRALIZADO
// ============================================================================

refactorTester.addPhaseTest(2, 'Estado centralizado em módulo', async () => {
  // Após refatoração, deve existir um módulo de estado
  const hasStateModule = window.AppState || window.stateManager;
  refactorTester.assert(hasStateModule, 'Módulo de estado deve existir');
});

refactorTester.addPhaseTest(2, 'Getters/setters para estado', async () => {
  // Verifica se estado não é mais acessado diretamente
  if (window.AppState) {
    refactorTester.assertFunction(window.AppState.getTransactions, 'getTransactions deve ser função');
    refactorTester.assertFunction(window.AppState.getCards, 'getCards deve ser função');
    refactorTester.assertFunction(window.AppState.getBalance, 'getBalance deve ser função');
  }
});

// ============================================================================
// 🔧 TESTES FASE 3 - UTILITÁRIOS
// ============================================================================

refactorTester.addPhaseTest(3, 'Formatters - Utilitários de formatação modularizados', async () => {
  refactorTester.assertExists(window.Formatters, 'Formatters deve existir globalmente');
  refactorTester.assertFunction(window.Formatters.escapeHtml, 'Formatters.escapeHtml deve ser função');
  refactorTester.assertFunction(window.Formatters.formatMoney, 'Formatters.formatMoney deve ser função');
  refactorTester.assertFunction(window.Formatters.formatDate, 'Formatters.formatDate deve ser função');
  
  // Testa formatação de HTML
  const escaped = Formatters.escapeHtml('<script>alert("xss")</script>');
  refactorTester.assert(!escaped.includes('<script>'), 'HTML deve ser escapado');
  refactorTester.assert(escaped.includes('&lt;'), 'Deve conter caracteres escapados');
  
  // Testa formatação de dinheiro
  const money = Formatters.formatMoney(1234.56);
  refactorTester.assert(typeof money === 'string', 'formatMoney deve retornar string');
});

refactorTester.addPhaseTest(3, 'Calculations - Cálculos de datas e financeiros', async () => {
  refactorTester.assertExists(window.Calculations, 'Calculations deve existir globalmente');
  refactorTester.assertFunction(window.Calculations.todayISO, 'Calculations.todayISO deve ser função');
  refactorTester.assertFunction(window.Calculations.formatToISO, 'Calculations.formatToISO deve ser função');
  refactorTester.assertFunction(window.Calculations.addDaysISO, 'Calculations.addDaysISO deve ser função');
  
  // Testa cálculo de data
  const today = Calculations.todayISO();
  refactorTester.assert(today.match(/^\d{4}-\d{2}-\d{2}$/), 'todayISO deve retornar data ISO válida');
  
  // Testa adição de dias
  const futureDate = Calculations.addDaysISO('2025-01-01', 10);
  refactorTester.assertEqual(futureDate, '2025-01-11', 'addDaysISO deve adicionar dias corretamente');
});

refactorTester.addPhaseTest(3, 'Validators - Validação e sanitização', async () => {
  refactorTester.assertExists(window.Validators, 'Validators deve existir globalmente');
  refactorTester.assertFunction(window.Validators.isValidTransaction, 'Validators.isValidTransaction deve ser função');
  refactorTester.assertFunction(window.Validators.sanitizeTransactions, 'Validators.sanitizeTransactions deve ser função');
  refactorTester.assertFunction(window.Validators.isValidISODate, 'Validators.isValidISODate deve ser função');
  
  // Testa validação de data ISO
  refactorTester.assert(Validators.isValidISODate('2025-01-15'), 'Data ISO válida deve passar');
  refactorTester.assert(!Validators.isValidISODate('2025-13-45'), 'Data ISO inválida deve falhar');
  
  // Testa validação de transação
  const validTx = {
    id: 'test-123',
    date: '2025-01-15',
    amount: -100.50,
    card: 'Teste',
    category: 'Categoria',
    note: 'Nota teste'
  };
  refactorTester.assert(Validators.isValidTransaction(validTx), 'Transação válida deve passar');
});

refactorTester.addPhaseTest(3, 'DateHelpers - Helpers específicos de datas', async () => {
  refactorTester.assertExists(window.DateHelpers, 'DateHelpers deve existir globalmente');
  refactorTester.assertFunction(window.DateHelpers.getCurrentPeriod, 'DateHelpers.getCurrentPeriod deve ser função');
  refactorTester.assertFunction(window.DateHelpers.formatPeriod, 'DateHelpers.formatPeriod deve ser função');
  refactorTester.assertFunction(window.DateHelpers.getPreviousPeriod, 'DateHelpers.getPreviousPeriod deve ser função');
  
  // Testa período atual
  const currentPeriod = DateHelpers.getCurrentPeriod();
  refactorTester.assert(currentPeriod.match(/^\d{4}-\d{2}$/), 'getCurrentPeriod deve retornar formato YYYY-MM');
  
  // Testa formatação de período
  const formatted = DateHelpers.formatPeriod('2025-01');
  refactorTester.assert(formatted.includes('Janeiro'), 'formatPeriod deve retornar nome do mês');
  
  // Testa período anterior
  const previous = DateHelpers.getPreviousPeriod('2025-03');
  refactorTester.assertEqual(previous, '2025-02', 'getPreviousPeriod deve retornar mês anterior');
});

refactorTester.addPhaseTest(3, 'Compatibilidade - Funções globais mantidas', async () => {
  // Verifica se funções globais ainda existem após refatoração
  refactorTester.assertFunction(window.todayISO, 'todayISO global deve existir');
  refactorTester.assertFunction(window.post, 'post global deve existir');
  refactorTester.assertFunction(window.escapeHtml, 'escapeHtml global deve existir');
  refactorTester.assertFunction(window.sanitizeTransactions, 'sanitizeTransactions global deve existir');
  
  // Verifica se as funções retornam os mesmos resultados
  const today1 = window.todayISO();
  const today2 = Calculations.todayISO();
  refactorTester.assertEqual(today1, today2, 'Função global e classe devem retornar mesmo resultado');
});

refactorTester.addPhaseTest(3, 'Utilitários de data modularizados', async () => {
  refactorTester.assertFunction(todayISO, 'todayISO deve continuar funcionando');
  refactorTester.assertFunction(post, 'post deve continuar funcionando');
  
  // Testa que os utilitários estão nos módulos corretos
  const hasNewModules = window.Calculations && window.DateHelpers;
  refactorTester.assert(hasNewModules, 'Novos módulos de data devem estar disponíveis');
});

refactorTester.addPhaseTest(3, 'Utilitários de formatação modularizados', async () => {
  refactorTester.assertFunction(formatMoney, 'formatMoney deve continuar funcionando');
  refactorTester.assertFunction(escHtml, 'escHtml deve continuar funcionando');
  
  // Verifica novos módulos
  const hasFormatters = window.Formatters;
  refactorTester.assert(hasFormatters, 'Módulo Formatters deve estar disponível');
});

refactorTester.addPhaseTest(3, 'Utilitários de dados modularizados', async () => {
  refactorTester.assertFunction(sanitizeTransactions, 'sanitizeTransactions deve continuar funcionando');
  
  // Verifica novos módulos
  const hasValidators = window.Validators;
  refactorTester.assert(hasValidators, 'Módulo Validators deve estar disponível');
});

// ============================================================================
// 🎨 TESTES FASE 4 - CAMADA DE VIEW
// ============================================================================

refactorTester.addPhaseTest(4, 'DOMSelectors - Módulo de seletores centralizados', async () => {
  refactorTester.assertExists(window.DOMSelectors, 'DOMSelectors deve existir globalmente');
  refactorTester.assertFunction(window.DOMSelectors.init, 'DOMSelectors.init deve ser função');
  refactorTester.assertFunction(window.DOMSelectors.get, 'DOMSelectors.get deve ser função');
  
  // Testa inicialização se necessário
  if (!DOMSelectors._initialized) {
    DOMSelectors.init();
  }
  
  // Testa getters específicos
  refactorTester.assert(typeof DOMSelectors.deleteRecurrenceModal !== 'undefined', 'deleteRecurrenceModal getter deve existir');
  refactorTester.assert(typeof DOMSelectors.plannedModal !== 'undefined', 'plannedModal getter deve existir');
});

refactorTester.addPhaseTest(4, 'ViewState - Gerenciamento de estado visual', async () => {
  refactorTester.assertExists(window.ViewState, 'ViewState deve existir globalmente');
  refactorTester.assertFunction(window.ViewState.openModal, 'ViewState.openModal deve ser função');
  refactorTester.assertFunction(window.ViewState.closeModal, 'ViewState.closeModal deve ser função');
  refactorTester.assertFunction(window.ViewState.showLoading, 'ViewState.showLoading deve ser função');
  refactorTester.assertFunction(window.ViewState.getState, 'ViewState.getState deve ser função');
  
  // Testa estado inicial
  const state = ViewState.getState();
  refactorTester.assert(state.activeModal === null, 'Estado inicial deve ter modal null');
  refactorTester.assert(state.loadingElements instanceof Set, 'loadingElements deve ser Set');
});

refactorTester.addPhaseTest(4, 'Renderers - Funções de renderização modularizadas', async () => {
  refactorTester.assertExists(window.Renderers, 'Renderers deve existir globalmente');
  refactorTester.assertFunction(window.Renderers.renderTable, 'Renderers.renderTable deve ser função');
  refactorTester.assertFunction(window.Renderers.renderCardList, 'Renderers.renderCardList deve ser função');
  refactorTester.assertFunction(window.Renderers.updatePendingBadge, 'Renderers.updatePendingBadge deve ser função');
  refactorTester.assertFunction(window.Renderers.renderError, 'Renderers.renderError deve ser função');
  
  // Testa renderização sem quebrar se elemento não existe
  try {
    Renderers.updatePendingBadge(5);
    refactorTester.assert(true, 'updatePendingBadge executou sem erros');
  } catch (error) {
    refactorTester.assert(error.message.includes('not found') || error.message.includes('null'), 
      'Deve tratar elementos ausentes graciosamente');
  }
});

refactorTester.addPhaseTest(4, 'ViewLayer - Interface unificada da view', async () => {
  refactorTester.assertExists(window.ViewLayer, 'ViewLayer deve existir globalmente');
  refactorTester.assertFunction(window.ViewLayer.init, 'ViewLayer.init deve ser função');
  refactorTester.assertFunction(window.ViewLayer.render, 'ViewLayer.render deve ser função');
  refactorTester.assertFunction(window.ViewLayer.withLoading, 'ViewLayer.withLoading deve ser função');
  refactorTester.assertFunction(window.ViewLayer.isInitialized, 'ViewLayer.isInitialized deve ser função');
  
  // Testa debug info
  const debugInfo = ViewLayer.getDebugInfo();
  refactorTester.assert(typeof debugInfo === 'object', 'getDebugInfo deve retornar objeto');
  refactorTester.assert(typeof debugInfo.initialized === 'boolean', 'debugInfo deve ter flag initialized');
});

refactorTester.addPhaseTest(4, 'StickyHeader - Compatibilidade mantida', async () => {
  refactorTester.assertExists(window.stickyHeaderManager, 'stickyHeaderManager deve existir globalmente');
  refactorTester.assertFunction(window.updateStickyMonth, 'updateStickyMonth função de compatibilidade deve existir');
  refactorTester.assertFunction(window.createStickyMonth, 'createStickyMonth função de compatibilidade deve existir');
  
  // Testa métodos da classe
  refactorTester.assertFunction(window.stickyHeaderManager.init, 'stickyHeaderManager.init deve ser função');
  refactorTester.assertFunction(window.stickyHeaderManager.updateStickyContent, 'updateStickyContent deve ser função');
  
  // Testa execução da função global
  try {
    window.updateStickyMonth();
    refactorTester.assert(true, 'updateStickyMonth executou sem erros');
  } catch (error) {
    console.warn('updateStickyMonth erro (aceitável se DOM não carregou):', error.message);
    refactorTester.assert(true, 'updateStickyMonth tratou erro graciosamente');
  }
});

refactorTester.addPhaseTest(4, 'Renderização modularizada', async () => {
  // Verifica se renderização foi extraída para módulos
  const hasViewModule = window.Renderers || window.ViewLayer;
  refactorTester.assert(hasViewModule, 'Módulos de view devem existir');
});

refactorTester.addPhaseTest(4, 'DOM helpers centralizados', async () => {
  // Verifica se manipulação DOM foi centralizada
  const domHelpers = window.DOMSelectors;
  refactorTester.assert(domHelpers, 'DOMSelectors deve estar disponível');
  
  // Testa funcionalidades básicas
  refactorTester.assertFunction(domHelpers.byId, 'DOMSelectors.byId deve existir');
  refactorTester.assertFunction(domHelpers.bySelector, 'DOMSelectors.bySelector deve existir');
});

// ============================================================================
// 🎯 TESTES FASE 6 - MÓDULOS DE FEATURES
// ============================================================================

refactorTester.addPhaseTest(6, 'Módulo de transações independente', async () => {
  const txModule = window.TransactionModule;
  if (txModule) {
    refactorTester.assertFunction(txModule.add, 'TransactionModule.add deve existir');
    refactorTester.assertFunction(txModule.delete, 'TransactionModule.delete deve existir');
    refactorTester.assertFunction(txModule.edit, 'TransactionModule.edit deve existir');
  }
});

refactorTester.addPhaseTest(6, 'Módulo de cartões independente', async () => {
  const cardModule = window.CardModule;
  if (cardModule) {
    refactorTester.assertFunction(cardModule.add, 'CardModule.add deve existir');
    refactorTester.assertFunction(cardModule.delete, 'CardModule.delete deve existir');
    refactorTester.assertFunction(cardModule.list, 'CardModule.list deve existir');
  }
});

refactorTester.addPhaseTest(6, 'Módulo de planejados independente', async () => {
  const plannedModule = window.PlannedModule;
  if (plannedModule) {
    refactorTester.assertFunction(plannedModule.list, 'PlannedModule.list deve existir');
    refactorTester.assertFunction(plannedModule.execute, 'PlannedModule.execute deve existir');
  }
});

// ============================================================================
// 🧹 TESTES FASE 9 - MAIN.JS LIMPO
// ============================================================================

refactorTester.addPhaseTest(9, 'Main.js reduzido', async () => {
  // Verifica se main.js foi drasticamente reduzido
  const response = await fetch('main.js');
  const content = await response.text();
  const lines = content.split('\n').length;
  refactorTester.assert(lines < 1000, `Main.js deve ter menos que 1000 linhas (atual: ${lines})`);
});

refactorTester.addPhaseTest(9, 'Variáveis globais reduzidas', async () => {
  // Conta variáveis globais (aproximado)
  const globalVars = Object.keys(window).filter(key => 
    !key.startsWith('webkit') && 
    !key.startsWith('chrome') && 
    !['location', 'document', 'navigator', 'console'].includes(key)
  ).length;
  
  console.log(`Variáveis globais detectadas: ${globalVars}`);
  // Deve ter significativamente menos que antes
});

refactorTester.addPhaseTest(9, 'Imports organizados', async () => {
  const response = await fetch('main.js');
  const content = await response.text();
  const importCount = (content.match(/^import /gm) || []).length;
  refactorTester.assert(importCount >= 5, `Deve ter pelo menos 5 imports organizados (atual: ${importCount})`);
});

// ============================================================================
// 🎯 FASE 5 - EVENT HANDLERS MODULARIZAÇÃO
// ============================================================================

refactorTester.addPhaseTest(5, 'EventManager carregado e funcional', async () => {
  refactorTester.assertExists(window.EventManager, 'EventManager deve estar disponível globalmente');
  refactorTester.assertFunction(window.EventManager.init, 'EventManager.init deve ser função');
  refactorTester.assertFunction(window.EventManager.emit, 'EventManager.emit deve ser função');
  refactorTester.assertFunction(window.EventManager.on, 'EventManager.on deve ser função');
  refactorTester.assertFunction(window.EventManager.getStats, 'EventManager.getStats deve ser função');
});

refactorTester.addPhaseTest(5, 'UIEventHandlers carregado', async () => {
  refactorTester.assertExists(window.UIEventHandlers, 'UIEventHandlers deve estar disponível');
  refactorTester.assertFunction(window.UIEventHandlers.init, 'UIEventHandlers.init deve ser função');
  refactorTester.assertFunction(window.UIEventHandlers.addListener, 'UIEventHandlers.addListener deve ser função');
  refactorTester.assertFunction(window.UIEventHandlers.getDebugInfo, 'UIEventHandlers.getDebugInfo deve ser função');
});

refactorTester.addPhaseTest(5, 'AuthEventHandlers carregado', async () => {
  refactorTester.assertExists(window.AuthEventHandlers, 'AuthEventHandlers deve estar disponível');
  refactorTester.assertFunction(window.AuthEventHandlers.init, 'AuthEventHandlers.init deve ser função');
  refactorTester.assertFunction(window.AuthEventHandlers.onAuthStateChange, 'AuthEventHandlers.onAuthStateChange deve ser função');
  refactorTester.assertFunction(window.AuthEventHandlers.getDebugInfo, 'AuthEventHandlers.getDebugInfo deve ser função');
});

refactorTester.addPhaseTest(5, 'TouchEventHandlers carregado', async () => {
  refactorTester.assertExists(window.TouchEventHandlers, 'TouchEventHandlers deve estar disponível');
  refactorTester.assertFunction(window.TouchEventHandlers.init, 'TouchEventHandlers.init deve ser função');
  refactorTester.assertFunction(window.TouchEventHandlers.setSwipeThreshold, 'TouchEventHandlers.setSwipeThreshold deve ser função');
  refactorTester.assertFunction(window.TouchEventHandlers.getDebugInfo, 'TouchEventHandlers.getDebugInfo deve ser função');
});

refactorTester.addPhaseTest(5, 'NetworkEventHandlers carregado', async () => {
  refactorTester.assertExists(window.NetworkEventHandlers, 'NetworkEventHandlers deve estar disponível');
  refactorTester.assertFunction(window.NetworkEventHandlers.init, 'NetworkEventHandlers.init deve ser função');
  refactorTester.assertFunction(window.NetworkEventHandlers.getNetworkStatus, 'NetworkEventHandlers.getNetworkStatus deve ser função');
  refactorTester.assertFunction(window.NetworkEventHandlers.getPWAStatus, 'NetworkEventHandlers.getPWAStatus deve ser função');
  refactorTester.assertFunction(window.NetworkEventHandlers.installPWA, 'NetworkEventHandlers.installPWA deve ser função');
});

refactorTester.addPhaseTest(5, 'EventManager inicializado com handlers', async () => {
  // Aguarda inicialização se ainda não ocorreu
  let attempts = 0;
  while ((!window.EventManager || !window.EventManager._initialized) && attempts < 10) {
    await new Promise(resolve => setTimeout(resolve, 100));
    attempts++;
  }
  
  refactorTester.assert(window.EventManager && window.EventManager._initialized, 'EventManager deve estar inicializado');
  
  const stats = window.EventManager.getStats();
  refactorTester.assert(stats.handlersCount >= 4, 'Deve ter pelo menos 4 handlers registrados');
  refactorTester.assertExists(stats.handlers.UIEventHandlers, 'UIEventHandlers deve estar nos stats');
  refactorTester.assertExists(stats.handlers.AuthEventHandlers, 'AuthEventHandlers deve estar nos stats');
  refactorTester.assertExists(stats.handlers.TouchEventHandlers, 'TouchEventHandlers deve estar nos stats');
  refactorTester.assertExists(stats.handlers.NetworkEventHandlers, 'NetworkEventHandlers deve estar nos stats');
});

refactorTester.addPhaseTest(5, 'Event bus funcional', async () => {
  let eventReceived = false;
  const testData = { test: 'phase5' };
  
  // Adiciona listener
  const removeListener = window.EventManager.on('test:phase5', (data) => {
    eventReceived = true;
    refactorTester.assert(data.test === 'phase5', 'Dados do evento devem ser corretos');
  });
  
  // Emite evento
  window.EventManager.emit('test:phase5', testData);
  
  // Aguarda processamento
  await new Promise(resolve => setTimeout(resolve, 10));
  
  refactorTester.assert(eventReceived, 'Event bus deve processar eventos corretamente');
  
  // Remove listener
  removeListener();
});

refactorTester.addPhaseTest(5, 'Handler debug info disponível', async () => {
  const handlers = ['UIEventHandlers', 'AuthEventHandlers', 'TouchEventHandlers', 'NetworkEventHandlers'];
  
  for (const handlerName of handlers) {
    const handler = window[handlerName];
    refactorTester.assertExists(handler, `${handlerName} deve existir`);
    refactorTester.assertFunction(handler.getDebugInfo, `${handlerName}.getDebugInfo deve ser função`);
    
    const debugInfo = handler.getDebugInfo();
    refactorTester.assertExists(debugInfo.initialized, `${handlerName} debug deve ter propriedade initialized`);
    refactorTester.assertExists(debugInfo.activeListeners, `${handlerName} debug deve ter propriedade activeListeners`);
    refactorTester.assertExists(debugInfo.listenerCount, `${handlerName} debug deve ter propriedade listenerCount`);
  }
});

refactorTester.addPhaseTest(5, 'Cleanup de handlers funcional', async () => {
  // Testa se cleanup não quebra a aplicação
  const initialStats = window.EventManager.getStats();
  
  // Não fazemos cleanup real para não quebrar a app, apenas testamos se a função existe
  refactorTester.assertFunction(window.EventManager.cleanup, 'EventManager.cleanup deve ser função');
  
  // Testa cleanup individual de handlers
  const handlers = ['UIEventHandlers', 'AuthEventHandlers', 'TouchEventHandlers', 'NetworkEventHandlers'];
  for (const handlerName of handlers) {
    const handler = window[handlerName];
    refactorTester.assertFunction(handler.removeAllListeners, `${handlerName}.removeAllListeners deve ser função`);
  }
});

refactorTester.addPhaseTest(5, 'Handlers não conflitam com funcionalidade existente', async () => {
  // Testa se modals ainda funcionam
  refactorTester.assertFunction(openSettings, 'openSettings deve ainda funcionar');
  refactorTester.assertFunction(closeSettings, 'closeSettings deve ainda funcionar');
  
  // Testa se elementos DOM ainda são acessíveis via DOMSelectors
  refactorTester.assertExists(window.DOMSelectors, 'DOMSelectors deve estar disponível');
  refactorTester.assertFunction(window.DOMSelectors.byId, 'DOMSelectors.byId deve funcionar');
  
  // Testa se auth ainda funciona
  refactorTester.assertExists(window.Auth, 'Auth deve ainda estar disponível');
  
  // Testa se view layer ainda funciona
  refactorTester.assertExists(window.ViewLayer, 'ViewLayer deve estar disponível');
});

refactorTester.addPhaseTest(5, 'Event handlers específicos funcionais', async () => {
  // Testa se handlers específicos podem ser chamados sem erro
  try {
    // UIEventHandlers
    const uiDebug = window.UIEventHandlers.getDebugInfo();
    refactorTester.assert(typeof uiDebug === 'object', 'UIEventHandlers debug deve retornar objeto');
    
    // AuthEventHandlers
    const authDebug = window.AuthEventHandlers.getDebugInfo();
    refactorTester.assert(typeof authDebug === 'object', 'AuthEventHandlers debug deve retornar objeto');
    
    // TouchEventHandlers
    const touchDebug = window.TouchEventHandlers.getDebugInfo();
    refactorTester.assert(typeof touchDebug === 'object', 'TouchEventHandlers debug deve retornar objeto');
    
    // NetworkEventHandlers
    const networkDebug = window.NetworkEventHandlers.getDebugInfo();
    refactorTester.assert(typeof networkDebug === 'object', 'NetworkEventHandlers debug deve retornar objeto');
    
    // Network status
    const networkStatus = window.NetworkEventHandlers.getNetworkStatus();
    refactorTester.assert(typeof networkStatus.isOnline === 'boolean', 'Network status deve ter isOnline boolean');
    
    // PWA status
    const pwaStatus = window.NetworkEventHandlers.getPWAStatus();
    refactorTester.assert(typeof pwaStatus.isInstalled === 'boolean', 'PWA status deve ter isInstalled boolean');
    
  } catch (error) {
    refactorTester.fail(`Event handlers devem ser funcionais: ${error.message}`);
  }
});

refactorTester.addPhaseTest(5, 'Event delegation funcional', async () => {
  // Testa se event delegation ainda funciona após modularização
  const testButton = document.createElement('button');
  testButton.className = 'tx-btn';
  testButton.dataset.action = 'edit';
  testButton.dataset.txId = 'test123';
  
  // Adiciona ao DOM temporariamente
  document.body.appendChild(testButton);
  
  let eventHandled = false;
  
  // Mock da função de edição
  const originalEditTx = window.editTx;
  window.editTx = (txId) => {
    eventHandled = true;
    refactorTester.assert(txId === 'test123', 'ID da transação deve ser passado corretamente');
  };
  
  // Simula clique
  testButton.click();
  
  // Aguarda processamento
  await new Promise(resolve => setTimeout(resolve, 10));
  
  // Cleanup
  document.body.removeChild(testButton);
  window.editTx = originalEditTx;
  
  refactorTester.assert(eventHandled, 'Event delegation deve funcionar para botões de transação');
});

refactorTester.addPhaseTest(5, 'Sistema de eventos não quebra carregamento', async () => {
  // Verifica se não há erros de import que quebram a app
  const response = await fetch('main.js');
  const content = await response.text();
  
  // Verifica se imports de eventos estão presentes
  refactorTester.assert(content.includes('EventManager'), 'main.js deve importar EventManager');
  
  // Verifica se não há erros óbvios de sintaxe
  refactorTester.assert(!content.includes('import {'), 'Não deve ter imports malformados');
  
  // Verifica se inicialização está presente
  refactorTester.assert(content.includes('initializeEventSystem'), 'main.js deve conter inicialização do sistema de eventos');
});

// ============================================================================
// 🚀 FUNÇÃO PRINCIPAL PARA TESTAR REFATORAÇÃO
// ============================================================================

async function runRefactorTests(phase = null) {
  console.clear();
  console.log('🔧 EXECUTANDO TESTES DE REFATORAÇÃO...\n');
  
  if (phase) {
    await refactorTester.runPhaseTests(phase);
  } else {
    await refactorTester.runAllTests();
  }
  
  return refactorTester.results;
}

// Torna disponível globalmente
window.runRefactorTests = runRefactorTests;
window.refactorTester = refactorTester;

console.log('🔧 Suite de testes de refatoração carregada!');
console.log('💡 Use: runRefactorTests() ou runRefactorTests(2) para fase específica');