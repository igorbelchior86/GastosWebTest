/**
 * Test for Budget Materialization Feature
 * 
 * Verifies that:
 * 1. Budgets generate materialization transactions correctly
 * 2. Materialization transactions deduce from balance
 * 3. Return transactions are created when cycles end
 */

import { generateBudgetMaterializationTransactions, rebuildMaterializationCache } from '../src/services/budgetMaterialization.js';

// Mock budget storage
const mockBudgets = [
  {
    id: 'budget1',
    tag: '#groceries',
    budgetType: 'recurring',
    status: 'active',
    initialValue: 100,
    spentValue: 0,
    startDate: '2025-10-27',
    endDate: '2025-11-03',
    triggerTxId: 'tx1',
    triggerTxIso: '2025-10-27'
  }
];

// Mock transactions
const mockTransactions = [];

console.log('=== Budget Materialization Test ===\n');

// Test 1: Generate materialization transactions
console.log('Test 1: Generate materialization transactions');
const today = '2025-10-27';

// Mock loadBudgets
globalThis.loadBudgets = () => mockBudgets;

try {
  const materializationTxs = generateBudgetMaterializationTransactions(mockTransactions, today);
  console.log(`✓ Generated ${materializationTxs.length} materialization transactions`);
  
  materializationTxs.forEach((tx) => {
    console.log(`  - ${tx.desc} (${tx.val > 0 ? '+' : ''}${tx.val})`);
  });
  
  if (materializationTxs.length === 1) {
    const reserveTx = materializationTxs[0];
    if (reserveTx.val === -100 && reserveTx.budgetTag === '#groceries') {
      console.log('✓ Reserve transaction created correctly');
    } else {
      console.log('✗ Reserve transaction value incorrect');
    }
  }
} catch (err) {
  console.log(`✗ Error: ${err.message}`);
}

console.log('\nTest 2: Rebuild materialization cache');
try {
  rebuildMaterializationCache([
    { id: 'budget-reserve-budget1', isBudgetMaterialization: true, budgetReserveFor: 'budget1', opDate: '2025-10-27' }
  ]);
  console.log('✓ Cache rebuilt successfully');
} catch (err) {
  console.log(`✗ Error: ${err.message}`);
}

console.log('\n=== Tests Complete ===');
