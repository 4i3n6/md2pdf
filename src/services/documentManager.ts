import { StorageKeys } from '@/constants'
import type { Document, LoggerInterface } from '@/types/index'

type DocumentChangeCallback = (docs: Document[]) => void
export class DocumentManager {
  private docs: Document[] = []
  private observers: DocumentChangeCallback[] = []
  private readonly defaultDoc: Document = {
    id: 1,
    name: 'README.md',
    content: '# SYSTEM READY\n\nPanel loaded successfully.\n\n- Editor Active\n- Renderer Ready\n- Memory OK',
    updated: Date.now(),
    lastSaved: Date.now()
  }

  constructor(private logger?: LoggerInterface) {}

  setLogger(logger: LoggerInterface): void {
    this.logger = logger
  }

  init(): void {
    this.load()
    this.logger?.log?.(`Loaded ${this.docs.length} document(s)`)
  }

  private load(): void {
    const currentDocs = this.loadFromStorage(StorageKeys.documents)
    if (currentDocs && currentDocs.length > 0) {
        this.docs = currentDocs
        return
    }

    const legacyDocs = this.loadFromStorage(StorageKeys.legacyDocuments)
    if (legacyDocs && legacyDocs.length > 0) {
        this.docs = legacyDocs
        this.persist()
        this.logger?.success?.('Migration complete: md2pdf-docs-v2 -> md2pdf-docs-v3')
        return
    }

    this.docs = [this.defaultDoc]
    this.logger?.log?.('No data found. Creating default document.')
  }

  private loadFromStorage(storageKey: string): Document[] | null {
    try {
        const raw = localStorage.getItem(storageKey)
        if (!raw) {
            return null
        }

        const parsed = JSON.parse(raw)
        return this.normalizeDocuments(parsed)
    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e)
        this.logger?.error?.(`Failed to read ${storageKey}: ${errorMessage}`)
        return null
    }
  }

  private normalizeDocuments(rawDocs: unknown): Document[] {
    if (!Array.isArray(rawDocs)) {
        return []
    }

    return rawDocs.map((item: unknown, index: number) => {
        const doc = item && typeof item === 'object' ? (item as Partial<Document>) : {}
        const updated = typeof doc.updated === 'number' ? doc.updated : Date.now()
        const lastSaved = typeof doc.lastSaved === 'number' ? doc.lastSaved : updated

        return {
            id: typeof doc.id === 'number' ? doc.id : this.generateDocumentId(index),
            name: typeof doc.name === 'string' && doc.name.length > 0 ? doc.name : 'Untitled.md',
            content: typeof doc.content === 'string' ? doc.content : '',
            updated,
            lastSaved
        }
    })
  }

  private generateDocumentId(index: number = 0): number {
    return Date.now() + index + Math.floor(Math.random() * 1000)
  }

  private save(): void {
    try {
      localStorage.setItem(StorageKeys.documents, JSON.stringify(this.docs))
      this.notifyObservers()
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e)
      this.logger?.error?.(`Failed to save documents: ${errorMessage}`)
    }
  }

  persist(): void {
    this.save()
  }

  private notifyObservers(): void {
    this.observers.forEach((callback) => {
      try {
        callback([...this.docs])
      } catch (e) {
        this.logger?.error?.(`Error in observer callback: ${String(e)}`)
      }
    })
  }

  getAll(): Document[] {
    return [...this.docs]
  }

  getById(id: number): Document | undefined {
    return this.docs.find((d) => d.id === id)
  }

  create(name?: string): Document {
    let docName = name || `UNTITLED_${Math.floor(Math.random() * 1000)}`

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
    this.logger?.log?.(`Document created [ID: ${newDoc.id}]`)
    return newDoc
  }

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
    this.logger?.log?.(`File imported: ${name} [ID: ${newDoc.id}]`)
    return newDoc
  }

  update(id: number, updates: Partial<Omit<Document, 'id'>>): Document | undefined {
    const doc = this.getById(id)
    if (!doc) {
      this.logger?.error?.(`Document ${id} not found`)
      return undefined
    }

    Object.assign(doc, updates, { updated: Date.now(), lastSaved: Date.now() })
    this.save()
    return doc
  }

  delete(id: number): boolean {
    if (this.docs.length <= 1) {
      this.logger?.error?.('Blocked: minimum 1 document required.')
      return false
    }

    const initialLength = this.docs.length
    this.docs = this.docs.filter((d) => d.id !== id)

    if (this.docs.length < initialLength) {
      this.save()
      this.logger?.log?.(`Document ${id} removed.`)
      return true
    }

    return false
  }

  rename(id: number, newName: string): Document | undefined {
    return this.update(id, { name: newName })
  }

  setContent(id: number, content: string): Document | undefined {
    return this.update(id, { content })
  }

  replaceAll(docs: Document[]): void {
    const normalized = this.normalizeDocuments(docs)
    if (normalized.length === 0) {
      this.docs = [this.defaultDoc]
      this.save()
      this.logger?.log?.('Empty backup. Default document restored.')
      return
    }

    this.docs = normalized
    this.save()
  }

  subscribe(callback: DocumentChangeCallback): () => void {
    this.observers.push(callback)

    return () => {
      this.observers = this.observers.filter((cb) => cb !== callback)
    }
  }

  getSize(): number {
    return JSON.stringify(this.docs).length
  }

  clear(): void {
    this.docs = [this.defaultDoc]
    this.save()
    this.logger?.log?.('All documents cleared')
  }
}

export const documentManager = new DocumentManager()
