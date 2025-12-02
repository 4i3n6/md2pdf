/**
 * CACHE DE IMAGENS - MD2PDF
 * Cache persistente em localStorage para dimensões de imagens
 * Melhora performance em documentos com múltiplas imagens
 */

const CACHE_KEY = 'md2pdf-image-cache-v1';
const CACHE_EXPIRATION = 30 * 24 * 60 * 60 * 1000; // 30 dias em ms
const MAX_CACHE_SIZE = 50 * 1024; // 50KB máximo

/**
 * Classe para gerenciar cache de imagens
 */
class ImageCacheManager {
    constructor() {
        this.memory = new Map();
        this.localStorage = typeof window !== 'undefined' && window.localStorage;
        this.init();
    }

    /**
     * Inicializar cache do localStorage
     */
    init() {
        if (this.localStorage) {
            try {
                const stored = window.localStorage.getItem(CACHE_KEY);
                if (stored) {
                    const data = JSON.parse(stored);
                    // Limpar entradas expiradas
                    this.cleanExpired(data);
                    // Carregar para memória
                    Object.entries(data.cache || {}).forEach(([key, value]) => {
                        this.memory.set(key, value);
                    });
                }
            } catch (e) {
                console.warn('Erro ao carregar cache de localStorage:', e);
            }
        }
    }

    /**
     * Remover entradas expiradas
     * @param {object} data - Dados do cache
     */
    cleanExpired(data) {
        const now = Date.now();
        const cache = data.cache || {};
        
        let cleaned = false;
        for (const [key, value] of Object.entries(cache)) {
            if (now - value.timestamp > CACHE_EXPIRATION) {
                delete cache[key];
                cleaned = true;
            }
        }

        if (cleaned && this.localStorage) {
            try {
                window.localStorage.setItem(CACHE_KEY, JSON.stringify(data));
            } catch (e) {
                console.warn('Erro ao salvar cache limpo:', e);
            }
        }
    }

    /**
     * Obter dimensões do cache
     * @param {string} src - URL da imagem
     * @returns {object | null} Dimensões ou null
     */
    get(src) {
        if (!src) return null;

        // Verificar memória primeiro (mais rápido)
        if (this.memory.has(src)) {
            const cached = this.memory.get(src);
            // Verificar expiração
            if (Date.now() - cached.timestamp <= CACHE_EXPIRATION) {
                return cached.dimensions;
            } else {
                this.memory.delete(src);
            }
        }

        return null;
    }

    /**
     * Guardar dimensões no cache
     * @param {string} src - URL da imagem
     * @param {object} dimensions - { width, height }
     */
    set(src, dimensions) {
        if (!src || !dimensions) return;

        const entry = {
            timestamp: Date.now(),
            dimensions
        };

        // Guardar em memória
        this.memory.set(src, entry);

        // Guardar em localStorage se disponível
        if (this.localStorage) {
            try {
                let data = {
                    version: 1,
                    lastUpdated: Date.now(),
                    cache: {}
                };

                // Carregar dados existentes
                try {
                    const stored = window.localStorage.getItem(CACHE_KEY);
                    if (stored) {
                        data = JSON.parse(stored);
                    }
                } catch (e) {
                    console.warn('Erro ao ler cache do localStorage:', e);
                }

                // Adicionar nova entrada
                data.cache[src] = entry;

                // Verificar tamanho
                const serialized = JSON.stringify(data);
                if (serialized.length > MAX_CACHE_SIZE) {
                    // Se excedeu tamanho, remover entradas antigas
                    this.trimCache(data);
                }

                window.localStorage.setItem(CACHE_KEY, JSON.stringify(data));
            } catch (e) {
                if (e.name === 'QuotaExceededError') {
                    console.warn('localStorage cheio, limpando cache de imagens');
                    this.clear();
                } else {
                    console.warn('Erro ao salvar no cache:', e);
                }
            }
        }
    }

    /**
     * Remover as entradas mais antigas para liberar espaço
     * @param {object} data - Dados do cache
     */
    trimCache(data) {
        const cache = data.cache || {};
        const entries = Object.entries(cache);
        
        // Ordenar por timestamp (mais antigos primeiro)
        entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

        // Remover metade das entradas mais antigas
        const toRemove = Math.ceil(entries.length / 2);
        for (let i = 0; i < toRemove; i++) {
            delete cache[entries[i][0]];
        }
    }

    /**
     * Limpar todo o cache
     */
    clear() {
        this.memory.clear();
        if (this.localStorage) {
            try {
                window.localStorage.removeItem(CACHE_KEY);
            } catch (e) {
                console.warn('Erro ao limpar cache:', e);
            }
        }
    }

    /**
     * Obter estatísticas do cache
     * @returns {object}
     */
    getStats() {
        return {
            memoryCount: this.memory.size,
            memoryKeys: Array.from(this.memory.keys()),
            storageAvailable: !!this.localStorage
        };
    }

    /**
     * Pré-carregar imagens (útil para batches)
     * @param {string[]} srcs - Array de URLs
     * @returns {Promise<number>} Número carregado
     */
    async preload(srcs) {
        if (!Array.isArray(srcs)) return 0;

        let loaded = 0;
        for (const src of srcs) {
            if (this.get(src)) {
                loaded++;
            }
        }

        return loaded;
    }
}

// Exportar instância singleton
export const imageCache = new ImageCacheManager();

/**
 * Helper functions para uso conveniente
 */

export function cacheGet(src) {
    return imageCache.get(src);
}

export function cacheSet(src, dimensions) {
    imageCache.set(src, dimensions);
}

export function cacheClear() {
    imageCache.clear();
}

export function cacheStats() {
    return imageCache.getStats();
}
