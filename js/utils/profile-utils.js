/**
 * profile-utils.js - Utilitários de perfil e configurações
 * Gerenciamento de perfis de usuário e configurações específicas
 */

// ===== CONFIGURAÇÃO PADRÃO =====

export const DEFAULT_PROFILE = {
    id: 'BR',
    name: 'Brasil (BRL)',
    locale: 'pt-BR',
    currency: 'BRL',
    decimalPlaces: 2,
    dateFormat: 'DD/MM/YYYY',
    firstDayOfWeek: 1,
    timezone: 'America/Sao_Paulo',
    features: {
        invoiceParcel: true
    }
};

export const LEGACY_PROFILE_ID = 'legacy';
export const DEFAULT_PROFILE_ID = DEFAULT_PROFILE.id;

export const PROFILE_DATA_KEYS = [
    'transactions',
    'cards', 
    'startBalance',
    'startDate',
    'startSet'
];

export const PROFILE_CACHE_KEYS = [
    'tx',
    'cards',
    'startBal', 
    'startDate',
    'startSet'
];

// Cache local para configurações derivadas (por ID normalizado)
const profileCache = new Map();

// ===== HELPERS =====

function getProfilesMap() {
    if (typeof window !== 'undefined' && window.CURRENCY_PROFILES) {
        return window.CURRENCY_PROFILES;
    }
    return { [DEFAULT_PROFILE_ID]: DEFAULT_PROFILE };
}

function normalizeProfileId(profileId) {
    if (!profileId) return DEFAULT_PROFILE_ID;
    const trimmed = String(profileId).trim();
    if (!trimmed) return DEFAULT_PROFILE_ID;
    const lower = trimmed.toLowerCase();
    if (lower === 'default' || lower === DEFAULT_PROFILE_ID.toLowerCase()) {
        return DEFAULT_PROFILE_ID;
    }
    return trimmed;
}

function resolveProfile(profileId = null) {
    const map = getProfilesMap();
    const normalized = normalizeProfileId(profileId);
    if (map[normalized]) {
        return map[normalized];
    }
    // Fallback to cached config if disponível
    if (profileCache.has(normalized)) {
        return profileCache.get(normalized);
    }
    if (normalized === DEFAULT_PROFILE_ID) {
        return DEFAULT_PROFILE;
    }
    // Perfil desconhecido: retorna cópia baseada no padrão
    return {
        ...DEFAULT_PROFILE,
        id: normalized,
        name: normalized
    };
}

function getStoredProfileId() {
    if (typeof window === 'undefined') return DEFAULT_PROFILE_ID;
    try {
        const saved = window.localStorage?.getItem?.('ui:profile');
        return normalizeProfileId(saved);
    } catch (_) {
        return DEFAULT_PROFILE_ID;
    }
}

function loadOverrides(profileId) {
    const normalized = normalizeProfileId(profileId);
    try {
        const cacheKey = scopedCacheKey('profile_config', normalized);
        const stored = localStorage.getItem(cacheKey);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (error) {
        console.warn('loadOverrides: failed to parse profile config', error);
    }
    return null;
}

// ===== API =====

/**
 * Obtém perfil ativo em tempo de execução (objeto completo)
 * @returns {Object} Perfil atual
 */
export function getRuntimeProfile() {
    if (typeof window !== 'undefined' && window.APP_PROFILE) {
        return window.APP_PROFILE;
    }

    const map = getProfilesMap();
    const savedId = getStoredProfileId();
    if (map[savedId]) {
        return map[savedId];
    }

    const fallback = map[DEFAULT_PROFILE_ID] || Object.values(map)[0];
    return fallback || DEFAULT_PROFILE;
}

/**
 * Obtém nome da moeda baseado no perfil
 * @param {string|null} profileId ID do perfil
 * @returns {string} Nome da moeda
 */
export function getCurrencyName(profileId = null) {
    const profile = profileId ? resolveProfile(profileId) : getRuntimeProfile();
    return profile.currency || DEFAULT_PROFILE.currency;
}

/**
 * Obtém ID do perfil atual
 * @returns {string} ID do perfil
 */
export function getCurrentProfileId() {
    const profile = getRuntimeProfile();
    return profile?.id || DEFAULT_PROFILE_ID;
}

/**
 * Gera chave de cache com escopo de perfil
 * @param {string} key Chave base
 * @param {string} profileId ID do perfil (opcional)
 * @returns {string} Chave com escopo
 */
export function scopedCacheKey(key, profileId = null) {
    const id = normalizeProfileId(profileId || getCurrentProfileId());
    if (id === DEFAULT_PROFILE_ID) {
        // Mantém compatibilidade para o perfil padrão (sem prefixo)
        return key;
    }
    return `profile_${id}_${key}`;
}

/**
 * Gera segmento de banco de dados com escopo de perfil
 * @param {string} segment Segmento base
 * @param {string} profileId ID do perfil (opcional)
 * @returns {string} Segmento com escopo
 */
export function scopedDbSegment(segment, profileId = null) {
    const id = normalizeProfileId(profileId || getCurrentProfileId());
    if (id === DEFAULT_PROFILE_ID) {
        return segment;
    }
    return `profiles/${id}/${segment}`;
}

/**
 * Obtém configurações específicas do perfil
 * @param {string} profileId ID do perfil
 * @returns {Object} Configurações do perfil
 */
export function getProfileConfig(profileId = null) {
    const normalized = normalizeProfileId(profileId || getCurrentProfileId());

    if (profileCache.has(normalized)) {
        return profileCache.get(normalized);
    }

    const base = resolveProfile(normalized);
    const overrides = loadOverrides(normalized);
    const config = {
        ...DEFAULT_PROFILE,
        ...base,
        ...(overrides || {}),
        id: normalized,
        name: base.name || overrides?.name || normalized
    };

    profileCache.set(normalized, config);
    return config;
}

/**
 * Define configuração específica do perfil
 * @param {string} key Chave da configuração
 * @param {*} value Valor da configuração
 * @param {string} profileId ID do perfil (opcional)
 */
export function setProfileConfig(key, value, profileId = null) {
    const id = normalizeProfileId(profileId || getCurrentProfileId());
    const config = { ...getProfileConfig(id), [key]: value };

    profileCache.set(id, config);

    // Persiste no localStorage se possível
    try {
        const cacheKey = scopedCacheKey('profile_config', id);
        localStorage.setItem(cacheKey, JSON.stringify(config));
    } catch (error) {
        console.warn('setProfileConfig: failed to persist', error);
    }
}

/**
 * Carrega configuração do perfil do cache
 * @param {string} profileId ID do perfil
 * @returns {Object} Configuração carregada
 */
export function loadProfileConfig(profileId = null) {
    const id = normalizeProfileId(profileId || getCurrentProfileId());
    const overrides = loadOverrides(id);
    if (overrides) {
        const merged = { ...getProfileConfig(id), ...overrides };
        profileCache.set(id, merged);
        return merged;
    }
    return getProfileConfig(id);
}

/**
 * Lista todos os perfis disponíveis
 * @returns {Array} Array de perfis
 */
export function listProfiles() {
    const profiles = new Map();
    const map = getProfilesMap();

    Object.values(map).forEach(profile => {
        profiles.set(profile.id, {
            id: profile.id,
            name: profile.name || profile.id,
            currency: profile.currency || DEFAULT_PROFILE.currency,
            locale: profile.locale || DEFAULT_PROFILE.locale
        });
    });

    // Perfis adicionais armazenados localmente (mesmo que não estejam no bundle)
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('profile_') && key.endsWith('_profile_config')) {
                const profileId = key.replace('profile_', '').replace('_profile_config', '');
                const normalized = normalizeProfileId(profileId);
                const config = loadOverrides(normalized);
                if (config) {
                    profiles.set(normalized, {
                        id: normalized,
                        name: config.name || normalized,
                        currency: config.currency || DEFAULT_PROFILE.currency,
                        locale: config.locale || DEFAULT_PROFILE.locale
                    });
                }
            }
        }
    } catch (error) {
        console.warn('listProfiles: error scanning profiles', error);
    }

    return Array.from(profiles.values());
}

/**
 * Cria novo perfil
 * @param {string} profileId ID do novo perfil
 * @param {Object} config Configuração inicial
 * @returns {boolean} Se foi criado com sucesso
 */
export function createProfile(profileId, config = {}) {
    const normalized = normalizeProfileId(profileId);
    if (!normalized || normalized === DEFAULT_PROFILE_ID) {
        console.warn('createProfile: invalid profile ID');
        return false;
    }
    
    const base = { ...DEFAULT_PROFILE, id: normalized };
    const fullConfig = {
        ...base,
        ...config,
        id: normalized
    };

    try {
        const cacheKey = scopedCacheKey('profile_config', normalized);
        localStorage.setItem(cacheKey, JSON.stringify(fullConfig));
        
        profileCache.set(normalized, fullConfig);
        return true;
    } catch (error) {
        console.warn('createProfile: failed to create', error);
        return false;
    }
}

/**
 * Remove perfil
 * @param {string} profileId ID do perfil
 * @returns {boolean} Se foi removido com sucesso
 */
export function removeProfile(profileId) {
    const normalized = normalizeProfileId(profileId);
    if (!normalized || normalized === DEFAULT_PROFILE_ID) {
        console.warn('removeProfile: cannot remove default profile');
        return false;
    }
    
    try {
        // Remove configuração
        const configKey = scopedCacheKey('profile_config', normalized);
        localStorage.removeItem(configKey);
        
        // Remove dados do perfil
        PROFILE_CACHE_KEYS.forEach(key => {
            const dataKey = scopedCacheKey(key, normalized);
            localStorage.removeItem(dataKey);
        });
        
        profileCache.delete(normalized);
        return true;
    } catch (error) {
        console.warn('removeProfile: failed to remove', error);
        return false;
    }
}

/**
 * Obtém estatísticas de uso dos perfis
 * @returns {Object} Estatísticas dos perfis
 */
export function getProfileStats() {
    const stats = {
        totalProfiles: 0,
        activeProfile: getCurrentProfileId(),
        profiles: {}
    };

    const profiles = listProfiles();
    stats.totalProfiles = profiles.length;

    profiles.forEach(profile => {
        const id = normalizeProfileId(profile.id);
        stats.profiles[id] = {
            name: profile.name,
            currency: profile.currency,
            locale: profile.locale,
            dataSize: 0
        };

        try {
            PROFILE_CACHE_KEYS.forEach(key => {
                const dataKey = scopedCacheKey(key, id);
                const data = localStorage.getItem(dataKey);
                if (data) {
                    stats.profiles[id].dataSize += data.length;
                }
            });
        } catch (error) {
            console.warn('getProfileStats: error calculating size', error);
        }
    });

    return stats;
}

console.log('👤 profile-utils.js carregado - Gerenciamento de perfis disponível');
