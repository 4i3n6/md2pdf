type DecodeBase64Options = {
    onError?: (mensagem: string) => void
    errorPrefix?: string
}

function decodeViaTextDecoder(base64: string): string {
    const raw = atob(base64)
    const bytes = Uint8Array.from(raw, (char) => char.charCodeAt(0))
    return new TextDecoder().decode(bytes)
}

function decodeViaLegacy(base64: string): string {
    const raw = atob(base64)
    const encoded = raw
        .split('')
        .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`)
        .join('')
    return decodeURIComponent(encoded)
}

export function decodeBase64Utf8(base64: string, options: DecodeBase64Options = {}): string {
    try {
        return decodeViaTextDecoder(base64)
    } catch {
        try {
            return decodeViaLegacy(base64)
        } catch (fallbackError) {
            const prefix = options.errorPrefix || ''
            const errorMsg = fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
            options.onError?.(`${prefix}${errorMsg}`)
            return ''
        }
    }
}
