// ============================================================================
// 🧪 SUITE DE TESTES AUTOMATIZADOS - GASTOS APP
// ============================================================================
// Testa funcionalidades críticas para garantir que refatorações não quebrem nada
// Uso: Abra o console e execute runAllTests()

class TestRunner {
  constructor() {
    this.tests = [];
    this.results = [];
    this.passedCount = 0;
    this.failedCount = 0;
  }

  // Adiciona um teste à suite
  addTest(name, testFn, category = 'General') {
    this.tests.push({ name, testFn, category });
  }

  // Executa todos os testes
  async runAllTests() {
    console.clear();
    console.log('🧪 INICIANDO TESTES AUTOMATIZADOS...\n');
    
    this.results = [];
    this.passedCount = 0;
    this.failedCount = 0;

    const startTime = performance.now();

    for (const test of this.tests) {
      await this.runTest(test);
    }

    const endTime = performance.now();
    const duration = Math.round(endTime - startTime);

    this.printSummary(duration);
    return {
      passed: this.passedCount,
      failed: this.failedCount,
      total: this.tests.length,
      duration
    };
  }

  // Executa um teste individual
  async runTest(test) {
    try {
      console.log(`⏳ ${test.category}: ${test.name}`);
      await test.testFn();
      console.log(`✅ PASSOU: ${test.name}`);
      this.results.push({ ...test, status: 'PASSOU' });
      this.passedCount++;
    } catch (error) {
      console.error(`❌ FALHOU: ${test.name}`, error);
      this.results.push({ ...test, status: 'FALHOU', error });
      this.failedCount++;
    }
  }

  // Imprime resumo final
  printSummary(duration) {
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMO DOS TESTES');
    console.log('='.repeat(60));
    console.log(`✅ Passou: ${this.passedCount}`);
    console.log(`❌ Falhou: ${this.failedCount}`);
    console.log(`⏱️  Tempo: ${duration}ms`);
    console.log(`📈 Taxa de sucesso: ${Math.round((this.passedCount / this.tests.length) * 100)}%`);
    
    if (this.failedCount > 0) {
      console.log('\n❌ TESTES QUE FALHARAM:');
      this.results.filter(r => r.status === 'FALHOU').forEach(r => {
        console.log(`   • ${r.category}: ${r.name}`);
      });
    }
    
    console.log('\n🎯 TODOS OS TESTES CONCLUÍDOS!');
  }

  // Helpers para assertions
  assert(condition, message) {
    if (!condition) {
      throw new Error(message || 'Assertion failed');
    }
  }

  assertEqual(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(`${message || 'Values not equal'}: expected ${expected}, got ${actual}`);
    }
  }

  assertExists(element, message) {
    if (!element) {
      throw new Error(message || 'Element does not exist');
    }
  }

  assertFunction(fn, message) {
    if (typeof fn !== 'function') {
      throw new Error(message || 'Expected a function');
    }
  }

  // Helper para aguardar condições
  async waitFor(condition, timeout = 5000) {
    const start = Date.now();
    while (!condition()) {
      if (Date.now() - start > timeout) {
        throw new Error('Timeout waiting for condition');
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  // Helper para simular eventos
  simulateClick(element) {
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    element.dispatchEvent(event);
  }

  simulateInput(element, value) {
    element.value = value;
    const event = new Event('input', { bubbles: true });
    element.dispatchEvent(event);
  }
}

// ============================================================================
// 🧪 DEFINIÇÃO DOS TESTES
// ============================================================================

const testRunner = new TestRunner();

// ---------------------------------------------------------------------------
// 📦 TESTES DE DEPENDÊNCIAS E INICIALIZAÇÃO
// ---------------------------------------------------------------------------

testRunner.addTest('Verificar dependências globais', async () => {
  testRunner.assertFunction(window.Auth?.signInWithGoogle, 'Auth.signInWithGoogle missing');
  testRunner.assertFunction(save, 'save function missing');
  testRunner.assertFunction(load, 'load function missing');
  testRunner.assert(Array.isArray(transactions), 'transactions is not array');
  testRunner.assert(Array.isArray(cards), 'cards is not array');
}, 'Dependências');

testRunner.addTest('Verificar funções utilitárias', async () => {
  testRunner.assertFunction(todayISO, 'todayISO missing');
  testRunner.assertFunction(post, 'post missing');
  testRunner.assertFunction(escHtml, 'escHtml missing');
  testRunner.assertFunction(sortTransactions, 'sortTransactions missing');
  testRunner.assertFunction(sanitizeTransactions, 'sanitizeTransactions missing');
}, 'Dependências');

testRunner.addTest('Verificar elementos DOM críticos', async () => {
  testRunner.assertExists(document.getElementById('txModal'), 'Modal de transação não encontrado');
  testRunner.assertExists(document.getElementById('cardModal'), 'Modal de cartão não encontrado');
  testRunner.assertExists(document.querySelector('#dailyTable tbody'), 'Tabela principal não encontrada');
}, 'DOM');

// ---------------------------------------------------------------------------
// 📊 TESTES DE FUNÇÕES DE CÁLCULO
// ---------------------------------------------------------------------------

testRunner.addTest('Cálculos de data (todayISO)', async () => {
  const today = todayISO();
  testRunner.assert(today.match(/^\d{4}-\d{2}-\d{2}$/), 'todayISO format invalid');
}, 'Cálculos');

testRunner.addTest('Cálculos de postDate para cartão', async () => {
  // Simula um cartão com fechamento e vencimento conhecidos
  const originalCards = [...cards];
  try {
    // Adiciona cartão de teste
    cards.push({ name: 'Teste', close: 15, due: 10 });
    
    // Testa cálculo para data antes do fechamento
    const result1 = post('2025-09-10', 'Teste');
    testRunner.assert(result1 >= '2025-09-10', 'postDate deve ser futuro');
    
    // Testa cálculo para data após fechamento
    const result2 = post('2025-09-20', 'Teste');
    testRunner.assert(result2 >= '2025-09-20', 'postDate deve ser futuro');
    
    // Testa cálculo para Dinheiro (deve ser igual)
    const result3 = post('2025-09-15', 'Dinheiro');
    testRunner.assertEqual(result3, '2025-09-15', 'Dinheiro deve ter postDate igual a opDate');
    
  } finally {
    // Restaura cards originais
    cards.length = 0;
    cards.push(...originalCards);
  }
}, 'Cálculos');

testRunner.addTest('Sanitização de transações', async () => {
  const dirtyTx = [
    { desc: 'Test', val: -10 }, // sem opDate, postDate
    { desc: 'Test2', val: -20, opDate: '2025-09-01' }, // sem postDate
    { desc: 'Test3', val: -30, method: '', opDate: '2025-09-01' } // method vazio
  ];
  
  const result = sanitizeTransactions(dirtyTx);
  testRunner.assert(result.changed, 'Sanitização deveria ter feito mudanças');
  testRunner.assert(result.list.every(t => t.opDate), 'Todas transações devem ter opDate');
  testRunner.assert(result.list.every(t => t.postDate), 'Todas transações devem ter postDate');
}, 'Cálculos');

// ---------------------------------------------------------------------------
// 💾 TESTES DE DADOS E CRUD
// ---------------------------------------------------------------------------

testRunner.addTest('CRUD básico de transações', async () => {
  const originalLength = transactions.length;
  
  // Simula adição de transação
  const newTx = {
    id: 'test_' + Date.now(),
    desc: 'Teste Automatizado',
    val: -50.00,
    method: 'Dinheiro',
    opDate: todayISO(),
    postDate: todayISO(),
    ts: Date.now()
  };
  
  transactions.push(newTx);
  testRunner.assertEqual(transactions.length, originalLength + 1, 'Transação não foi adicionada');
  
  // Verifica se foi adicionada corretamente
  const added = transactions.find(t => t.id === newTx.id);
  testRunner.assertExists(added, 'Transação adicionada não encontrada');
  testRunner.assertEqual(added.desc, 'Teste Automatizado', 'Descrição incorreta');
  
  // Remove para limpeza
  const index = transactions.findIndex(t => t.id === newTx.id);
  transactions.splice(index, 1);
  testRunner.assertEqual(transactions.length, originalLength, 'Transação não foi removida');
}, 'CRUD');

testRunner.addTest('CRUD básico de cartões', async () => {
  const originalLength = cards.length;
  
  // Adiciona cartão de teste
  const newCard = { name: 'Teste Auto', close: 5, due: 15 };
  cards.push(newCard);
  testRunner.assertEqual(cards.length, originalLength + 1, 'Cartão não foi adicionado');
  
  // Verifica se foi adicionado
  const added = cards.find(c => c.name === 'Teste Auto');
  testRunner.assertExists(added, 'Cartão adicionado não encontrado');
  
  // Remove para limpeza
  const index = cards.findIndex(c => c.name === 'Teste Auto');
  cards.splice(index, 1);
  testRunner.assertEqual(cards.length, originalLength, 'Cartão não foi removido');
}, 'CRUD');

// ---------------------------------------------------------------------------
// 🎨 TESTES DE UI E MODAIS
// ---------------------------------------------------------------------------

testRunner.addTest('Abertura e fechamento de modal de transação', async () => {
  const modal = document.getElementById('txModal');
  const openBtn = document.getElementById('addTxBtn');
  
  testRunner.assertExists(modal, 'Modal de transação não encontrado');
  testRunner.assertExists(openBtn, 'Botão de adicionar não encontrado');
  
  // Simula abertura
  testRunner.simulateClick(openBtn);
  await testRunner.waitFor(() => !modal.classList.contains('hidden'), 2000);
  testRunner.assert(!modal.classList.contains('hidden'), 'Modal não abriu');
  
  // Simula fechamento com ESC
  const escEvent = new KeyboardEvent('keydown', { key: 'Escape' });
  document.dispatchEvent(escEvent);
  await testRunner.waitFor(() => modal.classList.contains('hidden'), 2000);
  testRunner.assert(modal.classList.contains('hidden'), 'Modal não fechou com ESC');
}, 'UI');

testRunner.addTest('Formulário de transação - validação básica', async () => {
  const modal = document.getElementById('txModal');
  const descInput = document.getElementById('txDesc');
  const valInput = document.getElementById('txVal');
  
  testRunner.assertExists(descInput, 'Campo descrição não encontrado');
  testRunner.assertExists(valInput, 'Campo valor não encontrado');
  
  // Testa inputs
  testRunner.simulateInput(descInput, 'Teste de Input');
  testRunner.assertEqual(descInput.value, 'Teste de Input', 'Input de descrição não funciona');
  
  testRunner.simulateInput(valInput, '123.45');
  testRunner.assertEqual(valInput.value, '123.45', 'Input de valor não funciona');
  
  // Limpa
  descInput.value = '';
  valInput.value = '';
}, 'UI');

testRunner.addTest('Sistema de navegação responsivo', async () => {
  const headerSeg = document.querySelector('.header-seg');
  const bottomPill = document.querySelector('.floating-pill');
  
  // Verifica se elementos de navegação existem
  testRunner.assertExists(headerSeg, 'Header segmentado não encontrado');
  testRunner.assertExists(bottomPill, 'Pills inferiores não encontradas');
  
  // Simula clique em opção
  const homeOption = headerSeg.querySelector('[data-action="home"]');
  if (homeOption) {
    testRunner.simulateClick(homeOption);
    // Verifica se seleção mudou
    await new Promise(resolve => setTimeout(resolve, 100)); // aguarda
    testRunner.assert(headerSeg.dataset.selected === 'home', 'Navegação não atualizou');
  }
}, 'UI');

// ---------------------------------------------------------------------------
// 🔄 TESTES DE STICKY HEADER
// ---------------------------------------------------------------------------

testRunner.addTest('Sticky Header - Criação e posicionamento', async () => {
  const stickyElement = document.querySelector('.sticky-month');
  
  if (!stickyElement) {
    console.warn('⚠️  Sticky header não encontrado - pode não ter sido criado ainda');
    return; // Skip teste se sticky não existe ainda
  }
  
  // Verifica propriedades básicas
  testRunner.assert(stickyElement.className.includes('sticky-month'), 'Classe sticky incorreta');
  
  const styles = window.getComputedStyle(stickyElement);
  testRunner.assert(styles.position === 'fixed', 'Sticky deve ter position fixed');
}, 'Sticky Header');

testRunner.addTest('Sticky Header - Função updateStickyMonth', async () => {
  testRunner.assertFunction(updateStickyMonth, 'updateStickyMonth function missing');
  
  // Testa execução sem erro
  try {
    updateStickyMonth();
  } catch (error) {
    throw new Error('updateStickyMonth threw error: ' + error.message);
  }
}, 'Sticky Header');

// ---------------------------------------------------------------------------
// 🌐 TESTES DE CONECTIVIDADE E SYNC
// ---------------------------------------------------------------------------

testRunner.addTest('Cache functions', async () => {
  testRunner.assertFunction(cacheGet, 'cacheGet missing');
  testRunner.assertFunction(cacheSet, 'cacheSet missing');
  
  // Testa cache básico
  const testKey = 'test_cache_key';
  const testValue = { test: 'data', num: 123 };
  
  cacheSet(testKey, testValue);
  const retrieved = cacheGet(testKey);
  testRunner.assertEqual(JSON.stringify(retrieved), JSON.stringify(testValue), 'Cache não funcionou');
  
  // Limpa
  cacheSet(testKey, null);
}, 'Sync');

testRunner.addTest('Offline queue functions', async () => {
  testRunner.assertFunction(markDirty, 'markDirty missing');
  testRunner.assertFunction(flushQueue, 'flushQueue missing');
  
  // Testa marcação como dirty
  const originalQueue = cacheGet('dirtyQueue', []);
  markDirty('test');
  const newQueue = cacheGet('dirtyQueue', []);
  testRunner.assert(newQueue.includes('test'), 'markDirty não funcionou');
  
  // Restaura queue original
  cacheSet('dirtyQueue', originalQueue);
}, 'Sync');

// ---------------------------------------------------------------------------
// 📱 TESTES DE PWA E RESPONSIVIDADE
// ---------------------------------------------------------------------------

testRunner.addTest('Detecção de dispositivo e PWA', async () => {
  // Verifica se constantes estão definidas
  testRunner.assert(typeof APP_VERSION === 'string', 'APP_VERSION não definida');
  
  // Testa detecção básica de recursos
  testRunner.assert(typeof navigator !== 'undefined', 'Navigator não disponível');
  testRunner.assert(typeof window !== 'undefined', 'Window não disponível');
  
  // Verifica se service worker está registrado (PWA)
  if ('serviceWorker' in navigator) {
    console.log('✅ Service Worker suportado');
  }
}, 'PWA');

testRunner.addTest('Tema e preferências', async () => {
  testRunner.assertFunction(applyThemePreference, 'applyThemePreference missing');
  
  // Testa mudança de tema
  const currentTheme = document.documentElement.getAttribute('data-theme');
  
  applyThemePreference('light');
  testRunner.assertEqual(document.documentElement.getAttribute('data-theme'), 'light', 'Tema light não aplicou');
  
  applyThemePreference('dark');
  testRunner.assertEqual(document.documentElement.getAttribute('data-theme'), 'dark', 'Tema dark não aplicou');
  
  // Restaura tema original
  if (currentTheme) {
    document.documentElement.setAttribute('data-theme', currentTheme);
  }
}, 'PWA');

// ============================================================================
// 🚀 INTERFACE PÚBLICA
// ============================================================================

// Expõe o runner globalmente
window.TestRunner = testRunner;

// Função pública para executar todos os testes
window.runAllTests = () => testRunner.runAllTests();

// Função para executar categoria específica
window.runTestCategory = (category) => {
  const categoryTests = testRunner.tests.filter(t => t.category === category);
  if (categoryTests.length === 0) {
    console.log(`❌ Categoria '${category}' não encontrada`);
    return;
  }
  
  console.log(`🧪 Executando testes da categoria: ${category}\n`);
  const originalTests = testRunner.tests;
  testRunner.tests = categoryTests;
  const result = testRunner.runAllTests();
  testRunner.tests = originalTests;
  return result;
};

// Função para executar teste específico
window.runSingleTest = (testName) => {
  const test = testRunner.tests.find(t => t.name === testName);
  if (!test) {
    console.log(`❌ Teste '${testName}' não encontrado`);
    return;
  }
  
  console.log(`🧪 Executando teste: ${testName}\n`);
  return testRunner.runTest(test);
};

// Lista todas as categorias disponíveis
window.listTestCategories = () => {
  const categories = [...new Set(testRunner.tests.map(t => t.category))];
  console.log('📋 Categorias de testes disponíveis:');
  categories.forEach(cat => {
    const count = testRunner.tests.filter(t => t.category === cat).length;
    console.log(`   • ${cat} (${count} testes)`);
  });
  return categories;
};

// Exibe instruções
// ============================================================================
// 🏗️ TESTES FASE 6 - FEATURE MODULES
// ============================================================================

// Testa TransactionModule
testRunner.addTest('TransactionModule deve estar disponível', () => {
  TestRunner.assertExists(window.transactionModule, 'TransactionModule instance');
  TestRunner.assertExists(window.TransactionModule, 'TransactionModule class');
}, 'Phase 6 - Feature Modules');

testRunner.addTest('TransactionModule deve ter métodos CRUD básicos', () => {
  const tm = window.transactionModule;
  TestRunner.assertExists(tm.getTransactions, 'getTransactions method');
  TestRunner.assertExists(tm.setTransactions, 'setTransactions method');
  TestRunner.assertExists(tm.addTransaction, 'addTransaction method');
  TestRunner.assertExists(tm.updateTransaction, 'updateTransaction method');
  TestRunner.assertExists(tm.deleteTransaction, 'deleteTransaction method');
}, 'Phase 6 - Feature Modules');

testRunner.addTest('TransactionModule deve ter métodos utilitários', () => {
  const tm = window.transactionModule;
  TestRunner.assertExists(tm.sortTransactions, 'sortTransactions method');
  TestRunner.assertExists(tm.filterTransactions, 'filterTransactions method');
  TestRunner.assertExists(tm.validateTransaction, 'validateTransaction method');
  TestRunner.assertExists(tm.getTransactionStats, 'getTransactionStats method');
  TestRunner.assertExists(tm.exportTransactions, 'exportTransactions method');
}, 'Phase 6 - Feature Modules');

testRunner.addTest('TransactionModule validação deve detectar erros', () => {
  const tm = window.transactionModule;
  
  // Transação inválida - sem descrição
  const invalidTx1 = { desc: '', val: 100, postDate: '2025-01-01' };
  const errors1 = tm.validateTransaction(invalidTx1);
  TestRunner.assert(errors1.length > 0, 'Should detect missing description');
  
  // Transação inválida - valor não numérico
  const invalidTx2 = { desc: 'Test', val: 'abc', postDate: '2025-01-01' };
  const errors2 = tm.validateTransaction(invalidTx2);
  TestRunner.assert(errors2.length > 0, 'Should detect invalid value');
  
  // Transação válida
  const validTx = { desc: 'Test', val: 100, postDate: '2025-01-01' };
  const errors3 = tm.validateTransaction(validTx);
  TestRunner.assert(errors3.length === 0, 'Should pass validation for valid transaction');
}, 'Phase 6 - Feature Modules');

testRunner.addTest('TransactionModule filtros devem funcionar', () => {
  const tm = window.transactionModule;
  
  // Mock some transactions for testing
  const originalTxs = tm.getTransactions();
  const mockTxs = [
    { id: 'test1', desc: 'Grocery', val: -50, postDate: '2025-01-01', method: 'Dinheiro' },
    { id: 'test2', desc: 'Salary', val: 2000, postDate: '2025-01-01', method: 'Dinheiro' },
    { id: 'test3', desc: 'Coffee', val: -10, postDate: '2025-01-02', method: 'Cartão' }
  ];
  
  tm.setTransactions(mockTxs);
  
  // Test filter by type
  const expenses = tm.filterTransactions({ type: 'expense' });
  TestRunner.assert(expenses.length === 2, 'Should filter expenses correctly');
  
  const income = tm.filterTransactions({ type: 'income' });
  TestRunner.assert(income.length === 1, 'Should filter income correctly');
  
  // Test filter by method
  const cash = tm.filterTransactions({ method: 'Dinheiro' });
  TestRunner.assert(cash.length === 2, 'Should filter by method');
  
  // Test filter by description
  const coffee = tm.filterTransactions({ description: 'coffee' });
  TestRunner.assert(coffee.length === 1, 'Should filter by description (case insensitive)');
  
  // Restore original transactions
  tm.setTransactions(originalTxs);
}, 'Phase 6 - Feature Modules');

testRunner.addTest('TransactionEventHandlers deve estar disponível', () => {
  TestRunner.assertExists(window.transactionEventHandlers, 'TransactionEventHandlers instance');
  TestRunner.assertExists(window.TransactionEventHandlers, 'TransactionEventHandlers class');
}, 'Phase 6 - Feature Modules');

testRunner.addTest('TransactionEventHandlers deve ter métodos de evento', () => {
  const teh = window.transactionEventHandlers;
  TestRunner.assertExists(teh.init, 'init method');
  TestRunner.assertExists(teh.setupTransactionForm, 'setupTransactionForm method');
  TestRunner.assertExists(teh.setupTransactionActions, 'setupTransactionActions method');
  TestRunner.assertExists(teh.handleTransactionSubmit, 'handleTransactionSubmit method');
  TestRunner.assertExists(teh.validateField, 'validateField method');
}, 'Phase 6 - Feature Modules');

console.log('🧪 SUITE DE TESTES CARREGADA!');
console.log('📋 Comandos disponíveis:');
console.log('   • runAllTests()                    - Executa todos os testes');
console.log('   • runTestCategory("categoria")     - Executa testes de uma categoria');
console.log('   • runSingleTest("nome do teste")   - Executa um teste específico');
console.log('   • listTestCategories()             - Lista categorias disponíveis');
console.log('\n🎯 Execute runAllTests() para começar!');

// Execução automática com delay para aguardar carregamento das dependências
function waitForMainJsAndRunTests() {
  if (window.mainJsLoaded && window.location.pathname.includes('test-runner.html')) {
    console.log('\n🤖 Main.js carregado! Executando testes automaticamente...');
    window.runAllTests();
  } else {
    console.log('⏳ Aguardando main.js carregar...');
    setTimeout(waitForMainJsAndRunTests, 500); // Verifica a cada 500ms
  }
}

// Inicia a verificação após um pequeno delay
setTimeout(waitForMainJsAndRunTests, 1000);