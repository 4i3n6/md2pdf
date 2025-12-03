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

      const name = document.createElement('span')
      name.textContent = doc.name

      const deleteBtn = document.createElement('span')
      deleteBtn.textContent = '[x]'
      deleteBtn.style.fontSize = '9px'
      deleteBtn.style.cursor = 'pointer'
      deleteBtn.addEventListener('click', (e: MouseEvent) => {
        e.stopPropagation()
        onDelete(doc.id)
      })

      item.appendChild(name)
      item.appendChild(deleteBtn)

      item.addEventListener('click', () => onSelect(doc.id))
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

    // Criar wrapper para inserir HTML sanitizado
    const wrapper = document.createElement('div')
    wrapper.innerHTML = html

    // Clonar e inserir (dobra sanitização)
    for (const child of wrapper.children) {
      container.appendChild(child.cloneNode(true))
    }

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
