// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { findChrome } from './pdfGenerator'

vi.mock('fs', async (importOriginal) => {
    const actual = await importOriginal<typeof import('fs')>()
    return {
        ...actual,
        existsSync: vi.fn(() => false)
    }
})

import { existsSync } from 'fs'
const mockExistsSync = vi.mocked(existsSync)

describe('findChrome', () => {
    const originalPlatform = process.platform
    const originalEnv = { ...process.env }

    beforeEach(() => {
        mockExistsSync.mockReset()
        mockExistsSync.mockReturnValue(false)
        process.env = { ...originalEnv }
    })

    afterEach(() => {
        Object.defineProperty(process, 'platform', { value: originalPlatform })
        process.env = originalEnv
    })

    it('returns CHROME_PATH env var when set and file exists', () => {
        process.env['CHROME_PATH'] = '/custom/chrome'
        mockExistsSync.mockImplementation(
            (p) => p === '/custom/chrome'
        )

        expect(findChrome()).toBe('/custom/chrome')
    })

    it('prefers CHROME_PATH over platform paths', () => {
        Object.defineProperty(process, 'platform', { value: 'darwin' })
        process.env['CHROME_PATH'] = '/custom/chrome'
        mockExistsSync.mockReturnValue(true)

        expect(findChrome()).toBe('/custom/chrome')
    })

    it('falls back to platform paths when CHROME_PATH not set', () => {
        Object.defineProperty(process, 'platform', { value: 'darwin' })
        delete process.env['CHROME_PATH']

        const macChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
        mockExistsSync.mockImplementation(
            (p) => p === macChrome
        )

        expect(findChrome()).toBe(macChrome)
    })

    it('returns second candidate when first does not exist', () => {
        Object.defineProperty(process, 'platform', { value: 'linux' })
        delete process.env['CHROME_PATH']

        mockExistsSync.mockImplementation(
            (p) => p === '/usr/bin/google-chrome-stable'
        )

        expect(findChrome()).toBe('/usr/bin/google-chrome-stable')
    })

    it('throws when no Chrome found', () => {
        Object.defineProperty(process, 'platform', { value: 'darwin' })
        delete process.env['CHROME_PATH']
        mockExistsSync.mockReturnValue(false)

        expect(() => findChrome()).toThrow('Chrome/Chromium not found')
    })

    it('ignores CHROME_PATH when file does not exist', () => {
        Object.defineProperty(process, 'platform', { value: 'darwin' })
        process.env['CHROME_PATH'] = '/nonexistent/chrome'

        const macChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
        mockExistsSync.mockImplementation(
            (p) => p === macChrome
        )

        expect(findChrome()).toBe(macChrome)
    })
})
