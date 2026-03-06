import { expect, test } from '@playwright/test'
import {
    abrirAplicacao,
    definirMarkdownNoEditor,
    measurePrintImages,
    medirOverflowDeTabelas
} from './helpers'
import {
    markdownFidelidadeImpressao,
    markdownFidelidadeRender,
    markdownPrintImageSizing
} from './fixtures'

test.describe('Fidelidade Render e Print', () => {
    test('preview renderiza imagens standalone como figure com legenda sem wrapper extra', async ({
        page
    }) => {
        await abrirAplicacao(page)
        await definirMarkdownNoEditor(page, markdownPrintImageSizing)

        const previewImages = await measurePrintImages(page)

        expect(previewImages.imageCount).toBe(1)
        expect(previewImages.figureCount).toBe(1)
        expect(previewImages.wrappedFigureCount).toBe(0)
        expect(previewImages.dataPrintImageCount).toBe(1)
        expect(previewImages.captions[0]).toBe('Tall print image')
        expect(previewImages.imageWidthsPx[0]).toBeGreaterThan(0)
        expect(previewImages.imageHeightsPx[0]).toBeGreaterThan(0)
        expect(previewImages.imageHeightsPx[0]).toBeLessThanOrEqual(previewImages.imageMaxHeightsPx[0] + 1)
        expect(Math.abs(previewImages.renderedAspectRatios[0] - previewImages.naturalAspectRatios[0])).toBeLessThan(0.02)
        expect(previewImages.centerOffsetsPx[0]).toBeLessThanOrEqual(2)

        await expect(page.locator('#preview-wrapper')).toHaveScreenshot(
            'preview-standalone-image.png',
            {
                animations: 'disabled',
                caret: 'hide',
                maxDiffPixelRatio: 0.03
            }
        )
    })

    test('input_stream para render_output preserva estrutura essencial', async ({ page }) => {
        await abrirAplicacao(page)
        await definirMarkdownNoEditor(page, markdownFidelidadeRender)

        const preview = page.locator('#preview')
        await expect(preview.locator('h1')).toHaveText('Fidelity Check')
        await expect(preview.locator('table')).toHaveCount(1)
        await expect(preview.locator('pre code.language-javascript')).toHaveCount(1)
        await expect(preview.locator('input[type="checkbox"][disabled]')).toHaveCount(2)

        const alinhamentosComputados = await preview.locator('thead th').evaluateAll((ths) =>
            ths.map((th) => window.getComputedStyle(th).textAlign)
        )

        expect(alinhamentosComputados[0]).toBe('left')
        expect(alinhamentosComputados[1]).toBe('center')
        expect(alinhamentosComputados[2]).toBe('right')

        await expect(page.locator('#preview-wrapper')).toHaveScreenshot(
            'input-stream-to-render-output.png',
            {
                animations: 'disabled',
                caret: 'hide',
                maxDiffPixelRatio: 0.03
            }
        )
    })

    test('render_output para impressao evita overflow critico de tabela', async ({ page }) => {
        await abrirAplicacao(page)
        await definirMarkdownNoEditor(page, markdownFidelidadeImpressao)

        await page.emulateMedia({ media: 'print' })
        const resultadoPrint = await medirOverflowDeTabelas(page)

        expect(resultadoPrint.quantidadeTabelas).toBeGreaterThan(0)
        expect(resultadoPrint.maxOverflowPx).toBeLessThanOrEqual(12)
        expect(resultadoPrint.whiteSpaceCabecalho[0]).not.toBe('nowrap')
        expect(resultadoPrint.whiteSpaceCelula[0]).not.toBe('nowrap')

        await expect(page.locator('#preview-wrapper')).toHaveScreenshot(
            'render-output-to-print-media.png',
            {
                animations: 'disabled',
                caret: 'hide',
                maxDiffPixelRatio: 0.03
            }
        )
    })

    test('print media keeps standalone images as print blocks and uses the full A4 height budget', async ({
        page
    }) => {
        await abrirAplicacao(page)
        await definirMarkdownNoEditor(page, markdownPrintImageSizing)

        await page.emulateMedia({ media: 'print' })
        const printImages = await measurePrintImages(page)

        expect(printImages.imageCount).toBe(1)
        expect(printImages.figureCount).toBe(1)
        expect(printImages.wrappedFigureCount).toBe(0)
        expect(printImages.dataPrintImageCount).toBe(1)
        expect(printImages.captions[0]).toBe('Tall print image')
        expect(printImages.imageWidthsPx[0]).toBeGreaterThan(0)
        expect(printImages.imageHeightsPx[0]).toBeGreaterThan(1000)
        expect(printImages.imageMaxHeightsPx[0]).toBeGreaterThan(1000)
        expect(printImages.imageHeightsPx[0]).toBeLessThanOrEqual(printImages.imageMaxHeightsPx[0] + 1)
        expect(Math.abs(printImages.renderedAspectRatios[0] - printImages.naturalAspectRatios[0])).toBeLessThan(0.02)
        expect(printImages.centerOffsetsPx[0]).toBeLessThanOrEqual(2)

        await expect(page.locator('#preview-wrapper')).toHaveScreenshot(
            'print-standalone-image.png',
            {
                animations: 'disabled',
                caret: 'hide',
                maxDiffPixelRatio: 0.03
            }
        )
    })

    test('preview de impressao centraliza imagens e preserva proporcao visual', async ({ page }) => {
        await abrirAplicacao(page)
        await definirMarkdownNoEditor(page, markdownPrintImageSizing)

        await page.keyboard.press('ControlOrMeta+Shift+P')
        await expect(page.locator('body')).toHaveClass(/print-mode/)

        const printModeImages = await measurePrintImages(page)

        expect(printModeImages.imageCount).toBe(1)
        expect(printModeImages.figureCount).toBe(1)
        expect(printModeImages.captions[0]).toBe('Tall print image')
        expect(printModeImages.imageWidthsPx[0]).toBeGreaterThan(0)
        expect(printModeImages.imageHeightsPx[0]).toBeGreaterThan(1000)
        expect(printModeImages.imageHeightsPx[0]).toBeLessThanOrEqual(printModeImages.imageMaxHeightsPx[0] + 1)
        expect(Math.abs(printModeImages.renderedAspectRatios[0] - printModeImages.naturalAspectRatios[0])).toBeLessThan(0.02)
        expect(printModeImages.centerOffsetsPx[0]).toBeLessThanOrEqual(2)

        await expect(page.locator('#preview-wrapper')).toHaveScreenshot(
            'print-mode-standalone-image.png',
            {
                animations: 'disabled',
                caret: 'hide',
                maxDiffPixelRatio: 0.03
            }
        )
    })

    test('preview de impressao (print-mode) mantem constraints visuais de tabela', async ({
        page
    }) => {
        await abrirAplicacao(page)
        await definirMarkdownNoEditor(page, markdownFidelidadeImpressao)

        await page.keyboard.press('ControlOrMeta+Shift+P')
        await expect(page.locator('body')).toHaveClass(/print-mode/)

        const resultadoPreviewPrint = await medirOverflowDeTabelas(page)
        expect(resultadoPreviewPrint.quantidadeTabelas).toBeGreaterThan(0)
        expect(resultadoPreviewPrint.maxOverflowPx).toBeLessThanOrEqual(12)

        await expect(page.locator('#preview-wrapper')).toHaveScreenshot(
            'print-mode-table-constraints.png',
            {
                animations: 'disabled',
                caret: 'hide',
                maxDiffPixelRatio: 0.03
            }
        )
    })
})
