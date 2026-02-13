import { expect, test } from '@playwright/test'
import {
    abrirAplicacao,
    definirMarkdownNoEditor,
    medirOverflowDeTabelas
} from './helpers'
import {
    markdownFidelidadeImpressao,
    markdownFidelidadeRender
} from './fixtures'

test.describe('Fidelidade Render e Print', () => {
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
