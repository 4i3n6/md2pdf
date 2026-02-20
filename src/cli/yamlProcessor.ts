import { load as yamlLoad } from 'js-yaml'
import { escapeHtml, decodeBase64 } from './utils'

function renderValue(value: unknown, indent: number = 0): string {
    const indentStyle = `style="--yaml-indent: ${indent}"`

    if (value === null || value === undefined) {
        return `<span class="yaml-value yaml-null">null</span>`
    }

    if (typeof value === 'boolean') {
        return `<span class="yaml-value yaml-boolean">${value}</span>`
    }

    if (typeof value === 'number') {
        return `<span class="yaml-value yaml-number">${value}</span>`
    }

    if (typeof value === 'string') {
        if (value.includes('\n')) {
            const lines = value.split('\n').map((line) => escapeHtml(line))
            return `<div class="yaml-value yaml-multiline">${lines.join('<br>')}</div>`
        }
        return `<span class="yaml-value yaml-string">${escapeHtml(value)}</span>`
    }

    if (Array.isArray(value)) {
        if (value.length === 0) {
            return `<span class="yaml-value yaml-empty">[]</span>`
        }

        return value
            .map((item) => {
                if (typeof item === 'object' && item !== null) {
                    return `<div class="yaml-array-item" ${indentStyle}>${renderObject(item as Record<string, unknown>, indent + 1)}</div>`
                }
                return `<div class="yaml-array-item" ${indentStyle}>${renderValue(item, indent)}</div>`
            })
            .join('')
    }

    if (typeof value === 'object') {
        return renderObject(value as Record<string, unknown>, indent)
    }

    return `<span class="yaml-value">${escapeHtml(String(value))}</span>`
}

function renderObject(
    obj: Record<string, unknown>,
    indent: number = 0
): string {
    const entries = Object.entries(obj)

    if (entries.length === 0) {
        return `<span class="yaml-value yaml-empty">{}</span>`
    }

    return entries
        .map(([key, value]) => {
            const indentStyle = `style="--yaml-indent: ${indent}"`
            const escapedKey = escapeHtml(key)

            const isComplex =
                (typeof value === 'object' &&
                    value !== null &&
                    !Array.isArray(value)) ||
                (Array.isArray(value) && value.length > 0)

            if (isComplex) {
                return `<div class="yaml-entry" ${indentStyle}>
        <span class="yaml-key">${escapedKey}:</span>
      </div>${renderValue(value, indent + 1)}`
            }

            return `<div class="yaml-entry" ${indentStyle}>
      <span class="yaml-key">${escapedKey}:</span> ${renderValue(value, indent)}
    </div>`
        })
        .join('')
}

function renderYamlToHtml(data: unknown): string {
    if (data === null || data === undefined) {
        return '<div class="yaml-content"><span class="yaml-empty">Empty YAML</span></div>'
    }

    if (typeof data !== 'object') {
        return `<div class="yaml-content">${renderValue(data, 0)}</div>`
    }

    if (Array.isArray(data)) {
        return `<div class="yaml-content">${renderValue(data, 0)}</div>`
    }

    return `<div class="yaml-content">${renderObject(data as Record<string, unknown>, 0)}</div>`
}

function renderAsCodeBlock(source: string, errorMessage: string): string {
    const escapedSource = escapeHtml(source)
    const escapedError = escapeHtml(errorMessage)

    return `<div class="yaml-error">
    <span class="yaml-error-message">YAML Error: ${escapedError}</span>
  </div>
  <pre class="yaml-fallback-code"><code>${escapedSource}</code></pre>`
}

const YAML_BLOCK_REGEX =
    /<div\s+class="yaml-block"\s+data-yaml-source="([^"]+)"\s+data-yaml-type="([^"]*)"[^>]*>[\s\S]*?<\/div>/g

export function processYamlBlocksInHtml(html: string): string {
    return html.replace(YAML_BLOCK_REGEX, (_match, b64Source: string, yamlType: string) => {
        const source = decodeBase64(b64Source)
        if (!source) return _match

        try {
            const data = yamlLoad(source)
            const rendered = renderYamlToHtml(data)
            return `<div class="yaml-block yaml-rendered" data-yaml-type="${yamlType}">${rendered}</div>`
        } catch (e) {
            const errorMessage =
                e instanceof Error ? e.message : 'Unknown parsing error'
            return `<div class="yaml-block yaml-error-container">${renderAsCodeBlock(source, errorMessage)}</div>`
        }
    })
}
