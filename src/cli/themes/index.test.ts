// @vitest-environment node
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { describe, it, expect } from 'vitest'
import { getThemeCss, THEME_NAMES, PRINT_ESSENTIALS, COMPONENT_STYLES } from './index'

describe('themes', () => {
    it('exports 10 built-in theme names', () => {
        expect(THEME_NAMES).toHaveLength(10)
        expect(THEME_NAMES).toContain('github')
        expect(THEME_NAMES).toContain('github-dark')
        expect(THEME_NAMES).toContain('almond')
        expect(THEME_NAMES).toContain('latex')
        expect(THEME_NAMES).toContain('water')
        expect(THEME_NAMES).toContain('water-dark')
    })

    it('exports PRINT_ESSENTIALS as string', () => {
        expect(typeof PRINT_ESSENTIALS).toBe('string')
    })

    it('exports COMPONENT_STYLES as string', () => {
        expect(typeof COMPONENT_STYLES).toBe('string')
    })

    describe('getThemeCss', () => {
        it('returns CSS string for built-in theme', () => {
            const css = getThemeCss('github')
            expect(typeof css).toBe('string')
        })

        it('reads custom CSS file from path', () => {
            const tmpFile = path.join(os.tmpdir(), 'md2pdf-test-theme.css')
            fs.writeFileSync(tmpFile, 'body { color: green; }')
            try {
                const css = getThemeCss(tmpFile)
                expect(css).toBe('body { color: green; }')
            } finally {
                fs.unlinkSync(tmpFile)
            }
        })

        it('throws for unknown theme name', () => {
            expect(() => getThemeCss('nonexistent-theme')).toThrow(
                /Unknown theme "nonexistent-theme"/
            )
        })

        it('includes list of built-in themes in error message', () => {
            expect(() => getThemeCss('bad')).toThrow(/github/)
        })
    })
})
