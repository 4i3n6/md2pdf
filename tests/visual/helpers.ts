import { expect, type Page } from '@playwright/test'

const debounceRenderMs = 500
const seletorEditorConteudo = '#editor .cm-content'
const seletorPreview = '#preview'

export async function abrirAplicacao(page: Page): Promise<void> {
    await page.addInitScript(() => {
        localStorage.removeItem('md2pdf-docs-v3')
        localStorage.removeItem('md2pdf-docs-v2')
    })

    await page.goto('/app.html', { waitUntil: 'networkidle' })
    await expect(page.locator(seletorEditorConteudo)).toBeVisible()
    await expect(page.locator(seletorPreview)).toBeVisible()

    await page.addStyleTag({
        content: `
*,
*::before,
*::after {
  transition: none !important;
  animation: none !important;
}
        `
    })
}

export async function definirMarkdownNoEditor(page: Page, markdown: string): Promise<void> {
    const editor = page.locator(seletorEditorConteudo)
    await editor.click()
    await page.keyboard.press('ControlOrMeta+A')
    await page.keyboard.press('Backspace')
    await page.keyboard.insertText(markdown)
    await page.waitForTimeout(debounceRenderMs)
}

type ResultadoOverflowTabela = {
    quantidadeTabelas: number
    larguraUtilPx: number
    maxOverflowPx: number
    overflowsPx: number[]
    whiteSpaceCabecalho: string[]
    whiteSpaceCelula: string[]
}

type PrintImageMetrics = {
    imageCount: number
    figureCount: number
    wrappedFigureCount: number
    dataPrintImageCount: number
    imageWidthsPx: number[]
    imageHeightsPx: number[]
    imageMaxHeightsPx: number[]
    naturalAspectRatios: number[]
    renderedAspectRatios: number[]
    centerOffsetsPx: number[]
    captions: string[]
}

export async function medirOverflowDeTabelas(page: Page): Promise<ResultadoOverflowTabela> {
    return await page.locator(seletorPreview).evaluate((preview): ResultadoOverflowTabela => {
        const root = preview as HTMLElement
        const larguraUtilPx =
            root.getBoundingClientRect().width || root.clientWidth || root.scrollWidth || 0
        const tabelas = Array.from(root.querySelectorAll('table'))

        const overflowsPx = tabelas.map((table) => {
            const rect = table.getBoundingClientRect()
            const larguraTabelaPx = rect.width || table.scrollWidth || table.clientWidth || 0
            const overflowNoContainer = Math.max(0, larguraTabelaPx - larguraUtilPx)
            const overflowInterno = Math.max(0, table.scrollWidth - table.clientWidth)
            return Math.max(overflowNoContainer, overflowInterno)
        })

        const maxOverflowPx = overflowsPx.length > 0 ? Math.max(...overflowsPx) : 0
        const primeiroTh = root.querySelector('th')
        const primeiroTd = root.querySelector('td')
        const whiteSpaceCabecalho = primeiroTh
            ? [window.getComputedStyle(primeiroTh).whiteSpace]
            : []
        const whiteSpaceCelula = primeiroTd
            ? [window.getComputedStyle(primeiroTd).whiteSpace]
            : []

        return {
            quantidadeTabelas: tabelas.length,
            larguraUtilPx,
            maxOverflowPx,
            overflowsPx,
            whiteSpaceCabecalho,
            whiteSpaceCelula
        }
    })
}

export async function measurePrintImages(page: Page): Promise<PrintImageMetrics> {
    return await page.locator(seletorPreview).evaluate((preview): PrintImageMetrics => {
        const root = preview as HTMLElement
        const images = Array.from(root.querySelectorAll('img'))

        return {
            imageCount: images.length,
            figureCount: root.querySelectorAll('figure.markdown-image').length,
            wrappedFigureCount: root.querySelectorAll('p > figure.markdown-image').length,
            dataPrintImageCount: root.querySelectorAll('img[data-print-image="true"]').length,
            imageWidthsPx: images.map((img) => img.getBoundingClientRect().width),
            imageHeightsPx: images.map((img) => img.getBoundingClientRect().height),
            imageMaxHeightsPx: images.map((img) => {
                const maxHeight = Number.parseFloat(window.getComputedStyle(img).maxHeight)
                return Number.isFinite(maxHeight) ? maxHeight : 0
            }),
            naturalAspectRatios: images.map((img) => {
                if (!img.naturalWidth || !img.naturalHeight) {
                    return 0
                }
                return img.naturalWidth / img.naturalHeight
            }),
            renderedAspectRatios: images.map((img) => {
                const rect = img.getBoundingClientRect()
                if (!rect.width || !rect.height) {
                    return 0
                }
                return rect.width / rect.height
            }),
            centerOffsetsPx: images.map((img) => {
                const imgRect = img.getBoundingClientRect()
                const figure = img.closest('figure.markdown-image')
                const containerRect = figure?.getBoundingClientRect() || root.getBoundingClientRect()
                const imgCenterX = imgRect.left + imgRect.width / 2
                const containerCenterX = containerRect.left + containerRect.width / 2
                return Math.abs(imgCenterX - containerCenterX)
            }),
            captions: Array.from(root.querySelectorAll('figure.markdown-image figcaption')).map(
                (caption) => caption.textContent || ''
            )
        }
    })
}
