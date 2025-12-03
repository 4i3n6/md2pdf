import { marked } from 'marked'
import DOMPurify from 'dompurify'
import hljs from 'highlight.js'

/**
 * Token types for marked renderer
 */
interface HeadingToken {
  type: string
  depth: number
  text: string
}

interface ParagraphToken {
  type: string
  text: string
}

interface ImageToken {
  type: string
  href: string
  text: string
}

interface TableToken {
  type: string
  header: boolean
  rows: string[][]
}

interface CodeToken {
  type: string
  lang: string | null
  text: string
}

interface BlockquoteToken {
  type: string
  text: string
}

interface LinkToken {
  type: string
  href: string
  title: string
  text: string
}

interface ListToken {
  type: string
  ordered: boolean
  items: Array<{ text: string }>
}

// RendererToken type for reference (not directly used in interface implementation)

/**
 * Renderer customizado otimizado para impressão em A4
 * Cada função retorna HTML com classes específicas para print styling
 */
const printRenderer = {
  heading(token: HeadingToken): string {
    const level = token.depth
    const id = token.text
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]/g, '')
    return `<h${level} id="${id}" class="markdown-heading markdown-h${level}">${token.text}</h${level}>\n`
  },

  paragraph(token: ParagraphToken): string {
    return `<p class="markdown-paragraph">${token.text}</p>\n`
  },

  image(token: ImageToken): string {
    return `<figure class="markdown-image" style="page-break-inside: avoid;">
      <img src="${token.href}" 
           alt="${token.text || 'Image'}" 
           class="markdown-img"
           data-print-image="true"
           loading="lazy"
           onerror="this.style.display='none'">
      <figcaption class="markdown-figcaption">${token.text || 'Image'}</figcaption>
    </figure>\n`
  },

  table(token: TableToken): string {
    let rows = ''
    for (let i = 0; i < token.rows.length; i++) {
      const row = token.rows[i]
      if (!row) continue
      const cells = row
        .map((cell) => {
          const tag = i === 0 && token.header ? 'th' : 'td'
          return `<${tag}>${cell}</${tag}>`
        })
        .join('')
      rows += `<tr>${cells}</tr>`
    }

    return `<figure class="markdown-table" style="page-break-inside: avoid;">
      <table class="markdown-table-content">
        ${rows}
      </table>
    </figure>\n`
  },

  tablerow(): string {
    return ''
  },

  tablecell(): string {
    return ''
  },

  codespan(token: { text: string }): string {
    const sanitized = DOMPurify.sanitize(token.text)
    return `<code class="markdown-code-inline">${sanitized}</code>`
  },

  code(token: CodeToken): string {
    const lang = token.lang || 'plaintext'
    let highlightedCode = token.text

    try {
      if (lang && hljs.getLanguage(lang)) {
        const highlighted = hljs.highlight(token.text, { language: lang, ignoreIllegals: true })
        highlightedCode = highlighted.value
      } else if (lang === 'plaintext') {
        highlightedCode = DOMPurify.sanitize(token.text)
      } else {
        try {
          const highlighted = hljs.highlightAuto(token.text)
          highlightedCode = highlighted.value
        } catch {
          highlightedCode = DOMPurify.sanitize(token.text)
        }
      }
    } catch (e) {
      highlightedCode = DOMPurify.sanitize(token.text)
    }

    const sanitized = DOMPurify.sanitize(highlightedCode, {
      ALLOWED_TAGS: ['span', 'br'],
      ALLOWED_ATTR: ['class']
    })

    return `<pre class="markdown-code-block hljs" data-lang="${lang}"><code class="language-${lang}">${sanitized}</code></pre>\n`
  },

  blockquote(token: BlockquoteToken): string {
    return `<blockquote class="markdown-blockquote" style="page-break-inside: avoid;">
      ${token.text}
    </blockquote>\n`
  },

  link(token: LinkToken): string {
    return `<a href="${token.href}" title="${token.title || ''}" class="markdown-link">${token.text}</a>`
  },

  list(token: ListToken): string {
    const tag = token.ordered ? 'ol' : 'ul'
    const className = token.ordered ? 'markdown-list-ordered' : 'markdown-list-unordered'
    return `<${tag} class="${className}">\n${token.items.map((item) => `<li>${item.text}</li>`).join('\n')}\n</${tag}>\n`
  },

  listitem(token: { text: string }): string {
    return token.text
  },

  hr(): string {
    return `<hr class="markdown-hr" style="page-break-after: always;">\n`
  },

  br(): string {
    return '<br>\n'
  },

  text(token: { text: string }): string {
    return token.text
  }
}

/**
 * Configuração do marked para GitHub Flavored Markdown
 */
marked.setOptions({
  gfm: true,
  breaks: true,
  pedantic: false
})

marked.use({ renderer: printRenderer as any })

/**
 * Configuração DOMPurify com tags e atributos permitidos
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
    'nav'
  ],
  ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'id', 'class', 'data-lang', 'loading', 'onerror', 'style', 'role', 'aria-label'],
  ALLOW_DATA_ATTR: false,
  FORCE_BODY: false
} as const

/**
 * Processa markdown para HTML seguro e otimizado para print
 */
export function processMarkdown(markdown: string): string {
  try {
    if (!markdown || typeof markdown !== 'string') {
      return '<p class="error">Erro: conteúdo inválido</p>'
    }

    const dirty = marked(markdown) as string
    const clean = DOMPurify.sanitize(dirty, DOMPURIFY_CONFIG as any) as unknown as string

    return clean
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : 'Erro desconhecido'
    console.error('Erro ao processar markdown:', e)
    return `<p class="error">Erro ao processar markdown: ${DOMPurify.sanitize(errorMsg)}</p>`
  }
}

/**
 * Valida markdown antes de processar
 */
export function validateMarkdown(markdown: string): { isValid: boolean; warnings: string[] } {
  const warnings: string[] = []

  if (/<script|<iframe|<object|on\w+=/i.test(markdown)) {
    warnings.push('Conteúdo contém tags potencialmente perigosas (serão removidas)')
  }

  const longUrls = markdown.match(/https?:\/\/[^\s]{100,}/g)
  if (longUrls) {
    warnings.push(`${longUrls.length} URL(ns) muito longa(s) podem transbordar em impressão`)
  }

  return {
    isValid: warnings.length === 0,
    warnings
  }
}

/**
 * Estima número de páginas A4 baseado no conteúdo
 */
export function estimatePageCount(html: string): number {
  const wordsPerLine = 12
  const charsPerPage = 45 * wordsPerLine * 5
  const totalChars = html.length
  return Math.ceil(totalChars / charsPerPage) || 1
}

/**
 * Integração com processador de imagens para redimensionar imagens em HTML
 */
export async function processImagesInPreview(container: HTMLElement | null, useCache: boolean = true): Promise<number> {
  if (!container) return 0

  try {
    const { processImagesForPrint } = await import('./imageProcessor')
    return await processImagesForPrint(container, useCache)
  } catch (e) {
    console.error('Erro ao processar imagens para print:', e)
    return 0
  }
}
