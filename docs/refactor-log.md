# Refactor log

## 2025-10-06 — Refatoração de utilitários de transações

- Arquivos alterados:
  - `js/core/transactions-utils.js`

- Resumo da mudança:
  - Tornei as funções `sortTransactions`, `sanitizeTransactions` e `groupTransactionsByMonth` puras quando possível — elas agora aceitam um array `txs` como primeiro argumento e retornam resultados sem mutar globals.
  - Mantive compatibilidade retroativa: quando chamadas sem argumento, as funções operam sobre o snapshot atual (`getTransactions()`), e persistem alterações usando `setTransactions()` (com catch silencioso).
  - Esta alteração é o primeiro passo para remover dependências ao global `transactions` e permitir testes unitários mais fáceis.

- Próximo passo recomendado:
  - Atualizar chamadas em `main.js` para passar explicitamente `txs` snapshots onde apropriado e reduzir chamadas que dependem do efeito colateral de `sortTransactions()`.

## 2025-10-06 (afternoon) — Small-batch updates in `main.js`

- Arquivos alterados:
  - `main.js`

- Resumo da mudança:
  - `renderTable()` agora obtém um snapshot `txs = getTransactions()` e passa ele para `groupTransactionsByMonth(txs)`.
  - `groupTransactionsByMonth` foi adaptada para aceitar um parâmetro opcional `txs` e usar um fallback para compatibilidade.
  - `txByDate(iso)` foi convertido para `txByDate(iso, txs)` (aceita snapshot opcional) e os chamadores imediatos dentro de `main.js` foram atualizados para passar o snapshot disponível.
  - Corrigido um ReferenceError: substituí usos acidentais de `_txs` por `txs` dentro de `buildRunningBalanceMap`.

- Observações:
  - Todas as mudanças foram feitas em pequenos patches para reduzir risco. O comportamento legado é preservado quando `txs` não for passado.
  - Próximo lote: propagar snapshots para outras funções (p.ex. `getAllTransactionsOnCard`, `preparePlannedList`) e, eventualmente, alterar `buildRunningBalanceMap` para aceitar `txs` também.

## 2025-10-06 (evening) — Render-sweep and snapshot threading

- Arquivos alterados:
  - `main.js`

- Resumo da mudança:
  - Completei a varredura de `renderAccordion()` para usar um snapshot único `_txs` calculado no início da função. Todas as chamadas internas que antes liam `txs`/`getTransactions()` foram atualizadas para usar `_txs` ou receber `_txs` como argumento (incluindo `makeLine`, `txByDate` e `createCardInvoiceHeader`).
  - Atualizei pontos de persistência/sync para usar um snapshot local dentro de fluxos síncronos críticos (por exemplo: handler de hydration `onValue(txRef, ...)`, `performResetAllData`, e `finalizeTransaction`) para reduzir leituras repetidas de estado global.
  - Corrigi um ReferenceError em `buildRunningBalanceMap` relacionado à ordem de inicialização de variáveis.

- Observações:
  - Mantivemos compatibilidade retroativa: helpers continuam aceitando `txs` opcional e fallback para `getTransactions()` se omitido.
  - Após estes patches, o arquivo `main.js` não apresenta erros de sintaxe segundo a checagem rápida executada.

- Próximo passo recomendado:
  - Continuar a varredura de `main.js` e converter as leituras restantes em snapshots locais por função. Em seguida, rodar smoke tests manuais.

## 2025-10-06 (final) — Sistema Multi-Perfil e Correções Críticas

- Arquivos alterados:
  - `js/utils/profile-utils.js` 
  - `main.js`
  - `js/core/transactions-utils.js`
  - Documentação completa (`README.md`, `docs/*.md`)

- Resumo das mudanças:
  - **Profile System Fixes**: Corrigido isolamento completo entre perfis BR/PT/EUR com cache scoping adequado
  - **Firebase Path Resolution**: BR profile usa legacy root paths, outros perfis usam `/profiles/{id}/` structure  
  - **Format Compatibility**: Resolvido dual-format issue em `sanitizeTransactions` que destruía transações
  - **Cross-Profile Prevention**: Eliminado vazamento de transações BRL em perfil EUR
  - **Data Integrity**: Restaurado saldo inicial BR (€11,153.67) e todas as 357 transações
  - **Documentation Update**: Atualização completa da documentação refletindo estado atual estável

- Status final:
  - ✅ BR Profile: Totalmente funcional (startBal + 357 transactions + 3 cards)
  - ✅ PT Profile: Funcionando corretamente (startBal: €1,657.36 + 44 transactions) 
  - ✅ EUR Profile: Profile switching sem cross-contamination
  - ✅ Cache System: Profile-scoped keys (`BR::tx`, `PT::tx`) funcionando
  - ✅ Firebase Sync: Realtime listeners com proteção contra overwrites vazios
  - ✅ Snapshot Reads: Padrão implementado consistentemente em renderização

- Observações:
  - Sistema multi-perfil agora completamente estável e testado
  - Zero breaking changes - compatibilidade retroativa mantida  
  - Performance melhorada com snapshot reads reduzindo calls desnecessárias
  - Arquitetura limpa preparada para futuras extensões (novos perfis/moedas)
