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
import {
    getAlignAttribute,
    inferAlignmentsFromRaw,
    getCellAlignment,
    abbreviateCryptoInContent,
    renderTableCell
} from '../shared/markdownHelpers'
import {
    createMermaidExtension,
    createYamlExtension
} from '../shared/markdownExtensions'

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

export interface CliProcessorOptions {
    highlight: boolean
    mermaid: boolean
    yaml: boolean
}

// Module-level options read by renderers during marked() execution.
let activeOptions: CliProcessorOptions = {
    highlight: true,
    mermaid: true,
    yaml: true
}

// Type for renderer context — marked v17 injects `this.parser` on plain objects
interface RendererThis {
    parser: {
        parseInline(tokens: Token[]): string
        parse(tokens: Token[]): string
    }
}

function highlightCode(text: string, lang: string, hasLang: boolean): string {
    if (!activeOptions.highlight) return escapeHtml(text)

    if (lang === 'plaintext' && hasLang) return escapeHtml(text)

    if (lang !== 'plaintext' && hljs.getLanguage(lang)) {
        return hljs.highlight(text, { language: lang, ignoreIllegals: true }).value
    }

    try {
        return hljs.highlightAuto(text).value
    } catch {
        return escapeHtml(text)
    }
}

function renderMermaidPlaceholder(b64: string): string {
    if (!activeOptions.mermaid) {
        const source = Buffer.from(b64, 'base64').toString('utf-8')
        return `<pre class="markdown-code-block hljs" data-lang="mermaid"><code class="language-mermaid">${escapeHtml(source)}</code></pre>\n`
    }
    return `<div class="mermaid" data-mermaid-source="${b64}" aria-label="Mermaid Diagram">
          <pre class="mermaid-loading">Loading diagram...</pre>
        </div>\n`
}

function renderYamlPlaceholder(b64: string): string {
    if (!activeOptions.yaml) {
        const source = Buffer.from(b64, 'base64').toString('utf-8')
        return `<pre class="markdown-code-block hljs" data-lang="yaml"><code class="language-yaml">${escapeHtml(source)}</code></pre>\n`
    }
    return `<div class="yaml-block" data-yaml-source="${b64}" data-yaml-type="codeblock" aria-label="YAML Code Block">
          <pre class="yaml-loading">Loading YAML...</pre>
        </div>\n`
}

/**
 * CliPrintRenderer — plain object renderer for marked v17.
 *
 * marked v17 requires renderer methods as a plain object (not a class instance)
 * so that `this.parser` is properly injected at runtime.
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
        const fallback = inferAlignmentsFromRaw(
            token.raw,
            token.header?.length || 0
        )

        const headerRow = renderTableHeader(
            this.parser, token.header, alignments, fallback
        )
        const bodyRows = renderTableBody(
            this.parser, token.rows, alignments, fallback
        )

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
        const rawLang = typeof _token.lang === 'string' ? _token.lang.trim() : ''
        const lang = normalizeCodeLanguage(rawLang)
        const highlighted = highlightCode(_token.text, lang, rawLang.length > 0)
        return `<pre class="markdown-code-block hljs" data-lang="${lang}"><code class="language-${lang}">${highlighted}</code></pre>\n`
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

function renderTableHeader(
    parser: RendererThis['parser'],
    header: Tokens.TableCell[] | undefined,
    alignments: Array<string | null>,
    fallback: Array<string | null>
): string {
    if (!header || header.length === 0) return ''

    const cells = header
        .map((cell: Tokens.TableCell, idx: number) => {
            const alignAttr = getAlignAttribute(
                getCellAlignment(alignments, fallback, idx, cell)
            )
            return `<th${alignAttr}>${renderTableCell(parser, cell.tokens)}</th>`
        })
        .join('')
    return `<thead><tr>${cells}</tr></thead>`
}

function renderTableBody(
    parser: RendererThis['parser'],
    rows: Tokens.TableCell[][] | undefined,
    alignments: Array<string | null>,
    fallback: Array<string | null>
): string {
    if (!rows || rows.length === 0) return ''

    const rowsHtml = rows
        .map((row: Tokens.TableCell[]) => {
            const cells = row
                .map((cell: Tokens.TableCell, idx: number) => {
                    const alignAttr = getAlignAttribute(
                        getCellAlignment(alignments, fallback, idx, cell)
                    )
                    return `<td${alignAttr}>${renderTableCell(parser, cell.tokens)}</td>`
                })
                .join('')
            return `<tr>${cells}</tr>`
        })
        .join('')
    return `<tbody>${rowsHtml}</tbody>`
}

// Configure marked once at module level (marked is a global singleton).
marked.setOptions({
    gfm: true,
    breaks: true,
    pedantic: false,
    async: false
})

const extensionCallbacks = {
    encodeBase64,
    renderMermaid: renderMermaidPlaceholder,
    renderYaml: renderYamlPlaceholder
}

marked.use({
    renderer: cliRenderer,
    extensions: [
        createMermaidExtension(extensionCallbacks),
        createYamlExtension(extensionCallbacks)
    ]
})

export function processMarkdown(
    markdown: string,
    options: CliProcessorOptions
): string {
    if (!markdown || typeof markdown !== 'string') {
        return ''
    }

    activeOptions = options

    const preprocessed = markdown.replace(
        /<!--\s*pagebreak\s*-->/gi,
        '\n<div class="page-break" aria-hidden="true"></div>\n'
    )

    return marked(preprocessed) as string
}
