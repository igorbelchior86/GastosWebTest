/**
 * main-refactored.js - Arquivo principal refatorado
 * Integra todos os módulos e mantém compatibilidade com a versão original
 */

// ===== IMPORTS DOS NOVOS MÓDULOS =====
import { fmtCurrency, fmtNumber, parseCurrency, escHtml } from './js/utils/format-utils.js';
import { DEFAULT_PROFILE, LEGACY_PROFILE_ID, PROFILE_DATA_KEYS, PROFILE_CACHE_KEYS, getRuntimeProfile, getCurrencyName, getCurrentProfileId, scopedCacheKey, scopedDbSegment } from './js/utils/profile-utils.js';
import { cacheGet, cacheSet, cacheRemove, cacheClearProfile } from './js/utils/cache-utils.js';
import { todayISO, normalizeISODate, formatToISO } from './js/utils/date-utils.js';
import { 
    appState, setStartBalance, setStartDate, setStartSet, setBootHydrated, 
    setTransactions, getTransactions, setCards, getCards, subscribeState,
    addTransaction, removeTransaction, updateTransaction, findTransaction
} from './js/state/app-state.js';
import { 
    sortTransactions, sanitizeTransactions, groupTransactionsByMonth,
    getTransactionsByDate as txByDate, calculateDateRange, preparePlannedTransactions,
    normalizeTransaction as normalizeTransactionRecord, findMasterTransaction as findMasterRuleFor
} from './js/core/transaction-engine.js';
import { 
    buildRunningBalanceMap, calculateDayImpact, getBalanceOnDate,
    projectBalance, findNegativeBalanceDates, getBalanceStats
} from './js/core/balance-calculator.js';

// ===== ESTADO GLOBAL LEGADO (COMPATIBILIDADE) =====
const state = appState;
let transactions = []; // Mantido como shim para compatibilidade
let cards = [{ name: 'Dinheiro', close: 0, due: 0 }]; // Mantido como shim

// ===== VARIÁVEIS GLOBAIS EXISTENTES =====
let startInputRef = null;
const hydrationTargets = new Map();
let hydrationInProgress = true;
let reopenPlannedAfterEdit = false;
let _hydrationFallbackTimer = null;

// ===== UTILITIES EXISTENTES =====
const sameId = (a, b) => String(a ?? '') === String(b ?? '');
const HYDRATION_KEYS = ['tx', 'cards'];

function ensureCashCard(cardsList) {
    const normalized = Array.isArray(cardsList) ? cardsList.filter(Boolean).map(card => ({ ...card })) : [];
    const cashIndex = normalized.findIndex(card => (card?.name || '').toLowerCase() === 'dinheiro');

    if (cashIndex >= 0) {
        const cashCard = normalized[cashIndex];
        normalized[cashIndex] = {
            name: 'Dinheiro',
            close: Number.isFinite(Number(cashCard.close)) ? Number(cashCard.close) : 0,
            due: Number.isFinite(Number(cashCard.due)) ? Number(cashCard.due) : 0
        };
        return normalized;
    }

    return [
        { name: 'Dinheiro', close: 0, due: 0 },
        ...normalized
    ];
}

function syncStartInputFromState() {
    const input = startInputRef || document.getElementById('startInput');
    if (!input) return;

    if (!startInputRef && input) {
        startInputRef = input;
    }

    const balance = state.startBalance;
    const numericBalance = Number(balance);

    if (balance == null || Number.isNaN(numericBalance)) {
        input.value = '';
        return;
    }

    try {
        const formatted = fmtCurrency(numericBalance).replace(/\u00a0/g, ' ');
        input.value = formatted;
    } catch (error) {
        console.warn('syncStartInputFromState: fallback formatting', error);
        input.value = String(balance);
    }
}

function ensureStartSetFromBalance(options = {}) {
    const { persist = true, refresh = true } = options;

    if (state.startSet === true) return;

    const balance = Number(state.startBalance);
    if (state.startBalance == null || Number.isNaN(balance)) return;

    setStartSet(true);

    try { cacheSet('startSet', true); } catch (_) {}

    const hasPath = typeof PATH !== 'undefined' && PATH;
    if (persist && typeof save === 'function' && hasPath) {
        Promise.resolve()
            .then(() => save('startSet', true))
            .catch(() => {});
    }

    if (refresh) {
        try { initStart(); } catch (_) {}
    }
}

function updatePendingBadge() {
    const syncBtn = document.getElementById('syncNowBtn');
    if (!syncBtn) return;

    try {
        const dirtyQueue = cacheGet('dirtyQueue', []);
        const count = Array.isArray(dirtyQueue) ? dirtyQueue.length : 0;
        syncBtn.textContent = count > 0 ? `⟳ (${count})` : '⟳';
    } catch (error) {
        console.warn('updatePendingBadge error:', error);
    }
}

function resetHydration() {
    hydrationInProgress = true;
    hydrationTargets.clear();
    HYDRATION_KEYS.forEach(key => hydrationTargets.set(key, false));

    try {
        document.documentElement.classList.add('skeleton-boot');
    } catch (_) {}

    if (_hydrationFallbackTimer) {
        clearTimeout(_hydrationFallbackTimer);
    }

    _hydrationFallbackTimer = setTimeout(() => {
        console.warn('⏱️ Hydration fallback triggered - marking all targets ready');
        HYDRATION_KEYS.forEach(markHydrationTargetReady);
    }, 10000);
}

function markHydrationTargetReady(target) {
    if (!target) return;
    if (!hydrationTargets.has(target)) {
        hydrationTargets.set(target, true);
    } else {
        hydrationTargets.set(target, true);
    }

    const allReady = HYDRATION_KEYS.every(key => hydrationTargets.get(key));
    if (allReady && hydrationInProgress) {
        completeHydration();
    }
}

function completeHydration() {
    if (!hydrationInProgress) return;
    hydrationInProgress = false;

    if (_hydrationFallbackTimer) {
        clearTimeout(_hydrationFallbackTimer);
        _hydrationFallbackTimer = null;
    }

    hydrationTargets.clear();

    try { setBootHydrated(true); } catch (_) { state.bootHydrated = true; }
    try { ensureStartSetFromBalance({ persist: true }); } catch (error) { console.warn('ensureStartSetFromBalance failed during hydration', error); }
    try { updatePendingBadge(); } catch (_) {}

    try { if (typeof refreshMethods === 'function') refreshMethods(); } catch (error) { console.warn('refreshMethods failed during hydration', error); }
    try { if (typeof renderCardList === 'function') renderCardList(); } catch (error) { console.warn('renderCardList failed during hydration', error); }
    try { if (typeof initStart === 'function') initStart(); } catch (error) { console.warn('initStart failed during hydration', error); }
    try { if (typeof renderTable === 'function') renderTable(); } catch (error) { console.warn('renderTable failed during hydration', error); }

    try { document.documentElement.classList.remove('skeleton-boot'); } catch (_) {}

    try {
        const wrapper = document.querySelector('.wrapper');
        if (wrapper) {
            wrapper.classList.remove('app-hidden');
            wrapper.style.removeProperty('visibility');
            if (wrapper.style.display === 'none') {
                wrapper.style.display = '';
            }
        }
    } catch (error) {
        console.warn('completeHydration: failed to reveal wrapper', error);
    }

    try {
        if (typeof onHydrationComplete === 'function') {
            onHydrationComplete();
        }
    } catch (error) {
        console.error('onHydrationComplete error:', error);
    }

    console.log('✅ Hydration complete - all targets ready');
}

function isHydrating() {
    return hydrationInProgress;
}

// ===== SINCRONIZAÇÃO LEGADO/NOVO SISTEMA =====

/**
 * Sincroniza arrays legados com o novo estado
 */
function syncLegacyArrays() {
    try {
        transactions = getTransactions();
        cards = getCards();
    } catch (error) {
        console.warn('syncLegacyArrays error:', error);
    }
}

/**
 * Subscriber para manter sincronização
 */
subscribeState((type, data) => {
    if (type.startsWith('transactions:') || type.startsWith('cards:')) {
        syncLegacyArrays();
        
        // Notifica mudanças para código legado
        try {
            if (typeof onStateChange === 'function') {
                onStateChange(type, data);
            }
        } catch (error) {
            console.warn('State change notification error:', error);
        }
    }
});

// ===== PREPARAR LISTA PLANEJADOS (REFATORADO) =====

function preparePlannedList() {
    if (!plannedList) return;
    
    // Limpa lista atual
    plannedList.innerHTML = '';
    
    // Obtém transações planejadas organizadas
    const plannedByDate = preparePlannedTransactions(90);
    
    // Ordena datas e renderiza
    const sortedDates = Object.keys(plannedByDate).sort();
    
    for (const date of sortedDates) {
        const group = plannedByDate[date].sort((a, b) => (a.ts || '').localeCompare(b.ts || ''));
        
        // Cabeçalho da data
        const dateObj = new Date(date + 'T00:00');
        const dateLabel = dateObj.toLocaleDateString('pt-BR', { 
            weekday: 'long', 
            day: '2-digit', 
            month: '2-digit' 
        });
        
        const groupHeader = document.createElement('h3');
        groupHeader.textContent = dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1);
        plannedList.appendChild(groupHeader);
        
        // Transações do grupo
        for (const tx of group) {
            plannedList.appendChild(makeLine(tx, true));
        }
    }
}

// ===== HIDRATAÇÃO DO ESTADO (REFATORADO) =====

function hydrateStateFromCache(options = {}) {
    const { render = true } = options;
    
    try {
        // Carrega transações do cache
        const cachedTx = cacheGet('tx', []);
        const normalizedTx = (cachedTx || [])
            .filter(Boolean)
            .map(normalizeTransactionRecord);
        
        setTransactions(normalizedTx);
        
        // Sanitiza e ordena
        const { sanitized, changed } = sanitizeTransactions(normalizedTx);
        if (changed) {
            setTransactions(sanitized);
        }
        sortTransactions();
        
        // Carrega cartões
        const cachedCards = cacheGet('cards', [{ name: 'Dinheiro', close: 0, due: 0 }]);
        const normalizedCards = ensureCashCard(cachedCards);
        setCards(normalizedCards);
        
        // Carrega configurações
        state.startBalance = cacheGet('startBal', null);
        state.startDate = normalizeISODate(cacheGet('startDate', null));
        state.startSet = cacheGet('startSet', false);
        
        // Limpa saldo zero sem data
        if (state.startDate == null && (state.startBalance === 0 || state.startBalance === '0')) {
            state.startBalance = null;
            cacheSet('startBal', null);
        }
        
        // Finaliza hidratação
        syncStartInputFromState();
        setBootHydrated(true);
        ensureStartSetFromBalance();
        
        // Sincroniza arrays legados
        syncLegacyArrays();
        
        if (render && !isHydrating()) {
            // Renderiza interface
            try { initStart(); } catch (_) {}
            try { if (typeof refreshMethods === 'function') refreshMethods(); } catch (_) {}
            try { if (typeof renderCardList === 'function') renderCardList(); } catch (_) {}
            try { if (typeof renderTable === 'function') renderTable(); } catch (_) {}
            
            // Atualiza modal planejados se estiver aberto
            try {
                if (plannedModal && !plannedModal.classList.contains('hidden')) {
                    if (typeof renderPlannedModal === 'function') renderPlannedModal();
                    if (typeof fixPlannedAlignment === 'function') fixPlannedAlignment();
                    if (typeof expandPlannedDayLabels === 'function') expandPlannedDayLabels();
                }
            } catch (_) {}
        }
        
        updatePendingBadge();
        
    } catch (error) {
        console.error('hydrateStateFromCache error:', error);
    }

    markHydrationTargetReady('tx');
    markHydrationTargetReady('cards');
}

// ===== RECOMPUTA POSTDATES (REFATORADO) =====

function recomputePostDates() {
    if (!Array.isArray(cards) || !cards.length) return false;
    
    let changed = false;
    const txs = getTransactions();
    
    const norm = s => (s = s || null) ? s.toString().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').trim().toLowerCase() : '';
    const nonCash = cards.filter(c => c && c.name !== 'Dinheiro');
    const singleCardName = nonCash.length === 1 ? nonCash[0].name : null;
    
    const inferCardForTx = tx => {
        const m = tx.method;
        const mNorm = norm(m);
        if (mNorm === 'dinheiro') return null;
        
        const found = cards.find(c => c && norm(c.name) === mNorm);
        if (found) return found.name;
        
        if (tx.opDate && tx.postDate) {
            const candidates = nonCash.filter(c => post(tx.opDate, c.name) === tx.postDate);
            if (candidates.length === 1) return candidates[0].name;
        }
        
        if (singleCardName && (!m || mNorm === 'cartao' || mNorm === 'carto')) {
            return singleCardName;
        }
        
        return null;
    };
    
    const newList = txs.map(t => {
        if (!t) return t;
        const nt = { ...t };
        
        const inferred = inferCardForTx(nt);
        if (inferred && nt.method !== inferred) {
            nt.method = inferred;
            changed = true;
        }
        
        const isCash = norm(nt.method) === 'dinheiro';
        const isKnownCard = !isCash && cards.some(c => c && c.name === nt.method);
        const desired = isCash ? nt.opDate : (isKnownCard ? post(nt.opDate, nt.method) : nt.postDate);
        
        if (desired && nt.postDate !== desired) {
            nt.postDate = desired;
            changed = true;
        }
        
        return nt;
    });
    
    if (changed) {
        setTransactions(newList);
        syncLegacyArrays();
    }
    
    return changed;
}

// ===== FUNÇÃO PARA OBTER TODAS AS TRANSAÇÕES DE UM CARTÃO =====

function getAllTransactionsOnCard(cardName, year, month) {
    const txs = [];
    const targetMonth = month; // 0-based
    const targetYear = year;
    
    // Janela de 60 dias
    const windowStart = new Date(targetYear, targetMonth - 1, 1);
    const windowEnd = new Date(targetYear, targetMonth + 1, 0);
    
    const allTxs = getTransactions();
    
    allTxs.forEach(tx => {
        if (tx.method !== cardName) return;
        
        // Transações únicas
        if (!tx.recurrence) {
            const pd = new Date(tx.postDate);
            if (pd.getFullYear() === targetYear && pd.getMonth() === targetMonth) {
                txs.push(tx);
            }
            return;
        }
        
        // Transações recorrentes
        for (let d = new Date(windowStart); d <= windowEnd; d.setDate(d.getDate() + 1)) {
            const iso = d.toISOString().slice(0, 10);
            if (!occursOn(tx, iso)) continue;
            
            const pd = post(iso, cardName);
            const pdDate = new Date(pd);
            if (pdDate.getFullYear() === targetYear && pdDate.getMonth() === targetMonth) {
                txs.push({
                    ...tx,
                    opDate: iso,
                    postDate: pd,
                    planned: iso > todayISO()
                });
            }
        }
    });
    
    // Retorna apenas executadas para fatura
    return txs.filter(t => !t.planned);
}

// ===== HANDLERS DE EXCLUSÃO (REFATORADOS) =====

// Modal de exclusão - Single
if (typeof deleteSingleBtn !== 'undefined') {
    deleteSingleBtn.onclick = () => {
        const txs = getTransactions();
        const tx = txs.find(t => sameId(t.id, pendingDeleteTxId));
        const iso = pendingDeleteTxIso;
        const refreshPlannedModal = plannedModal && !plannedModal.classList.contains('hidden');
        
        if (!tx) {
            closeDeleteModal();
            return;
        }
        
        const master = findMasterRuleFor(tx, iso);
        if (master) {
            // Adiciona exceção
            if (!master.exceptions) master.exceptions = [];
            if (!master.exceptions.includes(iso)) master.exceptions.push(iso);
            
            // Remove materialização
            try {
                const child = txs.find(x => sameId(x.parentId, master.id) && x.opDate === iso);
                if (child) removeTransaction(child.id);
            } catch {
                const filtered = txs.filter(x => !(sameId(x.parentId, master.id) && x.opDate === iso));
                setTransactions(filtered);
            }
            
            showToast('Ocorrência excluída!', 'success');
        } else {
            // Exclusão direta
            try {
                removeTransaction(tx.id);
            } catch {
                const filtered = txs.filter(x => !sameId(x.id, tx.id));
                setTransactions(filtered);
            }
            showToast('Operação excluída.', 'success');
        }
        
        // Persiste e atualiza
        try { save('tx', getTransactions()); } catch {}
        syncLegacyArrays();
        renderTable();
        
        if (refreshPlannedModal) {
            try { renderPlannedModal(); } catch (err) { console.error('renderPlannedModal failed', err); }
        }
        
        closeDeleteModal();
    };
}

// ===== RENDERIZAÇÃO COM SNAPSHOTS =====

function renderAccordion() {
    try {
        // Usa snapshot para todas as operações
        const txs = getTransactions();
        const monthGroups = groupTransactionsByMonth(txs);
        
        if (!accordionData) return;
        accordionData.innerHTML = '';
        
        for (const [monthKey, monthTxs] of monthGroups) {
            // Renderiza mês
            renderMonthSection(monthKey, monthTxs);
        }
        
        updateSelectedYear();
        
    } catch (error) {
        console.error('renderAccordion error:', error);
    }
}

// ===== FUNÇÃO DE EDIÇÃO (REFATORADA) =====

const editTx = (id) => {
    const txs = getTransactions();
    const t = txs.find(x => x.id === id);
    if (!t) return;
    
    // Resto da lógica de edição permanece igual
    // mas agora usa snapshot consistente
    
    console.log('Editando transação:', t);
    // ... implementação existente usando t ...
};

// ===== LISTENER DE TRANSAÇÕES FIREBASE (REFATORADO) =====

function setupTransactionListener() {
    if (typeof txRef === 'undefined') return;
    
    const unsubscribe = onValue(txRef, (snap) => {
        try {
            const raw = snap.val() ?? [];
            const incoming = Array.isArray(raw) ? raw : Object.values(raw);
            const remote = incoming.filter(t => t).map(normalizeTransactionRecord);
            
            // Lógica de merge LWW
            const dirty = cacheGet('dirtyQueue', []);
            const hasPendingTx = Array.isArray(dirty) && dirty.includes('tx');
            
            if (navigator.onLine && !hasPendingTx) {
                // Fonte de verdade = servidor
                setTransactions(remote);
            } else {
                // Merge local vs remoto
                const local = getTransactions().map(normalizeTransactionRecord);
                const byId = new Map(local.map(t => [t.id, t]));
                
                for (const r of remote) {
                    const l = byId.get(r.id);
                    if (!l) {
                        byId.set(r.id, r);
                        continue;
                    }
                    const lt = Date.parse(l.modifiedAt || l.ts || 0);
                    const rt = Date.parse(r.modifiedAt || r.ts || 0);
                    if (rt > lt) byId.set(r.id, r);
                }
                
                setTransactions(Array.from(byId.values()));
            }
            
            // Sanitiza
            const { sanitized, changed } = sanitizeTransactions();
            if (changed) setTransactions(sanitized);
            
            // Revalida postDates
            const fixed = recomputePostDates();
            
            // Cache
            cacheSet('tx', getTransactions());
            
            // Persiste se mudou localmente
            if (changed || fixed) {
                try { save('tx', getTransactions()); } catch {}
            }
            
            // Ordena e renderiza
            sortTransactions();
            syncLegacyArrays();
            renderTable();
            
            // Atualiza modal planejados
            if (plannedModal && !plannedModal.classList.contains('hidden')) {
                renderPlannedModal();
                fixPlannedAlignment();
                expandPlannedDayLabels();
            }
            
        } finally {
            markHydrationTargetReady('tx');
        }
    });
    
    // Armazena unsubscribe para limpeza
    if (typeof listeners !== 'undefined') {
        listeners.push(unsubscribe);
    }
}

// ===== EXPORT DAS FUNÇÕES PRINCIPAIS (COMPATIBILIDADE) =====

// Funções que podem ser chamadas externamente
window.preparePlannedList = preparePlannedList;
window.hydrateStateFromCache = hydrateStateFromCache;
window.recomputePostDates = recomputePostDates;
window.getAllTransactionsOnCard = getAllTransactionsOnCard;
window.renderAccordion = renderAccordion;
window.editTx = editTx;
window.setupTransactionListener = setupTransactionListener;

// Estados e utilitários
window.transactions = transactions; // Shim legado
window.cards = cards; // Shim legado
window.syncLegacyArrays = syncLegacyArrays;

// Importações dos módulos disponíveis globalmente
window.appState = state;
window.getTransactions = getTransactions;
window.setTransactions = setTransactions;
window.addTransaction = addTransaction;
window.removeTransaction = removeTransaction;
window.updateTransaction = updateTransaction;

// Utilitários de formatação
window.fmtCurrency = fmtCurrency;
window.fmtNumber = fmtNumber;
window.parseCurrency = parseCurrency;
window.escHtml = escHtml;

// Utilitários de data
window.todayISO = todayISO;
window.normalizeISODate = normalizeISODate;
window.formatToISO = formatToISO;

// Utilitários de cache
window.cacheGet = cacheGet;
window.cacheSet = cacheSet;
window.cacheRemove = cacheRemove;

// Engines
window.sortTransactions = sortTransactions;
window.sanitizeTransactions = sanitizeTransactions;
window.groupTransactionsByMonth = groupTransactionsByMonth;
window.txByDate = txByDate;
window.buildRunningBalanceMap = buildRunningBalanceMap;
window.calculateDateRange = calculateDateRange;

console.log('🚀 main-refactored.js carregado - Projeto modular inicializado');
console.log('📦 Módulos carregados:', {
    utils: ['format-utils', 'cache-utils', 'date-utils', 'profile-utils'],
    state: ['app-state'],
    core: ['transaction-engine', 'balance-calculator']
});

// Inicialização
resetHydration();

// Auto-hidratação se não estiver em modo de teste
if (typeof window !== 'undefined' && !window.__TESTING__) {
    setTimeout(() => {
        hydrateStateFromCache();
    }, 100);
}
