const HTML_ENTITIES: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
}

export function escapeHtml(text: string): string {
    return text.replace(/[&<>"']/g, (char) => HTML_ENTITIES[char] ?? char)
}

export function encodeBase64(input: string): string {
    return Buffer.from(input, 'utf-8').toString('base64')
}

export function decodeBase64(b64: string): string {
    return Buffer.from(b64, 'base64').toString('utf-8')
}

export interface PageMargins {
    top: string
    right: string
    bottom: string
    left: string
}

export function parseMargins(input: string): PageMargins {
    const parts = input.split(',').map((p) => p.trim()).filter(Boolean)

    if (parts.length === 1) {
        const value = `${parts[0]}mm`
        return { top: value, right: value, bottom: value, left: value }
    }

    if (parts.length === 4) {
        return {
            top: `${parts[0]}mm`,
            right: `${parts[1]}mm`,
            bottom: `${parts[2]}mm`,
            left: `${parts[3]}mm`
        }
    }

    const fallback = '10mm'
    return { top: fallback, right: fallback, bottom: fallback, left: fallback }
}

const CODE_LANGUAGE_ALIASES: Record<string, string> = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    sh: 'bash',
    shell: 'bash',
    yml: 'yaml',
    md: 'markdown',
    text: 'plaintext',
    txt: 'plaintext',
    'c++': 'cpp',
    'c#': 'csharp',
    cs: 'csharp',
    ddl: 'sql',
    postgres: 'sql',
    postgresql: 'sql',
    psql: 'sql',
    htm: 'html',
    xhtml: 'xml'
}

export function normalizeCodeLanguage(raw?: string): string {
    const parts = (raw || 'plaintext')
        .toLowerCase()
        .trim()
        .split(/\s+/)
    const first = parts[0] || 'plaintext'
    const cleaned = first.replace(/[^a-z0-9#+.-]/g, '')

    if (!cleaned) return 'plaintext'

    return CODE_LANGUAGE_ALIASES[cleaned] || cleaned
}
