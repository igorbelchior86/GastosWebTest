# GastosWebTest — Copilot AI Agent Instructions & Complete Global Index

Este arquivo é o contrato e guia do agente AI trabalhando neste repositório (a versão web PWA). Contém convenções, inventário e políticas que o agente deve seguir.

---

**Repositório:** `/Users/igorbelchior/Documents/GitHub/GastosWebTest`
**Última atualização:** 2025-10-27 (Documento reestruturado baseado no padrão RN)

---

## PARTE 1: BIG PICTURE — Regras Imutáveis (Desenvolvimento)

Este documento é o **contrato único** entre desenvolvedor e AI. Todas as decisões devem seguir estas regras.

### 1.1 Objetivo Principal

- **SPA PWA vanilla JavaScript** para gestão de finanças pessoais
- **Firebase Realtime Database** para persistência e sync
- **Google Auth** para autenticação
- **Offline-first** com service worker e localStorage fallback
- **PWA compatível** com iOS Safari e Android Chrome

### 1.2 Princípios de Desenvolvimento

#### Código
- **JavaScript vanilla com manipulação direta do DOM** — sem frameworks, sem helpers que obscurecem relacionamentos de elementos
- **Single Source of Truth:** `src/state/appState.js` = estado global único
- **Persistência:** Firebase Realtime Database + localStorage fallback
- **Componentes:** Funções modulares puras, manipulação DOM direta
- **Nomeação:** camelCase (funções), PascalCase (construtores), UPPER_SNAKE_CASE (constantes)
- **Organização:** `src/`, `public/`, `utils/`, `ui/`, `services/`, `state/`, `config/`

#### Build & Infraestrutura
- **Vanilla JS** — nenhum bundler, transpiler ou build step necessário
- **PWA:** Service Worker em `sw.js`, manifest em `site.webmanifest`
- **Firebase:** Configuração em `src/config/firebaseConfig.js`
- **Testes:** `test-suite.js` com TestRunner APIs
- **Linting:** ESLint configurado (se existir)

#### Scripts NPM (se aplicável)
- Desenvolvimento direto no navegador
- Refresh automático do navegador
- Sem build steps — edição direta

### 1.3 Convenções Arquivos

**NUNCA criar .md na raiz do projeto.** Toda documentação vai aqui neste arquivo.

- `index.html` — SPA principal, estrutura de modais e UI
- `public/style.css` — Sistema de temas, tokens CSS, layout global
- `src/state/appState.js` — ⭐ Estado global + gerenciamento
- `src/services/firebaseService.js` — Firebase Realtime Database wrapper
- `src/services/authService.js` — Firebase Auth wrapper
- `public/auth.js` — Bootstrap Firebase Auth, API global window.Auth
- `src/ui/*` — Componentes UI modulares
- `src/utils/*` — Utilitários (formatting, dates, DOM helpers)
- `src/config/*` — Configurações (Firebase, features)
- `test-suite.js` — Testes unitários

**NÃO criar:** ROADMAP.md, DEVELOPMENT.md, etc. Tudo vai aqui.

### 1.4 Quality Gates (Antes de Qualquer Merge)

- ✅ **Funcionalidade:** App carrega e funciona no navegador
- ✅ **Estado:** Dados persistem via Firebase/localStorage
- ✅ **PWA:** Instala como app em dispositivos móveis
- ✅ **Compatibilidade:** Funciona em iOS Safari e Chrome Android
- ✅ **Código:** JavaScript vanilla, manipulação DOM direta
- ✅ **Testes:** `test-suite.js` passa (se existir)

### 1.5 Arquitetura do Projeto

```
src/
├── state/
│   └── appState.js                     # ⭐ Estado global
├── services/
│   ├── firebaseService.js              # Firebase Database
│   ├── authService.js                  # Firebase Auth
│   └── preferenceService.js            # Preferências usuário
├── ui/
│   ├── accordion.js                    # Accordion transações
│   ├── transactionModal.js             # Modal transações
│   ├── budgetActions.js                # Ações orçamentos
│   └── ...                             # Outros componentes UI
├── utils/
│   ├── format.js                       # Formatação moeda/data
│   ├── date.js                         # Helpers data
│   ├── dom.js                          # Helpers DOM
│   └── ...                             # Outros utils
├── config/
│   ├── firebaseConfig.js               # Config Firebase
│   └── features.js                     # Feature flags
└── compat/
    └── globals.js                      # Polyfills/compat

public/
├── index.html                          # SPA principal
├── style.css                           # CSS global
├── auth.js                             # Bootstrap auth
├── login.view.js                       # UI login
└── login.css                           # CSS login

utils/ (raiz)
├── currencyProfile.js
├── dailyBalances.js
├── data.js
└── ... (mais utils)
```

### 1.6 Regras de Engenharia

- **Não externalizar lógica:** Tudo importável do `src/` ou `utils/`
- **Não duplicar código:** Se existe função X em utils/, usar X (não copiar)
- **Não commitar secrets:** `.env`, senhas, tokens — ignorar via `.gitignore`
- **Manter histórico limpo:** Sem "arquivo 2", "pasta backup", etc
- **Imports locais:** Usar `./` ou `../` para imports

---

## PARTE 2: Planejamento / Desenvolvimento / Pendências (Dinâmico)

**Esta seção é atualizada a CADA modificação.** Data da última atualização no topo.

### 2.1 Status Geral do Projeto

**Porcentagem:** 100% funcional + PWA completa  
**Arquivos:** ~80 arquivos JS organizados  
**App Status:** 🟢 **RODANDO como PWA em navegadores modernos com 100% de funcionalidade**

#### ✅ COMPLETO (FINAL - PROJETO FUNCIONAL)
- [x] **index.html** — SPA principal com estrutura de modais
- [x] **appState.js** — Gerenciamento global de estado
- [x] **firebaseService.js** — Firebase Realtime Database com offline-first
- [x] **authService.js** — Firebase Auth com Google login
- [x] **auth.js** — Bootstrap auth com PWA handling
- [x] **login.view.js** — UI overlay de login
- [x] **Modais completos** — Transaction, Card, Planned, Settings, Year Select
- [x] **UI Components** — Accordion, transaction rows, card rows, etc.
- [x] **Utils completos** — Format, date, DOM helpers, currency profiles
- [x] **PWA features** — Service worker, manifest, offline support
- [x] **Sistema de temas** — Dark/light mode com CSS variables
- [x] **Multi-moeda** — Suporte BRL, EUR, USD com localização
- [x] **Testes** — test-suite.js com TestRunner APIs

#### ✅ FUNCIONALIDADES PRINCIPAIS
- [x] **Transações:** CRUD completo com filtros por data
- [x] **Cartões:** Gerenciamento de cartões de pagamento
- [x] **Orçamentos:** Sistema de budgets (planejados)
- [x] **Saldo inicial:** Setup e tracking de saldo
- [x] **Autenticação:** Google Auth com PWA support
- [x] **Persistência:** Firebase + localStorage fallback
- [x] **Offline:** Funciona offline com sync automático
- [x] **PWA:** Instalável em iOS/Android

### 2.2 Próximas Tarefas (Ordem de Prioridade)

#### BAIXA PRIORIDADE (manutenção)
- Melhorar performance em dispositivos móveis
- Adicionar mais testes unitários
- Otimizar bundle size (atualmente vanilla JS, já otimizado)
- Melhorar UX em iOS Safari PWA

### 2.3 Checklist de QA (Antes de Finalizar)

#### Build
- [x] **Carregamento:** App abre no navegador sem erros
- [x] **Funcionalidade:** Todas as features principais funcionam
- [x] **PWA:** Instala como app nativo

#### Funcionalidade
- [x] **Transações:** Adicionar, editar, deletar, listar ✓
- [x] **Cartões:** Gerenciar cartões ✓
- [x] **Orçamentos:** Criar e gerenciar budgets ✓
- [x] **Auth:** Login/logout Google ✓
- [x] **Offline:** Funciona sem internet ✓
- [x] **Sync:** Dados sincronizam quando online ✓

#### UI/UX
- [x] **Responsivo:** Funciona em mobile/desktop ✓
- [x] **Temas:** Dark/light mode ✓
- [x] **PWA:** Experiência nativa em dispositivos ✓
- [x] **Acessibilidade:** Labels ARIA, navegação teclado ✓

#### Código
- [x] **Vanilla JS:** Sem frameworks ✓
- [x] **Modular:** Código organizado em módulos ✓
- [x] **DOM direto:** Manipulação direta do DOM ✓
- [x] **Estado:** Tudo via appState.js ✓

### 2.4 Troubleshooting Rápido

**App não carrega:**
1. Verificar console do navegador para erros JS
2. Verificar se Firebase config está correta
3. Verificar se arquivos estão sendo servidos (localhost vs file://)

**Auth não funciona:**
1. Verificar Firebase project ID e API keys
2. Verificar domínio autorizado no Firebase Console
3. Verificar se está em HTTPS (requerido para Google Auth)

**Dados não persistem:**
1. Verificar conexão Firebase
2. Verificar se user está logado
3. Verificar localStorage fallback

**PWA não instala:**
1. Verificar manifest.json syntax
2. Verificar HTTPS
3. Verificar service worker registration

---

## PARTE 3: Referência Rápida

### Verificação Rápida
```bash
# Abrir no navegador
open index.html

# Ver estrutura
find src -name "*.js" | wc -l

# Ver testes (se existir)
# Abrir test-runner.html no navegador
```

### Estrutura Esperada Completa
```
~80 arquivos JS:
- Core: index.html, appState.js, firebaseService.js
- UI: accordion.js, transactionModal.js, etc. (~20 arquivos)
- Utils: format.js, date.js, dom.js, etc. (~15 arquivos)
- Services: authService.js, preferenceService.js (~5 arquivos)
- Config: firebaseConfig.js, features.js (~2 arquivos)
- State: appState.js (1)
- Outros: bootstrap, navigation, etc. (~20 arquivos)
```

#### Dependências Críticas
- Firebase SDK (CDN ou local)
- Service Worker API (modern browsers)
- localStorage/IndexedDB (persistência)
- PWA APIs (manifest, install prompt)

---

## 🗂️ Mapeamento Completo de Estruturas e Funções

### INDEX.HTML - Estrutura Principal da SPA

**MODALS E CONTAINERS:**
- `#loginOverlay` - Container do overlay de login
- `#transactionModal` - Modal de transações
- `#cardModal` - Modal de gerenciamento de cartões
- `#plannedModal` - Modal de transações planejadas
- `#yearSelectModal` - Modal de seleção de ano
- `#confirmModal` - Diálogos de confirmação
- `#settingsModal` - Modal de configurações
- `#accordion` - Tabela principal de transações

**ELEMENTOS UI PRINCIPAIS:**
- `.header` - Cabeçalho da app com navegação
- `.floating-pill` - Menu flutuante de ações
- `.segmented-control` - Abas de navegação no cabeçalho
- `.theme-switcher` - Controles de alternância de tema
- `.add-buttons` - Botões de adicionar transação/cartão
- `.balance-display` - Informações de saldo
- `.transaction-row` - Entradas individuais de transação
- `.card-row` - Entradas de gerenciamento de cartão

**SCRIPTS CARREGADOS:**
- auth.js (Bootstrap Firebase Auth)
- login.view.js (Lógica UI de login)
- main.js (Lógica central da app)
- appState.js (Gerenciamento de estado)
- authService.js (Wrapper de auth)
- firebaseService.js (Wrapper de database)
- currency-profiles.js (Dados de localização)

---

### APPSTATE.JS - Gerenciamento de Estado da Aplicação

**ESTRUTURA DE ESTADO (DEFAULT_STATE):**
- `startBalance: number|null` - Saldo inicial do usuário
- `startDate: string|null` - Data ISO do início do período
- `startSet: boolean` - Flag de completamento de setup
- `bootHydrated: boolean` - Dados carregados do armazenamento
- `transactions: Array` - Lista de transações
- `cards: Array` - Lista de cartões de pagamento

**EXPORTS PRINCIPAIS:**
- `getState()` - Obter cópia superficial do estado atual
- `setState(patch, options)` - Mesclar atualizações parciais de estado
- `subscribeState(fn)` - Subscrever a mudanças de estado
- `resetState(options)` - Resetar para valores padrão

**HELPERS DE SALDO E DATA:**
- `getStartBalance()` / `setStartBalance(value, options)`
- `getStartDate()` / `setStartDate(value, options)`
- `getStartSet()` / `setStartSet(value, options)`
- `isBootHydrated()` / `setBootHydrated(value, options)`

**HELPERS DE TRANSAÇÃO:**
- `getTransactions()` - Obter cópia do array de transações
- `setTransactions(list, options)` - Substituir transações
- `addTransaction(tx, options)` - Adicionar transação única
- `updateTransaction(id, patch, options)` - Atualizar por ID
- `removeTransaction(id, options)` - Remover por ID

**HELPERS DE CARTÃO:**
- `getCards()` - Obter cópia do array de cartões
- `setCards(list, options)` - Substituir cartões
- `addCard(card, options)` - Adicionar cartão único
- `updateCard(nameOrIndex, patch, options)` - Atualizar por nome/índice
- `removeCard(nameOrIndex, options)` - Remover por nome/índice

---

### FIREBASESERVICE.JS - Wrapper de Database

**EXPORTS:**
- `init(config)` - Inicializar database Firebase
- `setPath(p)` - Definir escopo do path de dados do usuário
- `setMockMode(enabled)` - Alternar modo offline/mock
- `load(key, defaultValue)` - Carregar dados do Firebase/localStorage
- `save(key, value)` - Salvar dados no Firebase/localStorage
- `profileRef(key)` - Obter referência de database para chave
- `startListeners(handlers)` - Anexar listeners realtime
- `markDirty(kind)` - Marcar dados como precisando sync
- `getDirtyQueue()` - Obter itens de sync pendentes
- `flushQueue()` - Sincronizar mudanças offline para Firebase
- `scheduleBgSync()` - Agendar sync service worker
- `FirebaseService` - Objeto debug

**CHAVES SUPORTADAS:**
- `'tx'` - transações
- `'cards'` - cartões de pagamento
- `'startBal'` - saldo inicial
- `'startDate'` - data de início do período
- `'startSet'` - flag de completamento de setup

---

### AUTHSERVICE.JS - Wrapper Modular de Auth

**EXPORTS:**
- `init(config)` - Inicializar serviço Firebase Auth
- `onAuthChanged(fn)` - Subscrever a mudanças de estado auth
- `signInWithGoogle()` - Login Google com detecção de plataforma
- `completeRedirectIfAny()` - Completar redirects pendentes
- `signOut()` - Logout do usuário atual
- `getCurrentUser()` - Obter usuário atual ou null
- `AuthService` - Objeto debug com todos os métodos

---

### AUTH.JS - Bootstrap Firebase Auth

**API GLOBAL (window.Auth):**
- `auth` - Instância Firebase auth
- `onReady(cb)` - Subscrever ao estado auth ready
- `off(cb)` - Desinscrever callback
- `signInWithGoogle` - Método de login Google
- `signOut` - Método de logout
- `waitForRedirect` - Método de espera de redirect
- `currentUser` - Getter do usuário atual

**EVENTOS DISPARADOS:**
- `'auth:state'` - Mudanças de estado auth
- `'auth:error'` - Erros de auth
- `'auth:init'` - Inicialização auth completa

---

## 🔧 Instruções para Agente AI Copilot (Padrão VIBE Coding 2025)

### 1. Princípios da Indústria & Política de Código Pristine

**SEMPRE siga estes fundamentos:**
- **JavaScript vanilla com manipulação direta do DOM** — sem frameworks, sem helpers que obscurecem relacionamentos de elementos
- **Toda lógica UI via event wiring e delegação explícita** — nunca clobber eventos globais
- **Estritamente modular:** Todos os módulos devem expor APIs claras e não vazadas. Sempre prefira funções helper para operações DOM repetidas
- **Estado gerenciado APENAS via appState.js** e, por extensão, Firebase via firebaseService.js — nunca reimplemente estado local ou duplique fonte da verdade
- **Use módulos utilitários para lógica compartilhada** (`src/utils/` para helpers de data, formato, DOM)

### 2. Padrões Padrão

**Show/Hide de Modal:** Todos os modais devem ter container dedicado com `id`, são gerenciados via JS com show/hide, e transições CSS.

**Alternância de Tema:** Controlada via class toggles. Todas as cores/espaçamento via CSS vars.

**Delegação:** Use delegação de eventos para controles repetitivos (segmentado do header, pills, menus swipe).

**Teste:** Todos os novos testes vão para `test-suite.js`, use APIs `TestRunner.*` apenas.

**Edição direta, refresh do navegador aplicado** — nunca requeira compilador, etapa de pacote, ou pré/pós-processamento para uso em produção.

### 3. Fluxo de Trabalho do Agente AI

**Antes de resolver/implementar:** Sempre consulte este índice para localizar estado, modal, UI ou lógica auth corretos.

**Para novos recursos:**
- Adicione estado via appState.js exclusivamente
- UI: adicione novos event wires centralmente em main.js
- Estilos: adicione tokens/variantes em style.css, respeite regras dark/light
- Auth/DB: Apenas via auth.js/authService.js e firebaseService.js

### 4. Integração Específica do Projeto

**Auth:** Todos os fluxos de autenticação dependem do Login Google e devem rotear via camada de API window.Auth (veja auth.js).

**Dados:** Todos os CRUD e listas (transações, cartões, planejados, etc.) fluem através de appState.js, firebaseService gerencia sync cloud e fallback offline.

**Moeda:** Adira a window.CURRENCY_PROFILES para todas as escolhas de locale/moeda. Nunca hardcode formatos monetários ou culturais.

### 5. Padrões de Nomeação e Organização

**Arquivos JS:** Use camelCase para nomes de função, PascalCase para constructors/classes

**Elementos DOM:** Use kebab-case para IDs e classes CSS

**Estados e Propriedades:** Use camelCase consistente com JavaScript

**Eventos Customizados:** Use formato 'namespace:action' (ex: 'auth:state', 'auth:error')

**Constantes:** Use UPPER_SNAKE_CASE para constantes do módulo

### 6. Tratamento de Erros e Logging

**Sempre implemente tratamento de erro gracioso:**
- Catch e log erros de rede/Firebase
- Fallback para modo mock quando apropriado
- Exiba mensagens de erro user-friendly
- Use console.error para debugging, console.warn para avisos

### 7. Otimizações PWA e Mobile

**Sempre considere contexto PWA:**
- Teste especialmente para iOS PWA (Safari)
- Use persistência apropriada (IndexedDB vs localStorage)
- Implemente estratégias offline-first
- Handle adequadamente redirects auth em PWA
- Considere limitações de popup em contextos mobile

### 8. Testes e Qualidade

**Para todo novo código:**
- Escreva testes unitários em test-suite.js
- Use TestRunner APIs para assertions
- Teste cenários de erro e edge cases
- Verifique compatibilidade cross-browser
- Valide comportamento offline/online

---

## [ARQUIVOS CHAVE POR RESPONSABILIDADE (LOOKUP RÁPIDO)]

### Core Logic
- **Estrutura SPA/UI:** `index.html`
- **Lógica Principal:** `src/main.js`
- **Estado Global:** `src/state/appState.js`

### Authentication
- **Bootstrap Auth:** `public/auth.js`
- **Wrapper Modular:** `src/services/authService.js`
- **UI de Login:** `public/login.view.js`

### Data Management
- **Database Wrapper:** `src/services/firebaseService.js`
- **Configuração:** `src/config/firebaseConfig.js`

### Localization
- **Perfis de Moeda:** `utils/currencyProfile.js`

### Styling
- **Tema Principal:** `public/style.css`
- **Login Styles:** `public/login.css`

---

**Para todas as futuras tarefas de codificação AI neste projeto:**

1. **Consulte este índice global e a seção "Instruções para Agente AI Copilot" antes de fazer mudanças arquiteturais ou de lógica**
2. **Mantenha, expanda e atualize este arquivo sempre que um novo recurso/arquivo/módulo ou diretório for criado**
3. **Anexe nova documentação de módulo ao "Mapeamento Completo" e, quando aplicável, à lista "Lookup Rápido"**
4. **Siga estritamente os padrões de código vanilla JS, manipulação DOM direta, e arquitetura modular descrita**

---

**LEMBRE-SE:** Este arquivo é a ÚNICA fonte de verdade para documentação do projeto.  
Nada de ROADMAP.md, DEVELOPMENT.md, etc.  
Tudo aqui. Sempre atualizado.

**Atualizado em:** 2025-10-27 | **Versão:** 3.0 Estruturada | **Status:** Documento reestruturado baseado no padrão RN