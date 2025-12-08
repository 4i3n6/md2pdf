import { marked, Renderer } from 'marked'
import type { Tokens } from 'marked'
import DOMPurify from 'dompurify'
import hljs from 'highlight.js'

/**
 * PrintRenderer - Renderer customizado otimizado para impressão em A4
 * 
 * IMPORTANTE: Estende a classe Renderer do marked para ter acesso a this.parser
 * que é necessário para processar tokens inline (**bold**, *italic*, etc.)
 * 
 * Usar objeto literal NÃO funciona porque this.parser seria undefined.
 */
class PrintRenderer extends Renderer {
  /**
   * Renderiza headings (h1-h6) com ID para navegação e classes para styling
   */
  override heading(token: Tokens.Heading): string {
    const level = token.depth
    const id = token.text
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]/g, '')
    
    // this.parser.parseInline processa **bold**, *italic*, etc. dentro do heading
    const content = this.parser.parseInline(token.tokens)
    
    return `<h${level} id="${id}" class="markdown-heading markdown-h${level}">${content}</h${level}>\n`
  }

  /**
   * Renderiza parágrafos com suporte a formatação inline
   */
  override paragraph(token: Tokens.Paragraph): string {
    const content = this.parser.parseInline(token.tokens)
    return `<p class="markdown-paragraph">${content}</p>\n`
  }

  /**
   * Renderiza imagens com figure/figcaption para melhor semântica
   */
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

  /**
   * Renderiza tabelas com suporte a header e body
   */
  override table(token: Tokens.Table): string {
    // Header row
    let headerRow = ''
    if (token.header && token.header.length > 0) {
      const headerCells = token.header
        .map((cell: Tokens.TableCell) => `<th>${this.parser.parseInline(cell.tokens)}</th>`)
        .join('')
      headerRow = `<thead><tr>${headerCells}</tr></thead>`
    }

    // Body rows
    let bodyRows = ''
    if (token.rows && token.rows.length > 0) {
      const rows = token.rows
        .map((row: Tokens.TableCell[]) => {
          const cells = row
            .map((cell: Tokens.TableCell) => `<td>${this.parser.parseInline(cell.tokens)}</td>`)
            .join('')
          return `<tr>${cells}</tr>`
        })
        .join('')
      bodyRows = `<tbody>${rows}</tbody>`
    }

    return `<figure class="markdown-table" style="page-break-inside: avoid;">
      <table class="markdown-table-content">
        ${headerRow}
        ${bodyRows}
      </table>
    </figure>\n`
  }

  /**
   * Renderiza código inline com sanitização
   */
  override codespan(token: Tokens.Codespan): string {
    const sanitized = DOMPurify.sanitize(token.text)
    return `<code class="markdown-code-inline">${sanitized}</code>`
  }

  /**
   * Renderiza blocos de código com syntax highlighting
   */
  override code(token: Tokens.Code): string {
    const lang = token.lang || 'plaintext'

    // MERMAID: Return container for later rendering by mermaidProcessor
    if (lang === 'mermaid') {
      // Escape HTML to prevent XSS, preserve in data attribute for later processing
      const escapedSource = token.text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
      
      return `<div class="mermaid" data-mermaid-source="${escapedSource}" aria-label="Mermaid Diagram">
        <pre class="mermaid-loading">Loading diagram...</pre>
      </div>\n`
    }

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
    } catch {
      highlightedCode = DOMPurify.sanitize(token.text)
    }

    const sanitized = DOMPurify.sanitize(highlightedCode, {
      ALLOWED_TAGS: ['span', 'br'],
      ALLOWED_ATTR: ['class']
    })

    return `<pre class="markdown-code-block hljs" data-lang="${lang}"><code class="language-${lang}">${sanitized}</code></pre>\n`
  }

  /**
   * Renderiza blockquotes com suporte a conteúdo aninhado
   */
  override blockquote(token: Tokens.Blockquote): string {
    // Blockquote pode conter parágrafos, listas, etc. - usar parse() para blocos
    const content = this.parser.parse(token.tokens)
    return `<blockquote class="markdown-blockquote" style="page-break-inside: avoid;">
      ${content}
    </blockquote>\n`
  }

  /**
   * Renderiza links com suporte a formatação no texto do link
   */
  override link(token: Tokens.Link): string {
    const content = this.parser.parseInline(token.tokens)
    return `<a href="${token.href}" title="${token.title || ''}" class="markdown-link">${content}</a>`
  }

  /**
   * Renderiza listas (ordenadas e não-ordenadas)
   */
  override list(token: Tokens.List): string {
    const tag = token.ordered ? 'ol' : 'ul'
    const className = token.ordered ? 'markdown-list-ordered' : 'markdown-list-unordered'
    
    const items = token.items
      .map((item: Tokens.ListItem) => {
        // List items podem conter parágrafos, sublistas, etc. - usar parse() para blocos
        const itemContent = this.parser.parse(item.tokens)
        
        // Suporte a task lists (checkboxes)
        if (item.task) {
          const checked = item.checked ? 'checked' : ''
          return `<li><input type="checkbox" ${checked} disabled> ${itemContent}</li>`
        }
        
        return `<li>${itemContent}</li>`
      })
      .join('')
    
    return `<${tag} class="${className}">${items}</${tag}>`
  }

  /**
   * Renderiza linha horizontal (visual apenas, não quebra página)
   * Para quebra de página usar <!-- pagebreak -->
   */
  override hr(): string {
    return `<hr class="markdown-hr">\n`
  }

  /**
   * Renderiza quebra de linha
   */
  override br(): string {
    return '<br>\n'
  }

  /**
   * Renderiza texto simples
   */
  override text(token: Tokens.Text | Tokens.Escape): string {
    // Text tokens podem ter tokens internos (raro, mas possível)
    if ('tokens' in token && token.tokens && token.tokens.length > 0) {
      return this.parser.parseInline(token.tokens)
    }
    return token.text
  }

  /**
   * Renderiza texto em negrito
   */
  override strong(token: Tokens.Strong): string {
    const content = this.parser.parseInline(token.tokens)
    return `<strong>${content}</strong>`
  }

  /**
   * Renderiza texto em itálico
   */
  override em(token: Tokens.Em): string {
    const content = this.parser.parseInline(token.tokens)
    return `<em>${content}</em>`
  }

  /**
   * Renderiza texto riscado (strikethrough - GFM)
   */
  override del(token: Tokens.Del): string {
    const content = this.parser.parseInline(token.tokens)
    return `<del>${content}</del>`
  }

  /**
   * Renderiza HTML inline (passthrough seguro)
   */
  override html(token: Tokens.HTML | Tokens.Tag): string {
    // Sanitizar HTML inline para segurança
    return DOMPurify.sanitize(token.text)
  }
}

/**
 * Configuração do marked para GitHub Flavored Markdown
 * Otimizado para renderização profissional e print
 */
marked.setOptions({
  gfm: true,
  breaks: true,
  pedantic: false,
  async: false
})

// Usar instância da classe PrintRenderer
marked.use({ renderer: new PrintRenderer() })

/**
 * Configuração segura do DOMPurify para sanitização de HTML
 * 
 * NÃO permite:
 * - Event handlers (onerror, onclick, etc) - XSS risk
 * - Data attributes customizadas - information leak
 * - Inline styles perigosos - CSS injection
 * 
 * PERMITE:
 * - Structural tags (h1-h6, p, div, etc)
 * - Links (a, href)
 * - Imagens (img, src, alt, loading)
 * - Tabelas estruturadas
 * - Code highlighting (class para highlight.js)
 * - Semantic markup (role, aria-label)
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
  ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'id', 'class', 'data-lang', 'data-mermaid-source', 'data-print-image', 'loading', 'style', 'role', 'aria-label', 'aria-hidden', 'type', 'checked', 'disabled'],
  ALLOW_DATA_ATTR: false,
  FORCE_BODY: false
} as const

/**
 * Processa markdown para HTML seguro e otimizado para print
 * 
 * Converte markdown para HTML com:
 * - GitHub Flavored Markdown (GFM)
 * - Sanitização via DOMPurify
 * - Otimizações para impressão A4
 * - Syntax highlighting para code blocks
 * 
 * @param {string} markdown - Conteúdo markdown a processar
 * @returns {string} HTML sanitizado e pronto para renderização
 * @throws Retorna HTML com mensagem de erro se processamento falhar
 * 
 * @example
 *   const html = processMarkdown('# Título\n\nParágrafo')
 *   // Retorna: '<h1>Título</h1>\n<p>Parágrafo</p>'
 */
export function processMarkdown(markdown: string): string {
  try {
    if (!markdown || typeof markdown !== 'string') {
      return '' // Conteúdo vazio não é erro
    }

    // Preprocessar: converter <!-- pagebreak --> para marcador HTML
    // Isso é feito ANTES do marked para preservar o comentário HTML
    const preprocessed = markdown.replace(
      /<!--\s*pagebreak\s*-->/gi,
      '\n<div class="page-break" aria-hidden="true"></div>\n'
    )

    const dirty = marked(preprocessed) as string
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
 * 
 * Detecta potenciais problemas:
 * - Tags perigosas (script, iframe, etc)
 * - URLs muito longas que podem transbordar em impressão
 * 
 * @param {string} markdown - Conteúdo markdown a validar
 * @returns {object} Objeto com isValid e array de warnings
 * 
 * @example
 *   const result = validateMarkdown('<script>alert(1)</script>')
 *   // Retorna: { isValid: false, warnings: ['Conteúdo contém tags potencialmente perigosas...'] }
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
 * 
 * Fórmula: 
 * - A4 tem ~80 caracteres de largura (210mm - 40mm margens)
 * - A4 tem ~45 linhas de altura (297mm - 40mm margens)
 * - Portanto: ~3500 caracteres por página
 * 
 * @param {string} html - Conteúdo HTML renderizado
 * @returns {number} Número estimado de páginas A4 (mínimo 1)
 * 
 * @example
 *   estimatePageCount('<p>Hello</p>') // 1
 *   estimatePageCount('<p>'.repeat(500) + '</p>'.repeat(500)) // ~3
 */
export function estimatePageCount(html: string): number {
  const wordsPerLine = 12
  const charsPerPage = 45 * wordsPerLine * 5 // ~2700 caracteres (conservative)
  const totalChars = html.length
  return Math.ceil(totalChars / charsPerPage) || 1
}

/**
 * Integração com processador de imagens para redimensionar imagens em HTML
 * 
 * Carrega processador de imagens dinamicamente e aplica dimensões A4-otimizadas.
 * 
 * @param {HTMLElement | null} container - Elemento contendo imagens a processar
 * @param {boolean} useCache - Se deve usar cache de dimensões (padrão: true)
 * @returns {Promise<number>} Número de imagens processadas com sucesso
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
