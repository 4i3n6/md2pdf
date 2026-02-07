import type { Document, LoggerInterface } from '@/types/index'

type DocumentIoService = {
    importMarkdownFile: () => void
    downloadMarkdownFile: () => void
    exportarBackupDocumentos: () => void
    importarBackupDocumentos: () => void
}

type AppEventsDeps = {
    logger: LoggerInterface
    createDoc: () => void
    imprimirDocumentoAtual: () => Promise<void>
    documentIoService: DocumentIoService
    togglePrintPreview: () => void
    getCurrentDoc: () => Document | undefined
    obterExtensaoDocumento: (nome?: string) => string
    saveDocs: () => void
    renderList: () => void
    renderPreview: (md: string) => void
    atualizarLinguagemEditor: (nome?: string) => Promise<void>
}

export function setupAppEvents(deps: AppEventsDeps): void {
    const btnNew = document.getElementById('new-doc-btn')
    if (btnNew) {
        btnNew.addEventListener('click', deps.createDoc)
    }

    const btnDown = document.getElementById('download-btn')
    if (btnDown) {
        btnDown.addEventListener('click', (): void => {
            void deps.imprimirDocumentoAtual()
        })
    }

    // Import MD Button
    const btnImportMd = document.getElementById('import-md-btn')
    if (btnImportMd) {
        btnImportMd.addEventListener('click', deps.documentIoService.importMarkdownFile)
    }

    // Download MD Button
    const btnDownloadMd = document.getElementById('download-md-btn')
    if (btnDownloadMd) {
        btnDownloadMd.addEventListener('click', deps.documentIoService.downloadMarkdownFile)
    }

    const btnBackup = document.getElementById('backup-btn')
    if (btnBackup) {
        btnBackup.addEventListener('click', deps.documentIoService.exportarBackupDocumentos)
    }

    const btnRestore = document.getElementById('restore-btn')
    if (btnRestore) {
        btnRestore.addEventListener('click', deps.documentIoService.importarBackupDocumentos)
    }

    // Atalhos de teclado globais
    document.addEventListener('keydown', (e: KeyboardEvent): void => {
        // Ctrl+Shift+P - Preview de impressao
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'P') {
            e.preventDefault()
            deps.togglePrintPreview()
            deps.logger.success(
                document.body.classList.contains('print-mode')
                    ? 'Preview de Impressao Ativado (ESC para sair)'
                    : 'Preview Desativado'
            )
        }
    })

    // Name Input
    const inputName = document.getElementById('doc-name') as HTMLInputElement | null
    if (inputName) {
        inputName.addEventListener('input', (e: Event): void => {
            const target = e.target as HTMLInputElement
            const doc = deps.getCurrentDoc()
            if (doc) {
                const extAnterior = deps.obterExtensaoDocumento(doc.name)
                doc.name = target.value
                deps.saveDocs()
                deps.renderList()
                const extNovo = deps.obterExtensaoDocumento(doc.name)
                if (extAnterior !== extNovo) {
                    deps.renderPreview(doc.content)
                    void deps.atualizarLinguagemEditor(doc.name)
                }
            }
        })
    }

    // Copy Markdown Button
    const btnCopyMd = document.getElementById('copy-md-btn') as HTMLButtonElement | null
    if (btnCopyMd) {
        btnCopyMd.addEventListener('click', async (): Promise<void> => {
            const doc = deps.getCurrentDoc()
            if (doc?.content) {
                try {
                    await navigator.clipboard.writeText(doc.content)
                    deps.logger.success('Conteudo copiado para area de transferencia')
                    const originalText = btnCopyMd.textContent
                    btnCopyMd.textContent = '[ OK! ]'
                    btnCopyMd.classList.add('copied')
                    setTimeout(() => {
                        btnCopyMd.textContent = originalText
                        btnCopyMd.classList.remove('copied')
                    }, 1500)
                } catch (err) {
                    deps.logger.error('Falha ao copiar: ' + String(err))
                }
            } else {
                deps.logger.log('Nenhum conteudo para copiar', 'warning')
            }
        })
    }

    // Atalho Ctrl+Shift+C para copiar
    document.addEventListener('keydown', (e: KeyboardEvent): void => {
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') {
            e.preventDefault()
            btnCopyMd?.click()
        }
    })
}

