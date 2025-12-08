/**
 * DOCUMENT MANAGER SERVICE
 * 
 * Gerencia estado de documentos com:
 * - CRUD operations
 * - Persistencia em localStorage
 * - Observer pattern para notificacoes
 * - Type-safe document management
 */

import type { Document, LoggerInterface } from '@/types/index'

/**
 * Tipo para callbacks de mudanca de documentos
 */
type DocumentChangeCallback = (docs: Document[]) => void

/**
 * Gerenciador centralizado de documentos
 */
export class DocumentManager {
  private docs: Document[] = []
  private observers: DocumentChangeCallback[] = []
  private readonly STORAGE_KEY = 'md2pdf-docs-v3'
  private readonly defaultDoc: Document = {
    id: 1,
    name: 'README.md',
    content: '# SISTEMA INICIADO\n\nPainel carregado com sucesso.\n\n- Editor Ativo\n- Renderizador Pronto\n- Memoria OK',
    updated: Date.now(),
    lastSaved: Date.now()
  }

  constructor(private logger?: LoggerInterface) {}

  /**
   * Inicializa o gerenciador carregando documentos do localStorage
   * 
   * @returns {void}
   */
  init(): void {
    this.load()
    this.logger?.log?.(`Carregado ${this.docs.length} documentos`)
  }

  /**
   * Carrega documentos do localStorage
   * 
   * @private
   * @returns {void}
   */
  private load(): void {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        // Garantir que cada doc tem os campos necessarios
        this.docs = parsed.map((doc: Partial<Document>) => ({
          id: doc.id || Date.now(),
          name: doc.name || 'Untitled.md',
          content: doc.content || '',
          updated: doc.updated || Date.now(),
          lastSaved: doc.lastSaved || Date.now()
        }))
        if (this.docs.length === 0) {
          this.docs = [this.defaultDoc]
        }
      } else {
        this.docs = [this.defaultDoc]
        this.logger?.log?.('Nenhum dado encontrado. Criando documento padrao.')
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e)
      this.logger?.error?.(`Falha ao carregar documentos: ${errorMessage}`)
      this.docs = [this.defaultDoc]
    }
  }

  /**
   * Salva documentos no localStorage e notifica observers
   * 
   * @private
   * @returns {void}
   */
  private save(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.docs))
      this.notifyObservers()
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e)
      this.logger?.error?.(`Erro ao salvar documentos: ${errorMessage}`)
    }
  }

  /**
   * Notifica todos os observers sobre mudanca
   * 
   * @private
   * @returns {void}
   */
  private notifyObservers(): void {
    this.observers.forEach((callback) => {
      try {
        callback([...this.docs])
      } catch (e) {
        this.logger?.error?.(`Erro em observer callback: ${String(e)}`)
      }
    })
  }

  /**
   * Obtem todos os documentos
   * 
   * @returns {Document[]} Array de documentos (copia)
   */
  getAll(): Document[] {
    return [...this.docs]
  }

  /**
   * Obtem um documento especifico por ID
   * 
   * @param {number} id - ID do documento
   * @returns {Document | undefined} Documento encontrado ou undefined
   */
  getById(id: number): Document | undefined {
    return this.docs.find((d) => d.id === id)
  }

  /**
   * Cria um novo documento vazio
   * 
   * @param {string} name - Nome do documento (padrao: 'Untitled_XXXX.md')
   * @returns {Document} Novo documento criado
   */
  create(name?: string): Document {
    let docName = name || `UNTITLED_${Math.floor(Math.random() * 1000)}`
    
    // Adicionar extensao .md se nao houver
    if (!docName.endsWith('.md')) {
      docName += '.md'
    }
    
    const newDoc: Document = {
      id: Date.now(),
      name: docName,
      content: '',
      updated: Date.now(),
      lastSaved: Date.now()
    }
    this.docs.unshift(newDoc)
    this.save()
    this.logger?.log?.(`Documento criado [ID: ${newDoc.id}]`)
    return newDoc
  }

  /**
   * Cria um documento a partir de conteudo importado
   * 
   * @param {string} name - Nome do arquivo
   * @param {string} content - Conteudo do arquivo
   * @returns {Document} Documento criado
   */
  createFromImport(name: string, content: string): Document {
    const newDoc: Document = {
      id: Date.now(),
      name,
      content,
      updated: Date.now(),
      lastSaved: Date.now()
    }
    this.docs.unshift(newDoc)
    this.save()
    this.logger?.log?.(`Arquivo importado: ${name} [ID: ${newDoc.id}]`)
    return newDoc
  }

  /**
   * Atualiza um documento existente
   * 
   * @param {number} id - ID do documento
   * @param {Partial<Omit<Document, 'id'>>} updates - Campos a atualizar
   * @returns {Document | undefined} Documento atualizado ou undefined
   */
  update(id: number, updates: Partial<Omit<Document, 'id'>>): Document | undefined {
    const doc = this.getById(id)
    if (!doc) {
      this.logger?.error?.(`Documento ${id} nao encontrado`)
      return undefined
    }

    Object.assign(doc, updates, { updated: Date.now(), lastSaved: Date.now() })
    this.save()
    return doc
  }

  /**
   * Deleta um documento por ID
   * 
   * Requer minimo de 1 documento na lista.
   * 
   * @param {number} id - ID do documento
   * @returns {boolean} true se deletado, false caso contrario
   */
  delete(id: number): boolean {
    if (this.docs.length <= 1) {
      this.logger?.error?.('Bloqueado: Minimo 1 documento requerido.')
      return false
    }

    const initialLength = this.docs.length
    this.docs = this.docs.filter((d) => d.id !== id)

    if (this.docs.length < initialLength) {
      this.save()
      this.logger?.log?.(`Documento ${id} removido.`)
      return true
    }

    return false
  }

  /**
   * Renomeia um documento
   * 
   * @param {number} id - ID do documento
   * @param {string} newName - Novo nome
   * @returns {Document | undefined} Documento atualizado ou undefined
   */
  rename(id: number, newName: string): Document | undefined {
    return this.update(id, { name: newName })
  }

  /**
   * Atualiza conteudo de um documento
   * 
   * @param {number} id - ID do documento
   * @param {string} content - Novo conteudo
   * @returns {Document | undefined} Documento atualizado ou undefined
   */
  setContent(id: number, content: string): Document | undefined {
    return this.update(id, { content })
  }

  /**
   * Registra um observer para notificacoes de mudanca
   * 
   * @param {DocumentChangeCallback} callback - Funcao chamada quando documentos mudam
   * @returns {() => void} Funcao para desinscrever o observer
   */
  subscribe(callback: DocumentChangeCallback): () => void {
    this.observers.push(callback)

    // Retorna funcao de desinscricao
    return () => {
      this.observers = this.observers.filter((cb) => cb !== callback)
    }
  }

  /**
   * Obtem tamanho total em bytes
   * 
   * @returns {number} Tamanho em bytes
   */
  getSize(): number {
    return JSON.stringify(this.docs).length
  }

  /**
   * Limpa todos os dados (para debugging/testes)
   * 
   * @returns {void}
   */
  clear(): void {
    this.docs = [this.defaultDoc]
    this.save()
    this.logger?.log?.('Todos os documentos foram limpos')
  }
}

/**
 * Instancia singleton do DocumentManager
 */
export const documentManager = new DocumentManager()
