# Budgets & Panorama Roadmap

Documento de referência para fatiar a implementação das features de orçamentos e panorama. Cada tarefa foi planejada para caber em blocos de 50–150 linhas, sempre protegida por flags (`FEATURE_BUDGETS`, `FEATURE_PANORAMA`) até a ativação completa.

## 0. Feature Flags e Base
- **Objetivo**: manter o aplicativo inalterado enquanto a feature não é liberada.
- **Entregas**:
  - Definir `FEATURE_BUDGETS = false` e `FEATURE_PANORAMA = false` em um módulo central.
  - Criar helpers `isBudgetsEnabled()` / `isPanoramaEnabled()` para facilitar toggling.
  - Guardar pontos do UI (botões, modais, autocomplete) e dos cálculos de saldo previsto atrás das flags.
- **Validação**: build e fluxo atuais permanecem idênticos com as flags em falso.

## 1. Esquema de Dados `budgets`
- **Objetivo**: persistir orçamentos no storage local.
- **Entregas**:
  - Implementar storage baseado em IndexedDB ou `localStorage` (escolher o existente no app).
  - Criar helpers `loadBudgets()`, `saveBudgets(budgets[])`, `findActiveByTag(tag)`.
  - Garantir serialização/parse correto de campos de data.
- **Validação**: operações CRUD via console funcionam com as flags desligadas.

## 2. Parser de `#tag`
- **Objetivo**: extrair a primeira hashtag da descrição de transações.
- **Entregas**:
  - Função `extractFirstHashtag(text)` retornando a string com sinal ou `null`.
  - Injetar `budgetTag` no objeto de transação durante create/update.
- **Validação**: salvar e editar transações preserva o `budgetTag`.

## 3. Validação Either/Or
- **Objetivo**: impedir combinações inválidas entre recorrência e data futura.
- **Entregas**:
  - Blocar transações com recorrência ativa e data futura (> hoje) antes de persistir.
  - Verificar se já existe orçamento recorrente ativo para a mesma tag.
  - Em edições de ocorrências recorrentes, impedir alteração da data controlada pela recorrência.
- **Validação**: modais exibem mensagens definidas, nenhum dado inválido é salvo.

## 4. Criação e Renovação de Orçamento
- **Objetivo**: abrir e manter ciclos corretamente.
- **Entregas**:
  - Função `upsertBudgetFromTransaction(tx)` acionada após validação.
  - Branch para recorrentes: criar/renovar usando `recurrenceId`, atualizando `startDate`/`endDate`.
  - Branch para avulsos: criar orçamento se data futura e sem recorrência.
  - Atualizar `initialValue` quando houver orçamento ativo da mesma tag sem duplicar registros.
- **Validação**: registros nascem/atualizam conforme casos de teste com flags ligadas manualmente.

## 5. Reserva no Saldo Previsto
- **Objetivo**: abater reservas do saldo previsto.
- **Entregas**:
  - Implementar `spentNoPeriodo(tag, start, end)` para calcular gastos já executados.
  - Calcular `reservedValue = max(initialValue - spentNoPeriodo, 0)`.
  - Função `getReservedTotalForDate(date)` e integração com cálculo existente do saldo previsto.
- **Validação**: saldo previsto reduz conforme reservas quando a flag estiver ativa.

## 6. Atualização por Lançamentos
- **Objetivo**: manter progresso dos orçamentos após eventos em transações.
- **Entregas**:
  - Listeners `onTransactionCreate/Update/Delete` atualizando `spentValue` e `reservedValue`.
  - Tratar retroativos e exclusões com recomputo idempotente.
  - Atualizar caches em memória (quando existirem) após cada alteração.
- **Validação**: barras e valores respondem imediatamente a edições/exclusões.

## 7. Fechamento de Ciclo
- **Objetivo**: encerrar orçamentos e liberar sobras.
- **Entregas**:
  - Função `closeExpiredBudgets()` executada em `onDayChange` e ao abrir o app.
  - Ajustar saldo previsto devolvendo `reservedValue` restante, status → `closed`.
- **Validação**: ciclos encerram no `endDate`, saldos recalibrados.

## 8. Autocomplete de Tags Ativas
- **Objetivo**: sugerir tags de orçamentos ativos ao focar descrição.
- **Entregas**:
  - Cache `activeBudgets[]` e UI de autocomplete com restante/inicial e `endDate`.
  - Seleção insere `#tag` no texto e seta `budgetTag`.
  - Respeitar flag `FEATURE_BUDGETS`.
- **Validação**: lista abre/fecha corretamente e preenche a tag.

## 9. Anti-Duplicidade de Orçamento
- **Objetivo**: evitar novos orçamentos para tags com ciclo ativo.
- **Entregas**:
  - Checagem antes de criar orçamento avulso/recorrente.
  - Modal curto “Use o ciclo ativo” quando houver conflito.
- **Validação**: nenhum segundo ciclo nasce para a mesma tag ativa.

## 10. Histórico Compacto da Tag
- **Objetivo**: exibir detalhes do ciclo atual.
- **Entregas**:
  - Função `getBudgetHistory(tag, start, end)` agregando transações.
  - UI simples listando lançamentos e totais (pode ser reuso do modal futuro).
- **Validação**: dados batem com os lançamentos do período.

## 11. Modal Panorama v1
- **Objetivo**: primeira versão do painel.
- **Entregas**:
  - Sheet/modal com widget 25% (barras CSS) + lista de orçamentos ativos.
  - Botão no header protegido por `FEATURE_PANORAMA`.
  - Layout seguindo paleta escura e acessibilidade descritas.
- **Validação**: modal abre/fecha, exibe mês atual e orçamentos ativos.

## 12. Panorama v2 — Expansão 12 Meses
- **Objetivo**: visão anual expandida.
- **Entregas**:
  - Toggle no widget para alternar mês atual ↔ gráfico anual.
  - Renderização `canvas` via `drawYearlyBars(data12)` sem libs.
  - Animação/transição leve (fade/slide) para manter fluidez.
- **Validação**: alternância suave, dados corretos nos 12 meses.

## 13. Performance e Índices
- **Objetivo**: evitar recomputações desnecessárias.
- **Entregas**:
  - Estrutura `monthlyTotals[YYYY-MM] = {income, expenses}` com invalidação incremental.
  - Índice `budgetsByTag` para consultas rápidas e autocomplete.
  - Garantir sincronização com triggers de create/update/delete.
- **Validação**: profiling manual mostra reprocessamentos limitados ao necessário.

## 14. Telemetria
- **Objetivo**: captar uso das novas features.
- **Entregas**:
  - Eventos `panorama_open`, `panorama_toggle_yearly`, `panorama_budget_card_open(tag)`.
  - Envio através do mecanismo de analytics já existente (ou stub se ainda não houver).
- **Validação**: eventos aparecem no logger/console durante a navegação.

## 15. Cartões e Faturas
- **Objetivo**: manter coerência temporal com cartões.
- **Entregas**:
  - Garantir que orçamentos usem a data da compra, não da fatura.
  - Ao conciliar cartão, recalcular `spentNoPeriodo` sem alterar o período do orçamento.
  - Ajustar integrações com saldo previsto para não duplicar reservas de cartões.
- **Validação**: conciliações não mudam períodos; totais batem com o saldo previsto.

---

**Ordem Recomendada**: 0 Flags → 1 Dados → 2 Parser → 3 Validação → 4 Criação → 5 Reserva → 6 Eventos → 7 Fechamento → 8 Autocomplete → 9 Anti-duplicidade → 10 Histórico → 11 Panorama v1 → 12 Panorama v2 → 13 Performance → 14 Telemetria → 15 Cartões.
