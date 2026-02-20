import DOMPurify from 'dompurify'

const tagsAllowingStyle = new Set(['span', 'div', 'mark', 'figure', 'blockquote', 'th', 'td'])
const allowedStylePropertiesByTag: Record<string, Set<string>> = {
    span: new Set(['font-family', 'color']),
    div: new Set(['text-align', 'page-break-inside', 'break-inside']),
    mark: new Set(['background', 'background-color', 'color']),
    figure: new Set(['page-break-inside', 'break-inside']),
    blockquote: new Set(['page-break-inside', 'break-inside']),
    th: new Set(['text-align']),
    td: new Set(['text-align'])
}

const cssColorRegex = /^(#[0-9a-f]{3,8}|rgb(a)?\([^)]{1,40}\)|hsl(a)?\([^)]{1,40}\)|transparent|black|white)$/i
const cssFontRegex = /^[a-z0-9\s,'"-]+$/i

function sanitizeCssValue(property: string, rawValue: string): string | null {
    const value = rawValue.trim()
    if (!value) return null

    if (/url\s*\(|expression\s*\(|@import|javascript:/i.test(value)) {
        return null
    }

    if (property === 'text-align') {
        if (/^(left|right|center|justify)$/i.test(value)) {
            return value.toLowerCase()
        }
        return null
    }

    if (property === 'font-family') {
        if (value.length <= 120 && cssFontRegex.test(value)) {
            return value
        }
        return null
    }

    if (property === 'background' || property === 'background-color' || property === 'color') {
        if (cssColorRegex.test(value)) {
            return value.toLowerCase()
        }
        return null
    }

    if (property === 'page-break-inside' || property === 'break-inside') {
        if (/^(auto|avoid|avoid-page)$/i.test(value)) {
            return value.toLowerCase()
        }
        return null
    }

    return null
}

function sanitizeInlineStyle(tagName: string, rawStyle: string): string {
    if (!rawStyle || !tagName) return ''
    if (!tagsAllowingStyle.has(tagName)) return ''

    const allowedProperties = allowedStylePropertiesByTag[tagName]
    if (!allowedProperties) return ''

    const sanitizedRules: string[] = []
    const declarations = rawStyle.split(';')

    declarations.forEach((declaration) => {
        const separatorIdx = declaration.indexOf(':')
        if (separatorIdx <= 0) return

        const property = declaration.slice(0, separatorIdx).trim().toLowerCase()
        const value = declaration.slice(separatorIdx + 1)

        if (!allowedProperties.has(property)) {
            return
        }

        const sanitizedValue = sanitizeCssValue(property, value)
        if (!sanitizedValue) return

        sanitizedRules.push(`${property}: ${sanitizedValue}`)
    })

    return sanitizedRules.join('; ')
}

type HookData = {
    attrName?: string
    attrValue?: string
    keepAttr?: boolean
}

let domPurifyHooksRegistered = false

export function registerStyleSanitizationHooks(): void {
    if (domPurifyHooksRegistered) return

    DOMPurify.addHook('uponSanitizeAttribute', (node: Element, data: HookData) => {
        if (!data || data.attrName !== 'style') return

        const tagName = node?.tagName?.toLowerCase() || ''
        const sanitizedValue = sanitizeInlineStyle(tagName, String(data.attrValue || ''))
        if (!sanitizedValue) {
            data.keepAttr = false
            return
        }

        data.attrValue = sanitizedValue
        data.keepAttr = true
    })

    domPurifyHooksRegistered = true
}
