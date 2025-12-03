/**
 * CACHE DE IMAGENS - MD2PDF
 * Cache persistente em localStorage para dimensões de imagens
 */

interface Dimensions {
  width: number
  height: number
}

interface CacheEntry {
  timestamp: number
  dimensions: Dimensions
}

interface CacheData {
  version: number
  lastUpdated: number
  cache: Record<string, CacheEntry>
}

interface CacheStats {
  memoryCount: number
  memoryKeys: string[]
  storageAvailable: boolean
}

const CACHE_KEY = 'md2pdf-image-cache-v1'
const CACHE_EXPIRATION = 30 * 24 * 60 * 60 * 1000
const MAX_CACHE_SIZE = 50 * 1024

class ImageCacheManager {
  private memory: Map<string, CacheEntry> = new Map()
  private localStorage: Storage | null =
    typeof window !== 'undefined' && window.localStorage ? window.localStorage : null

  constructor() {
    this.init()
  }

  /**
   * Inicializar cache do localStorage
   */
  private init(): void {
    if (this.localStorage) {
      try {
        const stored = this.localStorage.getItem(CACHE_KEY)
        if (stored) {
          const data: CacheData = JSON.parse(stored)
          this.cleanExpired(data)
          Object.entries(data.cache || {}).forEach(([key, value]) => {
            this.memory.set(key, value)
          })
        }
      } catch (e) {
        console.warn('Erro ao carregar cache de localStorage:', e)
      }
    }
  }

  /**
   * Remover entradas expiradas
   */
  private cleanExpired(data: CacheData): void {
    const now = Date.now()
    const cache = data.cache || {}

    let cleaned = false
    for (const [key, value] of Object.entries(cache)) {
      if (now - value.timestamp > CACHE_EXPIRATION) {
        delete cache[key]
        cleaned = true
      }
    }

    if (cleaned && this.localStorage) {
      try {
        this.localStorage.setItem(CACHE_KEY, JSON.stringify(data))
      } catch (e) {
        console.warn('Erro ao salvar cache limpo:', e)
      }
    }
  }

  /**
   * Obter dimensões do cache
   */
  get(src: string): Dimensions | null {
    if (!src) return null

    if (this.memory.has(src)) {
      const cached = this.memory.get(src)
      if (!cached) return null

      if (Date.now() - cached.timestamp <= CACHE_EXPIRATION) {
        return cached.dimensions
      } else {
        this.memory.delete(src)
      }
    }

    return null
  }

  /**
   * Guardar dimensões no cache
   */
  set(src: string, dimensions: Dimensions): void {
    if (!src || !dimensions) return

    const entry: CacheEntry = {
      timestamp: Date.now(),
      dimensions
    }

    this.memory.set(src, entry)

    if (this.localStorage) {
      try {
        let data: CacheData = {
          version: 1,
          lastUpdated: Date.now(),
          cache: {}
        }

        try {
          const stored = this.localStorage.getItem(CACHE_KEY)
          if (stored) {
            data = JSON.parse(stored)
          }
        } catch (e) {
          console.warn('Erro ao ler cache do localStorage:', e)
        }

        data.cache[src] = entry

        const serialized = JSON.stringify(data)
        if (serialized.length > MAX_CACHE_SIZE) {
          this.trimCache(data)
        }

        this.localStorage.setItem(CACHE_KEY, JSON.stringify(data))
      } catch (e) {
        if (e instanceof DOMException && e.name === 'QuotaExceededError') {
          console.warn('localStorage cheio, limpando cache de imagens')
          this.clear()
        } else {
          console.warn('Erro ao salvar no cache:', e)
        }
      }
    }
  }

  /**
   * Remover as entradas mais antigas para liberar espaço
   */
  private trimCache(data: CacheData): void {
    const cache = data.cache || {}
    const entries = Object.entries(cache)

    entries.sort((a, b) => a[1].timestamp - b[1].timestamp)

    const toRemove = Math.ceil(entries.length / 2)
    for (let i = 0; i < toRemove; i++) {
      delete cache[entries[i][0]]
    }
  }

  /**
   * Limpar todo o cache
   */
  clear(): void {
    this.memory.clear()
    if (this.localStorage) {
      try {
        this.localStorage.removeItem(CACHE_KEY)
      } catch (e) {
        console.warn('Erro ao limpar cache:', e)
      }
    }
  }

  /**
   * Obter estatísticas do cache
   */
  getStats(): CacheStats {
    return {
      memoryCount: this.memory.size,
      memoryKeys: Array.from(this.memory.keys()),
      storageAvailable: !!this.localStorage
    }
  }

  /**
   * Pré-carregar imagens
   */
  async preload(srcs: string[]): Promise<number> {
    if (!Array.isArray(srcs)) return 0

    let loaded = 0
    for (const src of srcs) {
      if (this.get(src)) {
        loaded++
      }
    }

    return loaded
  }
}

export const imageCache = new ImageCacheManager()

export function cacheGet(src: string): Dimensions | null {
  return imageCache.get(src)
}

export function cacheSet(src: string, dimensions: Dimensions): void {
  imageCache.set(src, dimensions)
}

export function cacheClear(): void {
  imageCache.clear()
}

export function cacheStats(): CacheStats {
  return imageCache.getStats()
}
