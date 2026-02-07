import { SplitterConfig } from '@/constants'
import type { LoggerInterface } from '@/types/index'
import { storageGetItem, storageSetItem } from '@/utils/storage'

const SPLITTER_STORAGE_KEY = SplitterConfig.storageKey
const SPLITTER_MIN_RATIO = SplitterConfig.minRatio
const SPLITTER_MAX_RATIO = SplitterConfig.maxRatio
const SPLITTER_DEFAULT_RATIO = SplitterConfig.defaultRatio

export function initSplitter(logger: LoggerInterface): void {
    const splitter = document.getElementById('workspace-splitter')
    const editorPane = document.getElementById('editor-pane')
    const workspace = document.querySelector('.workspace') as HTMLElement | null

    if (!splitter || !editorPane || !workspace) {
        logger.log('Splitter elements not found', 'warning')
        return
    }

    const splitterEl = splitter
    const editorPaneEl = editorPane
    const workspaceEl = workspace

    const savedRatio = storageGetItem(
        SPLITTER_STORAGE_KEY,
        (msg) => logger.log(msg, 'warning')
    )
    let currentRatio = savedRatio ? parseFloat(savedRatio) : SPLITTER_DEFAULT_RATIO

    if (isNaN(currentRatio) || currentRatio < SPLITTER_MIN_RATIO || currentRatio > SPLITTER_MAX_RATIO) {
        currentRatio = SPLITTER_DEFAULT_RATIO
    }

    applyRatio(currentRatio)

    let isDragging = false
    let startX = 0
    let startWidth = 0

    splitter.addEventListener('mousedown', (e: MouseEvent) => {
        isDragging = true
        startX = e.clientX
        startWidth = editorPaneEl.offsetWidth
        document.body.classList.add('splitter-dragging')
        e.preventDefault()
    })

    document.addEventListener('mousemove', (e: MouseEvent) => {
        if (!isDragging) return

        const deltaX = e.clientX - startX
        const workspaceWidth = workspaceEl.offsetWidth
        const splitterWidth = splitterEl.offsetWidth
        const availableWidth = workspaceWidth - splitterWidth
        const newWidth = startWidth + deltaX
        const newRatio = newWidth / availableWidth

        currentRatio = Math.max(SPLITTER_MIN_RATIO, Math.min(SPLITTER_MAX_RATIO, newRatio))
        applyRatio(currentRatio)
    })

    document.addEventListener('mouseup', () => {
        if (!isDragging) return

        isDragging = false
        document.body.classList.remove('splitter-dragging')

        storageSetItem(
            SPLITTER_STORAGE_KEY,
            currentRatio.toString(),
            (msg) => logger.error(msg)
        )

        logger.log(`Panel ratio: ${Math.round(currentRatio * 100)}%`)
    })

    splitter.addEventListener('dblclick', () => {
        currentRatio = SPLITTER_DEFAULT_RATIO
        applyRatio(currentRatio)

        storageSetItem(
            SPLITTER_STORAGE_KEY,
            currentRatio.toString(),
            (msg) => logger.error(msg)
        )

        logger.log('Panel ratio reset to 50%')
    })

    window.addEventListener('resize', () => {
        applyRatio(currentRatio)
    })

    logger.success('Splitter initialized')

    function applyRatio(ratio: number): void {
        const workspaceWidth = workspaceEl.offsetWidth
        const splitterWidth = splitterEl.offsetWidth
        const availableWidth = workspaceWidth - splitterWidth
        const editorWidth = Math.round(availableWidth * ratio)
        editorPaneEl.style.width = `${editorWidth}px`
    }
}
