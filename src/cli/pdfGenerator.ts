import * as fs from 'fs'
import * as path from 'path'
import type { PageMargins } from './utils'

export interface PdfOptions {
    pageSize: string
    landscape: boolean
    margin: PageMargins
    mermaid: boolean
    timeout: number
    debug: boolean
}

export async function generatePdf(
    htmlContent: string,
    outputPath: string,
    inputDir: string,
    options: PdfOptions
): Promise<void> {
    const tempFileName = `.md2pdf-temp-${Date.now()}.html`
    const tempHtmlPath = path.join(inputDir, tempFileName)

    let browser: import('puppeteer').Browser | null = null

    try {
        fs.writeFileSync(tempHtmlPath, htmlContent, 'utf-8')

        const puppeteer = await import('puppeteer')
        browser = await puppeteer.default.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        })

        const page = await browser.newPage()

        const fileUrl = `file://${tempHtmlPath}`
        await page.goto(fileUrl, {
            waitUntil: 'networkidle0',
            timeout: options.timeout
        })

        await page.emulateMediaType('print')

        if (options.mermaid) {
            await renderMermaidDiagrams(page, options.timeout)
        }

        await waitForImages(page, options.timeout)

        await page.pdf({
            path: outputPath,
            format: options.pageSize as 'A4' | 'Letter' | 'Legal',
            landscape: options.landscape,
            margin: options.margin,
            printBackground: true,
            preferCSSPageSize: true
        })
    } finally {
        if (browser) {
            await browser.close()
        }

        if (!options.debug && fs.existsSync(tempHtmlPath)) {
            fs.unlinkSync(tempHtmlPath)
        }

        if (options.debug) {
            const debugPath = tempHtmlPath.replace(
                '.html',
                '.debug.html'
            )
            if (tempHtmlPath !== debugPath && fs.existsSync(tempHtmlPath)) {
                fs.renameSync(tempHtmlPath, debugPath)
            }
            process.stderr.write(`Debug HTML saved: ${debugPath}\n`)
        }
    }
}

async function renderMermaidDiagrams(
    page: import('puppeteer').Page,
    timeout: number
): Promise<void> {
    const hasMermaid = await page.evaluate(() => {
        return document.querySelectorAll('[data-mermaid-source]').length > 0
    })

    if (!hasMermaid) return

    let mermaidPath: string
    try {
        mermaidPath = require.resolve('mermaid/dist/mermaid.min.js')
    } catch {
        try {
            mermaidPath = require.resolve('mermaid/dist/mermaid.js')
        } catch {
            process.stderr.write(
                'Warning: mermaid package not found, skipping diagram rendering\n'
            )
            return
        }
    }

    await page.addScriptTag({ path: mermaidPath })

    await page.evaluate(async () => {
        const mermaidGlobal = (window as unknown as { mermaid: {
            initialize: (config: Record<string, unknown>) => void
            run: (config: { nodes: NodeListOf<Element> }) => Promise<void>
        } }).mermaid

        mermaidGlobal.initialize({
            startOnLoad: false,
            theme: 'default',
            securityLevel: 'loose'
        })

        const blocks = document.querySelectorAll('[data-mermaid-source]')
        for (const block of blocks) {
            const b64 = block.getAttribute('data-mermaid-source')
            if (!b64) continue

            try {
                const source = atob(b64)
                block.removeAttribute('data-mermaid-source')
                block.textContent = source
            } catch {
                // Skip blocks with invalid base64
            }
        }

        const mermaidBlocks = document.querySelectorAll('.mermaid')
        if (mermaidBlocks.length > 0) {
            await mermaidGlobal.run({ nodes: mermaidBlocks })
        }
    })

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
    page: import('puppeteer').Page,
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
