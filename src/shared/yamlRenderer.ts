/**
 * Shared YAML-to-HTML rendering logic used by both web and CLI processors.
 * All functions are pure and platform-agnostic.
 * The `escape` parameter allows each platform to provide its own escapeHtml.
 */

export type EscapeHtmlFn = (text: string) => string

export function renderValue(
    value: unknown,
    indent: number,
    escape: EscapeHtmlFn
): string {
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
        return renderStringValue(value, escape)
    }
    if (Array.isArray(value)) {
        return renderArrayValue(value, indent, indentStyle, escape)
    }
    if (typeof value === 'object') {
        return renderObject(value as Record<string, unknown>, indent, escape)
    }
    return `<span class="yaml-value">${escape(String(value))}</span>`
}

function renderStringValue(value: string, escape: EscapeHtmlFn): string {
    if (value.includes('\n')) {
        const lines = value.split('\n').map((line) => escape(line))
        return `<div class="yaml-value yaml-multiline">${lines.join('<br>')}</div>`
    }
    return `<span class="yaml-value yaml-string">${escape(value)}</span>`
}

function renderArrayValue(
    value: unknown[],
    indent: number,
    indentStyle: string,
    escape: EscapeHtmlFn
): string {
    if (value.length === 0) {
        return `<span class="yaml-value yaml-empty">[]</span>`
    }
    return value
        .map((item) => {
            if (typeof item === 'object' && item !== null) {
                return `<div class="yaml-array-item" ${indentStyle}>${renderObject(item as Record<string, unknown>, indent + 1, escape)}</div>`
            }
            return `<div class="yaml-array-item" ${indentStyle}>${renderValue(item, indent, escape)}</div>`
        })
        .join('')
}

export function renderObject(
    obj: Record<string, unknown>,
    indent: number,
    escape: EscapeHtmlFn
): string {
    const entries = Object.entries(obj)
    if (entries.length === 0) {
        return `<span class="yaml-value yaml-empty">{}</span>`
    }

    return entries
        .map(([key, value]) => {
            const indentStyle = `style="--yaml-indent: ${indent}"`
            const escapedKey = escape(key)
            const isComplex =
                (typeof value === 'object' &&
                    value !== null &&
                    !Array.isArray(value)) ||
                (Array.isArray(value) && value.length > 0)

            if (isComplex) {
                return `<div class="yaml-entry" ${indentStyle}>
        <span class="yaml-key">${escapedKey}:</span>
      </div>${renderValue(value, indent + 1, escape)}`
            }

            return `<div class="yaml-entry" ${indentStyle}>
      <span class="yaml-key">${escapedKey}:</span> ${renderValue(value, indent, escape)}
    </div>`
        })
        .join('')
}

export function renderYamlToHtml(
    data: unknown,
    escape: EscapeHtmlFn
): string {
    if (data === null || data === undefined) {
        return '<div class="yaml-content"><span class="yaml-empty">Empty YAML</span></div>'
    }
    if (typeof data !== 'object') {
        return `<div class="yaml-content">${renderValue(data, 0, escape)}</div>`
    }
    if (Array.isArray(data)) {
        return `<div class="yaml-content">${renderValue(data, 0, escape)}</div>`
    }
    return `<div class="yaml-content">${renderObject(data as Record<string, unknown>, 0, escape)}</div>`
}

export function renderAsCodeBlock(
    source: string,
    errorMessage: string,
    escape: EscapeHtmlFn
): string {
    return `<div class="yaml-error">
    <span class="yaml-error-message">YAML Error: ${escape(errorMessage)}</span>
  </div>
  <pre class="yaml-fallback-code"><code>${escape(source)}</code></pre>`
}
