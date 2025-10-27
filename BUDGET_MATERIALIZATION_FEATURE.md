# Feature: Budget Materialization - Orçamentos Afetam o Saldo Permanentemente

## Problema Relatado
Um orçamento deve afetar o saldo da mesma forma que uma transação recorrente. 

**Exemplo:**
- Saldo inicial: R$1.000
- Orçamento semanal: R$100
- Esperado: saldo segue 900 → 800 → 700 → 600…

**Comportamento anterior (BUG):**
- Saldo inicial: 0
- Orçamento semanal: R$100
- Dia 1: -100 ✓
- Dia 2: -200 ✓
- Dia 3 (novo ciclo): -100 ✗ (voltou para -100 em vez de continuar em -200)

O problema era que orçamentos só deduziam do saldo "projetado" (via `reservedValue`), não como transações reais que afetam permanentemente o saldo dia a dia.

## Causa do Bug

### Modelo Anterior
1. **Orçamentos** = `reservedValue` (dedução apenas visual/prospectiva)
2. Cálculo em `getReservedTotalForDate()` subtraía apenas do saldo `projetado`
3. Isso era **temporário por dia** — não acumulava entre dias
4. Ao final do ciclo, o orçamento "desaparecia" e o saldo voltava

### Por que isso estava errado
Orçamentos deviam se comportar como **transações permanentes** que:
- Deduzem do saldo no **primeiro dia do ciclo**
- Permanecem deduzidas **todos os dias do ciclo**
- São "devolvidas" quando o ciclo fecha (via ajuste de retorno)

## Solução Implementada

### Modelo Novo: Budget Materialization
Orçamentos agora geram **transações automáticas** (invisíveis no storage, visíveis apenas no cálculo):

1. **No início do ciclo**: Cria transação de "Reserva de Orçamento" com valor **negativo**
   - Ex: `[Reserva de Orçamento] #groceries: -R$100`
   - Impacta o saldo como uma despesa normal

2. **Durante o ciclo**: Saldo reflete a deduction
   - Dia 1: 1000 - 100 = 900
   - Dia 2: 900 - 0 (não há mais transações) = 900
   - Etc.

3. **Ao final do ciclo**: Cria transação de "Retorno de Orçamento" com o valor não gasto
   - Se gastou R$30: Retorna R$70
   - Ex: `[Retorno de Orçamento] #groceries: +R$70`
   - Recupera o saldo do não utilizado

### Arquivos Criados/Modificados

#### 1. `src/services/budgetMaterialization.js` (NOVO)
**Responsabilidade:** Gerar transações automáticas de materialização

**Exports:**
- `generateBudgetMaterializationTransactions(transactions, todayISO)` → Cria TX de reserva/retorno
- `filterOutMaterializationTransactions(transactions)` → Remove TX de materialização
- `extractMaterializationTransactions(transactions)` → Extrai apenas TX de materialização
- `rebuildMaterializationCache(transactions)` → Reconstrói cache de materializações
- `resetMaterializationCache()` → Limpa cache

**Como funciona:**
- Varre budgets ativos do tipo `recurring`
- Para cada budget, verifica se o ciclo começou (today >= cycleStart)
- Se sim e ainda não foi materializado: cria transação de reserva negativa
- Se o ciclo terminou: cria transação de retorno com valor não gasto

**Flags nas TX:**
```javascript
{
  id: 'budget-reserve-${budgetId}',
  isBudgetMaterialization: true,
  budgetReserveFor: budgetId,
  originBudgetId: budgetId,
  // ... outros campos normais
}
```

#### 2. `src/utils/materializationInjector.js` (NOVO)
**Responsabilidade:** Injetar materializações no fluxo de transações

**Exports:**
- `injectBudgetMaterializationTransactions(transactions, todayISO)` → Adiciona materializações à lista

Wrapper simples que:
- Chama `generateBudgetMaterializationTransactions()`
- Retorna array combinado: TX reais + TX de materialização

#### 3. `src/utils/wrappedGetTransactions.js` (NOVO)
**Responsabilidade:** Wrapper de `getTransactions()` que injeta materializações

Permite envolver o getter original para incluir automaticamente as materializações em toda parte.

#### 4. `src/main.js` (MODIFICADO)
**Alterações:**

1. **Import do novo serviço:**
```javascript
import { generateBudgetMaterializationTransactions, rebuildMaterializationCache } from './services/budgetMaterialization.js';
import { injectBudgetMaterializationTransactions } from './utils/materializationInjector.js';
```

2. **Modificação de `renderTable()`:**
   - Aplica materializações **antes** de calcular `computeDailyBalances()`
   - Isso faz com que o saldo reflita as materializações

3. **Wrapper de `getTransactions` para `initTxUtils`:**
```javascript
const getTransactionsWithMaterializations = () => {
  try {
    const txs = typeof getTransactions === 'function' ? getTransactions() : transactions;
    return injectBudgetMaterializationTransactions(txs);
  } catch (_) {
    return typeof getTransactions === 'function' ? getTransactions() : transactions;
  }
};
```
   - Garante que `txByDate()` no accordion inclua materializações
   - Sem isso, as TX de materialização não apareceriam no accordion

4. **Inicialização em hidratação:**
```javascript
try { rebuildMaterializationCache(transactions); } catch (_) {}
```
   - Após carregar dados do cache, reconstrói a cache de materializações

#### 5. `src/startRealtimeHelper.js` (MODIFICADO)
**Alterações:**

1. **Add `rebuildMaterializationCache` ao contexto**

2. **Rebuild da cache após atualização de transações:**
```javascript
try { rebuildMaterializationCache && rebuildMaterializationCache(getTransactions ? getTransactions() : transactionsRef.get()); } catch (_) {}
```
   - Garante que quando dados chegam do Firebase, a cache é atualizada

## Fluxo de Execução

```
renderTable()
  ↓
  Injeta materializações nas TX
  ↓
  computeDailyBalances(txs com materializações)
  ↓
  Saldo reflete a deduction do orçamento
  ↓
  Accordion exibe com saldo correto
```

## Resultado

✅ Saldo inicial 1000 com orçamento semanal 100:
- Dia 1 (start): 900 (-100 de reserva)
- Dia 2: 900
- Dia 3: 900
- ...
- Dia 7 (fim do ciclo):
  - Calcula gasto real: se gastou 30, retorna 70
  - Novo saldo: 900 + 70 = 970

✅ Múltiplos orçamentos trabalham juntos:
- Orçamento 1: -100
- Orçamento 2: -50
- Saldo final: 1000 - 100 - 50 = 850

## Notas Técnicas

### TX de Materialização vs TX Reais
- **Não persistem em Firebase/localStorage**
- **Criadas dinamicamente** a cada renderização
- **Incluídas apenas em cálculos** (balanço, accordion)
- **Não aparecem em formulários de edição** (não são "reais")
- **Flag `isBudgetMaterialization=true`** permite filtrar quando necessário

### Cache de Materializações
- Evita criar a mesma TX de reserva múltiplas vezes
- Rastreia por chave: `${budgetId}|${cycleStart}`
- Reconstruído quando:
  - App inicia (hidratação)
  - Dados chegam do Firebase
  - Novas transações são adicionadas

### Performance
- Materialização é O(n) onde n = número de budgets ativos
- Típico: < 1-2 budgets ativos por usuário
- Geração é **lazy** (apenas quando `renderTable()` é chamado)

## Compatibilidade com Reservas Existentes

O código mantém suporte a:
- ✅ `getReservedTotalForDate()` continua funcionando
- ✅ Panorama continua mostrando reservas
- ✅ Budget history continua correto
- ✅ As materializações + reservas = modelo completo

## Próximos Passos (Futuro)

1. **Opção de configuração**: Permitir usuario desabilitar materialização (modo "projetado only")
2. **UI de materialização**: Mostrar/ocultar TX de materialização no accordion
3. **Rollover**: Quando um ciclo não tem budget siguiente, automáticamente criar um novo
4. **Return adjustment**: Melhorar UX da "devolução" (talvez consolidar em ajuste mensal)

## Commits

- `feat: implement budget materialization - budgets now affect balance like recurring transactions`
  - Cria `budgetMaterialization.js` com lógica de geração de TX
  - Cria `materializationInjector.js` para injeção
  - Modifica `renderTable()` e `initTxUtils()` para usar materializações
  - Adiciona rebuild de cache em hidratação e listeners
