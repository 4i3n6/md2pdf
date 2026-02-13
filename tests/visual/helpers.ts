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
