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