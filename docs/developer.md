# Documentação do Desenvolvedor — GastosWebTest

Este documento descreve as partes importantes do código, pontos de entrada, contratos de dados e funções públicas que ajudam na refatoração.

## Pontos de entrada

- `index.html` — HTML da aplicação.
- `main.js` — lógica principal da UI, renderização e orquestração (accordion, modals, handlers, sync, offline).
- `js/state/app-state.js` — fonte de verdade para estado compartilhado (transactions, cards, start balance, etc.).
- `js/utils/` — utilitários de formato, data, cache e perfil.

## Principais contratos de dados

### Transaction
```javascript
{
  id: string|number,
  desc: string,
  val: number,            // valor (positivo/negativo conforme fluxo)
  opDate: 'YYYY-MM-DD',   // data de lançamento (operação)
  postDate: 'YYYY-MM-DD', // data de postagem / vencimento (faturas)
  method: 'Dinheiro'|'CartãoName',
  recurrence: string,     // regra de recorrência ('' se não houver)
  installments: number,
  parentId: null|id,
  planned: boolean,
  ts: timestamp-string,
  modifiedAt: ISOstring
}
```

### Card
```javascript
{ 
  name: string, 
  close: number,  // dia do fechamento (1-31)
  due: number     // dia do vencimento (1-31)
}
```

### Profile System
```javascript
// Profiles suportados
const PROFILES = {
  BR: { currency: 'BRL', symbol: 'R$', firebasePath: 'root' },
  PT: { currency: 'EUR', symbol: '€', firebasePath: 'profiles/PT' },
  EUR: { currency: 'EUR', symbol: '€', firebasePath: 'profiles/EUR' }
};

// Cache keys por perfil
// Format: {profileId}::{dataType}
// Examples: "BR::tx", "PT::cards", "EUR::startBal"
```

## APIs públicas de `app-state` (consulte também `docs/app-state.md`)

- getTransactions(): Transaction[]
- setTransactions(list)
- addTransaction(tx)
- updateTransaction(id, patch)
- removeTransaction(id)
- getCards(), setCards(), addCard(), updateCard(), removeCard()
- getState(), setState(patch)
- subscribeState(fn) — recebe { changedKeys, state }

Observação: `app-state.js` também exporta um `appState` Proxy e injeta versões globais (`window.getTransactions` etc.) para compatibilidade durante a migração.

## Funções/fluxos relevantes em `main.js`

- Hydration & boot
  - `resetHydration`, `registerHydrationTarget`, `markHydrationTargetReady`, `maybeCompleteHydration`, `completeHydration`
  - `hydrateStateFromCache()` — carrega cache local (IndexedDB/localStorage) e popula `app-state`.

- Rendering
  - `renderTable()` -> orquestra `groupTransactionsByMonth()` → `renderTransactionGroups()` → `renderAccordion()`
  - `groupTransactionsByMonth()` — agrupa transações por `postDate` (YYYY-MM) e retorna um Map ordenado decrescentemente.
  - `renderAccordion()` — monta o DOM do acordeão mês→dia→fatura usando `buildRunningBalanceMap()`, `txByDate()` e `makeLine()`.

- Data/aggregation helpers
  - `txByDate(iso)` — retorna lista de transações (incluindo ocorrências de recorrência) que materializam no `iso`.
  - `buildRunningBalanceMap()` — constrói um Map ISO-date -> running balance, iterando dia-a-dia no range retornado por `calculateDateRange()`.
  - `calculateDateRange()` — determina min/max date a partir de transações (expande recorrências para um window razoável).

- Mutations & sync
  - `addTx`, `updateTransaction` handlers (no código) — usam `setTransactions`/`addTransaction` do `app-state` para persistir.
  - `flushQueue()` / `tryFlushWithBackoff()` — lógica de flush offline para Firebase.

## Padrões de refatoração adotados

- Snapshot reads: dentro de funções síncronas que fazem iterações/filtragens sobre transações, obter um snapshot único no começo:
  const txs = getTransactions ? getTransactions() : transactions;
  Em seguida use apenas `txs` durante toda a execução da função.

- Writes: usar APIs de `app-state` para mudanças incrementais; para operações em lote use `setTransactions(list)`.

## Arquivos/funcionalidades a priorizar para refactor

- Utilitários que ainda acessam o global `transactions`: `sortTransactions`, `sanitizeTransactions` — mover para funções puras que aceitam `txs` como argumento.
- Agregadores/relatórios: `groupTransactionsByMonth`, `txByDate`, `preparePlannedList`, `buildRunningBalanceMap` — garantir leitura por snapshot.
- `main.js` tem várias buscas/iterações que ainda referenciam `transactions` diretamente — aplicar snapshot pattern em cada função síncrona.

## Convenção prática: leituras por snapshot

Ao modificar funções em `main.js` que fazem iterações/filtragens, siga este conjunto mínimo de regras para evitar leituras incoerentes:

1. Capture um snapshot no início da função:

   const txs = getTransactions ? getTransactions() : transactions;

2. Use apenas `txs` durante toda a execução da função (não chame `getTransactions()` novamente dentro do mesmo fluxo).

3. Ao chamar helpers adaptados para receber snapshot (ex.: `txByDate(iso, txs)`, `makeLine(tx, ..., txs)`), passe `txs` para manter coerência.

4. Mantenha compatibilidade retroativa: helpers devem aceitar `txs` opcional e, quando omitido, chamar `getTransactions()` internamente.

## Progresso recente (2025-10-06)

### ✅ Refatoração Core Concluída
- **Rendering pipeline**: `renderAccordion()` com snapshot threading completo
- **Pure utilities**: `sortTransactions`, `sanitizeTransactions` convertidos para funções puras  
- **Snapshot consistency**: Threading em `makeLine`, `txByDate`, `createCardInvoiceHeader`
- **Persistence layer**: Snapshots locais em hydration, reset, e finalizeTransaction

### ✅ Sistema Multi-Perfil Estável  
- **Profile isolation**: Cache scoping com chaves `{profile}::tx` funcionando
- **Firebase paths**: BR legacy root vs outros profiles scoped (`/profiles/{id}/`)
- **Profile switching**: Transições seguras sem cross-contamination de dados
- **Format compatibility**: Dual-format handling para `sanitizeTransactions`

### 🔄 Melhorias Contínuas
- **Performance**: Snapshot reads reduzindo calls desnecessárias 
- **Testing**: Smoke tests manuais validando funcionalidades críticas
- **Documentation**: Atualização completa refletindo estado atual


## Exemplos de chamadas (uso recomendado)

- Ler snapshot e renderizar:
  const txs = getTransactions();
  const groups = groupTransactionsByMonth(txs); // (preferível adaptar a função para aceitar txs)

- Atualizar transações em lote:
  const updated = txs.map(...);
  setTransactions(updated);

## Próximos passos sugeridos

1. Converter utilitários para aceitar `txs` (puras) e atualizar chamadas em `main.js`.
2. Varredura em `main.js` função-a-função; aplicar snapshot pattern e rodar smoke-tests entre batches.
3. Adicionar `docs/app-state.md` (já criado) e um `README.md` principal com links para os docs.
