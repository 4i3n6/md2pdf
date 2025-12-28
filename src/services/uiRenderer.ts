/**
 * UI RENDERER SERVICE
 * 
 * Responsavel por renderizacao de UI sem efeitos colaterais.
 * Separa logica de renderizacao da logica de negocio.
 */

import type { Document, LoggerInterface } from '@/types/index'
import { processImagesInPreview } from '@/processors/markdownProcessor'
import { processMermaidDiagrams } from '@/processors/mermaidProcessor'
import { processYamlBlocks } from '@/processors/yamlProcessor'

/**
 * Callback para evento de selecao de documento
 */
type DocumentSelectCallback = (id: number) => void

/**
 * Callback para evento de delecao de documento
 */
type DocumentDeleteCallback = (id: number) => void

/**
 * Servico de renderizacao de UI
 */
export class UIRenderer {
  constructor(private logger?: LoggerInterface) {}

  /**
   * Define o logger apos a instancia criada
   * 
   * @param {LoggerInterface} logger - Logger global
   * @returns {void}
   */
  setLogger(logger: LoggerInterface): void {
    this.logger = logger
  }

  /**
   * Renderiza lista de documentos
   * 
   * @param {HTMLElement} container - Container onde renderizar
   * @param {Document[]} documents - Lista de documentos
   * @param {number} activeId - ID do documento ativo
   * @param {DocumentSelectCallback} onSelect - Callback de selecao
   * @param {DocumentDeleteCallback} onDelete - Callback de delecao
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

      // Container para nome
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
      deleteBtn.setAttribute('aria-label', `Deletar documento ${doc.name}`)
      deleteBtn.setAttribute('tabindex', '-1')
      deleteBtn.setAttribute('title', 'Clique para deletar (ou pressione Delete na selecao)')
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
   * - Estimativa de paginas
   * 
   * @param {HTMLElement} container - Container para renderizar
   * @param {string} html - HTML sanitizado ja processado
   * @returns {Promise<void>}
   */
  async renderPreview(container: HTMLElement, html: string): Promise<void> {
    if (!container) return

    // Limpar container de forma segura
    while (container.firstChild) {
      container.removeChild(container.firstChild)
    }

    // Inserir HTML diretamente usando insertAdjacentHTML (nao sanitiza novamente)
    // O HTML ja foi sanitizado pelo DOMPurify em processMarkdown()
    container.insertAdjacentHTML('afterbegin', html)

    // Processar imagens com cache
    try {
      const imagesProcessed = await processImagesInPreview(container, true)
      if (imagesProcessed > 0) {
        this.logger?.log?.(`${imagesProcessed} imagem(ns) otimizada(s) para A4`, 'success')
      }
    } catch (e) {
      this.logger?.error?.(`Erro ao processar imagens: ${String(e)}`)
    }

    // Processar diagramas Mermaid (lazy loaded)
    try {
      const diagramsProcessed = await processMermaidDiagrams(container)
      if (diagramsProcessed > 0) {
        this.logger?.log?.(`${diagramsProcessed} diagrama(s) Mermaid renderizado(s)`, 'success')
      }
    } catch (e) {
      this.logger?.error?.(`Erro ao processar diagramas Mermaid: ${String(e)}`)
    }

    // Processar blocos YAML (lazy loaded)
    try {
      const yamlProcessed = await processYamlBlocks(container)
      if (yamlProcessed > 0) {
        this.logger?.log?.(`${yamlProcessed} bloco(s) YAML renderizado(s)`, 'success')
      }
    } catch (e) {
      this.logger?.error?.(`Erro ao processar blocos YAML: ${String(e)}`)
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
   * Atualiza metrica de memoria
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
   * @param {number} duration - Duracao do flash em ms
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
 * Instancia singleton do UIRenderer
 */
export const uiRenderer = new UIRenderer()
