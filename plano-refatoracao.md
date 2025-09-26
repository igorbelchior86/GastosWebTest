# Plano de Refatoração

```markdown
# Plano de Refatoração

## Objetivos Gerais
- Externalizar lógicas utilitárias/estado global de `main.js` em módulos reutilizáveis.
- Manter compatibilidade total com comportamento atual (refatoração sem regressões funcionais).
- Facilitar testes automatizados e manuais ao longo das etapas.

## Resumo do que foi feito (até 2025-09-26)

- Centralização inicial do estado e utilitários:
  - `js/state/app-state.js` foi adotado como fonte de verdade para operações relacionadas a estado (saldo, data inicial, boot/hydration, e APIs para `transactions`/`cards`).
  - Utilitários (format, date, cache) já consolidados em `js/utils/`.

- Migração writes-first (concluída majoritariamente):
  - A maioria dos pontos que adicionam/atualizam/removem transações agora usa as APIs de `app-state` (`addTransaction`, `removeTransaction`, `updateTransaction`, `setTransactions`) com fallbacks atômicos para preservar compatibilidade com o global legado quando necessário.

- Migração reads-second (em andamento):
  - Estratégia: dentro de funções síncronas que precisam consultar o conjunto de transações, ler um snapshot pontual do estado e usar apenas esse snapshot durante a execução da função:
    const txs = getTransactions ? getTransactions() : transactions;
  - Alterações já aplicadas em `main.js` (exemplos):
    - `renderAccordion()` — snapshot inserido e vários usos internos trocados para `txs`.
    - `makeLine(tx, ...)` — snapshot inserido; heurísticas de recorrência e buscas agora consultam `(txs || [])`.
    - `delTx`, `findMasterRuleFor`, `deleteSingleBtn`, `deleteFutureBtn`, `deleteAllBtn` — handlers de exclusão atualizados para usar snapshot.
    - `editTx` e o listener global de edição — agora usam snapshot para localizar transação antes de abrir modal.
    - `createCardSwipeActions` (rename) — reescrito para usar `txs` snapshot e `setTransactions` para persistência em lote (com fallback que mantém compatibilidade).

## Estado atual e métricas

- Todo list (resumido):
  - Finish read-migration sweep — status: in-progress (varredura de leituras ainda precisa ser concluída)
  - Convert card-rename writes safely — status: completed
  - Run static + smoke tests — status: not-started

- Verificações rápidas: após as edições aplicadas foram executadas checagens estáticas (sem erros de sintaxe). Algumas patches iniciais exigiram re-read antes de reaplicar para evitar contexto desatualizado; isso foi corrigido.

## Áreas já cobertas (leitura segura via snapshot)
- renderAccordion internals (mês/dia/fatura)
- makeLine (linha de operação: ícones, badges, recorrência detection)
- delTx e handlers de exclusão de recorrência
- editTx e o listener global de edição
- createCardSwipeActions (rename handler atualizado)

## Áreas pendentes (onde continuar)
- utilitários que ainda referenciam `transactions` diretamente: `sortTransactions`, `sanitizeTransactions`.
- agregadores/relatórios: `groupTransactionsByMonth`, `txByDate`, `preparePlannedList`, `buildRunningBalanceMap` — revisar para garantir leituras únicas via snapshot por execução.
- pequenas buscas/consultas espalhadas pelo arquivo (`main.js`) — aplicar o mesmo padrão de snapshot onde fazem iterações/filtragens.

## Convenções e invariantes adotadas

- Leitura: sempre obter um snapshot no início de funções síncronas que precisam iterar/filtrar sobre transações e usar somente esse snapshot local (evita leituras incoerentes quando o estado muda durante a execução).
- Escrita: preferir APIs específicas (add/remove/update) para mudanças incrementais; quando for uma alteração em lote, usar `setTransactions(updatedList)`.
- Hidratação: manter os pontos explicítos que sincronizam o global com `getTransactions()` durante boot; não alterá-los sem um plano de migração explícito.

## Plano imediato (quando retomarmos)

1. Continuar a varredura em `main.js` função-por-função (pequenos batches):
   - Marcar um único todo como `in-progress` antes de tocar código.
   - Aplicar um pequeno grupo de patches (2–6 funções relacionadas).
   - Rodar checagem estática e uma verificação manual rápida (smoke checklist abaixo).
   - Repetir até cobrir o arquivo.

2. Pós-migração completa:
   - Considerar remover o global `transactions` ou deixá-lo apenas como um shim read-only que aponta para `getTransactions()`.
   - Adicionar testes de smoke automatizados (Playwright) cobrindo fluxos críticos.

## Smoke-test checklist (para rodar manualmente)
1. Adicionar transação em `Dinheiro` e verificar UI/saldo/console.
2. Criar parcelamento de fatura (parcelas) e checar master/children e notas de fatura.
3. Abrir modal `Planned` e validar projeções de recorrência.
4. Editar/excluir recorrência (single/future/all) e validar comportamento.
5. Simular offline (DevTools) e confirmar enqueue/flush de transações.

## Sugestões de follow-up
- Escrever um pequeno `README.md` para `js/state/app-state.js` com as APIs e contratos esperados (inputs/outputs, side effects), isso acelera revisões futuras.
- Adicionar scripts simples de lint / formatação (ESLint/Prettier) para manter diffs menores e consistentes enquanto a migração prossegue.
- Eventualmente criar um script Playwright básico que cobre os passos do smoke-test para automação contínua.

## Observações finais

Esta atualização documenta o que foi feito até a pausa solicitada. Quando quiser que eu continue a varredura, diga se prefere batches pequenos com smoke-tests entre eles (mais seguro) ou um sweep maior seguido por testes manuais (mais rápido). Também posso começar aplicando as funções pendentes listadas na seção "Áreas pendentes" — diga qual abordagem prefere.

```
