import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DocumentManager } from './documentManager'
import { StorageKeys } from '@/constants'
import type { LoggerInterface, Document } from '@/types/index'

// Mock para o Logger
const mockLogger: LoggerInterface = {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    success: vi.fn(),
    info: vi.fn()
} as unknown as LoggerInterface

describe('DocumentManager', () => {
    let docManager: DocumentManager
    let store: Record<string, string> = {}

    beforeEach(() => {
        // Definir mock do localStorage
        store = {}

        Object.defineProperty(window, 'localStorage', {
            value: {
                getItem: vi.fn((key: string) => store[key] || null),
                setItem: vi.fn((key: string, value: string) => {
                    store[key] = value.toString()
                }),
                removeItem: vi.fn((key: string) => {
                    delete store[key]
                }),
                clear: vi.fn(() => {
                    store = {}
                })
            },
            writable: true
        })

        docManager = new DocumentManager(mockLogger)
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it('deve inicializar com um documento padrao se o storage estiver vazio', () => {
        docManager.init()
        const docs = docManager.getAll()

        expect(docs).toHaveLength(1)
        expect(docs[0].name).toBe('README.md')
        expect(mockLogger.log).toHaveBeenCalledWith('No data found. Creating default document.')
    })

    it('deve criar um novo documento', () => {
        docManager.init()
        const newDoc = docManager.create('Novo Doc')

        const docs = docManager.getAll()
        expect(docs).toHaveLength(2) // 1 default + 1 new
        expect(docs[0]).toEqual(newDoc) // new document is prepended to the list
        expect(newDoc.name).toBe('Novo Doc.md')
    })

    it('deve salvar e persistir documentos no localStorage', () => {
        docManager.init()
        docManager.create('Teste Persistencia')

        const newManager = new DocumentManager(mockLogger)
        newManager.init()

        const docs = newManager.getAll()
        expect(docs).toHaveLength(2)
        expect(docs[0].name).toBe('Teste Persistencia.md')
    })

    it('deve atualizar o conteudo de um documento', () => {
        docManager.init()
        const doc = docManager.create('Doc Editavel')

        const updatedDoc = docManager.setContent(doc.id, '# Novo Conteudo')

        expect(updatedDoc).toBeDefined()
        expect(updatedDoc?.content).toBe('# Novo Conteudo')

        const storedDocs = JSON.parse(store[StorageKeys.documents] || '[]')
        const storedDoc = storedDocs.find((d: Document) => d.id === doc.id)
        expect(storedDoc.content).toBe('# Novo Conteudo')
    })

    it('deve deletar um documento, mantendo pelo menos um', () => {
        vi.useFakeTimers()
        docManager.init()

        vi.setSystemTime(new Date(2024, 1, 1, 10, 0, 0))
        const doc1 = docManager.create('Doc 1')

        vi.setSystemTime(new Date(2024, 1, 1, 10, 0, 1))
        const doc2 = docManager.create('Doc 2')

        expect(doc1.id).not.toBe(doc2.id)

        const deleted = docManager.delete(doc1.id)
        expect(deleted).toBe(true)

        const currentDocs = docManager.getAll()
        expect(currentDocs).toHaveLength(2)
        expect(currentDocs.find(d => d.id === doc1.id)).toBeUndefined()
        expect(currentDocs.find(d => d.id === doc2.id)).toBeDefined()

        docManager.delete(doc2.id)
        expect(docManager.getAll()).toHaveLength(1) // README only

        const lastDoc = docManager.getAll()[0]
        const deletedLast = docManager.delete(lastDoc.id)
        expect(deletedLast).toBe(false)
        expect(docManager.getAll()).toHaveLength(1)
        expect(mockLogger.error).toHaveBeenCalledWith('Blocked: minimum 1 document required.')
    })
})
