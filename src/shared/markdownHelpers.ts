/**
 * Shared markdown helper functions used by both web and CLI processors.
 * All functions are pure and platform-agnostic (no DOM, no Node.js APIs).
 */

import type { Token, Tokens } from 'marked'

export function getAlignAttribute(align?: string | null): string {
    const value = (align || '').toLowerCase().trim()
    if (value !== 'left' && value !== 'center' && value !== 'right') {
        return ''
    }
    return ` align="${value}" style="text-align: ${value}"`
}

export function inferAlignFromPattern(pattern: string): string | null {
    const value = pattern.trim()
    if (!value) return null

    const hasLeadingColon = value.startsWith(':')
    const hasTrailingColon = value.endsWith(':')

    if (hasLeadingColon && hasTrailingColon) return 'center'
    if (hasTrailingColon) return 'right'
    if (hasLeadingColon) return 'left'
    return null
}

export function inferAlignmentsFromRaw(
    raw: string | undefined,
    columnCount: number
): Array<string | null> {
    if (!raw || columnCount <= 0) return []

    const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean)
    if (lines.length < 2) return []

    const separatorLine = lines[1] || ''
    const parts = separatorLine
        .split('|')
        .map((p) => p.trim())
        .filter((p) => p.length > 0)

    const alignments = parts.map((p) => inferAlignFromPattern(p))
    while (alignments.length < columnCount) {
        alignments.push(null)
    }
    return alignments.slice(0, columnCount)
}

export function getCellAlignment(
    alignments: Array<string | null>,
    fallbackAlignments: Array<string | null>,
    idx: number,
    cell: Tokens.TableCell
): string | null {
    const cellWithAlign = cell as Tokens.TableCell & { align?: string | null }
    return alignments[idx] || cellWithAlign.align || fallbackAlignments[idx] || null
}

export function escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function abbreviateCryptoAddress(value: string): string {
    if (value.length < 28) return value
    return `${value.slice(0, 10)}...${value.slice(-8)}`
}

export function abbreviateCryptoInContent(content: string): string {
    const evmAddressRegex = /\b0x[a-fA-F0-9]{24,}\b/g
    const btcAddressRegex = /\b(?:bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}\b/g

    return content
        .replace(evmAddressRegex, abbreviateCryptoAddress)
        .replace(btcAddressRegex, abbreviateCryptoAddress)
}

/**
 * Find a fenced code block in markdown source by language.
 * @param isPattern - when true, `language` is a regex pattern (e.g. `ya?ml`)
 */
export function findFencedCodeBlock(
    src: string,
    language: string,
    isPattern: boolean = false
): { raw: string; text: string } | null {
    const langPattern = isPattern ? language : escapeRegex(language)
    const regex = new RegExp(
        '^[ \\t]*(?:`{3,}|~{3,})[ \\t]*' +
            langPattern +
            '\\b[^\\n]*\\n([\\s\\S]*?)\\n[ \\t]*(?:`{3,}|~{3,})[ \\t]*(?:\\n|$)',
        'i'
    )
    const match = regex.exec(src)
    if (!match?.[1]) return null
    return { raw: match[0], text: match[1].trim() }
}

export function abbreviateTokens(tokens: Array<unknown> = []): Array<unknown> {
    return tokens.map((token) => {
        if (!token || typeof token !== 'object') return token

        const t = token as {
            type?: string
            text?: string
            tokens?: Array<unknown>
        }

        if (t.type === 'text' || t.type === 'escape') {
            return { ...t, text: abbreviateCryptoInContent(t.text || '') }
        }

        if (!Array.isArray(t.tokens) || t.tokens.length === 0) {
            return t
        }

        return { ...t, tokens: abbreviateTokens(t.tokens) }
    })
}

/** Abbreviate crypto addresses in table cell tokens and render via parser. */
export function renderTableCell(
    parser: { parseInline(tokens: Token[]): string },
    tokens: Array<unknown> = []
): string {
    const normalized = abbreviateTokens(tokens)
    const html = parser.parseInline(normalized as Token[])
    return abbreviateCryptoInContent(html)
}
