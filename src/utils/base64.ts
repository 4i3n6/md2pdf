type DecodeBase64Options = {
    onError?: (message: string) => void
    errorPrefix?: string
}

function encodeViaTextEncoder(input: string): string {
    const encoded = new TextEncoder().encode(input)
    let raw = ''
    for (let i = 0; i < encoded.length; i += 1) {
        raw += String.fromCharCode(encoded[i] ?? 0)
    }
    return btoa(raw)
}

function encodeViaLegacyUnicode(input: string): string {
    const raw = encodeURIComponent(input).replace(
        /%([0-9A-F]{2})/gi,
        (_match: string, hex: string) => String.fromCharCode(parseInt(hex, 16))
    )
    return btoa(raw)
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

export function encodeBase64Utf8(input: string): string {
    try {
        return encodeViaTextEncoder(input)
    } catch {
        return encodeViaLegacyUnicode(input)
    }
}
