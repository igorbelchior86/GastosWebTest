# js/state/app-state.js — README

Este documento descreve as APIs, contratos e invariantes do módulo `js/state/app-state.js`.

## Propósito

Fornecer uma fonte de verdade central para o estado da aplicação (startBalance, startDate, transactions, cards, etc.), com APIs para leitura/escrita e um mecanismo de subscription.

## Exported functions

- getState(): retorna o objeto `state` atual (mutável via funções do módulo).
- setState(patch, options): aplica um patch nas chaves existentes do `state`. Opcional `options.emit=false` para suprimir emissão de eventos.
- subscribeState(fn): registra um callback que recebe { changedKeys, state } quando chaves mudam.

Start-specific helpers:
- getStartBalance(), setStartBalance(value, options)
- getStartDate(), setStartDate(value, options)
- getStartSet(), setStartSet(value, options)
- isBootHydrated(), setBootHydrated(value, options)

Transactions APIs:
- getTransactions(): Transaction[]
- setTransactions(list, options)
- addTransaction(tx, options)
- updateTransaction(id, patch, options)
- removeTransaction(id, options)

Cards APIs:
- getCards(), setCards(list, options), addCard(card, options), updateCard(nameOrIndex, patch, options), removeCard(nameOrIndex, options)

Utility:
- resetState(options)
- appState proxy — acesso read/write com emissão automática via `appState[prop] = value`.

## Data shapes
- `state` inicialmente tem:
  - startBalance: null|number
  - startDate: null|string(YYYY-MM-DD)
  - startSet: boolean
  - bootHydrated: boolean
  - transactions: []
  - cards: []

Transactions are stored as an array; callers should pass/receive full arrays when using `setTransactions`.

## Emissão de eventos

- As funções que alteram o estado chamam `emit([keys])` a menos que `options.emit === false`.
- Assinantes recebem o objeto { changedKeys, state }.

## Backwards compatibility

- O módulo expõe versões globais (window.getTransactions, window.setTransactions, etc.) para manter compatibilidade com o código legado que não foi convertido para módulos ainda.

## Recomendações de uso

1. Preferir as APIs exportadas ao invés de acessar `window.APP_STATE` diretamente.
2. Para leituras consistentes dentro de uma função síncrona, leia `const txs = getTransactions()` no início e use apenas `txs`.
3. Evitar mutações in-place dos arrays retornados; trate-os como imutáveis (clone antes de modificar) e use `setTransactions` para persistir substituições.

## Exemplos rápidos

const txs = getTransactions();
const updated = txs.filter(t => t.id !== idToRemove);
setTransactions(updated);

addTransaction({ id: 'x', desc: 'Compra', val: -10 });

## Erros e modos de falha

- O módulo é resiliente: operações silenciosas retornam valores falsy quando parâmetros inválidos são passados (ex.: updateTransaction sem id retorna null).
- `emit` protege assinantes com try/catch para evitar que um assinante que quebre pare o fluxo.
