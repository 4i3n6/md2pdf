import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function loadPrivateUrlHelpers() {
    const filePath = resolve(process.cwd(), 'src', 'processors', 'markdownProcessor.ts')
    const source = readFileSync(filePath, 'utf8')

    const truncateStart = source.indexOf('function truncateUrlForDisplay')
    if (truncateStart < 0) {
        throw new Error('truncateUrlForDisplay function not found')
    }

    const fencedStart = source.indexOf('function findFencedCodeBlock')
    if (fencedStart < 0) {
        throw new Error('findFencedCodeBlock function not found')
    }
    const helpersSection = source.slice(truncateStart, fencedStart)
    const autoLinkStart = helpersSection.indexOf('function isAutolinkedUrl')
    if (autoLinkStart < 0) {
        throw new Error('isAutolinkedUrl function not found')
    }

    const truncateSource = helpersSection.slice(0, autoLinkStart).trim()
    const autolinkSource = helpersSection.slice(autoLinkStart).trim()

    const transpileSource = (value: string): string =>
        value
            .replace(/:\s*string/g, '')
            .replace(/:\s*number/g, '')
            .replace(/:\s*boolean/g, '')

    const moduleExports: {
        truncateUrlForDisplay?: (url: string, maxLength?: number) => string
        isAutolinkedUrl?: (tokenText: string, tokenHref: string) => boolean
    } = {}

    const mountHelpers = new Function(
        'moduleExports',
        `${transpileSource(truncateSource)}\n${transpileSource(autolinkSource)}\nmoduleExports.truncateUrlForDisplay = truncateUrlForDisplay\nmoduleExports.isAutolinkedUrl = isAutolinkedUrl`
    )

    mountHelpers(moduleExports)

    if (!moduleExports.truncateUrlForDisplay || !moduleExports.isAutolinkedUrl) {
        throw new Error('Unable to load markdown processor helper functions')
    }

    return {
        truncateUrlForDisplay: moduleExports.truncateUrlForDisplay,
        isAutolinkedUrl: moduleExports.isAutolinkedUrl
    }
}

const { truncateUrlForDisplay, isAutolinkedUrl } = loadPrivateUrlHelpers()

describe('URL display helpers', () => {
    it('does not change urls shorter than default max length', () => {
        const shortUrl = 'https://short.url/test'

        expect(truncateUrlForDisplay(shortUrl)).toBe(shortUrl)
    })

    it('keeps empty strings unchanged', () => {
        expect(truncateUrlForDisplay('')).toBe('')
    })

    it('truncates urls longer than max length using head and tail segments', () => {
        const longUrl = 'https://example.com/really/long/path/to/resource?query=alpha&value=beta&name=delta%20value'
        const expected = `${longUrl.substring(0, 40)}...${longUrl.substring(longUrl.length - 15)}`

        expect(truncateUrlForDisplay(longUrl)).toBe(expected)
    })

    it('uses custom maxLength threshold before truncation', () => {
        const url = 'https://example.com/custom?alpha=beta&value=123'
        const maxLength = 20

        expect(truncateUrlForDisplay(url, maxLength)).toBe(`${url.substring(0, 40)}...${url.substring(url.length - 15)}`)
    })

    it('truncates urls with encoded characters such as %20', () => {
        const encodedUrl = 'https://example.com/file%20name%20with%20spaces?query=some%20value&foo=bar'
        const expected = `${encodedUrl.substring(0, 40)}...${encodedUrl.substring(encodedUrl.length - 15)}`

        expect(truncateUrlForDisplay(encodedUrl)).toBe(expected)
    })

    it('detects exact token and href match as autolink', () => {
        expect(isAutolinkedUrl('https://example.com', 'https://example.com')).toBe(true)
    })

    it('detects protocol-added autolinks', () => {
        expect(isAutolinkedUrl('example.com', 'https://example.com')).toBe(true)
        expect(isAutolinkedUrl('example.com', 'http://example.com')).toBe(true)
    })

    it('returns false for descriptive text link labels', () => {
        expect(isAutolinkedUrl('click here', 'https://example.com')).toBe(false)
    })
})
