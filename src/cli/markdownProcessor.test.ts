// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { processMarkdown } from './markdownProcessor'

const defaultOptions = { highlight: true, mermaid: true, yaml: true }

describe('processMarkdown', () => {
    it('returns empty string for empty input', () => {
        expect(processMarkdown('', defaultOptions)).toBe('')
    })

    it('renders headings with id and class', () => {
        const result = processMarkdown('# Hello World', defaultOptions)
        expect(result).toContain('<h1 id="hello-world"')
        expect(result).toContain('class="markdown-heading markdown-h1"')
        expect(result).toContain('Hello World</h1>')
    })

    it('renders h2 headings', () => {
        const result = processMarkdown('## Sub Title', defaultOptions)
        expect(result).toContain('<h2 id="sub-title"')
        expect(result).toContain('markdown-h2')
    })

    it('renders paragraphs', () => {
        const result = processMarkdown('Hello world', defaultOptions)
        expect(result).toContain('<p class="markdown-paragraph">Hello world</p>')
    })

    it('renders code blocks with syntax highlighting', () => {
        const md = '```javascript\nconst x = 1;\n```'
        const result = processMarkdown(md, defaultOptions)
        expect(result).toContain('class="markdown-code-block hljs"')
        expect(result).toContain('data-lang="javascript"')
        expect(result).toContain('language-javascript')
    })

    it('renders inline code', () => {
        const result = processMarkdown('Use `npm install`', defaultOptions)
        expect(result).toContain('<code class="markdown-code-inline">')
        expect(result).toContain('npm install')
    })

    it('renders tables', () => {
        const md = '| A | B |\n|---|---|\n| 1 | 2 |'
        const result = processMarkdown(md, defaultOptions)
        expect(result).toContain('<table class="markdown-table-content">')
        expect(result).toContain('<th>')
        expect(result).toContain('<td>')
    })

    it('renders mermaid blocks as placeholders', () => {
        const md = '```mermaid\ngraph TD\n  A-->B\n```'
        const result = processMarkdown(md, defaultOptions)
        expect(result).toContain('class="mermaid"')
        expect(result).toContain('data-mermaid-source=')
        expect(result).toContain('aria-label="Mermaid Diagram"')
    })

    it('renders yaml blocks as placeholders', () => {
        const md = '```yaml\nname: test\nvalue: 42\n```'
        const result = processMarkdown(md, defaultOptions)
        expect(result).toContain('class="yaml-block"')
        expect(result).toContain('data-yaml-source=')
    })

    it('converts pagebreak comments', () => {
        const md = 'Before\n\n<!-- pagebreak -->\n\nAfter'
        const result = processMarkdown(md, defaultOptions)
        expect(result).toContain('class="page-break"')
        expect(result).toContain('aria-hidden="true"')
    })

    it('abbreviates long crypto addresses', () => {
        const addr = '0x1234567890abcdef1234567890abcdef12345678'
        const result = processMarkdown(addr, defaultOptions)
        expect(result).toContain('0x12345678...12345678')
        expect(result).not.toContain(addr)
    })

    it('renders blockquotes', () => {
        const result = processMarkdown('> Quote text', defaultOptions)
        expect(result).toContain('class="markdown-blockquote"')
    })

    it('renders ordered lists', () => {
        const md = '1. First\n2. Second'
        const result = processMarkdown(md, defaultOptions)
        expect(result).toContain('class="markdown-list-ordered"')
    })

    it('renders unordered lists', () => {
        const md = '- First\n- Second'
        const result = processMarkdown(md, defaultOptions)
        expect(result).toContain('class="markdown-list-unordered"')
    })

    it('renders links', () => {
        const result = processMarkdown('[click](https://example.com)', defaultOptions)
        expect(result).toContain('href="https://example.com"')
        expect(result).toContain('class="markdown-link"')
    })

    it('renders horizontal rules', () => {
        const result = processMarkdown('---', defaultOptions)
        expect(result).toContain('class="markdown-hr"')
    })
})

describe('--no-* flags', () => {
    it('--no-highlight renders code without syntax classes', () => {
        const md = '```javascript\nconst x = 1;\n```'
        const result = processMarkdown(md, { highlight: false, mermaid: true, yaml: true })
        expect(result).toContain('data-lang="javascript"')
        // Should contain escaped text, not hljs span wrappers
        expect(result).not.toContain('hljs-keyword')
        expect(result).toContain('const x = 1;')
    })

    it('--no-mermaid renders mermaid as a plain code block', () => {
        const md = '```mermaid\ngraph TD\n  A-->B\n```'
        const result = processMarkdown(md, { highlight: true, mermaid: false, yaml: true })
        expect(result).toContain('data-lang="mermaid"')
        expect(result).toContain('language-mermaid')
        expect(result).toContain('graph TD')
        // Should NOT produce the mermaid placeholder div
        expect(result).not.toContain('data-mermaid-source')
        expect(result).not.toContain('class="mermaid"')
    })

    it('--no-yaml renders yaml as a plain code block', () => {
        const md = '```yaml\nname: test\nvalue: 42\n```'
        const result = processMarkdown(md, { highlight: true, mermaid: true, yaml: false })
        expect(result).toContain('data-lang="yaml"')
        expect(result).toContain('language-yaml')
        expect(result).toContain('name: test')
        // Should NOT produce the yaml placeholder div
        expect(result).not.toContain('data-yaml-source')
        expect(result).not.toContain('class="yaml-block"')
    })

    it('all flags disabled together', () => {
        const md = '```javascript\nconst x = 1;\n```\n\n```mermaid\ngraph TD\n```\n\n```yaml\nk: v\n```'
        const result = processMarkdown(md, { highlight: false, mermaid: false, yaml: false })
        expect(result).not.toContain('hljs-keyword')
        expect(result).not.toContain('data-mermaid-source')
        expect(result).not.toContain('data-yaml-source')
    })
})
