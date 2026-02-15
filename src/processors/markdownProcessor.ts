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
import { normalizarLinguagemCodigo } from '@/services/documentLanguageService'
import { logErro } from '@/utils/logger'
import { registrarHooksSanitizacaoStyle } from './styleSanitizer'

// Registro explicito para manter o bundle de highlight.js enxuto.
const linguagensHighlight: Array<[string, LanguageFn]> = [
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

for (const [nome, definicao] of linguagensHighlight) {
    hljs.registerLanguage(nome, definicao)
}

function obterAtributoAlinhamento(align?: string | null): string {
    const valor = (align || '').toLowerCase().trim()
    if (valor !== 'left' && valor !== 'center' && valor !== 'right') {
        return ''
    }
    return ` align="${valor}" style="text-align: ${valor}"`
}

function inferirAlinhamentoPorPadrao(padrao: string): string | null {
  const valor = padrao.trim()
  if (!valor) return null

  const temDoisPontosInicio = valor.startsWith(':')
  const temDoisPontosFim = valor.endsWith(':')

  if (temDoisPontosInicio && temDoisPontosFim) return 'center'
  if (temDoisPontosFim) return 'right'
  if (temDoisPontosInicio) return 'left'
  return null
}

function inferirAlinhamentosPorRaw(raw: string | undefined, quantidadeColunas: number): Array<string | null> {
  if (!raw || quantidadeColunas <= 0) return []

  const linhas = raw.split('\n').map((linha) => linha.trim()).filter(Boolean)
  if (linhas.length < 2) return []

  const linhaSeparadora = linhas[1] || ''
  const partes = linhaSeparadora
    .split('|')
    .map((parte) => parte.trim())
    .filter((parte) => parte.length > 0)

  const alinhamentos = partes.map((parte) => inferirAlinhamentoPorPadrao(parte))
  while (alinhamentos.length < quantidadeColunas) {
    alinhamentos.push(null)
  }
  return alinhamentos.slice(0, quantidadeColunas)
}

function obterAlinhamentoCelula(
  alinhamentos: Array<string | null>,
  alinhamentosFallback: Array<string | null>,
  idx: number,
  cell: Tokens.TableCell
): string | null {
  const cellComAlinhamento = cell as Tokens.TableCell & { align?: string | null }
  return alinhamentos[idx] || cellComAlinhamento.align || alinhamentosFallback[idx] || null
}

function escaparRegex(valor: string): string {
  return valor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function abreviarEnderecoCriptografico(valor: string): string {
  if (valor.length < 28) {
    return valor
  }

  const tamanhoInicio = 10
  const tamanhoFim = 8
  return `${valor.slice(0, tamanhoInicio)}...${valor.slice(-tamanhoFim)}`
}

function abreviarTextoCriptoNoConteudo(conteudo: string): string {
  const regexEnderecoEvm = /\b0x[a-fA-F0-9]{24,}\b/g
  const regexEnderecoBtc = /\b(?:bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}\b/g

  return conteudo
    .replace(regexEnderecoEvm, abreviarEnderecoCriptografico)
    .replace(regexEnderecoBtc, abreviarEnderecoCriptografico)
}

function encontrarBlocoCodigoFenced(src: string, linguagem: string): { raw: string, text: string } | null {
  const linguagemEscapada = escaparRegex(linguagem)
  const regex = new RegExp(
    '^[ \\t]*(?:`{3,}|~{3,})[ \\t]*' + linguagemEscapada + '\\b[^\\n]*\\n([\\s\\S]*?)\\n[ \\t]*(?:`{3,}|~{3,})[ \\t]*(?:\\n|$)',
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
    const tokenComAlinhamento = token as Tokens.Table & { align?: Array<string | null> }
    const alinhamentos = Array.isArray(tokenComAlinhamento.align)
      ? tokenComAlinhamento.align
      : []
    const alinhamentosFallback = inferirAlinhamentosPorRaw(token.raw, token.header?.length || 0)

    // Header row
    let headerRow = ''
    if (token.header && token.header.length > 0) {
      const headerCells = token.header
        .map((cell: Tokens.TableCell, idx: number) => {
          const alignAttr = obterAtributoAlinhamento(
            obterAlinhamentoCelula(alinhamentos, alinhamentosFallback, idx, cell)
          )
          return `<th${alignAttr}>${this.parser.parseInline(cell.tokens)}</th>`
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
              const alignAttr = obterAtributoAlinhamento(
                obterAlinhamentoCelula(alinhamentos, alinhamentosFallback, idx, cell)
              )
              return `<td${alignAttr}>${this.parser.parseInline(cell.tokens)}</td>`
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
    const linguagemBruta = typeof token.lang === 'string' ? token.lang.trim() : ''
    const lang = normalizarLinguagemCodigo(linguagemBruta)
    const temLinguagem = linguagemBruta.length > 0
    let highlightedCode = token.text

    try {
      if (lang === 'plaintext' && temLinguagem) {
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
    const content = abreviarTextoCriptoNoConteudo(this.parser.parseInline(token.tokens))
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
    return abreviarTextoCriptoNoConteudo(token.text)
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
// A classe estende Renderer e tem acesso a this.parser para processar tokens inline
marked.use({ renderer: new PrintRenderer() })

/**
 * Extensões para interceptar blocos de código especiais (Mermaid, YAML)
 * 
 * NOTA: No marked v17, precisamos de extensões separadas para interceptar 
 * code blocks antes do renderer padrão processar.
 */
marked.use({
  extensions: [
    // Extensão Mermaid
    {
      name: 'mermaidCodeBlock',
      level: 'block',
      start(src: string) {
        return src.match(/^[ \t]*(?:`{3,}|~{3,})[ \t]*mermaid\b/i)?.index
      },
      tokenizer(src: string) {
        const match = encontrarBlocoCodigoFenced(src, 'mermaid')
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
    // Extensão YAML
    {
      name: 'yamlCodeBlock',
      level: 'block',
      start(src: string) {
        return src.match(/^[ \t]*(?:`{3,}|~{3,})[ \t]*ya?ml\b/i)?.index
      },
      tokenizer(src: string) {
        const match = encontrarBlocoCodigoFenced(src, 'ya?ml')
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
  ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'id', 'class', 'data-lang', 'data-mermaid-source', 'data-yaml-source', 'data-yaml-type', 'data-print-image', 'loading', 'style', 'align', 'role', 'aria-label', 'aria-hidden', 'type', 'checked', 'disabled'],
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
    registrarHooksSanitizacaoStyle()
    const clean = DOMPurify.sanitize(dirty, DOMPURIFY_CONFIG as any) as unknown as string

    return clean
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : 'Erro desconhecido'
    logErro(`Erro ao processar markdown: ${errorMsg}`)
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
 * - A4 tem ~90 caracteres de largura (210mm - 20mm margens)
 * - A4 tem ~50 linhas de altura (297mm - 20mm margens)
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
    const errorMsg = e instanceof Error ? e.message : String(e)
    logErro(`Erro ao processar imagens para print: ${errorMsg}`)
    return 0
  }
}
