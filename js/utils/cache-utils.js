/**
 * cache-utils.js - Utilitários de cache/localStorage
 * Gerenciamento seguro de localStorage com fallbacks
 * Mantém compatibilidade com a versão legada (prefixo cache_ + scoped key)
 */

import { scopedCacheKey } from './profile-utils.js';

// Prefixos atuais e legados
const CACHE_PREFIX = 'finapp_';
const LEGACY_PREFIX = 'cache_';

// Cache em memória como fallback
let memoryCache = new Map();

/**
 * Verifica se localStorage está disponível
 * @returns {boolean} Se localStorage está disponível
 */
function isLocalStorageAvailable() {
    try {
        const test = '__localStorage_test__';
        localStorage.setItem(test, 'test');
        localStorage.removeItem(test);
        return true;
    } catch (error) {
        return false;
    }
}

/**
 * Obtém valor do cache
 * @param {string} key Chave do cache
 * @param {*} defaultValue Valor padrão se não encontrado
 * @returns {*} Valor do cache ou padrão
 */
function buildKeys(key) {
    const scopedKey = scopedCacheKey(key);
    const canonicalCurrent = `${CACHE_PREFIX}${scopedKey}`;
    const canonicalLegacy = `${LEGACY_PREFIX}${scopedKey}`;

    const candidates = [canonicalCurrent, canonicalLegacy];

    // Chaves legadas que usavam 'profile_default_' para o perfil padrão
    if (scopedKey === key) {
        const legacyDefaultScoped = `profile_default_${key}`;
        candidates.push(`${CACHE_PREFIX}${legacyDefaultScoped}`);
        candidates.push(`${LEGACY_PREFIX}${legacyDefaultScoped}`);
    }

    // Chaves com casing diferente (ex.: profile_br_*)
    const lowerScoped = scopedKey.toLowerCase();
    if (lowerScoped !== scopedKey) {
        candidates.push(`${CACHE_PREFIX}${lowerScoped}`);
        candidates.push(`${LEGACY_PREFIX}${lowerScoped}`);
    }

    const fallbackKeys = Array.from(new Set(candidates));

    const legacyDefaultCurrent = `${CACHE_PREFIX}profile_default_${key}`;
    const legacyDefaultLegacy = `${LEGACY_PREFIX}profile_default_${key}`;

    return {
        scopedKey,
        current: canonicalCurrent,
        legacy: canonicalLegacy,
        legacyDefaultCurrent,
        legacyDefaultLegacy,
        fallbackKeys
    };
}

function readLocalStorage(key) {
    try {
        const stored = localStorage.getItem(key);
        if (stored !== null) {
            return JSON.parse(stored);
        }
    } catch (error) {
        console.warn('cacheGet localStorage error:', error);
    }
    return null;
}

export function cacheGet(key, defaultValue = null) {
    const { current, legacy, fallbackKeys } = buildKeys(key);

    // Tenta localStorage primeiro
    if (isLocalStorageAvailable()) {
        for (const storageKey of fallbackKeys) {
            const value = readLocalStorage(storageKey);
            if (value !== null) {
                // Sincroniza com a chave canônica principal
                if (storageKey !== current) {
                    try { localStorage.setItem(current, JSON.stringify(value)); } catch (_) {}
                }
                memoryCache.set(current, value);
                memoryCache.set(storageKey, value);
                return value;
            }
        }
    }

    // Fallback para cache em memória (considera ambos os prefixos)
    for (const memoryKey of fallbackKeys) {
        if (memoryCache.has(memoryKey)) {
            const value = memoryCache.get(memoryKey);
            memoryCache.set(current, value);
            return value;
        }
    }

    return defaultValue;
}

/**
 * Define valor no cache
 * @param {string} key Chave do cache
 * @param {*} value Valor a ser armazenado
 * @returns {boolean} Se foi armazenado com sucesso
 */
export function cacheSet(key, value) {
    const { current, legacy, legacyDefaultCurrent, legacyDefaultLegacy } = buildKeys(key);

    // Tenta localStorage primeiro
    if (isLocalStorageAvailable()) {
        try {
            const stringValue = JSON.stringify(value);
            localStorage.setItem(current, stringValue);
            // Mantém compatibilidade gravando também no formato legado
            localStorage.setItem(legacy, stringValue);
            // Remove chaves antigas baseada em 'profile_default'
            if (legacyDefaultCurrent !== current) {
                try { localStorage.removeItem(legacyDefaultCurrent); } catch (_) {}
            }
            if (legacyDefaultLegacy !== legacy) {
                try { localStorage.removeItem(legacyDefaultLegacy); } catch (_) {}
            }
            
            // Sincroniza com cache em memória
            memoryCache.set(current, value);
            memoryCache.set(legacy, value);
            memoryCache.delete(legacyDefaultCurrent);
            memoryCache.delete(legacyDefaultLegacy);
            return true;
        } catch (error) {
            console.warn('cacheSet localStorage error:', error);
        }
    }

    // Fallback para cache em memória
    memoryCache.set(current, value);
    memoryCache.set(legacy, value);
    memoryCache.delete(legacyDefaultCurrent);
    memoryCache.delete(legacyDefaultLegacy);
    return false; // Indica que não persistiu em localStorage
}

/**
 * Remove valor do cache
 * @param {string} key Chave a ser removida
 * @returns {boolean} Se foi removido com sucesso
 */
export function cacheRemove(key) {
    const { fallbackKeys } = buildKeys(key);
    let removed = false;
    
    // Remove do localStorage
    if (isLocalStorageAvailable()) {
        try {
            fallbackKeys.forEach(storageKey => localStorage.removeItem(storageKey));
            removed = true;
        } catch (error) {
            console.warn('cacheRemove localStorage error:', error);
        }
    }

    // Remove do cache em memória
    fallbackKeys.forEach(memoryKey => memoryCache.delete(memoryKey));

    return removed;
}

/**
 * Limpa todo o cache de um perfil específico
 * @param {string} profileId ID do perfil (opcional)
 */
export function cacheClearProfile(profileId = null) {
    const keysToRemove = [];

    const collectKeys = (prefix) => {
        if (isLocalStorageAvailable()) {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(prefix)) {
                    keysToRemove.push(key);
                }
            }
        }
        for (const key of memoryCache.keys()) {
            if (key.startsWith(prefix)) {
                keysToRemove.push(key);
            }
        }
    };

    if (profileId) {
        const scoped = scopedCacheKey('', profileId);
        const normalizedPrefix = `${CACHE_PREFIX}${scoped}`.replace(/\s*$/, '');
        const legacyPrefix = `${LEGACY_PREFIX}${scoped}`.replace(/\s*$/, '');
        collectKeys(normalizedPrefix);
        collectKeys(legacyPrefix);
    
    } else {
        collectKeys(CACHE_PREFIX);
        collectKeys(LEGACY_PREFIX);
    }

    // Remove chaves coletadas
    keysToRemove.forEach(key => {
        try {
            if (isLocalStorageAvailable()) {
                localStorage.removeItem(key);
            }
            memoryCache.delete(key);
        } catch (error) {
            console.warn('cacheClearProfile error:', error);
        }
    });

    console.log(`🗑️ Cache limpo - ${keysToRemove.length} chaves removidas`);
}

/**
 * Obtém informações sobre o cache
 * @returns {Object} Informações do cache
 */
export function getCacheInfo() {
    const info = {
        localStorageAvailable: isLocalStorageAvailable(),
        memoryKeys: memoryCache.size,
        localStorageKeys: 0,
        totalSize: 0
    };
    
    if (info.localStorageAvailable) {
        try {
            let totalSize = 0;
            let keys = 0;
            
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(CACHE_PREFIX)) {
                    keys++;
                    const value = localStorage.getItem(key) || '';
                    totalSize += key.length + value.length;
                }
            }
            
            info.localStorageKeys = keys;
            info.totalSize = totalSize;
        } catch (error) {
            console.warn('getCacheInfo error:', error);
        }
    }
    
    return info;
}

/**
 * Comprime cache removendo entradas antigas
 * @param {number} maxAge Idade máxima em ms (padrão: 30 dias)
 */
export function compressCache(maxAge = 30 * 24 * 60 * 60 * 1000) {
    const now = Date.now();
    let removed = 0;
    
    // Verifica chaves com timestamp
    const keysToCheck = [];
    
    if (isLocalStorageAvailable()) {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(CACHE_PREFIX)) {
                keysToCheck.push(key);
            }
        }
    }
    
    keysToCheck.forEach(key => {
        try {
            const value = localStorage.getItem(key);
            if (value) {
                const parsed = JSON.parse(value);
                
                // Se tem timestamp e está expirado, remove
                if (parsed && parsed._timestamp && (now - parsed._timestamp) > maxAge) {
                    localStorage.removeItem(key);
                    memoryCache.delete(key);
                    removed++;
                }
            }
        } catch (error) {
            // Se não conseguir parsear, remove (pode estar corrompido)
            localStorage.removeItem(key);
            memoryCache.delete(key);
            removed++;
        }
    });
    
    if (removed > 0) {
        console.log(`🧹 Cache comprimido - ${removed} entradas antigas removidas`);
    }
}

/**
 * Adiciona timestamp a um valor para controle de idade
 * @param {*} value Valor a ser timestampado
 * @returns {Object} Valor com timestamp
 */
export function addTimestamp(value) {
    return {
        data: value,
        _timestamp: Date.now()
    };
}

/**
 * Extrai valor sem timestamp
 * @param {*} storedValue Valor armazenado (pode ter timestamp)
 * @returns {*} Valor sem timestamp
 */
export function extractValue(storedValue) {
    if (storedValue && typeof storedValue === 'object' && storedValue._timestamp) {
        return storedValue.data;
    }
    return storedValue;
}

// Inicialização
console.log('💾 cache-utils.js carregado - Cache disponível:', isLocalStorageAvailable() ? 'localStorage + memória' : 'apenas memória');
