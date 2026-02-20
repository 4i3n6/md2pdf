/**
 * MERMAID PROCESSOR
 * 
 * Responsible for rendering Mermaid diagrams in the preview.
 * Uses lazy loading to avoid impacting the initial bundle size.
 */

import { MermaidConfig } from '@/constants'
import { decodeBase64Utf8 } from '@/utils/base64'
import { t } from '@/i18n'
import { logError } from '@/utils/logger'

let mermaidInstance: typeof import('mermaid').default | null = null
let initPromise: Promise<void> | null = null
const mermaidCache = new Map<string, string>()
const mermaidRenderPromises = new Map<string, Promise<string>>()
const MAX_CACHE_ENTRIES = 80
const LANDSCAPE_MULTIPLIER = 2

/**
 * Ensure Mermaid library is loaded and initialized (singleton pattern).
 * Only loads on first use - subsequent calls return cached instance.
 */
async function ensureMermaidLoaded(): Promise<typeof import('mermaid').default> {
  if (mermaidInstance) return mermaidInstance

  if (!initPromise) {
    initPromise = (async () => {
      const { default: mermaid } = await import('mermaid')
      mermaid.initialize({
        startOnLoad: false,
        theme: 'default',
        securityLevel: 'strict',
        fontFamily: 'JetBrains Mono, Fira Code, monospace',
        fontSize: 9,
        flowchart: {
          useMaxWidth: false,
          htmlLabels: true,
          curve: 'basis',
          padding: 8
        },
        sequence: {
          useMaxWidth: false,
          boxMargin: 4,
          noteMargin: 4
        },
        gantt: {
          useMaxWidth: false,
          fontSize: 9
        },
        themeVariables: {
          fontSize: '9pt'
        }
      })
      mermaidInstance = mermaid
    })()
  }

  try {
    await initPromise
  } catch (erro) {
    initPromise = null
    throw erro
  }

  return mermaidInstance!
}

function normalizeMermaidSource(source: string): string {
  return source.trim()
}

function generateMermaidId(): string {
  return `mermaid-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function decodeBase64Source(base64: string): string {
  return decodeBase64Utf8(base64, {
    onError: logError,
    errorPrefix: '[Mermaid] Failed to decode base64: '
  })
}

function setTextSafe(element: HTMLElement, text: string): void {
  element.textContent = text
}

function parseDimension(value: string | null): number {
  if (!value) return 0
  const match = value.trim().match(/^(\d+(?:\.\d+)?)(px)?$/i)
  if (!match) return 0
  const parsed = Number.parseFloat(match[1] ?? '')
  return Number.isFinite(parsed) ? parsed : 0
}

function extractSvgDimensions(svgElement: SVGSVGElement | null): { width: number, height: number } {
  if (!svgElement) {
    return { width: 0, height: 0 }
  }

  const widthFromAttr = parseDimension(svgElement.getAttribute('width'))
  const heightFromAttr = parseDimension(svgElement.getAttribute('height'))
  if (widthFromAttr > 0 && heightFromAttr > 0) {
    return { width: widthFromAttr, height: heightFromAttr }
  }

  const viewBox = svgElement.getAttribute('viewBox') || ''
  const viewBoxParts = viewBox
    .trim()
    .split(/[\s,]+/)
    .map((value) => Number.parseFloat(value))
    .filter((value) => Number.isFinite(value))

  const vbW = viewBoxParts[2]
  const vbH = viewBoxParts[3]
  if (viewBoxParts.length >= 4 && vbW !== undefined && vbH !== undefined && vbW > 0 && vbH > 0) {
    return { width: vbW, height: vbH }
  }

  if (typeof svgElement.getBoundingClientRect === 'function') {
    const bounds = svgElement.getBoundingClientRect()
    if (bounds.width > 0 && bounds.height > 0) {
      return { width: bounds.width, height: bounds.height }
    }
  }

  return { width: 0, height: 0 }
}

function isWideDiagramForPrint(svgElement: SVGSVGElement | null): boolean {
  const { width, height } = extractSvgDimensions(svgElement)
  const maxWidth = MermaidConfig.maxPageWidthPx
  const landscapeTrigger = maxWidth * LANDSCAPE_MULTIPLIER
  return width > maxWidth && width > landscapeTrigger && width > height
}

function detectDiagramType(source: string): string {
  const firstLine = (source.trim().split('\n')[0] || '').toLowerCase()

  if (firstLine.startsWith('flowchart') || firstLine.startsWith('graph')) return 'flowchart'
  if (firstLine.startsWith('sequencediagram') || firstLine.startsWith('sequence')) return 'sequence'
  if (firstLine.startsWith('classdiagram') || firstLine.startsWith('class')) return 'class'
  if (firstLine.startsWith('statediagram')) return 'state'
  if (firstLine.startsWith('erdiagram')) return 'er'
  if (firstLine.startsWith('gantt')) return 'gantt'
  if (firstLine.startsWith('pie')) return 'pie'
  if (firstLine.startsWith('journey')) return 'journey'
  if (firstLine.startsWith('gitgraph')) return 'git'
  if (firstLine.startsWith('mindmap')) return 'mindmap'
  if (firstLine.startsWith('timeline')) return 'timeline'
  if (firstLine.startsWith('sankey')) return 'sankey'
  if (firstLine.startsWith('xychart')) return 'xychart'
  if (firstLine.startsWith('block')) return 'block'
  if (firstLine.startsWith('quadrant')) return 'quadrant'
  if (firstLine.startsWith('requirement')) return 'requirement'
  if (firstLine.startsWith('c4')) return 'c4'
  if (firstLine.startsWith('architecture')) return 'architecture'

  return 'diagram'
}

function extractDiagramTitle(source: string): string | null {
  const yamlMatch = source.match(/^---\s*\n[\s\S]*?title:\s*["']?(.+?)["']?\s*\n[\s\S]*?---/m)
  if (yamlMatch && yamlMatch[1]) {
    return yamlMatch[1].trim()
  }

  const lines = source.trim().split('\n')
  for (const line of lines) {
    const commentMatch = line.match(/^%%\s*(.+)$/)
    if (commentMatch && commentMatch[1] && !commentMatch[1].startsWith('{')) {
      return commentMatch[1].trim()
    }
  }

  return null
}

function limitarCache(): void {
  while (mermaidCache.size > MAX_CACHE_ENTRIES) {
    const firstKey = mermaidCache.keys().next().value
    if (typeof firstKey === 'string') {
      mermaidCache.delete(firstKey)
    } else {
      break
    }
  }
}

async function renderMermaidSvg(source: string): Promise<string> {
  const normalizedSource = normalizeMermaidSource(source)
  const cacheKey = normalizedSource
  const cachedSvg = mermaidCache.get(cacheKey)
  if (cachedSvg) {
    return cachedSvg
  }

  const inFlight = mermaidRenderPromises.get(cacheKey)
  if (inFlight) {
    return inFlight
  }

  const renderPromise = (async () => {
    const mermaid = await ensureMermaidLoaded()
    const id = generateMermaidId()
    const { svg } = await mermaid.render(id, normalizedSource)
    mermaidCache.set(cacheKey, svg)
    limitarCache()
    return svg
  })()

  mermaidRenderPromises.set(cacheKey, renderPromise)
  try {
    return await renderPromise
  } finally {
    if (mermaidRenderPromises.get(cacheKey) === renderPromise) {
      mermaidRenderPromises.delete(cacheKey)
    }
  }
}

function renderMermaidError(block: HTMLElement, message: string): void {
  block.innerHTML = ''
  const errorContainer = document.createElement('div')
  errorContainer.className = 'mermaid-error'

  const title = document.createElement('strong')
  title.textContent = `${t('preview.mermaidErrorLabel')} `
  const details = document.createElement('pre')
  setTextSafe(details, message)

  errorContainer.appendChild(title)
  errorContainer.appendChild(details)
  block.appendChild(errorContainer)
  block.classList.add('mermaid-error-container')
  block.removeAttribute('data-mermaid-source')
}

/**
 * Processes all Mermaid diagram blocks in a container
 * 
 * @param container - HTML element containing .mermaid blocks
 * @returns Number of diagrams processed
 */
export async function processMermaidDiagrams(container: HTMLElement | null): Promise<number> {
  if (!container) return 0

  const mermaidBlocks = container.querySelectorAll<HTMLElement>('.mermaid[data-mermaid-source]')
  if (mermaidBlocks.length === 0) return 0

  let processedCount = 0

  for (const block of mermaidBlocks) {
    const encodedSource = block.getAttribute('data-mermaid-source')
    if (!encodedSource) {
      continue
    }

    const source = decodeBase64Source(encodedSource)
    if (!source) {
      renderMermaidError(block, t('preview.mermaidDecodeError'))
      continue
    }

    try {
      const svg = await renderMermaidSvg(source)
      const diagramType = detectDiagramType(source)
      const diagramTitle = extractDiagramTitle(source)

      const figure = document.createElement('figure')
      figure.className = 'mermaid-figure'
      figure.setAttribute('data-diagram-type', diagramType)

      const diagramContainer = document.createElement('div')
      diagramContainer.className = 'mermaid-diagram'
      diagramContainer.innerHTML = svg
      figure.appendChild(diagramContainer)

      const svgElement = diagramContainer.querySelector('svg')
      if (isWideDiagramForPrint(svgElement as SVGSVGElement | null)) {
        figure.classList.add('mermaid-landscape')
        block.classList.add('mermaid-landscape')
      }

      if (diagramTitle) {
        const caption = document.createElement('figcaption')
        caption.className = 'mermaid-caption'

        const numberSpan = document.createElement('span')
        numberSpan.className = 'diagram-number'
        setTextSafe(numberSpan, '')

        const titleSpan = document.createElement('span')
        titleSpan.className = 'diagram-title'
        setTextSafe(titleSpan, diagramTitle)

        caption.appendChild(numberSpan)
        caption.appendChild(titleSpan)
        figure.appendChild(caption)
      }

      block.innerHTML = ''
      block.appendChild(figure)
      block.removeAttribute('data-mermaid-source')
      block.classList.add('mermaid-rendered')

      processedCount += 1
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Unknown error'
      logError(`Failed to render Mermaid: ${errorMessage}`)
      renderMermaidError(block, errorMessage)
    }
  }

  return processedCount
}
