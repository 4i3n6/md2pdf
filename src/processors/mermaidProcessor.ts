/**
 * MERMAID PROCESSOR
 * 
 * Responsible for rendering Mermaid diagrams in the preview.
 * Uses lazy loading to avoid impacting the initial bundle size.
 */

let mermaidInstance: typeof import('mermaid').default | null = null
let initPromise: Promise<void> | null = null

/**
 * Ensures Mermaid library is loaded and initialized (singleton pattern)
 * Only loads on first use - subsequent calls return cached instance
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

  await initPromise
  return mermaidInstance!
}

/**
 * Generates a unique ID for Mermaid diagram rendering
 */
function generateMermaidId(): string {
  return `mermaid-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/**
 * Decodes base64 encoded Mermaid source code
 * Required because source is stored as base64 to survive DOMPurify
 */
function decodeBase64Source(base64: string): string {
  try {
    return decodeURIComponent(escape(atob(base64)))
  } catch (e) {
    console.error('[Mermaid] Failed to decode base64:', e)
    return ''
  }
}

/**
 * Detects the type of Mermaid diagram from source code
 * Used for labeling and styling purposes
 */
function detectDiagramType(source: string): string {
  const firstLine = source.trim().split('\n')[0].toLowerCase()
  
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

/**
 * Extracts diagram title from source code
 * Supports YAML frontmatter (title:) and Mermaid comments (%%)
 */
function extractDiagramTitle(source: string): string | null {
  // Try YAML frontmatter: ---\ntitle: My Title\n---
  const yamlMatch = source.match(/^---\s*\n[\s\S]*?title:\s*["']?(.+?)["']?\s*\n[\s\S]*?---/m)
  if (yamlMatch) return yamlMatch[1].trim()
  
  // Try Mermaid comment: %% My Title
  const lines = source.trim().split('\n')
  for (const line of lines) {
    const commentMatch = line.match(/^%%\s*(.+)$/)
    if (commentMatch && !commentMatch[1].startsWith('{')) {
      return commentMatch[1].trim()
    }
  }
  
  return null
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

  const mermaid = await ensureMermaidLoaded()
  let processedCount = 0

  for (const block of mermaidBlocks) {
    const encodedSource = block.getAttribute('data-mermaid-source')
    if (!encodedSource) continue

    const source = decodeBase64Source(encodedSource)

    try {
      const id = generateMermaidId()
      const { svg } = await mermaid.render(id, source)
      
      // Detect diagram type and extract title
      const diagramType = detectDiagramType(source)
      const diagramTitle = extractDiagramTitle(source)
      
      // Create figure structure for professional documentation
      const figure = document.createElement('figure')
      figure.className = 'mermaid-figure'
      figure.setAttribute('data-diagram-type', diagramType)
      
      // Create diagram container
      const diagramContainer = document.createElement('div')
      diagramContainer.className = 'mermaid-diagram'
      diagramContainer.innerHTML = svg
      figure.appendChild(diagramContainer)
      
      // Check if diagram needs landscape rotation
      // Only rotate if: width exceeds page limit AND diagram is wider than tall
      const svgElement = diagramContainer.querySelector('svg')
      if (svgElement) {
        const svgWidth = parseFloat(svgElement.getAttribute('width') || '0')
        const svgHeight = parseFloat(svgElement.getAttribute('height') || '0')
        const MAX_PAGE_WIDTH = 480 // ~170mm at 72dpi
        
        // Only rotate wide diagrams (width > height) that exceed page width
        if (svgWidth > MAX_PAGE_WIDTH && svgWidth > svgHeight) {
          figure.classList.add('mermaid-landscape')
        }
      }
      
      // Add figcaption if title exists
      if (diagramTitle) {
        const caption = document.createElement('figcaption')
        caption.className = 'mermaid-caption'
        caption.innerHTML = `<span class="diagram-number"></span><span class="diagram-title">${diagramTitle}</span>`
        figure.appendChild(caption)
      }
      
      // Replace block content with figure
      block.innerHTML = ''
      block.appendChild(figure)
      block.removeAttribute('data-mermaid-source')
      block.classList.add('mermaid-rendered')
      
      processedCount++
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Unknown error'
      console.error('Error rendering Mermaid diagram:', e)
      
      block.innerHTML = `<div class="mermaid-error">
        <strong>Diagram error:</strong>
        <pre>${errorMessage}</pre>
      </div>`
      block.classList.add('mermaid-error-container')
    }
  }

  return processedCount
}
