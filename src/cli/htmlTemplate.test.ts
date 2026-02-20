// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { buildHtmlDocument } from './htmlTemplate'

describe('buildHtmlDocument', () => {
    it('produces valid HTML5 document', () => {
        const result = buildHtmlDocument('<p>Hello</p>')
        expect(result).toContain('<!DOCTYPE html>')
        expect(result).toContain('<html lang="en">')
        expect(result).toContain('<head>')
        expect(result).toContain('</head>')
        expect(result).toContain('<body>')
        expect(result).toContain('</body>')
        expect(result).toContain('</html>')
    })

    it('contains style tags for CSS embedding', () => {
        const result = buildHtmlDocument('<p>Test</p>')
        // CSS files are imported as text by tsup at build time.
        // In vitest they may be empty strings, but the style tags must be present.
        const styleCount = (result.match(/<style>/g) || []).length
        expect(styleCount).toBeGreaterThanOrEqual(3)
    })

    it('wraps content in markdown-body div', () => {
        const result = buildHtmlDocument('<p>Content</p>')
        expect(result).toContain('<div class="markdown-body">')
        expect(result).toContain('<p>Content</p>')
        expect(result).toContain('</div>')
    })

    it('includes CLI-specific overrides', () => {
        const result = buildHtmlDocument('')
        expect(result).toContain('max-width: none')
    })

    it('includes meta charset', () => {
        const result = buildHtmlDocument('')
        expect(result).toContain('charset="UTF-8"')
    })

    describe('with theme', () => {
        const theme = { themeCss: '/* test-theme */ body { color: red; }' }

        it('produces valid HTML5 document', () => {
            const result = buildHtmlDocument('<p>Hello</p>', theme)
            expect(result).toContain('<!DOCTYPE html>')
            expect(result).toContain('<html lang="en">')
            expect(result).toContain('</html>')
        })

        it('includes theme CSS', () => {
            const result = buildHtmlDocument('<p>Test</p>', theme)
            expect(result).toContain('/* test-theme */')
        })

        it('has 5 style tags (hljs + theme + essentials + components + overrides)', () => {
            const result = buildHtmlDocument('<p>Test</p>', theme)
            const styleCount = (result.match(/<style>/g) || []).length
            expect(styleCount).toBe(5)
        })

        it('does not include full print CSS', () => {
            const result = buildHtmlDocument('<p>Test</p>', theme)
            // The default path includes the monospace font-family override
            expect(result).not.toContain("font-family: 'Liberation Mono'")
        })

        it('includes themed overrides without visual styling', () => {
            const result = buildHtmlDocument('<p>Test</p>', theme)
            expect(result).toContain('max-width: none')
            // Should not force background/color in themed mode
            expect(result).not.toContain('background: white')
        })

        it('wraps content in markdown-body div', () => {
            const result = buildHtmlDocument('<p>Content</p>', theme)
            expect(result).toContain('<div class="markdown-body">')
            expect(result).toContain('<p>Content</p>')
        })
    })
})
