import type { AppState, Document as AppDocument, LoggerInterface } from '@/types/index'
import { debounce } from '@/utils/debounce'

type TranslationFn = (key: string, params?: Record<string, string | number>) => string

type SaveStatusDeps = {
    state: AppState
    logger: LoggerInterface
    getCurrentDoc: () => AppDocument | undefined
    persistDocs: () => void
    updateMetrics: () => void
    t: TranslationFn
    debounceMs: number
}

export function documentoEstaModificado(doc: AppDocument): boolean {
    if (!doc.lastSaved) return true
    return doc.updated > doc.lastSaved
}

export function createSaveStatusService(deps: SaveStatusDeps) {
    let saveStatusInterval: ReturnType<typeof setInterval> | null = null

    function formatTimeSinceSaved(lastSaved: number | null): string {
        if (!lastSaved) return deps.t('time.never')

        const now = Date.now()
        const diff = now - lastSaved

        const seconds = Math.floor(diff / 1000)
        const minutes = Math.floor(seconds / 60)
        const hours = Math.floor(minutes / 60)

        if (seconds < 5) return deps.t('save.savedNow')
        if (seconds < 60) return deps.t('save.savedAgo', { time: deps.t('time.seconds', { n: seconds }) })
        if (minutes < 60) return deps.t('save.savedAgo', { time: deps.t('time.minutes', { n: minutes }) })
        return deps.t('save.savedAgo', { time: deps.t('time.hours', { n: hours }) })
    }

    function updateSaveStatus(): void {
        const doc = deps.getCurrentDoc()
        if (!doc) return

        const statusEl = document.getElementById('save-status')
        if (!statusEl) return

        if (documentoEstaModificado(doc)) {
            statusEl.className = 'save-status save-status-modified'
            statusEl.innerHTML = `<span class="save-dot modified"></span><span class="save-text">${deps.t('save.notSaved')}</span>`
            return
        }

        const statusText = formatTimeSinceSaved(doc.lastSaved)
        statusEl.className = 'save-status save-status-saved'
        statusEl.innerHTML = `<span class="save-dot saved"></span><span class="save-text">${statusText}</span>`
    }

    function marcarDocumentosSalvos(): void {
        const now = Date.now()
        deps.state.docs.forEach((doc) => {
            if (!doc.lastSaved || doc.updated > doc.lastSaved) {
                doc.lastSaved = now
            }
        })
    }

    function salvarDocumentosAgora(): void {
        marcarDocumentosSalvos()
        deps.persistDocs()
        deps.updateMetrics()
        updateSaveStatus()
    }

    const salvarDocumentosDebounced = debounce(() => {
        salvarDocumentosAgora()
    }, deps.debounceMs)

    function agendarSalvamento(): void {
        salvarDocumentosDebounced()
        updateSaveStatus()
    }

    function forceSave(): void {
        const doc = deps.getCurrentDoc()
        if (!doc) {
            deps.logger.log(deps.t('logs.noDocToSave'), 'warning')
            return
        }

        salvarDocumentosAgora()
        deps.logger.success(deps.t('logs.docSaved'))
    }

    function startSaveStatusUpdater(): void {
        if (saveStatusInterval) {
            clearInterval(saveStatusInterval)
        }
        saveStatusInterval = setInterval(() => {
            updateSaveStatus()
        }, 10000)
    }

    function setupSaveControls(): void {
        const forceSaveBtn = document.getElementById('force-save-btn')

        if (forceSaveBtn) {
            forceSaveBtn.addEventListener('click', forceSave)
        }

        document.addEventListener('keydown', (e: KeyboardEvent): void => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault()
                forceSave()
            }
        })

        startSaveStatusUpdater()
        deps.logger.success('Controles de salvamento ativos')
    }

    return {
        updateSaveStatus,
        agendarSalvamento,
        salvarDocumentosAgora,
        setupSaveControls
    }
}

