# Plano de Refatoração

## Objetivos Gerais
- Externalizar lógicas utilitárias/estado global de `main.js` em módulos reutilizáveis.
- Manter compatibilidade total com comportamento atual (refatoração sem regressões funcionais).
- Facilitar testes automatizados e manuais ao longo das etapas.

## Estado Atual (2025-09-18)
- **Utilitários de formato**: centralizados em `js/utils/format-utils.js` e reaproveitados via import.
- **Perfis de moeda**: lógica compartilhada em `js/utils/profile-utils.js`, consumida por `main.js` e helpers.
- **Cache local**: criado `js/utils/cache-utils.js` com chaves escopadas por perfil.
- **Placeholders/formatos**: sincronizados com o perfil ativo (ex.: saldo inicial).
- **Estado (start flow)**: novo módulo `js/state/app-state.js` controla `startBalance`, `startDate`, `startSet` e `bootHydrated`, consumido por `main.js`.
- **Perfil ↔ saldo inicial**: troca de perfil agora recarrega saldo/start específicos e limpa o input quando inexistente, evitando valores residuais.
- **Testes manuais executados**: troca de perfis, lançamento/edição de transações, validação de modais e saldo inicial.

## Próximos Passos Sugeridos
1. **Estado global (cont.)**
   - Estender `app-state` para abranger `transactions` e `cards`, oferecendo APIs de mutação observáveis.
   - Mapear pontos de escrita em `main.js` e substituir por chamadas centralizadas (`setTransactions`, `mutateTransactions`).
2. **Serviços externos**
   - Encapsular chamadas Firebase em `js/services/firebase.js` com funções puras (`loadTransactions`, `saveTransaction`).
   - Facilitar mocks para testes e isolar dependências.
3. **Camada de cache persistente**
   - Unificar `cacheGet/cacheSet` com IndexedDB (`idb`) em um único módulo, expondo fallback localStorage.
4. **Camada de UI/Render**
   - Separar renderizações complexas (tabela, modais) em módulos/componentes puros.
   - Introduzir testes de snapshot/smoke com Playwright ou similar.
5. **Ferramentas de qualidade**
   - Adicionar scripts de lint (`ESLint`) e formatação (`Prettier`) com regras mínimas.
   - Configurar suíte de testes automatizados para fluxos críticos (ex.: saldo inicial, recorrências, faturas).

## Estratégia de Execução
- Trabalhar em branches pequenas/temáticas e validar via smoke/manual a cada entrega.
- Manter compatibilidade global exportando APIs antigas enquanto módulos são migrados.
- Documentar alterações relevantes neste arquivo conforme as fases forem concluídas.

## Métricas de Confiança
- `npm test` / smoke tests (quando disponíveis) passam.
- Testes manuais principais executados e sem regressões observadas.
- Monitorar métricas de erro nos ambientes (Firebase logs) após deploys das etapas grandes.

## Referências Rápidas
- Perfis: `js/utils/profile-utils.js`
- Formatação: `js/utils/format-utils.js`
- Cache local: `js/utils/cache-utils.js`
- Arquivo principal legado: `main.js`
