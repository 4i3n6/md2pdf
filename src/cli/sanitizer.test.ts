// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { sanitizeFragment } from './sanitizer'

describe('sanitizeFragment', () => {
    it('allows standard markdown HTML tags', () => {
        const html = '<h1>Title</h1><p>Text</p><strong>Bold</strong>'
        expect(sanitizeFragment(html)).toContain('<h1>')
        expect(sanitizeFragment(html)).toContain('<p>')
        expect(sanitizeFragment(html)).toContain('<strong>')
    })

    it('strips script tags', () => {
        const html = '<p>Safe</p><script>alert("xss")</script>'
        const result = sanitizeFragment(html)
        expect(result).toContain('<p>Safe</p>')
        expect(result).not.toContain('<script>')
        expect(result).not.toContain('alert')
    })

    it('strips event handler attributes', () => {
        const html = '<img src="x" onerror="alert(1)">'
        const result = sanitizeFragment(html)
        expect(result).not.toContain('onerror')
    })

    it('strips iframe tags', () => {
        const html = '<iframe src="https://evil.com"></iframe><p>Safe</p>'
        const result = sanitizeFragment(html)
        expect(result).not.toContain('iframe')
        expect(result).toContain('<p>Safe</p>')
    })

    it('allows data attributes used by the app', () => {
        const html = '<div class="mermaid" data-mermaid-source="abc123">content</div>'
        const result = sanitizeFragment(html)
        expect(result).toContain('data-mermaid-source')
    })

    it('allows yaml block attributes', () => {
        const html = '<div class="yaml-block" data-yaml-source="abc" data-yaml-type="codeblock">content</div>'
        const result = sanitizeFragment(html)
        expect(result).toContain('data-yaml-source')
        expect(result).toContain('data-yaml-type')
    })

    it('allows table alignment attributes', () => {
        const html = '<td align="center">value</td>'
        const result = sanitizeFragment(html)
        expect(result).toContain('align')
    })

    it('allows code highlighting spans', () => {
        const html = '<pre><code><span class="hljs-keyword">const</span></code></pre>'
        const result = sanitizeFragment(html)
        expect(result).toContain('hljs-keyword')
    })
})
