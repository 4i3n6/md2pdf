import type { LoggerInterface } from '@/types/index'

function getLogger(): LoggerInterface | null {
    if (typeof window === 'undefined') {
        return null
    }
    return window.Logger || null
}

export function logInfo(message: string): void {
    const logger = getLogger()
    if (!logger?.log) return
    logger.log(message, 'info')
}

export function logWarn(message: string): void {
    const logger = getLogger()
    if (!logger?.log) return
    logger.log(message, 'warning')
}

export function logError(message: string): void {
    const logger = getLogger()
    if (!logger?.error) return
    logger.error(message)
}

export function logSuccess(message: string): void {
    const logger = getLogger()
    if (!logger?.success) return
    logger.success(message)
}
