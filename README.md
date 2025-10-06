# GastosWebTest

Mini-app para controle financeiro pessoal desenvolvido em vanilla JavaScript, HTML e CSS. PWA completa com suporte offline e sincronização Firebase.

## 🚀 Funcionalidades

- **Gestão Multi-Moeda**: Suporte completo a perfis BRL, EUR, POR com isolamento de dados
- **Controle de Transações**: Adicionar, editar, excluir com categorização por cartões
- **Recorrências e Parcelamentos**: Sistema completo de transações recorrentes
- **Relatórios**: Visualização por data com saldos progressivos
- **PWA**: Funciona offline com sincronização automática
- **Firebase**: Autenticação e banco de dados em tempo real

## 🏗️ Arquitetura

### Estado Atual da Refatoração
Este projeto passou por uma refatoração incremental para:
- Centralizar estado em `js/state/app-state.js`
- Implementar padrão de snapshot reads para consistência de dados
- Tornar funções puras e testáveis
- Manter compatibilidade total com comportamento legado

### Arquivos Principais
- `index.html` — Interface principal da aplicação
- `main.js` — Lógica de UI, renderização e orquestração
- `js/state/app-state.js` — Fonte de verdade para estado compartilhado
- `js/utils/` — Utilitários (data, formato, cache, perfil)
- `auth.js` — Integração Firebase Authentication

## 📁 Estrutura do Projeto

```
├── index.html              # App principal  
├── main.js                 # Core UI logic
├── auth.js                 # Firebase auth
├── js/
│   ├── state/
│   │   └── app-state.js    # Estado centralizado
│   ├── utils/              # Utilitários
│   └── services/           # Serviços externos
├── docs/                   # Documentação técnica
└── icons/                  # Ícones PWA
```

## 🔧 Desenvolvimento

### Executar Localmente
```bash
# Servir arquivos estáticos (qualquer servidor HTTP)
python -m http.server 8000
# ou
npx serve .
```

### Testes
```javascript
// No console do navegador
runAllTests()
```

### Documentação Técnica
- `docs/index.md` — Overview e arquitetura
- `docs/developer.md` — APIs e contratos
- `docs/app-state.md` — Documentação do estado central

## ✅ Status da Refatoração

### Concluído
- ✅ Sistema de perfis multi-moeda (BRL/EUR/POR)
- ✅ Migração para app-state centralizado
- ✅ Padrão snapshot reads implementado
- ✅ Renderização otimizada com snapshots únicos
- ✅ Compatibilidade retroativa mantida
- ✅ Correções de isolamento de perfis

### Próximos Passos
1. Finalizar varredura de snapshot reads em `main.js`
2. Converter utilitários restantes para funções puras
3. Adicionar testes automatizados (Playwright)

## 🏛️ Padrões Arquiteturais

### Snapshot Reads
```javascript
// Padrão recomendado para leituras consistentes
const txs = getTransactions();
// Use apenas 'txs' durante toda a execução
```

### APIs de Estado
```javascript
// Leitura
const transactions = getTransactions();
const cards = getCards();

// Escrita
addTransaction(newTx);
updateTransaction(id, patch);
setTransactions(updatedList);
```

## 📊 Sistema Multi-Perfil

O app suporta múltiplos perfis de moeda com:
- Isolamento completo de dados por perfil
- Cache independente por perfil  
- Estruturas Firebase diferenciadas (legacy vs scoped)
- Transições seguras entre perfis

## 🔄 Sincronização

- **Offline-First**: Funciona completamente offline
- **Auto-Sync**: Sincronização automática quando online
- **Conflict Resolution**: Sistema LWW (Last Writer Wins)
- **Queue System**: Fila de operações para sync posterior
