import type { LoggerInterface } from '@/types/index'

type KeyboardNavigationDeps = {
    logger: LoggerInterface
    createDoc: () => void
    deleteDoc: (id: number) => void
    togglePrintPreview: () => void
}

export function setupKeyboardNavigation(deps: KeyboardNavigationDeps): void {
    document.addEventListener('keydown', (e: KeyboardEvent): void => {
        // Ctrl+N - Novo documento
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault()
            deps.createDoc()
        }

        // Ctrl+Shift+E - Exportar PDF
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'E') {
            e.preventDefault()
            const btnDown = document.getElementById('download-btn') as HTMLButtonElement | null
            if (btnDown) {
                btnDown.click()
            }
        }

        // Escape - Limpar print preview
        if (e.key === 'Escape') {
            if (document.body.classList.contains('print-mode')) {
                e.preventDefault()
                deps.togglePrintPreview()
                deps.logger.log('Preview de Impressao desativado')
            }
        }
    })

    // Keyboard navigation em lista de documentos
    const documentsList = document.getElementById('documents-list') as HTMLElement | null
    if (documentsList) {
        documentsList.addEventListener('keydown', (e: KeyboardEvent): void => {
            const items = Array.from(documentsList.querySelectorAll('.document-item')) as HTMLElement[]
            if (items.length === 0) return

            const activeItem = document.querySelector('.document-item.active') as HTMLElement | null
            const currentIndex = activeItem ? items.indexOf(activeItem) : -1

            if (e.key === 'ArrowDown') {
                e.preventDefault()
                const nextIndex = Math.min(currentIndex + 1, items.length - 1)
                items[nextIndex]?.click()
                items[nextIndex]?.focus()
            }

            if (e.key === 'ArrowUp') {
                e.preventDefault()
                const prevIndex = Math.max(currentIndex - 1, 0)
                items[prevIndex]?.click()
                items[prevIndex]?.focus()
            }

            if (e.key === 'Delete' && activeItem) {
                e.preventDefault()
                const docId = activeItem.getAttribute('data-doc-id')
                if (docId) {
                    deps.deleteDoc(parseInt(docId, 10))
                }
            }

            if (e.key === 'Home') {
                e.preventDefault()
                items[0]?.click()
                items[0]?.focus()
            }

            if (e.key === 'End') {
                e.preventDefault()
                const lastItem = items[items.length - 1]
                lastItem?.click()
                lastItem?.focus()
            }

            if (e.key === 'Enter') {
                e.preventDefault()
                const target = e.target as HTMLElement
                if (target.classList.contains('document-item')) {
                    target.click()
                }
            }
        })

        const items = documentsList.querySelectorAll('.document-item') as NodeListOf<HTMLElement>
        items.forEach((item: HTMLElement, index: number): void => {
            item.setAttribute('tabindex', index === 0 ? '0' : '-1')
        })
    }

    const editor = document.getElementById('editor') as HTMLElement | null
    if (editor) {
        editor.addEventListener('keydown', (e: KeyboardEvent): void => {
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'I') {
                e.preventDefault()
                const firstDoc = documentsList?.querySelector('.document-item') as HTMLElement | null
                if (firstDoc) {
                    firstDoc.focus()
                }
            }
        })
    }

    deps.logger.success('Navegacao por teclado ativada')
    deps.logger.log('Atalhos: Ctrl+N=Novo | Ctrl+Shift+E=PDF | Arrow Keys=Navegar Docs')
}
