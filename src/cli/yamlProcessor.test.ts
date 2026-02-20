// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { processYamlBlocksInHtml } from './yamlProcessor'
import { encodeBase64 } from './utils'

function makeYamlBlock(yamlSource: string): string {
    const b64 = encodeBase64(yamlSource)
    return `<div class="yaml-block" data-yaml-source="${b64}" data-yaml-type="codeblock" aria-label="YAML Code Block">
  <pre class="yaml-loading">Loading YAML...</pre>
</div>`
}

describe('processYamlBlocksInHtml', () => {
    it('renders simple key-value YAML', () => {
        const html = makeYamlBlock('name: test\nvalue: 42')
        const result = processYamlBlocksInHtml(html)
        expect(result).toContain('yaml-rendered')
        expect(result).toContain('yaml-key')
        expect(result).toContain('name:')
        expect(result).toContain('test')
        expect(result).toContain('42')
    })

    it('renders nested objects', () => {
        const yaml = 'server:\n  host: localhost\n  port: 8080'
        const html = makeYamlBlock(yaml)
        const result = processYamlBlocksInHtml(html)
        expect(result).toContain('yaml-rendered')
        expect(result).toContain('server:')
        expect(result).toContain('host:')
        expect(result).toContain('localhost')
    })

    it('renders arrays', () => {
        const yaml = 'items:\n  - apple\n  - banana'
        const html = makeYamlBlock(yaml)
        const result = processYamlBlocksInHtml(html)
        expect(result).toContain('yaml-array-item')
        expect(result).toContain('apple')
        expect(result).toContain('banana')
    })

    it('renders error fallback for invalid YAML', () => {
        const yaml = '{ invalid: yaml: content }'
        const html = makeYamlBlock(yaml)
        const result = processYamlBlocksInHtml(html)
        expect(result).toContain('yaml-error-container')
        expect(result).toContain('yaml-fallback-code')
        expect(result).toContain('YAML Error:')
    })

    it('passes through HTML without yaml blocks unchanged', () => {
        const html = '<p>Hello world</p>'
        const result = processYamlBlocksInHtml(html)
        expect(result).toBe('<p>Hello world</p>')
    })

    it('handles multiple yaml blocks', () => {
        const block1 = makeYamlBlock('a: 1')
        const block2 = makeYamlBlock('b: 2')
        const html = `<p>Before</p>${block1}<p>Middle</p>${block2}<p>After</p>`
        const result = processYamlBlocksInHtml(html)
        expect(result).toContain('yaml-rendered')
        expect(result).toContain('a:')
        expect(result).toContain('b:')
    })

    it('escapes HTML in YAML values', () => {
        const yaml = 'name: <script>alert("xss")</script>'
        const html = makeYamlBlock(yaml)
        const result = processYamlBlocksInHtml(html)
        expect(result).toContain('&lt;script&gt;')
        expect(result).not.toContain('<script>')
    })

    it('handles boolean values', () => {
        const yaml = 'enabled: true\ndisabled: false'
        const html = makeYamlBlock(yaml)
        const result = processYamlBlocksInHtml(html)
        expect(result).toContain('yaml-boolean')
        expect(result).toContain('true')
        expect(result).toContain('false')
    })

    it('handles null values', () => {
        const yaml = 'value: null'
        const html = makeYamlBlock(yaml)
        const result = processYamlBlocksInHtml(html)
        expect(result).toContain('yaml-null')
    })
})
