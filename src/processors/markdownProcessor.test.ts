import { describe, expect, it } from 'vitest'
import { processMarkdown } from './markdownProcessor'

describe('processMarkdown', () => {
    it('renders standalone images as print-ready figure blocks', () => {
        const html = processMarkdown('![Tall print image](https://example.com/image.png)')

        expect(html).toContain('<figure class="markdown-image"')
        expect(html).toContain('class="markdown-img"')
        expect(html).toContain('data-print-image="true"')
        expect(html).toContain('loading="eager"')
        expect(html).toContain('<figcaption class="markdown-figcaption">Tall print image</figcaption>')
        expect(html).not.toContain('<p class="markdown-paragraph"><figure')
    })

    it('renders headings and tables with print classes', () => {
        const html = processMarkdown('# Title\n\n| Name | Value |\n| --- | --- |\n| alpha | 42 |')

        expect(html).toContain('<h1 class="markdown-heading markdown-h1">Title</h1>')
        expect(html).toContain('<figure class="markdown-table">')
        expect(html).toContain('<table class="markdown-table-content">')
    })
})
