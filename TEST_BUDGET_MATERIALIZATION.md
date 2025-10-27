/**
 * Manual Test Instructions for Budget Materialization
 * 
 * To test the budget materialization feature:
 * 
 * 1. Open the app at http://localhost:8000/
 * 
 * 2. Set up test data:
 *    - Initial balance: R$1,000
 *    - Start date: today
 * 
 * 3. Create a recurring budget:
 *    - Tag: #groceries
 *    - Amount: R$100
 *    - Recurrence: Weekly (W)
 *    - Start date: today
 * 
 * 4. EXPECTED BEHAVIOR:
 *    - Saldo inicial: 1,000
 *    - 1º dia do ciclo: 900 (1000 - 100 reserva)
 *    - Demais dias: 900 (mantém)
 *    - Final do ciclo: 
 *      - Se gastou R$30: 900 + 70 (retorno) = 970
 *      - Se gastou R$100: 900 (sem retorno)
 *      - Se não gastou: 900 + 100 (retorno total) = 1000
 * 
 * 5. VERIFICATION:
 *    - Open Developer Console (F12)
 *    - Check if there are any errors
 *    - Look for transactions like "[Reserva de Orçamento]" and "[Retorno de Orçamento]"
 *    - These should appear in the accordion with correct values
 * 
 * 6. DEBUGGING:
 *    - window.__gastos.getDailyBalances() - view daily balances
 *    - window.__gastos.loadBudgets() - view active budgets
 *    - window.__gastos.generateBudgetMaterializationTransactions() - test generation
 */
