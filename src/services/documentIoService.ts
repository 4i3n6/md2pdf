import { BackupConfig } from '@/constants'
import { getDocPreferences, loadDocPreferences, saveDocPreferences, type DocumentPreferences } from '@/services/previewPreferencesService'
import type { AppState, Document as AppDocument, LoggerInterface } from '@/types/index'
import { confirm } from '@/services/modalService'

type BackupPayload = {
    version: number
    appVersion: string
    exportedAt: string
    docs: AppDocument[]
    prefs: Record<string, DocumentPreferences>
}

type DocumentIoDeps = {
    state: AppState
    logger: LoggerInterface
    appVersion: string
    documentManager: {
        createFromImport: (name: string, content: string) => AppDocument
        getAll: () => AppDocument[]
        replaceAll: (docs: AppDocument[]) => void
    }
    getCurrentDoc: () => AppDocument | undefined
    renderList: () => void
    renderPreview: (md: string) => void
    updateMetrics: () => void
    updateSaveStatus: () => void
    updateEditorLanguage: (name?: string) => Promise<void>
}

export function createDocumentIoService(deps: DocumentIoDeps) {
    function importMarkdownFile(): void {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = '.md,.markdown,.txt'

        input.onchange = async (e: Event): Promise<void> => {
            const target = e.target as HTMLInputElement
            const file = target.files?.[0]

            if (!file) {
                deps.logger.log('Nenhum arquivo selecionado', 'info')
                return
            }

            try {
                const content = await file.text()
                const newDoc = deps.documentManager.createFromImport(file.name, content)

                deps.state.currentId = newDoc.id

                if (deps.state.editor) {
                    deps.state.editor.dispatch({
                        changes: { from: 0, to: deps.state.editor.state.doc.length, insert: content }
                    })
                }

                deps.renderList()
                deps.renderPreview(content)
                deps.updateSaveStatus()
                void deps.updateEditorLanguage(newDoc.name)

                deps.logger.success(`Arquivo importado: ${file.name}`)
            } catch (error) {
                const errorMsg = error instanceof Error ? error.message : String(error)
                deps.logger.error(`Erro ao importar arquivo: ${errorMsg}`)
            }
        }

        input.click()
    }

    function downloadMarkdownFile(): void {
        try {
            const doc = deps.getCurrentDoc()
            if (!doc) {
                deps.logger.error('Nenhum documento carregado')
                return
            }

            const blob = new Blob([doc.content], { type: 'text/markdown;charset=utf-8' })
            const url = URL.createObjectURL(blob)

            const link = document.createElement('a')
            link.href = url
            link.download = doc.name
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)

            URL.revokeObjectURL(url)

            deps.logger.success(`Download: ${doc.name} (${(blob.size / 1024).toFixed(2)}KB)`)
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : String(e)
            deps.logger.error('Erro ao fazer download: ' + errorMessage)
        }
    }

    function generateBackupName(): string {
        const now = new Date()
        const pad = (value: number): string => String(value).padStart(2, '0')
        const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`
        const time = `${pad(now.getHours())}${pad(now.getMinutes())}`
        return `md2pdf-backup-${date}-${time}.json`
    }

    function buildBackupPayload(): BackupPayload {
        const docs = deps.documentManager.getAll()
        const prefs: Record<string, DocumentPreferences> = {}

        docs.forEach((doc) => {
            prefs[String(doc.id)] = getDocPreferences(doc.id, deps.logger)
        })

        return {
            version: BackupConfig.version,
            appVersion: deps.appVersion,
            exportedAt: new Date().toISOString(),
            docs,
            prefs
        }
    }

    function normalizeBackupPayload(raw: unknown): BackupPayload | null {
        if (Array.isArray(raw)) {
            return {
                version: 0,
                appVersion: 'unknown',
                exportedAt: new Date().toISOString(),
                docs: raw as AppDocument[],
                prefs: {}
            }
        }

        if (!raw || typeof raw !== 'object') return null

        const payload = raw as Partial<BackupPayload>
        if (!Array.isArray(payload.docs)) return null

        const rawPrefs = payload.prefs && typeof payload.prefs === 'object'
            ? (payload.prefs as Record<string, unknown>)
            : {}

        const prefs: Record<string, DocumentPreferences> = {}
        Object.entries(rawPrefs).forEach(([docId, prefValue]) => {
            if (!prefValue || typeof prefValue !== 'object') return
            const pref = prefValue as Partial<DocumentPreferences>
            if (typeof pref.font !== 'string' || typeof pref.align !== 'string') return
            const fontSize = typeof pref.fontSize === 'string' ? pref.fontSize : '8pt'
            prefs[docId] = { font: pref.font, align: pref.align, fontSize }
        })

        return {
            version: typeof payload.version === 'number' ? payload.version : 0,
            appVersion: typeof payload.appVersion === 'string' ? payload.appVersion : 'unknown',
            exportedAt: typeof payload.exportedAt === 'string' ? payload.exportedAt : new Date().toISOString(),
            docs: payload.docs as AppDocument[],
            prefs
        }
    }

    function applyBackup(payload: BackupPayload): void {
        deps.documentManager.replaceAll(payload.docs)

        Object.entries(payload.prefs).forEach(([docId, pref]) => {
            const id = Number(docId)
            if (!Number.isNaN(id)) {
                saveDocPreferences(id, pref, deps.logger)
            }
        })

        const updatedDocs = deps.documentManager.getAll()
        deps.state.docs = updatedDocs
        deps.state.currentId = updatedDocs[0]?.id ?? null

        const currentDoc = deps.getCurrentDoc()
        if (deps.state.editor) {
            deps.state.editor.dispatch({
                changes: {
                    from: 0,
                    to: deps.state.editor.state.doc.length,
                    insert: currentDoc?.content || ''
                }
            })
        }

        deps.renderList()
        if (currentDoc) {
            deps.renderPreview(currentDoc.content)
            loadDocPreferences(deps.state, deps.logger, currentDoc.id)
        } else {
            deps.renderPreview('')
        }
        deps.updateMetrics()
        deps.updateSaveStatus()
    }

    function exportBackup(): void {
        try {
            const payload = buildBackupPayload()
            const content = JSON.stringify(payload, null, 2)
            const blob = new Blob([content], { type: 'application/json;charset=utf-8' })
            const url = URL.createObjectURL(blob)

            const link = document.createElement('a')
            link.href = url
            link.download = generateBackupName()
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)

            URL.revokeObjectURL(url)
            deps.logger.success(`Backup created with ${payload.docs.length} document(s)`)
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : String(e)
            deps.logger.error('Failed to create backup: ' + errorMessage)
        }
    }

    async function processBackupFile(file: File): Promise<void> {
        try {
            const text = await file.text()
            const parsed = JSON.parse(text) as unknown
            const payload = normalizeBackupPayload(parsed)

            if (!payload) {
                deps.logger.error('Invalid backup or unrecognized format')
                return
            }

            const confirmed = await confirm({
                title: 'Restore backup',
                message: 'This action replaces all current documents.\nContinue?',
                confirmLabel: 'Restore',
                variant: 'warning'
            })
            if (!confirmed) {
                deps.logger.log('Restore cancelled by user', 'warning')
                return
            }

            if (payload.version > BackupConfig.version) {
                deps.logger.log('Backup was created by a newer version. Some data may be ignored.', 'warning')
            }

            if (payload.appVersion !== 'unknown' && payload.appVersion !== deps.appVersion) {
                deps.logger.log(`Backup was created with app version ${payload.appVersion}`, 'info')
            }

            applyBackup(payload)
            deps.logger.success(`Backup restored (${payload.docs.length} document(s))`)
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : String(e)
            deps.logger.error('Failed to restore backup: ' + errorMessage)
        }
    }

    function importBackup(): void {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = '.json,application/json'

        input.onchange = (event: Event): void => {
            const target = event.target as HTMLInputElement
            const file = target.files?.[0]
            if (!file) return

            void processBackupFile(file)
        }

        input.click()
    }

    return {
        importMarkdownFile,
        downloadMarkdownFile,
        exportBackupDocuments: exportBackup,
        importBackupDocuments: importBackup
    }
}
