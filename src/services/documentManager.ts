/**
 * DOCUMENT MANAGER SERVICE
 * 
 * Gerencia estado de documentos com:
 * - CRUD operations
 * - Persistência via StorageManager (local/disk/cloud)
 * - Observer pattern para notificações
 * - Type-safe document management
 */

import type { Document, LoggerInterface, StorageType, MigrationOptions } from '@/types/index'
import { storageManager } from './storageManager'

/**
 * Tipo para callbacks de mudança de documentos
 */
type DocumentChangeCallback = (docs: Document[]) => void

/**
 * Gerenciador centralizado de documentos
 */
export class DocumentManager {
  private docs: Document[] = []
  private observers: DocumentChangeCallback[] = []
  private readonly STORAGE_KEY = 'md2pdf-docs-v2'
  private readonly defaultDoc: Document = {
    id: 1,
    name: 'README.md',
    content: '# SISTEMA INICIADO\n\nPainel carregado com sucesso.\n\n- Editor Ativo\n- Renderizador Pronto\n- Memória OK',
    updated: Date.now(),
    storage: 'local',
    lastSaved: Date.now(),
    isDirty: false
  }

  constructor(private logger?: LoggerInterface) {}

  /**
   * Inicializa o gerenciador carregando documentos do localStorage
   * 
   * @returns {void}
   */
  init(): void {
    this.load()
    this.logger?.log?.(`Carregado ${this.docs.length} documentos do armazenamento`)
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
        this.docs = JSON.parse(raw)
        if (this.docs.length === 0) {
          this.docs = [this.defaultDoc]
        } else {
          // Migrar documentos antigos que não têm os novos campos
          this.migrateDocuments()
        }
      } else {
        this.docs = [this.defaultDoc]
        this.logger?.log?.('Nenhum dado encontrado. Criando documento padrão.')
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e)
      this.logger?.error?.(`Falha ao carregar documentos: ${errorMessage}`)
      this.docs = [this.defaultDoc]
    }
  }

  /**
   * Migra documentos antigos para incluir novos campos
   * 
   * @private
   * @returns {void}
   */
  private migrateDocuments(): void {
    let needsSave = false
    
    this.docs = this.docs.map((doc) => {
      // Verificar se precisa migrar (campo storage não existe)
      if (doc.storage === undefined) {
        needsSave = true
        return {
          ...doc,
          storage: 'local' as const,
          lastSaved: doc.updated || Date.now(),
          isDirty: false
        }
      }
      return doc
    })
    
    if (needsSave) {
      this.logger?.log?.('Documentos migrados para novo formato')
      // Salvar sem notificar observers (ainda não inicializados)
      try {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.docs))
      } catch (e) {
        this.logger?.error?.(`Erro ao salvar migração: ${String(e)}`)
      }
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
   * Notifica todos os observers sobre mudança
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
   * Obtém todos os documentos
   * 
   * @returns {Document[]} Array de documentos (cópia)
   */
  getAll(): Document[] {
    return [...this.docs]
  }

  /**
   * Obtém um documento específico por ID
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
    * @param {string} name - Nome do documento (padrão: 'Untitled_XXXX.md')
    * @returns {Document} Novo documento criado
    */
   create(name?: string): Document {
     let docName = name || `UNTITLED_${Math.floor(Math.random() * 1000)}`
     
     // Adicionar extensão .md se não houver
     if (!docName.endsWith('.md')) {
       docName += '.md'
     }
     
     const newDoc: Document = {
       id: Date.now(),
       name: docName,
       content: '',
       updated: Date.now(),
       storage: 'local',
       lastSaved: Date.now(),
       isDirty: false
     }
     this.docs.unshift(newDoc)
     this.save()
     this.logger?.log?.(`Documento criado [ID: ${newDoc.id}]`)
     return newDoc
   }

   /**
    * Cria um documento a partir de um arquivo do disco
    * 
    * @param {string} name - Nome do arquivo
    * @param {string} content - Conteúdo do arquivo
    * @param {FileSystemFileHandle} fileHandle - Handle do arquivo para salvamento direto
    * @returns {Document} Documento criado
    */
   createFromFile(name: string, content: string, fileHandle: FileSystemFileHandle): Document {
     const newDoc: Document = {
       id: Date.now(),
       name,
       content,
       updated: Date.now(),
       storage: 'disk',
       lastSaved: Date.now(),
       isDirty: false,
       fileHandle
     }
     this.docs.unshift(newDoc)
     this.save()
     this.logger?.log?.(`Arquivo aberto: ${name} [ID: ${newDoc.id}]`)
     return newDoc
   }

   /**
    * Atualiza o fileHandle de um documento (após Save As)
    * 
    * @param {number} id - ID do documento
    * @param {FileSystemFileHandle} fileHandle - Novo handle do arquivo
    * @returns {Document | undefined} Documento atualizado ou undefined
    */
   setFileHandle(id: number, fileHandle: FileSystemFileHandle): Document | undefined {
     const doc = this.getById(id)
     if (!doc) {
       this.logger?.error?.(`Documento ${id} não encontrado`)
       return undefined
     }
     
     doc.fileHandle = fileHandle
     doc.storage = 'disk'
     doc.lastSaved = Date.now()
     doc.isDirty = false
     this.save()
     this.logger?.log?.(`Handle atualizado para doc ${id}`)
     return doc
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
      this.logger?.error?.(`Documento ${id} não encontrado`)
      return undefined
    }

    Object.assign(doc, updates, { updated: Date.now() })
    this.save()
    return doc
  }

  /**
   * Deleta um documento por ID
   * 
   * Requer mínimo de 1 documento na lista.
   * 
   * @param {number} id - ID do documento
   * @returns {boolean} true se deletado, false caso contrário
   */
  delete(id: number): boolean {
    if (this.docs.length <= 1) {
      this.logger?.error?.('Bloqueado: Mínimo 1 documento requerido.')
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
   * Atualiza conteúdo de um documento
   * 
   * @param {number} id - ID do documento
   * @param {string} content - Novo conteúdo
   * @returns {Document | undefined} Documento atualizado ou undefined
   */
  setContent(id: number, content: string): Document | undefined {
    return this.update(id, { content })
  }

  /**
   * Registra um observer para notificações de mudança
   * 
   * @param {DocumentChangeCallback} callback - Função chamada quando documentos mudam
   * @returns {() => void} Função para desinscrever o observer
   */
  subscribe(callback: DocumentChangeCallback): () => void {
    this.observers.push(callback)

    // Retorna função de desinscrição
    return () => {
      this.observers = this.observers.filter((cb) => cb !== callback)
    }
  }

  /**
   * Obtém tamanho total em bytes
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

  // ============================================
  // STORAGE MANAGER INTEGRATION
  // ============================================

  /**
   * Migra um documento para outro tipo de storage
   * 
   * @param {number} id - ID do documento
   * @param {StorageType} targetStorage - Tipo de storage destino
   * @param {boolean} deleteFromSource - Se true, remove do storage original
   * @returns {Promise<Document | undefined>} Documento migrado ou undefined
   */
  async migrateStorage(
    id: number,
    targetStorage: StorageType,
    deleteFromSource: boolean = false
  ): Promise<Document | undefined> {
    const doc = this.getById(id)
    if (!doc) {
      this.logger?.error?.(`Documento ${id} não encontrado para migração`)
      return undefined
    }

    const options: MigrationOptions = {
      sourceType: doc.storage,
      targetType: targetStorage,
      documentId: id,
      deleteSource: deleteFromSource
    }

    const result = await storageManager.migrate(doc, options)
    
    if (result.success && result.data) {
      // Atualizar documento local
      Object.assign(doc, result.data)
      this.save()
      this.logger?.log?.(`Documento ${id} migrado para ${targetStorage}`)
      return doc
    }

    this.logger?.error?.(result.error || 'Erro na migração')
    return undefined
  }

  /**
   * Salva documento no storage apropriado (baseado em doc.storage)
   * 
   * @param {number} id - ID do documento
   * @returns {Promise<boolean>} true se salvou com sucesso
   */
  async saveToStorage(id: number): Promise<boolean> {
    const doc = this.getById(id)
    if (!doc) {
      this.logger?.error?.(`Documento ${id} não encontrado`)
      return false
    }

    const result = await storageManager.save(doc)
    
    if (result.success && result.data) {
      // Atualizar documento local com dados retornados
      Object.assign(doc, result.data)
      this.save() // Persistir estado local
      return true
    }

    this.logger?.error?.(result.error || 'Erro ao salvar')
    return false
  }

  /**
   * Registra um fileHandle no DiskStorageProvider
   * 
   * @param {number} id - ID do documento
   * @param {FileSystemFileHandle} handle - Handle do arquivo
   */
  registerDiskHandle(id: number, handle: FileSystemFileHandle): void {
    storageManager.disk.registerHandle(String(id), handle)
  }

  /**
   * Obtém o storageManager para operações avançadas
   */
  getStorageManager() {
    return storageManager
  }

  /**
   * Lista tipos de storage disponíveis
   */
  getAvailableStorageTypes(): StorageType[] {
    return storageManager.getAvailableTypes()
  }
}

/**
 * Instância singleton do DocumentManager
 */
export const documentManager = new DocumentManager()
