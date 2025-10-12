# GastosWebTest — Copilot AI Agent Instructions & Complete Global Index

## 📋 Índice Geral do Projeto

### Arquitetura Core
1. **index.html** - SPA principal, estrutura de modais e UI
2. **main.js** - Lógica central, event handling, orquestração de modais *(não fornecido)*
3. **auth.js** - Bootstrap Firebase Auth, API global window.Auth
4. **authService.js** - Wrapper modular para Firebase Auth
5. **firebaseService.js** - Abstração Firebase Realtime Database
6. **appState.js** - Gerenciamento global de estado da aplicação
7. **login.view.js** - Overlay de login e UX de autenticação
8. **firebaseConfig.js** - Configurações de ambiente (test/production)
9. **currency-profiles.js** - Perfis de moeda e localização

### UI e Estilos
10. **style.css** - Sistema de temas, tokens CSS, layout global
11. **login.css** - Estilos específicos do overlay de login

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

### AUTH.JS - Bootstrap Firebase Auth

**FUNÇÕES PRINCIPAIS:**
- `getOrInitApp()` - Inicializar ou reusar app Firebase
- `isStandalone()` - Detectar modo PWA
- `completeRedirectIfAny()` - Lidar com redirects de auth
- `handleRedirectOnStartup()` - Handling de auth resume PWA
- `signInWithGoogle()` - Login Google com detecção de plataforma
- `waitForRedirect()` - Aguardar completamento de redirect
- `signOut()` - Logout do usuário

**API GLOBAL (window.Auth):**
- `auth` - Instância Firebase auth
- `onReady(cb)` - Subscrever ao estado auth ready
- `off(cb)` - Desinscrever callback
- `signInWithGoogle` - Método de login Google
- `signOut` - Método de logout
- `waitForRedirect` - Método de espera de redirect
- `currentUser` - Getter do usuário atual

**DETECÇÃO DE PLATAFORMA:**
- Detecção iOS PWA e handling especial
- Seleção de persistência (IndexedDB vs browserLocal)
- Seleção de fluxo popup vs redirect

**EVENTOS DISPARADOS:**
- `'auth:state'` - Mudanças de estado auth
- `'auth:error'` - Erros de auth
- `'auth:init'` - Inicialização auth completa

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

**FUNÇÕES INTERNAS:**
- `getOrInitApp()` - Helper de inicialização Firebase app
- Gerenciamento de listeners (Set para callbacks)
- Detecção de plataforma (iOS/PWA handling)
- Configuração de provider (Google OAuth)
- Seleção de estratégia de persistência
- Tratamento de erros e fallbacks

**RECURSOS:**
- Vinculação de sessão anônima ao Google
- Otimizações iOS PWA
- Estratégias de fallback popup/redirect
- Completamento automático de redirect
- Tratamento e logging de erros

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

**FUNÇÕES INTERNAS:**
- `mockLoad(key, defaultValue)` - Operações localStorage
- `mockSave(key, value)` - Operações localStorage
- `readDirtyQueue()` - Ler queue offline
- `writeDirtyQueue(arr)` - Escrever queue offline

**RECURSOS:**
- Offline-first com fallback localStorage
- Failover automático para modo mock
- Dirty queue para sync offline
- Background sync service worker
- Paths de dados com escopo de perfil
- Gerenciamento de listeners realtime

**CHAVES SUPORTADAS:**
- `'tx'` - transações
- `'cards'` - cartões de pagamento
- `'startBal'` - saldo inicial
- `'startDate'` - data de início do período
- `'startSet'` - flag de completamento de setup

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

**PROXY LEGADO:**
- `appState` - Objeto proxy para acesso direto a propriedades

**INTERNO:**
- `subscribers` Set - Callbacks de notificação de mudança
- `emit(keys)` - Notificar subscritores de mudanças
- Validação e normalização de mudanças de estado

---

### LOGIN.VIEW.JS - UI de Overlay de Login

**CONSTANTES:**
- `ID = 'loginOverlay'` - ID do elemento overlay

**FUNÇÕES:**
- `ensureOverlay()` - Criar ou obter elemento de overlay de login
- `show()` - Exibir overlay de login com animações
- `hide()` - Ocultar overlay de login
- `setError(message)` - Exibir mensagem de erro
- `clearError()` - Limpar exibição de erro

**COMPONENTES UI:**
- Caixa de login com logo shimmer
- Título "Gastos" com animação shimmer
- Tagline "Finança simplificada"
- Botão de login Google com ícone
- Área de exibição de mensagem de erro
- Estados de loading e botão desabilitado

**RECURSOS:**
- Detecção iOS PWA e handling
- Gerenciamento de estado de botão (loading/disabled)
- Exibição e limpeza de erro
- Handling de animação e transição
- Botão Google com labels ARIA adequados
- Efeitos de texto shimmer

**TRATAMENTO DE EVENTOS:**
- Handler de clique de botão Google
- Integração com window.Auth.signInWithGoogle
- Tratamento de erro para falhas de login
- Gerenciamento de estado de loading

---

### FIREBASECONFIG.JS - Configuração de Ambiente

**EXPORTS:**
- `testConfig` - Config Firebase ambiente de teste
- `productionConfig` - Config Firebase ambiente de produção
- `firebaseConfig` - Config padrão (dependente do ambiente)
- export padrão - Mesmo que firebaseConfig

**CONFIG DE TESTE:**
- Projeto: gastosweb-test
- Domínio: gastosweb-test.firebaseapp.com
- Database: gastosweb-test-default-rtdb.firebaseio.com

**CONFIG DE PRODUÇÃO:**
- Projeto: gastosweb-e7356
- Domínio: gastosweb-e7356.firebaseapp.com
- Database: gastosweb-e7356-default-rtdb.firebaseio.com

**DETECÇÃO DE AMBIENTE:**
- Usa NODE_ENV para selecionar configuração
- Padrão para config de teste em desenvolvimento
- Config de produção quando NODE_ENV === 'production'

---

### CURRENCY-PROFILES.JS - Dados de Localização e Moeda

**GLOBAL WINDOW:** `window.CURRENCY_PROFILES`

**PERFIS SUPORTADOS:**
- **BR (Brasil):**
  - Moeda: BRL
  - Locale: pt-BR
  - Bandeira: 🇧🇷
  - Recursos: invoiceParcel: true (parcelamento)

- **PT (Portugal):**
  - Moeda: EUR
  - Locale: pt-PT
  - Bandeira: 🇵🇹
  - Recursos: invoiceParcel: false

- **US (Estados Unidos):**
  - Moeda: USD
  - Locale: en-US
  - Bandeira: 🇺🇸
  - Recursos: invoiceParcel: false

**ESTRUTURA DE PERFIL:**
- `id: string` - Identificador do perfil
- `name: string` - Nome de exibição
- `locale: string` - String de locale JavaScript
- `currency: string` - Código da moeda
- `decimalPlaces: number` - Precisão decimal
- `flag: string` - Emoji de bandeira Unicode
- `features: object` - Flags de recurso por região

---

## 🔧 Instruções para Agente AI Copilot (Padrão VIBE Coding 2025)

### 1. Princípios da Indústria & Política de Código Pristine

**SEMPRE siga estes fundamentos:**
- **JavaScript vanilla com manipulação direta do DOM** — sem frameworks, sem helpers que obscurecem relacionamentos de elementos
- **Toda lógica UI via event wiring e delegação explícita** — nunca clobber eventos globais
- **Estritamente modular:** Todos os módulos devem expor APIs claras e não vazadas. Sempre prefira funções helper para operações DOM repetidas
- **Estado gerenciado APENAS via appState.js** e, por extensão, Firebase via firebaseService.js — nunca reimplemente estado local ou duplique fonte da verdade
- **Use módulos utilitários para lógica compartilhada** (`/js/utils/` para helpers de data, formato, DOM)
- **Gerenciamento de tema e modal:** Sempre use triggers e convenções corretos:
  - Tema: alternar com `themeManager` + seletores `.theme-row`, `.theme-btn`
  - Modais: abrir/fechar via modalManager único ou rotinas DOM vanilla show/hide, IDs devem seguir convenção

### 2. Padrões Padrão

**Show/Hide de Modal:** Todos os modais devem ter container dedicado com `id`, são gerenciados via JS com show/hide, e transições CSS.

**Alternância de Tema:** Controlada via class toggles ou themeManager. Todas as cores/espaçamento via CSS vars.

**Delegação:** Use delegação de eventos para controles repetitivos (segmentado do header, pills, menus swipe).

**Teste:** Todos os novos testes vão para `test-suite.js`, use APIs `TestRunner.*` apenas. UI: `test-runner.html`.

**Edição direta, refresh do navegador aplicado** — nunca requeira compilador, etapa de pacote, ou pré/pós-processamento para uso em produção.

### 3. Fluxo de Trabalho do Agente AI

**Antes de resolver/implementar:** Sempre consulte este índice para localizar estado, modal, UI ou lógica auth corretos.

**Não adivinhe localização de módulo ou estado — encontre e use isto como fonte única da verdade do projeto.**

**Para novos recursos:**
- Adicione estado via appState.js exclusivamente
- UI: adicione novos event wires centralmente em main.js
- Estilos: adicione tokens/variantes em style.css, respeite regras dark/light
- Auth/DB: Apenas via auth.js/authService.js e firebaseService.js

**Para correções de bugs:** Trace caminho de evento e estado usando este mapa global — não adicione lógica sobreposta.

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

**Logging Consistente:**
- Prefixe logs com nome do módulo (ex: 'AuthService:', 'FirebaseService:')
- Use níveis apropriados: error, warn, log, info
- Inclua contexto relevante em mensagens de log

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
- **Lógica Principal:** `main.js` *(não fornecido)*
- **Estado Global:** `appState.js`

### Authentication
- **Bootstrap Auth:** `auth.js`
- **Wrapper Modular:** `authService.js`
- **UI de Login:** `login.view.js`

### Data Management
- **Database Wrapper:** `firebaseService.js`
- **Configuração:** `firebaseConfig.js`

### Localization
- **Perfis de Moeda:** `currency-profiles.js`

### Styling
- **Tema Principal:** `style.css`
- **Login Styles:** `login.css`

### Directories (Referenced but not provided)
- **Utils:** `/js/utils/`
- **UI Components:** `/ui/`
- **Components:** `/components/`
- **Assets:** `/icons/`

---

**Para todas as futuras tarefas de codificação AI neste projeto:**

1. **Consulte este índice global e a seção "Instruções para Agente AI Copilot" antes de fazer mudanças arquiteturais ou de lógica**
2. **Mantenha, expanda e atualize este arquivo sempre que um novo recurso/arquivo/módulo ou diretório for criado**
3. **Anexe nova documentação de módulo ao "Mapeamento Completo" e, quando aplicável, à lista "Lookup Rápido"**
4. **Siga estritamente os padrões de código vanilla JS, manipulação DOM direta, e arquitetura modular descrita**

---

**Atualizado em:** 2025-10-12 | **Versão:** 2.0 Completa | **Status:** Mapeamento Integral Concluído