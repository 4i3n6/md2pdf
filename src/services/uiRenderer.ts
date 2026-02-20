/**
 * UI RENDERER SERVICE
 *
 * Responsible for side-effect-free UI rendering.
 * Separates rendering logic from business logic.
 */

import type { Document, LoggerInterface } from '@/types/index'
import { runPreviewPostProcessing } from '@/services/previewPostProcessingService'

type DocumentSelectCallback = (id: number) => void

type DocumentDeleteCallback = (id: number) => void

export class UIRenderer {
  constructor(private logger?: LoggerInterface) {}

  setLogger(logger: LoggerInterface): void {
    this.logger = logger
  }

  renderDocumentList(
    container: HTMLElement,
    documents: Document[],
    activeId: number | null,
    onSelect: DocumentSelectCallback,
    onDelete: DocumentDeleteCallback
  ): void {
    container.innerHTML = ''

    documents.forEach((doc: Document) => {
      const item = document.createElement('div')
      item.className = `document-item ${doc.id === activeId ? 'active' : ''}`

      // WCAG 2.1 AA
      item.setAttribute('data-doc-id', String(doc.id))
      item.setAttribute('role', 'option')
      item.setAttribute('aria-selected', doc.id === activeId ? 'true' : 'false')
      item.setAttribute('tabindex', doc.id === activeId ? '0' : '-1')
      item.setAttribute('aria-label', `Document: ${doc.name}`)
      item.setAttribute('title', `Click to open ${doc.name} (Delete to remove)`)

      const nameContainer = document.createElement('div')
      nameContainer.className = 'doc-name-container'
      nameContainer.style.cssText = 'display: flex; align-items: center; gap: 6px; flex: 1; min-width: 0;'

      const name = document.createElement('span')
      name.textContent = doc.name
      name.className = 'doc-name'
      name.style.cssText = 'overflow: hidden; text-overflow: ellipsis; white-space: nowrap;'
      name.setAttribute('aria-hidden', 'false')
      nameContainer.appendChild(name)

      const deleteBtn = document.createElement('span')
      deleteBtn.textContent = '[x]'
      deleteBtn.className = 'doc-delete-btn'
      deleteBtn.style.cssText = 'font-size: 9px; cursor: pointer; opacity: 0.6; padding: 2px 4px;'
      deleteBtn.setAttribute('role', 'button')
      deleteBtn.setAttribute('aria-label', `Delete document ${doc.name}`)
      deleteBtn.setAttribute('tabindex', '-1')
      deleteBtn.setAttribute('title', 'Click to delete (or press Delete when focused)')
      deleteBtn.addEventListener('click', (e: MouseEvent) => {
        e.stopPropagation()
        onDelete(doc.id)
      })
      deleteBtn.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          e.stopPropagation()
          onDelete(doc.id)
        }
      })
      deleteBtn.addEventListener('mouseenter', () => {
        deleteBtn.style.opacity = '1'
      })
      deleteBtn.addEventListener('mouseleave', () => {
        deleteBtn.style.opacity = '0.6'
      })

      item.appendChild(nameContainer)
      item.appendChild(deleteBtn)

      item.addEventListener('click', () => onSelect(doc.id))
      item.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect(doc.id)
        }
      })

      container.appendChild(item)
    })
  }

  async renderPreview(container: HTMLElement, html: string): Promise<void> {
    if (!container) return

    // Safe DOM clear — avoids innerHTML assignment on live nodes
    while (container.firstChild) {
      container.removeChild(container.firstChild)
    }

    // HTML is already sanitized by DOMPurify in processMarkdown()
    container.insertAdjacentHTML('afterbegin', html)

    await runPreviewPostProcessing(container, this.logger)
  }

  setDocumentNameInput(input: HTMLElement, name: string): void {
    if (input instanceof HTMLInputElement) {
      input.value = name
    }
  }

  updateMemoryMetric(container: HTMLElement, bytes: number): void {
    const kb = (bytes / 1024).toFixed(2)
    container.innerText = `${kb}KB`
  }

  flashIndicator(indicator: HTMLElement, duration: number = 200): void {
    indicator.classList.add('active')
    setTimeout(() => {
      indicator.classList.remove('active')
    }, duration)
  }

  showError(message: string, errorContainer?: HTMLElement): void {
    this.logger?.error?.(message)
    if (errorContainer) {
      errorContainer.textContent = message
      errorContainer.style.display = 'block'
      setTimeout(() => {
        errorContainer.style.display = 'none'
      }, 5000)
    }
  }

  showSuccess(message: string): void {
    this.logger?.success?.(message)
  }
}

export const uiRenderer = new UIRenderer()
