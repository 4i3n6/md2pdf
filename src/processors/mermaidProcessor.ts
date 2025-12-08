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
        flowchart: {
          useMaxWidth: true,
          htmlLabels: true
        },
        sequence: {
          useMaxWidth: true
        },
        gantt: {
          useMaxWidth: true
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
 * Decodes HTML entities in Mermaid source code
 * Required because source is stored escaped in data attribute
 */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
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

    const source = decodeHtmlEntities(encodedSource)

    try {
      const id = generateMermaidId()
      const { svg } = await mermaid.render(id, source)
      
      block.innerHTML = svg
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
