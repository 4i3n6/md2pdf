export type StorageErrorHandler = (message: string) => void

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

function resolverStorage(storage?: StorageLike | null): StorageLike | null {
    if (storage) return storage
    if (typeof window === 'undefined') return null
    try {
        return window.localStorage
    } catch {
        return null
    }
}

function formatarErro(chave: string, operacao: string, e: unknown): string {
    const errorMsg = e instanceof Error ? e.message : String(e)
    return `Storage: falha ao ${operacao} "${chave}": ${errorMsg}`
}

export function storageGetItem(
    chave: string,
    onError?: StorageErrorHandler,
    storage?: StorageLike | null
): string | null {
    const resolved = resolverStorage(storage)
    if (!resolved) return null

    try {
        return resolved.getItem(chave)
    } catch (e) {
        onError?.(formatarErro(chave, 'ler', e))
        return null
    }
}

export function storageSetItem(
    chave: string,
    valor: string,
    onError?: StorageErrorHandler,
    storage?: StorageLike | null
): boolean {
    const resolved = resolverStorage(storage)
    if (!resolved) return false

    try {
        resolved.setItem(chave, valor)
        return true
    } catch (e) {
        onError?.(formatarErro(chave, 'salvar', e))
        return false
    }
}

export function storageRemoveItem(
    chave: string,
    onError?: StorageErrorHandler,
    storage?: StorageLike | null
): boolean {
    const resolved = resolverStorage(storage)
    if (!resolved) return false

    try {
        resolved.removeItem(chave)
        return true
    } catch (e) {
        onError?.(formatarErro(chave, 'remover', e))
        return false
    }
}

export function storageGetJson<T>(
    chave: string,
    onError?: StorageErrorHandler,
    storage?: StorageLike | null
): T | null {
    const raw = storageGetItem(chave, onError, storage)
    if (!raw) return null

    try {
        return JSON.parse(raw) as T
    } catch (e) {
        onError?.(formatarErro(chave, 'parsear JSON', e))
        return null
    }
}

export function storageSetJson(
    chave: string,
    valor: unknown,
    onError?: StorageErrorHandler,
    storage?: StorageLike | null
): boolean {
    let serialized = ''
    try {
        serialized = JSON.stringify(valor)
    } catch (e) {
        onError?.(formatarErro(chave, 'serializar JSON', e))
        return false
    }

    return storageSetItem(chave, serialized, onError, storage)
}

