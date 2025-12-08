/**
 * Tipos globais da aplicação
 */

import type { EditorView } from 'codemirror'

export type StorageType = 'local' | 'disk' | 'cloud'

export type SaveStatus = 'saved' | 'modified' | 'saving' | 'error'

export interface Document {
  id: number
  name: string
  content: string
  updated: number
  storage: StorageType
  lastSaved: number | null
  isDirty: boolean
  /** File handle for disk storage (File System Access API) */
  fileHandle?: FileSystemFileHandle
  /** Remote ID for cloud storage */
  remoteId?: string
}

export interface AppState {
  docs: Document[]
  currentId: number | null
  editor: EditorView | null
}

/**
 * Declara Logger globalmente em window
 */
declare global {
  interface Window {
    Logger: LoggerInterface
  }
}

export interface LogLine {
  time: string
  message: string
  type: 'info' | 'error' | 'success' | 'warning' | 'system'
}

export interface ValidationResult {
  isValid: boolean
  issues: string[]
  warnings: string[]
}

export interface PrintStats {
  estimatedPages: number
  words: number
  characters: number
  paragraphs: number
  readingTime: number
  imageCount: number
  codeBlocks: number
}

export interface SyncQueueItem {
  id: string
  type: 'save' | 'delete' | 'create'
  docId?: number
  data?: unknown
  timestamp: number
}

export interface ConnectivityStatus {
  isOnline: boolean
  queueSize: number
  timestamp: number
}

export interface LoggerInterface {
  log: (msg: string, type?: 'info' | 'error' | 'success' | 'warning') => void
  error: (msg: string) => void
  success: (msg: string) => void
}

export interface ImageProcessResult {
  count: number
  errors: string[]
}

export interface CacheEntry {
  url: string
  width: number
  height: number
  dataUrl: string
  timestamp: number
  size: number
}

export interface ReporterResult {
  checks: string[]
  warnings: string[]
}

export interface DocumentAnalysis {
  estimatedPages: number
  words: number
  characters: number
  paragraphs: number
  readingTime: number
  imageCount: number
  codeBlocks: number
  tables: number
  headings: number
}

// ============================================
// STORAGE PROVIDER INTERFACES
// ============================================

/**
 * Metadata for a stored document
 */
export interface StorageDocumentMeta {
  id: string
  name: string
  size: number
  updated: number
  created: number
}

/**
 * Result of a storage operation
 */
export interface StorageResult<T = void> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Interface for storage providers (local, disk, cloud)
 */
export interface StorageProvider {
  /** Provider type identifier */
  readonly type: StorageType
  
  /** Check if provider is available */
  isAvailable(): boolean
  
  /** Save document content */
  save(doc: Document): Promise<StorageResult<Document>>
  
  /** Load document content by ID */
  load(id: string): Promise<StorageResult<Document>>
  
  /** Delete document */
  delete(id: string): Promise<StorageResult>
  
  /** List all documents */
  list(): Promise<StorageResult<StorageDocumentMeta[]>>
  
  /** Check if document exists */
  exists(id: string): Promise<boolean>
}

/**
 * Options for storage migration
 */
export interface MigrationOptions {
  sourceType: StorageType
  targetType: StorageType
  documentId: number
  /** If true, delete from source after successful migration */
  deleteSource?: boolean
}
