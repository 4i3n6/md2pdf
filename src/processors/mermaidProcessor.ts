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
