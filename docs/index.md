# GastosWebTest — Documentação de referência

Este documento reúne informações essenciais do projeto para acelerar on-boarding e desenvolvimento contínuo.

## Visão geral

- **Projeto**: GastosWebTest — PWA para gestão financeira pessoal multi-moeda
- **Stack**: Vanilla JS/HTML/CSS + Firebase (sem frameworks)
- **Status**: Refatoração concluída com sistema multi-perfil estável
- **Arquitetura**: Estado centralizado com padrão snapshot reads implementado

## Estrutura principal

### Core Files
- `index.html` — Interface principal da aplicação
- `main.js` — Lógica de UI: renderização, handlers, modais e orquestração
- `auth.js` — Sistema de autenticação Firebase e gerenciamento de sessão

### Estado e Lógica
- `js/state/app-state.js` — **Fonte de verdade central** para todo o estado da aplicação
- `js/utils/` — Utilitários organizados: data, formato, cache, perfil, DOM
- `js/services/firebase.js` — Integração com Firebase Realtime Database

### UI e Assets  
- `login.view.js`, `login.css` — Telas de autenticação
- `style.css` — Estilos principais da aplicação
- `icons/` — Ícones para PWA (144px a 512px)
- `sw.js`, `site.webmanifest` — Service Worker e manifesto PWA

### Sistema Multi-Perfil
- Perfis suportados: **BR** (BRL), **PT** (EUR), **EUR** 
- Isolamento completo de dados por perfil
- Cache independente com chaves scopadas (`BR::tx`, `PT::tx`, etc.)
- Firebase paths diferenciados: BR usa root legacy, outros usam `/profiles/{id}/`

## Convenções e padrões adotados

- Leitura: funções síncronas que iteram/filtram transações devem obter um snapshot no começo:
```
const txs = getTransactions ? getTransactions() : transactions;
// usar `txs` exclusivamente na função
```
- Escrita: mudanças incrementais devem preferir APIs de `app-state` (`addTransaction`, `removeTransaction`, `updateTransaction`). Para alterações em lote, usar `setTransactions(list)`.
- Modais: gerenciados via `modalManager` em `ui/modals.js` (referenciar elementos por ID).
- Testes manuais: há um `test-suite.js` que pode ser executado com `runAllTests()` no console; há uma UI de testes em `test-runner.html`.

## Status da Refatoração (Outubro 2025)

### ✅ Concluído
1. **Estado centralizado**: `app-state.js` como fonte única de verdade
2. **Snapshot reads**: Padrão implementado em toda renderização
3. **Sistema multi-perfil**: BR/PT/EUR com isolamento completo
4. **Utilitários puros**: `sortTransactions`, `sanitizeTransactions` convertidos
5. **Correções críticas**: Profile switching, cache scoping, Firebase paths
6. **Compatibilidade**: Zero breaking changes no comportamento

### 🔄 Próximos Passos  
1. Finalizar varredura de snapshot reads em funções restantes
2. Adicionar testes automatizados (Playwright)  
3. Otimizações de performance (lazy loading, memoization)
4. Melhorias de UX (loading states, error handling)

## Como trabalhar na refatoração (workflow recomendado)

1. Criar uma pequena branch por batch (2–6 funções) para facilitar revisão.
2. Marcar um único TODO como `in-progress` antes de tocar código (seguindo o plano neste repositório).
3. Aplicar patches e rodar checagem estática (sintaxe) + smoke-test manual rápido.
4. Repetir até cobrir `main.js` e utilitários.

## Smoke-test checklist (essencial)

### Funcionalidades Core
1. **Transações básicas**: Adicionar, editar, excluir transação
2. **Parcelamentos**: Criar fatura parcelada e verificar master/children  
3. **Recorrências**: Criar, editar (single/future/all), excluir recorrência
4. **Modals**: Abrir `Planned` e validar projeções

### Sistema Multi-Perfil  
5. **Profile switching**: BR ↔ PT ↔ EUR sem cross-contamination
6. **Data isolation**: Verificar saldos e transações corretas por perfil
7. **Cache integrity**: Profile-scoped cache funcionando corretamente

### Sync e PWA
8. **Offline mode**: Adicionar transação offline e confirmar queue
9. **Auto-sync**: Conectar e verificar flush automático  
10. **PWA**: Install prompt e funcionamento offline completo

## Como executar testes/smoke checks locais

1. Abrir o `index.html` no navegador (dev server não é necessário, mas use um servidor estático se preferir).
2. Abrir Console e executar `runAllTests()` para rodar `test-suite.js`.
3. Usar `test-runner.html` para UI de testes.

## Próximos passos sugeridos

- Criar `docs/README.md` apontando para este documento.
- Adicionar `README.md` específico para `js/state/app-state.js` com contrato das funções públicas.
- Quando pronto, posso continuar aplicando a varredura nas áreas pendentes listadas em `plano-refatoracao.md`.

---

Se quiser, eu posso também gerar um diagrama simples (ASCII ou Mermaid) das dependências principais (`main.js` → `app-state` → `utils`) e adicionar exemplos de chamadas para as APIs de `app-state`.
