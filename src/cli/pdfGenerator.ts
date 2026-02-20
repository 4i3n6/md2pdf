import * as fs from 'fs'
import * as path from 'path'
import puppeteer from 'puppeteer-core'
import type { Browser, Page } from 'puppeteer-core'
import type { PageMargins } from './utils'

export interface PdfOptions {
    pageSize: string
    landscape: boolean
    margin: PageMargins
    mermaid: boolean
    timeout: number
    debug: boolean
}

const CHROME_PATHS: Record<string, string[]> = {
    darwin: [
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
        '/Applications/Chromium.app/Contents/MacOS/Chromium',
        '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
        '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    ],
    linux: [
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable',
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
        '/snap/bin/chromium',
        '/usr/bin/brave-browser',
        '/usr/bin/microsoft-edge',
    ],
    win32: [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        `${process.env['LOCALAPPDATA'] ?? ''}\\Google\\Chrome\\Application\\chrome.exe`,
        'C:\\Program Files\\Chromium\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    ],
}

export function findChrome(): string {
    // Explicit user override takes priority
    const envPath = process.env['CHROME_PATH']
    if (envPath && fs.existsSync(envPath)) {
        return envPath
    }

    const candidates = CHROME_PATHS[process.platform] ?? []
    for (const candidate of candidates) {
        if (candidate && fs.existsSync(candidate)) {
            return candidate
        }
    }

    const lines = [
        'Error: Chrome/Chromium not found.',
        '',
        'md2pdf needs a Chromium-based browser to generate PDFs.',
        'Options:',
        '  1. Install Google Chrome: https://google.com/chrome',
        '  2. Set CHROME_PATH environment variable to your browser executable',
        `     Example: CHROME_PATH=/path/to/chrome md2pdf input.md`,
    ]
    throw new Error(lines.join('\n'))
}

export async function generatePdf(
    htmlContent: string,
    outputPath: string,
    inputDir: string,
    options: PdfOptions
): Promise<void> {
    const tempFileName = `.md2pdf-temp-${Date.now()}.html`
    const tempHtmlPath = path.join(inputDir, tempFileName)

    let browser: Browser | null = null

    try {
        fs.writeFileSync(tempHtmlPath, htmlContent, 'utf-8')

        browser = await launchBrowser()
        const page = await browser.newPage()

        await navigateToFile(page, tempHtmlPath, options.timeout)
        await page.emulateMediaType('print')

        if (options.mermaid) {
            await renderMermaidDiagrams(page, options.timeout)
        }

        await waitForImages(page, options.timeout)
        await writePdf(page, outputPath, options)
    } finally {
        if (browser) await browser.close()
        handleTempFile(tempHtmlPath, options.debug)
    }
}

async function launchBrowser(): Promise<Browser> {
    const executablePath = findChrome()
    return puppeteer.launch({
        headless: true,
        executablePath,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    })
}

async function navigateToFile(
    page: Page,
    htmlPath: string,
    timeout: number
): Promise<void> {
    await page.goto(`file://${htmlPath}`, {
        waitUntil: 'networkidle0',
        timeout
    })
}

async function writePdf(
    page: Page,
    outputPath: string,
    options: PdfOptions
): Promise<void> {
    await page.pdf({
        path: outputPath,
        format: options.pageSize as 'A4' | 'Letter' | 'Legal',
        landscape: options.landscape,
        margin: options.margin,
        printBackground: true,
        preferCSSPageSize: true
    })
}

function handleTempFile(tempHtmlPath: string, debug: boolean): void {
    if (!debug && fs.existsSync(tempHtmlPath)) {
        fs.unlinkSync(tempHtmlPath)
        return
    }

    if (debug) {
        const debugPath = tempHtmlPath.replace('.html', '.debug.html')
        if (tempHtmlPath !== debugPath && fs.existsSync(tempHtmlPath)) {
            fs.renameSync(tempHtmlPath, debugPath)
        }
        process.stderr.write(`Debug HTML saved: ${debugPath}\n`)
    }
}

async function loadMermaidScript(page: Page): Promise<boolean> {
    // Try local mermaid package first (available in dev / npm install)
    for (const entry of ['mermaid/dist/mermaid.min.js', 'mermaid/dist/mermaid.js']) {
        try {
            const resolved = require.resolve(entry)
            await page.addScriptTag({ path: resolved })
            return true
        } catch {
            // not found, try next
        }
    }

    // Fallback: load from CDN (standalone binary / SEA)
    try {
        await page.addScriptTag({
            url: 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js'
        })
        return true
    } catch {
        process.stderr.write(
            'Warning: mermaid not available (install locally or check internet), skipping diagrams\n'
        )
        return false
    }
}

async function initAndRunMermaid(page: Page): Promise<void> {
    await page.evaluate(async () => {
        const mermaidGlobal = (window as unknown as { mermaid: {
            initialize: (config: Record<string, unknown>) => void
            run: (config: { nodes: NodeListOf<Element> }) => Promise<void>
        } }).mermaid

        mermaidGlobal.initialize({
            startOnLoad: false,
            theme: 'default',
            securityLevel: 'strict'
        })

        const blocks = document.querySelectorAll('[data-mermaid-source]')
        for (const block of blocks) {
            const b64 = block.getAttribute('data-mermaid-source')
            if (!b64) continue
            try {
                block.removeAttribute('data-mermaid-source')
                block.textContent = atob(b64)
            } catch {
                // Skip blocks with invalid base64
            }
        }

        const mermaidBlocks = document.querySelectorAll('.mermaid')
        if (mermaidBlocks.length > 0) {
            await mermaidGlobal.run({ nodes: mermaidBlocks })
        }
    })
}

async function renderMermaidDiagrams(
    page: Page,
    timeout: number
): Promise<void> {
    const hasMermaid = await page.evaluate(() => {
        return document.querySelectorAll('[data-mermaid-source]').length > 0
    })
    if (!hasMermaid) return

    const loaded = await loadMermaidScript(page)
    if (!loaded) return

    await initAndRunMermaid(page)

    await page.waitForFunction(
        () => {
            const blocks = document.querySelectorAll('.mermaid')
            return Array.from(blocks).every(
                (b) => b.querySelector('svg') !== null || b.classList.contains('mermaid-error')
            )
        },
        { timeout }
    )
}

async function waitForImages(
    page: Page,
    timeout: number
): Promise<void> {
    await page.evaluate((imgTimeout: number) => {
        const images = document.querySelectorAll('img')
        const promises = Array.from(images).map(
            (img) =>
                new Promise<void>((resolve) => {
                    if (img.complete) {
                        resolve()
                        return
                    }
                    const timer = setTimeout(resolve, imgTimeout)
                    img.addEventListener('load', () => {
                        clearTimeout(timer)
                        resolve()
                    })
                    img.addEventListener('error', () => {
                        clearTimeout(timer)
                        resolve()
                    })
                })
        )
        return Promise.all(promises)
    }, Math.min(timeout, 10000))
}
