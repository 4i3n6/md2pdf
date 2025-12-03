/**
 * Tipos globais da aplicação
 */

import type { EditorView } from 'codemirror'

export interface Document {
  id: number
  name: string
  content: string
  updated: number
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
