import { BackupConfig } from '@/constants'
import { getDocPreferences, loadDocPreferences, saveDocPreferences, type DocumentPreferences } from '@/services/previewPreferencesService'
import type { AppState, Document as AppDocument, LoggerInterface } from '@/types/index'
import { confirmar } from '@/services/modalService'

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
    atualizarLinguagemEditor: (nome?: string) => Promise<void>
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
                void deps.atualizarLinguagemEditor(newDoc.name)

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

    function gerarNomeBackup(): string {
        const now = new Date()
        const pad = (value: number): string => String(value).padStart(2, '0')
        const data = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`
        const hora = `${pad(now.getHours())}${pad(now.getMinutes())}`
        return `md2pdf-backup-${data}-${hora}.json`
    }

    function montarBackupPayload(): BackupPayload {
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

    function normalizarBackupPayload(raw: unknown): BackupPayload | null {
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

        const prefsBrutas = payload.prefs && typeof payload.prefs === 'object'
            ? (payload.prefs as Record<string, unknown>)
            : {}

        const prefs: Record<string, DocumentPreferences> = {}
        Object.entries(prefsBrutas).forEach(([docId, valor]) => {
            if (!valor || typeof valor !== 'object') return
            const pref = valor as Partial<DocumentPreferences>
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

    function aplicarBackup(payload: BackupPayload): void {
        deps.documentManager.replaceAll(payload.docs)

        Object.entries(payload.prefs).forEach(([docId, pref]) => {
            const id = Number(docId)
            if (!Number.isNaN(id)) {
                saveDocPreferences(id, pref, deps.logger)
            }
        })

        const docsAtualizados = deps.documentManager.getAll()
        deps.state.docs = docsAtualizados
        deps.state.currentId = docsAtualizados[0]?.id ?? null

        const docAtual = deps.getCurrentDoc()
        if (deps.state.editor) {
            deps.state.editor.dispatch({
                changes: {
                    from: 0,
                    to: deps.state.editor.state.doc.length,
                    insert: docAtual?.content || ''
                }
            })
        }

        deps.renderList()
        if (docAtual) {
            deps.renderPreview(docAtual.content)
            loadDocPreferences(deps.state, deps.logger, docAtual.id)
        } else {
            deps.renderPreview('')
        }
        deps.updateMetrics()
        deps.updateSaveStatus()
    }

    function exportarBackupDocumentos(): void {
        try {
            const payload = montarBackupPayload()
            const content = JSON.stringify(payload, null, 2)
            const blob = new Blob([content], { type: 'application/json;charset=utf-8' })
            const url = URL.createObjectURL(blob)

            const link = document.createElement('a')
            link.href = url
            link.download = gerarNomeBackup()
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)

            URL.revokeObjectURL(url)
            deps.logger.success(`Backup gerado com ${payload.docs.length} documento(s)`)
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : String(e)
            deps.logger.error('Falha ao gerar backup: ' + errorMessage)
        }
    }

    async function processarArquivoBackup(file: File): Promise<void> {
        try {
            const text = await file.text()
            const parsed = JSON.parse(text) as unknown
            const payload = normalizarBackupPayload(parsed)

            if (!payload) {
                deps.logger.error('Backup invalido ou formato nao reconhecido')
                return
            }

            const confirmado = await confirmar({
                titulo: 'Restaurar backup',
                mensagem: 'Esta ação substitui todos os documentos atuais.\nDeseja continuar?',
                textoBotaoConfirmar: 'Restaurar',
                variante: 'warning'
            })
            if (!confirmado) {
                deps.logger.log('Restauração cancelada pelo usuário', 'warning')
                return
            }

            if (payload.version > BackupConfig.version) {
                deps.logger.log('Backup gerado por versao mais nova. Alguns dados podem ser ignorados.', 'warning')
            }

            if (payload.appVersion !== 'unknown' && payload.appVersion !== deps.appVersion) {
                deps.logger.log(`Backup gerado na versao ${payload.appVersion}`, 'info')
            }

            aplicarBackup(payload)
            deps.logger.success(`Backup restaurado (${payload.docs.length} documento(s))`)
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : String(e)
            deps.logger.error('Falha ao restaurar backup: ' + errorMessage)
        }
    }

    function importarBackupDocumentos(): void {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = '.json,application/json'

        input.onchange = (event: Event): void => {
            const target = event.target as HTMLInputElement
            const file = target.files?.[0]
            if (!file) return

            void processarArquivoBackup(file)
        }

        input.click()
    }

    return {
        importMarkdownFile,
        downloadMarkdownFile,
        exportarBackupDocumentos,
        importarBackupDocumentos
    }
}
