import { obterChavePreferenciasDocumento } from '@/constants'
import type { AppState, LoggerInterface } from '@/types/index'
import { storageGetItem, storageSetJson } from '@/utils/storage'

export type DocumentPreferences = {
    font: string
    align: string
    fontSize: string
}

const DEFAULT_PREFS: DocumentPreferences = {
    font: "'JetBrains Mono', monospace",
    align: 'left',
    fontSize: '9pt'
}

export function getDocPreferences(
    docId: number,
    logger: LoggerInterface
): DocumentPreferences {
    const key = obterChavePreferenciasDocumento(docId)
    const saved = storageGetItem(key, (msg) => logger.log(msg, 'warning'))
    if (!saved) return { ...DEFAULT_PREFS }

    try {
        const parsed = JSON.parse(saved) as Partial<DocumentPreferences>
        return {
            font: typeof parsed.font === 'string' ? parsed.font : DEFAULT_PREFS.font,
            align: typeof parsed.align === 'string' ? parsed.align : DEFAULT_PREFS.align,
            fontSize: typeof parsed.fontSize === 'string' ? parsed.fontSize : DEFAULT_PREFS.fontSize
        }
    } catch {
        return { ...DEFAULT_PREFS }
    }
}

export function saveDocPreferences(
    docId: number,
    prefs: DocumentPreferences,
    logger: LoggerInterface
): void {
    const key = obterChavePreferenciasDocumento(docId)
    storageSetJson(key, prefs, (msg) => logger.error(msg))
}

function updateAlignButtons(activeAlign: string): void {
    const buttons = document.querySelectorAll('.align-btn')
    buttons.forEach((btn) => {
        const btnAlign = (btn as HTMLElement).dataset['align']
        if (btnAlign === activeAlign) {
            btn.classList.add('active')
            btn.setAttribute('aria-pressed', 'true')
        } else {
            btn.classList.remove('active')
            btn.setAttribute('aria-pressed', 'false')
        }
    })
}

function applyPreviewFont(state: AppState, logger: LoggerInterface, font: string): void {
    const preview = document.getElementById('preview')
    if (preview) {
        preview.style.fontFamily = font
    }

    const fontSelect = document.getElementById('preview-font') as HTMLSelectElement | null
    if (fontSelect) {
        fontSelect.value = font
    }

    if (state.currentId) {
        const prefs = getDocPreferences(state.currentId, logger)
        prefs.font = font
        saveDocPreferences(state.currentId, prefs, logger)
    }
}

function applyPreviewFontSize(state: AppState, logger: LoggerInterface, size: string): void {
    const preview = document.getElementById('preview')
    if (preview) {
        preview.style.fontSize = size
    }

    const fontSizeSelect = document.getElementById('preview-font-size') as HTMLSelectElement | null
    if (fontSizeSelect) {
        fontSizeSelect.value = size
    }

    if (state.currentId) {
        const prefs = getDocPreferences(state.currentId, logger)
        prefs.fontSize = size
        saveDocPreferences(state.currentId, prefs, logger)
    }
}

function applyPreviewAlign(state: AppState, logger: LoggerInterface, align: string): void {
    const preview = document.getElementById('preview')
    if (preview) {
        preview.style.textAlign = align
    }

    updateAlignButtons(align)

    if (state.currentId) {
        const prefs = getDocPreferences(state.currentId, logger)
        prefs.align = align
        saveDocPreferences(state.currentId, prefs, logger)
    }
}

export function loadDocPreferences(
    state: AppState,
    logger: LoggerInterface,
    docId: number
): void {
    const prefs = getDocPreferences(docId, logger)
    applyPreviewFont(state, logger, prefs.font)
    applyPreviewFontSize(state, logger, prefs.fontSize)
    applyPreviewAlign(state, logger, prefs.align)
}

function insertFontTag(state: AppState, logger: LoggerInterface, font: string): void {
    if (!state.editor) return

    const { from, to } = state.editor.state.selection.main
    if (from === to) {
        logger.log('Selecione um texto para aplicar a fonte', 'warning')
        return
    }

    const selectedText = state.editor.state.sliceDoc(from, to)
    const insert = `<span style="font-family: ${font}">${selectedText}</span>`

    state.editor.dispatch({
        changes: { from, to, insert },
        selection: { anchor: from + insert.length }
    })

    state.editor.focus()
    logger.log('Fonte aplicada na selecao')
}

export function setupPreviewControls(state: AppState, logger: LoggerInterface): void {
    const fontSelect = document.getElementById('preview-font') as HTMLSelectElement | null
    if (fontSelect) {
        fontSelect.addEventListener('change', (e) => {
            const target = e.target as HTMLSelectElement
            const font = target.value
            if (font) {
                applyPreviewFont(state, logger, font)
                const fontName = font.split(',')[0]?.replace(/'/g, '') || font
                logger.log(`Fonte do documento: ${fontName}`)
            }
        })
    }

    const fontSizeSelect = document.getElementById('preview-font-size') as HTMLSelectElement | null
    if (fontSizeSelect) {
        fontSizeSelect.addEventListener('change', (e) => {
            const target = e.target as HTMLSelectElement
            const size = target.value
            if (size) {
                applyPreviewFontSize(state, logger, size)
                logger.log(`Tamanho da fonte: ${size}`)
            }
        })
    }

    document.querySelectorAll('.align-btn').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            const target = e.target as HTMLElement
            const align = target.dataset['align']
            if (align) {
                applyPreviewAlign(state, logger, align)
                logger.log(`Alinhamento: ${align}`)
            }
        })
    })

    const tagFontSelect = document.getElementById('tag-font') as HTMLSelectElement | null
    tagFontSelect?.addEventListener('change', (e) => {
        const font = (e.target as HTMLSelectElement).value
        if (font) {
            insertFontTag(state, logger, font)
            ;(e.target as HTMLSelectElement).selectedIndex = 0
        }
    })

    logger.success('Controles do preview ativados')
}

