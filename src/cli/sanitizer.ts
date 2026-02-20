import sanitizeHtml from 'sanitize-html'

/**
 * Sanitize HTML fragment before injecting into the Puppeteer page.
 * Mirrors the web app's DOMPurify allowlist to maintain parity.
 */
const ALLOWED_TAGS = [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'br', 'strong', 'em', 'u', 's', 'del',
    'a', 'img', 'code', 'pre',
    'ul', 'ol', 'li',
    'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
    'blockquote', 'figure', 'figcaption', 'hr',
    'div', 'span', 'section', 'article', 'aside', 'nav',
    'input', 'mark', 'svg', 'path', 'g', 'rect', 'circle',
    'line', 'polyline', 'polygon', 'text', 'tspan', 'defs',
    'clipPath', 'marker', 'foreignObject', 'use'
]

const ALLOWED_ATTRS: Record<string, string[]> = {
    '*': [
        'class', 'id', 'style', 'role',
        'aria-label', 'aria-hidden',
        'data-lang', 'data-mermaid-source',
        'data-yaml-source', 'data-yaml-type',
        'data-print-image', 'data-diagram-type'
    ],
    'a': ['href', 'title'],
    'img': ['src', 'alt', 'title', 'loading'],
    'th': ['align'],
    'td': ['align'],
    'input': ['type', 'checked', 'disabled'],
    'svg': ['viewBox', 'xmlns', 'width', 'height', 'fill', 'stroke'],
    'path': ['d', 'fill', 'stroke', 'stroke-width', 'transform'],
    'g': ['transform', 'fill', 'stroke'],
    'rect': ['x', 'y', 'width', 'height', 'rx', 'ry', 'fill', 'stroke'],
    'circle': ['cx', 'cy', 'r', 'fill', 'stroke'],
    'line': ['x1', 'y1', 'x2', 'y2', 'stroke'],
    'text': ['x', 'y', 'dx', 'dy', 'text-anchor', 'fill', 'font-size'],
    'tspan': ['x', 'y', 'dx', 'dy'],
    'use': ['href'],
    'marker': ['id', 'viewBox', 'refX', 'refY', 'markerWidth', 'markerHeight', 'orient'],
    'clipPath': ['id'],
    'foreignObject': ['x', 'y', 'width', 'height']
}

export function sanitizeFragment(html: string): string {
    return sanitizeHtml(html, {
        allowedTags: ALLOWED_TAGS,
        allowedAttributes: ALLOWED_ATTRS,
        allowedSchemes: ['http', 'https', 'mailto', 'data'],
        allowVulnerableTags: false
    })
}
