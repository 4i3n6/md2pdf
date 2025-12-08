/**
 * UI RENDERER SERVICE
 * 
 * Responsável por renderização de UI sem efeitos colaterais.
 * Separa lógica de renderização da lógica de negócio.
 */

import type { Document, LoggerInterface } from '@/types/index'
import { processImagesInPreview } from '@/processors/markdownProcessor'

/**
 * Callback para evento de seleção de documento
 */
type DocumentSelectCallback = (id: number) => void

/**
 * Callback para evento de deleção de documento
 */
type DocumentDeleteCallback = (id: number) => void

/**
 * Serviço de renderização de UI
 */
export class UIRenderer {
  constructor(private logger?: LoggerInterface) {}

  /**
   * Renderiza lista de documentos
   * 
   * @param {HTMLElement} container - Container onde renderizar
   * @param {Document[]} documents - Lista de documentos
   * @param {number} activeId - ID do documento ativo
   * @param {DocumentSelectCallback} onSelect - Callback de seleção
   * @param {DocumentDeleteCallback} onDelete - Callback de deleção
   * @returns {void}
   */
  renderDocumentList(
    container: HTMLElement,
    documents: Document[],
    activeId: number | null,
    onSelect: DocumentSelectCallback,
    onDelete: DocumentDeleteCallback
  ): void {
    // Limpar container
    container.innerHTML = ''

    documents.forEach((doc: Document) => {
      const item = document.createElement('div')
      item.className = `document-item ${doc.id === activeId ? 'active' : ''}`
      
      // WCAG 2.1 AA - Acessibilidade
      item.setAttribute('data-doc-id', String(doc.id))
      item.setAttribute('role', 'option')
      item.setAttribute('aria-selected', doc.id === activeId ? 'true' : 'false')
      item.setAttribute('tabindex', doc.id === activeId ? '0' : '-1')
      item.setAttribute('aria-label', `Documento: ${doc.name}`)
      item.setAttribute('title', `Clique para abrir ${doc.name} (Delete para remover)`)

      // Container para nome + indicadores
      const nameContainer = document.createElement('div')
      nameContainer.className = 'doc-name-container'
      nameContainer.style.cssText = 'display: flex; align-items: center; gap: 6px; flex: 1; min-width: 0;'

      // Dirty indicator
      if (doc.isDirty) {
        const dirtyDot = document.createElement('span')
        dirtyDot.className = 'doc-dirty-dot'
        dirtyDot.style.cssText = 'width: 6px; height: 6px; border-radius: 50%; background: #f59e0b; flex-shrink: 0;'
        dirtyDot.setAttribute('title', 'Nao salvo')
        dirtyDot.setAttribute('aria-label', 'Documento modificado')
        nameContainer.appendChild(dirtyDot)
      }

      const name = document.createElement('span')
      name.textContent = doc.name
      name.className = 'doc-name'
      name.style.cssText = 'overflow: hidden; text-overflow: ellipsis; white-space: nowrap;'
      name.setAttribute('aria-hidden', 'false')
      nameContainer.appendChild(name)

      // Storage badge (pequeno)
      const storageBadge = document.createElement('span')
      storageBadge.className = `doc-storage-badge doc-storage-${doc.storage}`
      const storageLabels: Record<string, string> = {
        local: 'L',
        disk: 'D',
        cloud: 'C'
      }
      storageBadge.textContent = storageLabels[doc.storage] || 'L'
      storageBadge.style.cssText = 'font-size: 8px; padding: 1px 3px; border-radius: 2px; flex-shrink: 0;'
      
      if (doc.storage === 'local') {
        storageBadge.style.background = '#e5e7eb'
        storageBadge.style.color = '#6b7280'
      } else if (doc.storage === 'disk') {
        storageBadge.style.background = '#dbeafe'
        storageBadge.style.color = '#1d4ed8'
      } else {
        storageBadge.style.background = '#d1fae5'
        storageBadge.style.color = '#047857'
      }

      const deleteBtn = document.createElement('span')
      deleteBtn.textContent = '[x]'
      deleteBtn.style.fontSize = '9px'
      deleteBtn.style.cursor = 'pointer'
      deleteBtn.setAttribute('role', 'button')
      deleteBtn.setAttribute('aria-label', `Deletar documento ${doc.name}`)
      deleteBtn.setAttribute('tabindex', '-1')
      deleteBtn.setAttribute('title', 'Clique para deletar (ou pressione Delete na seleção)')
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

      item.appendChild(nameContainer)
      item.appendChild(storageBadge)
      item.appendChild(deleteBtn)

      item.addEventListener('click', () => onSelect(doc.id))
      item.addEventListener('keydown', (e: KeyboardEvent) => {
        // Enter ou Space para ativar
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect(doc.id)
        }
      })
      
      container.appendChild(item)
    })
  }

  /**
   * Renderiza preview de markdown
   * 
   * Processa HTML sanitizado com:
   * - Imagens redimensionadas para A4
   * - Estimativa de páginas
   * 
   * @param {HTMLElement} container - Container para renderizar
   * @param {string} html - HTML sanitizado já processado
   * @returns {Promise<void>}
   */
  async renderPreview(container: HTMLElement, html: string): Promise<void> {
    if (!container) return

    // Limpar container de forma segura
    while (container.firstChild) {
      container.removeChild(container.firstChild)
    }

    // Inserir HTML diretamente usando insertAdjacentHTML (não sanitiza novamente)
    // O HTML já foi sanitizado pelo DOMPurify em processMarkdown()
    container.insertAdjacentHTML('afterbegin', html)

    // Processar imagens com cache
    try {
      const imagesProcessed = await processImagesInPreview(container, true)
      if (imagesProcessed > 0) {
        this.logger?.log?.(`✓ ${imagesProcessed} imagem(ns) otimizada(s) para A4`, 'success')
      }
    } catch (e) {
      this.logger?.error?.(`Erro ao processar imagens: ${String(e)}`)
    }
  }

  /**
   * Atualiza nome de documento no input
   * 
   * @param {HTMLElement} input - Input element
   * @param {string} name - Nome a exibir
   * @returns {void}
   */
  setDocumentNameInput(input: HTMLElement, name: string): void {
    if (input instanceof HTMLInputElement) {
      input.value = name
    }
  }

  /**
   * Atualiza métrica de memória
   * 
   * @param {HTMLElement} container - Container do metric
   * @param {number} bytes - Tamanho em bytes
   * @returns {void}
   */
  updateMemoryMetric(container: HTMLElement, bytes: number): void {
    const kb = (bytes / 1024).toFixed(2)
    container.innerText = `${kb}KB`
  }

  /**
   * Flash visual indicator
   * 
   * @param {HTMLElement} indicator - Elemento indicator
   * @param {number} duration - Duração do flash em ms
   * @returns {void}
   */
  flashIndicator(indicator: HTMLElement, duration: number = 200): void {
    indicator.classList.add('active')
    setTimeout(() => {
      indicator.classList.remove('active')
    }, duration)
  }

  /**
   * Mostra mensagem de erro
   * 
   * @param {string} message - Mensagem de erro
   * @param {HTMLElement} errorContainer - Elemento para exibir erro
   * @returns {void}
   */
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

  /**
   * Mostra mensagem de sucesso
   * 
   * @param {string} message - Mensagem
   * @returns {void}
   */
  showSuccess(message: string): void {
    this.logger?.success?.(message)
  }
}

/**
 * Instância singleton do UIRenderer
 */
export const uiRenderer = new UIRenderer()
