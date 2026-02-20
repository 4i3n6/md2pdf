/**
 * YAML PROCESSOR
 *
 * Responsible for parsing YAML content and rendering it as structured HTML.
 * Supports both frontmatter (---\n...\n---) and code blocks (```yaml).
 * Uses lazy loading to avoid impacting the initial bundle size.
 */

import type { load as YamlLoad } from 'js-yaml'
import { decodeBase64Utf8 } from '@/utils/base64'
import { logErro } from '@/utils/logger'
import {
    renderYamlToHtml,
    renderAsCodeBlock
} from '../shared/yamlRenderer'

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
  return decodeBase64Utf8(base64, {
    onError: logErro,
    errorPrefix: '[YAML] Falha ao decodificar base64: '
  })
}

/** Escapes HTML special characters using DOM API (browser-safe) */
function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
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
      const data = yaml.load(source)
      const html = renderYamlToHtml(data, escapeHtml)

      block.innerHTML = html
      block.removeAttribute('data-yaml-source')
      block.classList.add('yaml-rendered')
      block.setAttribute('data-yaml-type', yamlType)

      processedCount++
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Unknown parsing error'
      logErro(`[YAML] Erro de parse: ${errorMessage}`)

      block.innerHTML = renderAsCodeBlock(source, errorMessage, escapeHtml)
      block.classList.add('yaml-error-container')
      block.removeAttribute('data-yaml-source')
    }
  }

  return processedCount
}
