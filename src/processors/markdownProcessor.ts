import { marked, Renderer } from 'marked'
import type { Tokens } from 'marked'
import DOMPurify from 'dompurify'
import hljs from 'highlight.js/lib/core'
import type { LanguageFn } from 'highlight.js'
import bash from 'highlight.js/lib/languages/bash'
import c from 'highlight.js/lib/languages/c'
import cpp from 'highlight.js/lib/languages/cpp'
import csharp from 'highlight.js/lib/languages/csharp'
import css from 'highlight.js/lib/languages/css'
import go from 'highlight.js/lib/languages/go'
import xml from 'highlight.js/lib/languages/xml'
import java from 'highlight.js/lib/languages/java'
import javascript from 'highlight.js/lib/languages/javascript'
import json from 'highlight.js/lib/languages/json'
import markdown from 'highlight.js/lib/languages/markdown'
import php from 'highlight.js/lib/languages/php'
import plaintext from 'highlight.js/lib/languages/plaintext'
import python from 'highlight.js/lib/languages/python'
import ruby from 'highlight.js/lib/languages/ruby'
import rust from 'highlight.js/lib/languages/rust'
import sql from 'highlight.js/lib/languages/sql'
import typescript from 'highlight.js/lib/languages/typescript'
import yaml from 'highlight.js/lib/languages/yaml'
import { t } from '@/i18n'
import { encodeBase64Utf8 } from '@/utils/base64'
import { normalizeCodeLanguage } from '@/services/documentLanguageService'
import { logError } from '@/utils/logger'
import { registerStyleSanitizationHooks } from './styleSanitizer'

// Explicit registration to keep the highlight.js bundle lean.
const highlightLanguages: Array<[string, LanguageFn]> = [
    ['bash', bash],
    ['c', c],
    ['cpp', cpp],
    ['csharp', csharp],
    ['css', css],
    ['go', go],
    ['java', java],
    ['javascript', javascript],
    ['json', json],
    ['markdown', markdown],
    ['php', php],
    ['plaintext', plaintext],
    ['python', python],
    ['ruby', ruby],
    ['rust', rust],
    ['sql', sql],
    ['typescript', typescript],
    ['yaml', yaml],
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

function inferAlignmentsFromRaw(raw: string | undefined, columnCount: number): Array<string | null> {
  if (!raw || columnCount <= 0) return []

  const lines = raw.split('\n').map((line) => line.trim()).filter(Boolean)
  if (lines.length < 2) return []

  const separatorLine = lines[1] || ''
  const parts = separatorLine
    .split('|')
    .map((part) => part.trim())
    .filter((part) => part.length > 0)

  const alignments = parts.map((part) => inferAlignFromPattern(part))
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
  if (value.length < 28) {
    return value
  }

  const startLen = 10
  const endLen = 8
  return `${value.slice(0, startLen)}...${value.slice(-endLen)}`
}

function abbreviateCryptoInContent(content: string): string {
  const evmAddressRegex = /\b0x[a-fA-F0-9]{24,}\b/g
  const btcAddressRegex = /\b(?:bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}\b/g

  return content
    .replace(evmAddressRegex, abbreviateCryptoAddress)
    .replace(btcAddressRegex, abbreviateCryptoAddress)
}

function findFencedCodeBlock(src: string, language: string): { raw: string, text: string } | null {
  const escapedLanguage = escapeRegex(language)
  const regex = new RegExp(
    '^[ \\t]*(?:`{3,}|~{3,})[ \\t]*' + escapedLanguage + '\\b[^\\n]*\\n([\\s\\S]*?)\\n[ \\t]*(?:`{3,}|~{3,})[ \\t]*(?:\\n|$)',
    'i'
  )
  const match = regex.exec(src)

  if (!match || !match[1]) {
    return null
  }

  return {
    raw: match[0],
    text: match[1].trim()
  }
}

/**
 * PrintRenderer - Custom renderer optimized for A4 print output.
 *
 * IMPORTANT: Extends the marked Renderer class to have access to this.parser,
 * which is required to process inline tokens (**bold**, *italic*, etc.).
 *
 * A plain object literal does NOT work because this.parser would be undefined.
 */
class PrintRenderer extends Renderer {
  private abbreviateTokens(tokens: Array<unknown> = []): Array<unknown> {
    return tokens.map((token) => {
      if (!token || typeof token !== 'object') {
        return token
      }

      const tokenObj = token as { type?: string; text?: string; tokens?: Array<unknown> }
      const tokenType = tokenObj.type

      if (tokenType === 'text' || tokenType === 'escape') {
        return {
          ...tokenObj,
          text: abbreviateCryptoInContent(tokenObj.text || '')
        }
      }

      if (!Array.isArray(tokenObj.tokens) || tokenObj.tokens.length === 0) {
        return tokenObj
      }

      return {
        ...tokenObj,
        tokens: this.abbreviateTokens(tokenObj.tokens)
      }
    })
  }

  private renderTableCell(tokens: Array<unknown> = []): string {
    const normalizedTokens = this.abbreviateTokens(tokens)
    const html = this.parser.parseInline(normalizedTokens as any[])
    return this.abbreviateCryptoInHtml(html)
  }

  private abbreviateCryptoInHtml(html: string): string {
    if (typeof document === 'undefined') {
      return abbreviateCryptoInContent(html)
    }

    const template = document.createElement('template')
    template.innerHTML = html

    const processTextNodes = (node: ChildNode): void => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || ''
        node.textContent = abbreviateCryptoInContent(text)
        return
      }

      if (node.nodeType !== Node.ELEMENT_NODE) {
        return
      }

      const element = node as Element
      if (element.tagName === 'SCRIPT' || element.tagName === 'STYLE') {
        return
      }

      Array.from(element.childNodes).forEach((child) => { processTextNodes(child) })
    }

    Array.from(template.content.childNodes).forEach((node) => { processTextNodes(node) })
    return template.innerHTML
  }

  override heading(token: Tokens.Heading): string {
    const level = token.depth
    const id = token.text
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]/g, '')
    
    const content = this.parser.parseInline(token.tokens)
    
    return `<h${level} id="${id}" class="markdown-heading markdown-h${level}">${content}</h${level}>\n`
  }

  override paragraph(token: Tokens.Paragraph): string {
    const content = this.parser.parseInline(token.tokens)
    return `<p class="markdown-paragraph">${content}</p>\n`
  }

  override image(token: Tokens.Image): string {
    return `<figure class="markdown-image" style="page-break-inside: avoid;">
      <img src="${token.href}" 
           alt="${token.text || 'Image'}" 
           class="markdown-img"
           data-print-image="true"
           loading="lazy">
      <figcaption class="markdown-figcaption">${token.text || 'Image'}</figcaption>
    </figure>\n`
  }

  override table(token: Tokens.Table): string {
    const tokenWithAlign = token as Tokens.Table & { align?: Array<string | null> }
    const alignments = Array.isArray(tokenWithAlign.align)
      ? tokenWithAlign.align
      : []
    const fallbackAlignments = inferAlignmentsFromRaw(token.raw, token.header?.length || 0)

    // Header row
    let headerRow = ''
    if (token.header && token.header.length > 0) {
      const headerCells = token.header
        .map((cell: Tokens.TableCell, idx: number) => {
          const alignAttr = getAlignAttribute(
            getCellAlignment(alignments, fallbackAlignments, idx, cell)
          )
          return `<th${alignAttr}>${this.renderTableCell(cell.tokens)}</th>`
        })
        .join('')
      headerRow = `<thead><tr>${headerCells}</tr></thead>`
    }

    // Body rows
    let bodyRows = ''
    if (token.rows && token.rows.length > 0) {
      const rows = token.rows
        .map((row: Tokens.TableCell[]) => {
          const cells = row
            .map((cell: Tokens.TableCell, idx: number) => {
              const alignAttr = getAlignAttribute(
                getCellAlignment(alignments, fallbackAlignments, idx, cell)
              )
              return `<td${alignAttr}>${this.renderTableCell(cell.tokens)}</td>`
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
  }

  override codespan(token: Tokens.Codespan): string {
    const sanitized = abbreviateCryptoInContent(DOMPurify.sanitize(token.text))
    return `<code class="markdown-code-inline">${sanitized}</code>`
  }

  override code(token: Tokens.Code): string {
    const rawLanguage = typeof token.lang === 'string' ? token.lang.trim() : ''
    const lang = normalizeCodeLanguage(rawLanguage)
    const hasLanguage = rawLanguage.length > 0
    let highlightedCode = token.text

    try {
      if (lang === 'plaintext' && hasLanguage) {
        highlightedCode = DOMPurify.sanitize(token.text)
      } else if (lang !== 'plaintext' && hljs.getLanguage(lang)) {
        const highlighted = hljs.highlight(token.text, { language: lang, ignoreIllegals: true })
        highlightedCode = highlighted.value
      } else {
        try {
          const highlighted = hljs.highlightAuto(token.text)
          highlightedCode = highlighted.value
        } catch {
          highlightedCode = DOMPurify.sanitize(token.text)
        }
      }
    } catch {
      highlightedCode = DOMPurify.sanitize(token.text)
    }

    const sanitized = DOMPurify.sanitize(highlightedCode, {
      ALLOWED_TAGS: ['span', 'br'],
      ALLOWED_ATTR: ['class']
    })

    return `<pre class="markdown-code-block hljs" data-lang="${lang}"><code class="language-${lang}">${sanitized}</code></pre>\n`
  }

  override blockquote(token: Tokens.Blockquote): string {
    const content = this.parser.parse(token.tokens)
    return `<blockquote class="markdown-blockquote" style="page-break-inside: avoid;">
      ${content}
    </blockquote>\n`
  }

  override link(token: Tokens.Link): string {
    const rawContent = token.tokens && token.tokens.length > 0
      ? this.parser.parseInline(token.tokens)
      : token.text || ''
    const content = abbreviateCryptoInContent(rawContent)
    return `<a href="${token.href}" title="${token.title || ''}" class="markdown-link">${content}</a>`
  }

  override list(token: Tokens.List): string {
    const tag = token.ordered ? 'ol' : 'ul'
    const className = token.ordered ? 'markdown-list-ordered' : 'markdown-list-unordered'

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
  }

  override hr(): string {
    return `<hr class="markdown-hr">\n`
  }

  override br(): string {
    return '<br>\n'
  }

  override text(token: Tokens.Text | Tokens.Escape): string {
    if ('tokens' in token && token.tokens && token.tokens.length > 0) {
      return this.parser.parseInline(token.tokens)
    }
    return abbreviateCryptoInContent(token.text)
  }

  override strong(token: Tokens.Strong): string {
    const content = this.parser.parseInline(token.tokens)
    return `<strong>${content}</strong>`
  }

  override em(token: Tokens.Em): string {
    const content = this.parser.parseInline(token.tokens)
    return `<em>${content}</em>`
  }

  override del(token: Tokens.Del): string {
    const content = this.parser.parseInline(token.tokens)
    return `<del>${content}</del>`
  }

  override html(token: Tokens.HTML | Tokens.Tag): string {
    return DOMPurify.sanitize(token.text)
  }
}

marked.setOptions({
  gfm: true,
  breaks: true,
  pedantic: false,
  async: false
})

marked.use({ renderer: new PrintRenderer() })

marked.use({
  extensions: [
    {
      name: 'mermaidCodeBlock',
      level: 'block',
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
        const tokenData = token as { text?: string }
        const tokenText: string = typeof tokenData.text === 'string' ? tokenData.text : ''
        const base64Source = encodeBase64Utf8(tokenText)
        return `<div class="mermaid" data-mermaid-source="${base64Source}" aria-label="${t('preview.mermaidAriaLabel')}">
          <pre class="mermaid-loading">${t('preview.mermaidLoading')}</pre>
        </div>\n`
      }
    },
    {
      name: 'yamlCodeBlock',
      level: 'block',
      start(src: string) {
        return src.match(/^[ \t]*(?:`{3,}|~{3,})[ \t]*ya?ml\b/i)?.index
      },
      tokenizer(src: string) {
        const match = findFencedCodeBlock(src, 'ya?ml')
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
        const tokenData = token as { text?: string }
        const tokenText: string = typeof tokenData.text === 'string' ? tokenData.text : ''
        const base64Source = encodeBase64Utf8(tokenText)
        return `<div class="yaml-block" data-yaml-source="${base64Source}" data-yaml-type="codeblock" aria-label="YAML Code Block">
          <pre class="yaml-loading">Loading YAML...</pre>
        </div>\n`
      }
    }
  ]
})



/**
 * DOMPurify allowlist configuration for sanitizing HTML.
 *
 * Blocked: event handlers (XSS), custom data attributes, unsafe inline styles.
 * Allowed: structural tags, links, images, tables, code highlighting, semantic markup.
 */
const DOMPURIFY_CONFIG = {
  ALLOWED_TAGS: [
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'p',
    'br',
    'strong',
    'em',
    'u',
    's',
    'del',
    'a',
    'img',
    'code',
    'pre',
    'ul',
    'ol',
    'li',
    'table',
    'thead',
    'tbody',
    'tfoot',
    'tr',
    'th',
    'td',
    'blockquote',
    'figure',
    'figcaption',
    'hr',
    'div',
    'span',
    'section',
    'article',
    'aside',
    'nav',
    'input',
    'mark'
  ],
  ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'id', 'class', 'data-lang', 'data-mermaid-source', 'data-yaml-source', 'data-yaml-type', 'data-print-image', 'loading', 'style', 'align', 'role', 'aria-label', 'aria-hidden', 'type', 'checked', 'disabled'],
  ALLOW_DATA_ATTR: false,
  FORCE_BODY: false
} as const

export function processMarkdown(markdown: string): string {
  try {
    if (!markdown || typeof markdown !== 'string') {
      return ''
    }

    const preprocessed = markdown.replace(
      /<!--\s*pagebreak\s*-->/gi,
      '\n<div class="page-break" aria-hidden="true"></div>\n'
    )

    const dirty = marked(preprocessed) as string
    registerStyleSanitizationHooks()
    const clean = DOMPurify.sanitize(dirty, DOMPURIFY_CONFIG as any) as unknown as string

    return clean
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : 'Unknown error'
    logError(`Failed to process markdown: ${errorMsg}`)
    return `<p class="error">Failed to process markdown: ${DOMPurify.sanitize(errorMsg)}</p>`
  }
}

export function validateMarkdown(markdown: string): { isValid: boolean; warnings: string[] } {
  const warnings: string[] = []

  if (/<script|<iframe|<object|on\w+=/i.test(markdown)) {
    warnings.push('Content contains potentially dangerous tags (will be removed)')
  }

  const longUrls = markdown.match(/https?:\/\/[^\s]{100,}/g)
  if (longUrls) {
    warnings.push(`${longUrls.length} long URL(s) may overflow in print output`)
  }

  return {
    isValid: warnings.length === 0,
    warnings
  }
}

export function estimatePageCount(html: string): number {
  const wordsPerLine = 12
  // ~2700 chars per page: 45 lines × 12 words × 5 chars avg (conservative A4 estimate)
  const charsPerPage = 45 * wordsPerLine * 5
  const totalChars = html.length
  return Math.ceil(totalChars / charsPerPage) || 1
}

export async function processImagesInPreview(container: HTMLElement | null, useCache: boolean = true): Promise<number> {
  if (!container) return 0

  try {
    const { processImagesForPrint } = await import('./imageProcessor')
    return await processImagesForPrint(container, useCache)
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : String(e)
    logError(`Failed to process images for print: ${errorMsg}`)
    return 0
  }
}
