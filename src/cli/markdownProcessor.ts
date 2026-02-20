import { marked } from 'marked'
import type { Token, Tokens } from 'marked'
import hljs from 'highlight.js/lib/core'
import type { LanguageFn } from 'highlight.js'
import bash from 'highlight.js/lib/languages/bash'
import c from 'highlight.js/lib/languages/c'
import cpp from 'highlight.js/lib/languages/cpp'
import csharp from 'highlight.js/lib/languages/csharp'
import cssLang from 'highlight.js/lib/languages/css'
import go from 'highlight.js/lib/languages/go'
import xml from 'highlight.js/lib/languages/xml'
import java from 'highlight.js/lib/languages/java'
import javascript from 'highlight.js/lib/languages/javascript'
import json from 'highlight.js/lib/languages/json'
import markdownLang from 'highlight.js/lib/languages/markdown'
import php from 'highlight.js/lib/languages/php'
import plaintextLang from 'highlight.js/lib/languages/plaintext'
import python from 'highlight.js/lib/languages/python'
import ruby from 'highlight.js/lib/languages/ruby'
import rust from 'highlight.js/lib/languages/rust'
import sql from 'highlight.js/lib/languages/sql'
import typescript from 'highlight.js/lib/languages/typescript'
import yamlLang from 'highlight.js/lib/languages/yaml'
import { escapeHtml, encodeBase64, normalizeCodeLanguage } from './utils'

// Explicit registration to keep the highlight.js bundle lean.
const highlightLanguages: Array<[string, LanguageFn]> = [
    ['bash', bash],
    ['c', c],
    ['cpp', cpp],
    ['csharp', csharp],
    ['css', cssLang],
    ['go', go],
    ['java', java],
    ['javascript', javascript],
    ['json', json],
    ['markdown', markdownLang],
    ['php', php],
    ['plaintext', plaintextLang],
    ['python', python],
    ['ruby', ruby],
    ['rust', rust],
    ['sql', sql],
    ['typescript', typescript],
    ['yaml', yamlLang],
    ['xml', xml]
]

for (const [name, definition] of highlightLanguages) {
    hljs.registerLanguage(name, definition)
}

function getAlignAttribute(align?: string | null): string {
    const value = (align || '').toLowerCase().trim()
    if (value !== 'left' && value !== 'center' && value !== 'right') {
        return ''
    }
    return ` align="${value}" style="text-align: ${value}"`
}

function inferAlignFromPattern(pattern: string): string | null {
    const value = pattern.trim()
    if (!value) return null

    const hasLeadingColon = value.startsWith(':')
    const hasTrailingColon = value.endsWith(':')

    if (hasLeadingColon && hasTrailingColon) return 'center'
    if (hasTrailingColon) return 'right'
    if (hasLeadingColon) return 'left'
    return null
}

function inferAlignmentsFromRaw(
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

function getCellAlignment(
    alignments: Array<string | null>,
    fallbackAlignments: Array<string | null>,
    idx: number,
    cell: Tokens.TableCell
): string | null {
    const cellWithAlign = cell as Tokens.TableCell & { align?: string | null }
    return alignments[idx] || cellWithAlign.align || fallbackAlignments[idx] || null
}

function escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function abbreviateCryptoAddress(value: string): string {
    if (value.length < 28) return value
    return `${value.slice(0, 10)}...${value.slice(-8)}`
}

function abbreviateCryptoInContent(content: string): string {
    const evmAddressRegex = /\b0x[a-fA-F0-9]{24,}\b/g
    const btcAddressRegex = /\b(?:bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}\b/g

    return content
        .replace(evmAddressRegex, abbreviateCryptoAddress)
        .replace(btcAddressRegex, abbreviateCryptoAddress)
}

function findFencedCodeBlock(
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

export interface CliProcessorOptions {
    highlight: boolean
    mermaid: boolean
    yaml: boolean
}

// Type for renderer context — marked v17 injects `this.parser` on plain objects
interface RendererThis {
    parser: {
        parseInline(tokens: Token[]): string
        parse(tokens: Token[]): string
    }
}

function abbreviateTokens(tokens: Array<unknown> = []): Array<unknown> {
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

function renderTableCell(
    parser: RendererThis['parser'],
    tokens: Array<unknown> = []
): string {
    const normalized = abbreviateTokens(tokens)
    const html = parser.parseInline(normalized as Token[])
    return abbreviateCryptoInContent(html)
}

/**
 * CliPrintRenderer — plain object renderer for marked v17.
 *
 * marked v17 requires renderer methods as a plain object (not a class instance)
 * so that `this.parser` is properly injected at runtime.
 * Node.js-safe: uses escapeHtml() instead of DOMPurify.
 */
const cliRenderer = {
    heading(this: RendererThis, token: Tokens.Heading): string {
        const level = token.depth
        const id = token.text
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^\w-]/g, '')
        const content = this.parser.parseInline(token.tokens)
        return `<h${level} id="${id}" class="markdown-heading markdown-h${level}">${content}</h${level}>\n`
    },

    paragraph(this: RendererThis, token: Tokens.Paragraph): string {
        const content = this.parser.parseInline(token.tokens)
        return `<p class="markdown-paragraph">${content}</p>\n`
    },

    image(_token: Tokens.Image): string {
        return `<figure class="markdown-image" style="page-break-inside: avoid;">
      <img src="${_token.href}"
           alt="${_token.text || 'Image'}"
           class="markdown-img"
           data-print-image="true"
           loading="lazy">
      <figcaption class="markdown-figcaption">${_token.text || 'Image'}</figcaption>
    </figure>\n`
    },

    table(this: RendererThis, token: Tokens.Table): string {
        const tokenWithAlign = token as Tokens.Table & {
            align?: Array<string | null>
        }
        const alignments = Array.isArray(tokenWithAlign.align)
            ? tokenWithAlign.align
            : []
        const fallbackAlignments = inferAlignmentsFromRaw(
            token.raw,
            token.header?.length || 0
        )

        let headerRow = ''
        if (token.header && token.header.length > 0) {
            const headerCells = token.header
                .map((cell: Tokens.TableCell, idx: number) => {
                    const alignAttr = getAlignAttribute(
                        getCellAlignment(alignments, fallbackAlignments, idx, cell)
                    )
                    return `<th${alignAttr}>${renderTableCell(this.parser, cell.tokens)}</th>`
                })
                .join('')
            headerRow = `<thead><tr>${headerCells}</tr></thead>`
        }

        let bodyRows = ''
        if (token.rows && token.rows.length > 0) {
            const rows = token.rows
                .map((row: Tokens.TableCell[]) => {
                    const cells = row
                        .map((cell: Tokens.TableCell, idx: number) => {
                            const alignAttr = getAlignAttribute(
                                getCellAlignment(
                                    alignments,
                                    fallbackAlignments,
                                    idx,
                                    cell
                                )
                            )
                            return `<td${alignAttr}>${renderTableCell(this.parser, cell.tokens)}</td>`
                        })
                        .join('')
                    return `<tr>${cells}</tr>`
                })
                .join('')
            bodyRows = `<tbody>${rows}</tbody>`
        }

        return `<figure class="markdown-table">
      <table class="markdown-table-content">
        ${headerRow}
        ${bodyRows}
      </table>
    </figure>\n`
    },

    codespan(_token: Tokens.Codespan): string {
        const sanitized = abbreviateCryptoInContent(escapeHtml(_token.text))
        return `<code class="markdown-code-inline">${sanitized}</code>`
    },

    code(_token: Tokens.Code): string {
        const rawLanguage =
            typeof _token.lang === 'string' ? _token.lang.trim() : ''
        const lang = normalizeCodeLanguage(rawLanguage)
        const hasLanguage = rawLanguage.length > 0
        let highlightedCode = escapeHtml(_token.text)

        try {
            if (lang === 'plaintext' && hasLanguage) {
                highlightedCode = escapeHtml(_token.text)
            } else if (lang !== 'plaintext' && hljs.getLanguage(lang)) {
                const result = hljs.highlight(_token.text, {
                    language: lang,
                    ignoreIllegals: true
                })
                highlightedCode = result.value
            } else {
                try {
                    const result = hljs.highlightAuto(_token.text)
                    highlightedCode = result.value
                } catch {
                    highlightedCode = escapeHtml(_token.text)
                }
            }
        } catch {
            highlightedCode = escapeHtml(_token.text)
        }

        return `<pre class="markdown-code-block hljs" data-lang="${lang}"><code class="language-${lang}">${highlightedCode}</code></pre>\n`
    },

    blockquote(this: RendererThis, token: Tokens.Blockquote): string {
        const content = this.parser.parse(token.tokens)
        return `<blockquote class="markdown-blockquote" style="page-break-inside: avoid;">
      ${content}
    </blockquote>\n`
    },

    link(this: RendererThis, token: Tokens.Link): string {
        const rawContent =
            token.tokens && token.tokens.length > 0
                ? this.parser.parseInline(token.tokens)
                : token.text || ''
        const content = abbreviateCryptoInContent(rawContent)
        return `<a href="${token.href}" title="${token.title || ''}" class="markdown-link">${content}</a>`
    },

    list(this: RendererThis, token: Tokens.List): string {
        const tag = token.ordered ? 'ol' : 'ul'
        const className = token.ordered
            ? 'markdown-list-ordered'
            : 'markdown-list-unordered'

        const items = token.items
            .map((item: Tokens.ListItem) => {
                const itemContent = this.parser.parse(item.tokens)
                if (item.task) {
                    const checked = item.checked ? 'checked' : ''
                    return `<li><input type="checkbox" ${checked} disabled> ${itemContent}</li>`
                }
                return `<li>${itemContent}</li>`
            })
            .join('')

        return `<${tag} class="${className}">${items}</${tag}>`
    },

    hr(): string {
        return `<hr class="markdown-hr">\n`
    },

    br(): string {
        return '<br>\n'
    },

    text(this: RendererThis, token: Tokens.Text | Tokens.Escape): string {
        if ('tokens' in token && token.tokens && token.tokens.length > 0) {
            return this.parser.parseInline(token.tokens)
        }
        return abbreviateCryptoInContent(token.text)
    },

    strong(this: RendererThis, token: Tokens.Strong): string {
        return `<strong>${this.parser.parseInline(token.tokens)}</strong>`
    },

    em(this: RendererThis, token: Tokens.Em): string {
        return `<em>${this.parser.parseInline(token.tokens)}</em>`
    },

    del(this: RendererThis, token: Tokens.Del): string {
        return `<del>${this.parser.parseInline(token.tokens)}</del>`
    },

    html(_token: Tokens.HTML | Tokens.Tag): string {
        return _token.text
    }
}

// Configure marked once at module level (marked is a global singleton).
marked.setOptions({
    gfm: true,
    breaks: true,
    pedantic: false,
    async: false
})

marked.use({
    renderer: cliRenderer,
    extensions: [
        {
            name: 'mermaidCodeBlock',
            level: 'block' as const,
            start(src: string) {
                return src.match(/^[ \t]*(?:`{3,}|~{3,})[ \t]*mermaid\b/i)?.index
            },
            tokenizer(src: string) {
                const match = findFencedCodeBlock(src, 'mermaid')
                if (match) {
                    return {
                        type: 'mermaidCodeBlock',
                        raw: match.raw,
                        text: match.text
                    }
                }
                return undefined
            },
            renderer(token: Tokens.Generic) {
                const data = token as { text?: string }
                const text: string = typeof data.text === 'string' ? data.text : ''
                const b64 = encodeBase64(text)
                return `<div class="mermaid" data-mermaid-source="${b64}" aria-label="Mermaid Diagram">
          <pre class="mermaid-loading">Loading diagram...</pre>
        </div>\n`
            }
        },
        {
            name: 'yamlCodeBlock',
            level: 'block' as const,
            start(src: string) {
                return src.match(/^[ \t]*(?:`{3,}|~{3,})[ \t]*ya?ml\b/i)?.index
            },
            tokenizer(src: string) {
                const match = findFencedCodeBlock(src, 'ya?ml', true)
                if (match) {
                    return {
                        type: 'yamlCodeBlock',
                        raw: match.raw,
                        text: match.text
                    }
                }
                return undefined
            },
            renderer(token: Tokens.Generic) {
                const data = token as { text?: string }
                const text: string = typeof data.text === 'string' ? data.text : ''
                const b64 = encodeBase64(text)
                return `<div class="yaml-block" data-yaml-source="${b64}" data-yaml-type="codeblock" aria-label="YAML Code Block">
          <pre class="yaml-loading">Loading YAML...</pre>
        </div>\n`
            }
        }
    ]
})

export function processMarkdown(
    markdown: string,
    _options: CliProcessorOptions
): string {
    if (!markdown || typeof markdown !== 'string') {
        return ''
    }

    const preprocessed = markdown.replace(
        /<!--\s*pagebreak\s*-->/gi,
        '\n<div class="page-break" aria-hidden="true"></div>\n'
    )

    return marked(preprocessed) as string
}
