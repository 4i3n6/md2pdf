import type { LoggerInterface } from '@/types/index'

function obterLogger(): LoggerInterface | null {
    if (typeof window === 'undefined') {
        return null
    }
    return window.Logger || null
}

export function logInfo(mensagem: string): void {
    const logger = obterLogger()
    if (!logger?.log) return
    logger.log(mensagem, 'info')
}

export function logAviso(mensagem: string): void {
    const logger = obterLogger()
    if (!logger?.log) return
    logger.log(mensagem, 'warning')
}

export function logErro(mensagem: string): void {
    const logger = obterLogger()
    if (!logger?.error) return
    logger.error(mensagem)
}

export function logSucesso(mensagem: string): void {
    const logger = obterLogger()
    if (!logger?.success) return
    logger.success(mensagem)
}
