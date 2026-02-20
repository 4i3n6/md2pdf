// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { escapeHtml, encodeBase64, decodeBase64, parseMargins, normalizeCodeLanguage } from './utils'

describe('escapeHtml', () => {
    it('escapes all HTML entities', () => {
        expect(escapeHtml('<div class="a">b & c</div>'))
            .toBe('&lt;div class=&quot;a&quot;&gt;b &amp; c&lt;/div&gt;')
    })

    it('escapes single quotes', () => {
        expect(escapeHtml("it's")).toBe('it&#39;s')
    })

    it('returns empty string for empty input', () => {
        expect(escapeHtml('')).toBe('')
    })

    it('leaves safe text unchanged', () => {
        expect(escapeHtml('hello world')).toBe('hello world')
    })
})

describe('encodeBase64 / decodeBase64', () => {
    it('round-trips ASCII text', () => {
        const text = 'Hello, World!'
        expect(decodeBase64(encodeBase64(text))).toBe(text)
    })

    it('round-trips UTF-8 text', () => {
        const text = 'Olá, mundo! 🌍'
        expect(decodeBase64(encodeBase64(text))).toBe(text)
    })

    it('encodes to valid base64', () => {
        expect(encodeBase64('abc')).toBe('YWJj')
    })
})

describe('parseMargins', () => {
    it('parses single value to all sides', () => {
        expect(parseMargins('10')).toEqual({
            top: '10mm', right: '10mm', bottom: '10mm', left: '10mm'
        })
    })

    it('parses four values to individual sides', () => {
        expect(parseMargins('10,15,10,15')).toEqual({
            top: '10mm', right: '15mm', bottom: '10mm', left: '15mm'
        })
    })

    it('handles spaces in values', () => {
        expect(parseMargins('10, 15, 10, 15')).toEqual({
            top: '10mm', right: '15mm', bottom: '10mm', left: '15mm'
        })
    })

    it('falls back to 10mm for invalid input', () => {
        expect(parseMargins('10,15')).toEqual({
            top: '10mm', right: '10mm', bottom: '10mm', left: '10mm'
        })
    })
})

describe('normalizeCodeLanguage', () => {
    it('resolves js to javascript', () => {
        expect(normalizeCodeLanguage('js')).toBe('javascript')
    })

    it('resolves ts to typescript', () => {
        expect(normalizeCodeLanguage('ts')).toBe('typescript')
    })

    it('resolves sh to bash', () => {
        expect(normalizeCodeLanguage('sh')).toBe('bash')
    })

    it('resolves yml to yaml', () => {
        expect(normalizeCodeLanguage('yml')).toBe('yaml')
    })

    it('resolves c++ to cpp', () => {
        expect(normalizeCodeLanguage('c++')).toBe('cpp')
    })

    it('returns plaintext for empty input', () => {
        expect(normalizeCodeLanguage('')).toBe('plaintext')
    })

    it('returns plaintext for undefined', () => {
        expect(normalizeCodeLanguage(undefined)).toBe('plaintext')
    })

    it('passes through unknown languages', () => {
        expect(normalizeCodeLanguage('kotlin')).toBe('kotlin')
    })

    it('handles uppercase input', () => {
        expect(normalizeCodeLanguage('JavaScript')).toBe('javascript')
    })

    it('takes first word only', () => {
        expect(normalizeCodeLanguage('python 3.12')).toBe('python')
    })
})
