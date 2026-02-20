export type StorageErrorHandler = (message: string) => void

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

function resolveStorage(storage?: StorageLike | null): StorageLike | null {
    if (storage) return storage
    if (typeof window === 'undefined') return null
    try {
        return window.localStorage
    } catch {
        return null
    }
}

function formatError(key: string, operation: string, e: unknown): string {
    const errorMsg = e instanceof Error ? e.message : String(e)
    return `Storage: failed to ${operation} "${key}": ${errorMsg}`
}

export function storageGetItem(
    key: string,
    onError?: StorageErrorHandler,
    storage?: StorageLike | null
): string | null {
    const resolved = resolveStorage(storage)
    if (!resolved) return null

    try {
        return resolved.getItem(key)
    } catch (e) {
        onError?.(formatError(key, 'read', e))
        return null
    }
}

export function storageSetItem(
    key: string,
    value: string,
    onError?: StorageErrorHandler,
    storage?: StorageLike | null
): boolean {
    const resolved = resolveStorage(storage)
    if (!resolved) return false

    try {
        resolved.setItem(key, value)
        return true
    } catch (e) {
        onError?.(formatError(key, 'save', e))
        return false
    }
}

export function storageRemoveItem(
    key: string,
    onError?: StorageErrorHandler,
    storage?: StorageLike | null
): boolean {
    const resolved = resolveStorage(storage)
    if (!resolved) return false

    try {
        resolved.removeItem(key)
        return true
    } catch (e) {
        onError?.(formatError(key, 'remove', e))
        return false
    }
}

export function storageGetJson<T>(
    key: string,
    onError?: StorageErrorHandler,
    storage?: StorageLike | null
): T | null {
    const raw = storageGetItem(key, onError, storage)
    if (!raw) return null

    try {
        return JSON.parse(raw) as T
    } catch (e) {
        onError?.(formatError(key, 'parse JSON', e))
        return null
    }
}

export function storageSetJson(
    key: string,
    value: unknown,
    onError?: StorageErrorHandler,
    storage?: StorageLike | null
): boolean {
    let serialized = ''
    try {
        serialized = JSON.stringify(value)
    } catch (e) {
        onError?.(formatError(key, 'serialize JSON', e))
        return false
    }

    return storageSetItem(key, serialized, onError, storage)
}

