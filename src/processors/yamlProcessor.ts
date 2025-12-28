/**
 * YAML PROCESSOR
 * 
 * Responsible for parsing YAML content and rendering it as structured HTML.
 * Supports both frontmatter (---\n...\n---) and code blocks (```yaml).
 * Uses lazy loading to avoid impacting the initial bundle size.
 */

import type { load as YamlLoad } from 'js-yaml'
import { logErro } from '@/utils/logger'

let yamlInstance: { load: typeof YamlLoad } | null = null
let initPromise: Promise<void> | null = null

/**
 * Ensures js-yaml library is loaded (singleton pattern)
 * Only loads on first use - subsequent calls return cached instance
 */
async function ensureYamlLoaded(): Promise<{ load: typeof YamlLoad }> {
  if (yamlInstance) return yamlInstance

  if (!initPromise) {
    initPromise = (async () => {
      const yaml = await import('js-yaml')
      yamlInstance = { load: yaml.load }
    })()
  }

  await initPromise
  return yamlInstance!
}

/**
 * Decodes base64 encoded YAML source code
 * Required because source is stored as base64 to survive DOMPurify
 */
function decodeBase64Source(base64: string): string {
  try {
    return decodeURIComponent(escape(atob(base64)))
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : String(e)
    logErro(`[YAML] Falha ao decodificar base64: ${errorMsg}`)
    return ''
  }
}

/**
 * Escapes HTML special characters to prevent XSS
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

/**
 * Renders a YAML value to HTML string
 * Handles primitives, arrays, and nested objects with proper indentation
 */
function renderValue(value: unknown, indent: number = 0): string {
  const indentStyle = `style="--yaml-indent: ${indent}"`

  // Handle null/undefined
  if (value === null || value === undefined) {
    return `<span class="yaml-value yaml-null">null</span>`
  }

  // Handle boolean
  if (typeof value === 'boolean') {
    return `<span class="yaml-value yaml-boolean">${value}</span>`
  }

  // Handle number
  if (typeof value === 'number') {
    return `<span class="yaml-value yaml-number">${value}</span>`
  }

  // Handle string
  if (typeof value === 'string') {
    // Check if string contains newlines (multiline string from | or >)
    if (value.includes('\n')) {
      const lines = value.split('\n').map(line => escapeHtml(line))
      return `<div class="yaml-value yaml-multiline">${lines.join('<br>')}</div>`
    }
    return `<span class="yaml-value yaml-string">${escapeHtml(value)}</span>`
  }

  // Handle array
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return `<span class="yaml-value yaml-empty">[]</span>`
    }

    const items = value.map(item => {
      if (typeof item === 'object' && item !== null) {
        // Complex array item (object)
        return `<div class="yaml-array-item" ${indentStyle}>${renderObject(item as Record<string, unknown>, indent + 1)}</div>`
      }
      // Simple array item (primitive)
      return `<div class="yaml-array-item" ${indentStyle}>${renderValue(item, indent)}</div>`
    }).join('')

    return items
  }

  // Handle object
  if (typeof value === 'object') {
    return renderObject(value as Record<string, unknown>, indent)
  }

  // Fallback for unknown types
  return `<span class="yaml-value">${escapeHtml(String(value))}</span>`
}

/**
 * Renders a YAML object to HTML string
 * Each key-value pair becomes a yaml-entry div
 */
function renderObject(obj: Record<string, unknown>, indent: number = 0): string {
  const entries = Object.entries(obj)
  
  if (entries.length === 0) {
    return `<span class="yaml-value yaml-empty">{}</span>`
  }

  return entries.map(([key, value]) => {
    const indentStyle = `style="--yaml-indent: ${indent}"`
    const escapedKey = escapeHtml(key)

    // Check if value is complex (object or non-empty array)
    const isComplex = (
      (typeof value === 'object' && value !== null && !Array.isArray(value)) ||
      (Array.isArray(value) && value.length > 0)
    )

    if (isComplex) {
      // Complex value: key on its own line, value indented below
      return `<div class="yaml-entry" ${indentStyle}>
        <span class="yaml-key">${escapedKey}:</span>
      </div>${renderValue(value, indent + 1)}`
    }

    // Simple value: key and value on same line
    return `<div class="yaml-entry" ${indentStyle}>
      <span class="yaml-key">${escapedKey}:</span> ${renderValue(value, indent)}
    </div>`
  }).join('')
}

/**
 * Renders parsed YAML data to structured HTML
 */
function renderYamlToHtml(data: unknown): string {
  if (data === null || data === undefined) {
    return '<div class="yaml-content"><span class="yaml-empty">Empty YAML</span></div>'
  }

  if (typeof data !== 'object') {
    // Root is a primitive value
    return `<div class="yaml-content">${renderValue(data, 0)}</div>`
  }

  if (Array.isArray(data)) {
    // Root is an array
    return `<div class="yaml-content">${renderValue(data, 0)}</div>`
  }

  // Root is an object
  return `<div class="yaml-content">${renderObject(data as Record<string, unknown>, 0)}</div>`
}

/**
 * Renders YAML as a code block with syntax highlighting (fallback for invalid YAML)
 */
function renderAsCodeBlock(source: string, errorMessage: string): string {
  // Import highlight.js dynamically would be overkill here
  // Just render as pre/code with error message
  const escapedSource = escapeHtml(source)
  const escapedError = escapeHtml(errorMessage)
  
  return `<div class="yaml-error">
    <span class="yaml-error-message">YAML Error: ${escapedError}</span>
  </div>
  <pre class="yaml-fallback-code"><code>${escapedSource}</code></pre>`
}

/**
 * Processes all YAML blocks in a container
 * 
 * @param container - HTML element containing .yaml-block elements
 * @returns Number of blocks processed
 */
export async function processYamlBlocks(container: HTMLElement | null): Promise<number> {
  if (!container) return 0

  const yamlBlocks = container.querySelectorAll<HTMLElement>('.yaml-block[data-yaml-source]')
  if (yamlBlocks.length === 0) return 0

  const yaml = await ensureYamlLoaded()
  let processedCount = 0

  for (const block of yamlBlocks) {
    const encodedSource = block.getAttribute('data-yaml-source')
    const yamlType = block.getAttribute('data-yaml-type') || 'codeblock'
    
    if (!encodedSource) continue

    const source = decodeBase64Source(encodedSource)
    if (!source) continue

    try {
      // Parse YAML
      const data = yaml.load(source)
      
      // Render to HTML
      const html = renderYamlToHtml(data)
      
      // Update block content
      block.innerHTML = html
      block.removeAttribute('data-yaml-source')
      block.classList.add('yaml-rendered')
      block.setAttribute('data-yaml-type', yamlType)
      
      processedCount++
    } catch (e) {
      // Parse error - render as code block fallback
      const errorMessage = e instanceof Error ? e.message : 'Unknown parsing error'
      logErro(`[YAML] Erro de parse: ${errorMessage}`)
      
      block.innerHTML = renderAsCodeBlock(source, errorMessage)
      block.classList.add('yaml-error-container')
      block.removeAttribute('data-yaml-source')
    }
  }

  return processedCount
}
