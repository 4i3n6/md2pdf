/**
 * UNIFIED STORAGE MANAGER
 * 
 * Provides a unified interface for document storage across:
 * - localStorage (browser)
 * - File System Access API (disk)
 * - Cloud storage (future: Cloudflare R2)
 * 
 * Uses Strategy pattern with StorageProvider interface
 */

import type {
  Document,
  StorageType,
  StorageProvider,
  StorageResult,
  StorageDocumentMeta,
  MigrationOptions
} from '@/types/index'
import {
  isFileSystemAccessSupported,
  saveFileToDisk,
  openFileFromDisk,
  verifyFileHandle
} from './fileSystemService'

// ============================================
// LOCAL STORAGE PROVIDER
// ============================================

const LOCAL_STORAGE_KEY = 'md2pdf-docs-v2'

/**
 * Provider for browser localStorage
 */
export class LocalStorageProvider implements StorageProvider {
  readonly type: StorageType = 'local'

  isAvailable(): boolean {
    try {
      const test = '__storage_test__'
      localStorage.setItem(test, test)
      localStorage.removeItem(test)
      return true
    } catch {
      return false
    }
  }

  async save(doc: Document): Promise<StorageResult<Document>> {
    try {
      const docs = this.getAllDocs()
      const index = docs.findIndex(d => d.id === doc.id)
      
      const updatedDoc = {
        ...doc,
        storage: 'local' as const,
        lastSaved: Date.now(),
        isDirty: false
      }
      
      if (index >= 0) {
        docs[index] = updatedDoc
      } else {
        docs.unshift(updatedDoc)
      }
      
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(docs))
      
      return { success: true, data: updatedDoc }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save to localStorage'
      }
    }
  }

  async load(id: string): Promise<StorageResult<Document>> {
    try {
      const docs = this.getAllDocs()
      const doc = docs.find(d => String(d.id) === id)
      
      if (!doc) {
        return { success: false, error: 'Document not found' }
      }
      
      return { success: true, data: doc }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load from localStorage'
      }
    }
  }

  async delete(id: string): Promise<StorageResult> {
    try {
      const docs = this.getAllDocs()
      const filtered = docs.filter(d => String(d.id) !== id)
      
      if (filtered.length === docs.length) {
        return { success: false, error: 'Document not found' }
      }
      
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered))
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete from localStorage'
      }
    }
  }

  async list(): Promise<StorageResult<StorageDocumentMeta[]>> {
    try {
      const docs = this.getAllDocs()
      const meta: StorageDocumentMeta[] = docs.map(doc => ({
        id: String(doc.id),
        name: doc.name,
        size: doc.content.length,
        updated: doc.updated,
        created: doc.id // ID is timestamp-based
      }))
      
      return { success: true, data: meta }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list from localStorage'
      }
    }
  }

  async exists(id: string): Promise<boolean> {
    const docs = this.getAllDocs()
    return docs.some(d => String(d.id) === id)
  }

  /**
   * Get all documents from localStorage
   */
  private getAllDocs(): Document[] {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
      if (!raw) return []
      return JSON.parse(raw)
    } catch {
      return []
    }
  }

  /**
   * Get total storage size in bytes
   */
  getSize(): number {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
    return raw ? raw.length : 0
  }
}

// ============================================
// DISK STORAGE PROVIDER
// ============================================

/**
 * Provider for File System Access API (disk storage)
 */
export class DiskStorageProvider implements StorageProvider {
  readonly type: StorageType = 'disk'
  
  /** Cache of file handles by document ID */
  private handleCache: Map<string, FileSystemFileHandle> = new Map()

  isAvailable(): boolean {
    return isFileSystemAccessSupported()
  }

  /**
   * Register a file handle for a document
   */
  registerHandle(docId: string, handle: FileSystemFileHandle): void {
    this.handleCache.set(docId, handle)
  }

  /**
   * Get cached file handle for a document
   */
  getHandle(docId: string): FileSystemFileHandle | undefined {
    return this.handleCache.get(docId)
  }

  /**
   * Remove handle from cache
   */
  removeHandle(docId: string): void {
    this.handleCache.delete(docId)
  }

  async save(doc: Document): Promise<StorageResult<Document>> {
    try {
      const handle = doc.fileHandle || this.handleCache.get(String(doc.id))
      
      if (!handle) {
        return {
          success: false,
          error: 'No file handle available. Use "Save to Disk" first.'
        }
      }

      // Verify handle is still valid
      const isValid = await verifyFileHandle(handle)
      if (!isValid) {
        this.handleCache.delete(String(doc.id))
        return {
          success: false,
          error: 'File handle is no longer valid. File may have been moved or deleted.'
        }
      }

      await saveFileToDisk(doc.content, { handle })
      
      const updatedDoc: Document = {
        ...doc,
        storage: 'disk',
        lastSaved: Date.now(),
        isDirty: false,
        fileHandle: handle
      }
      
      // Update cache
      this.handleCache.set(String(doc.id), handle)
      
      return { success: true, data: updatedDoc }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save to disk'
      }
    }
  }

  async load(id: string): Promise<StorageResult<Document>> {
    try {
      const handle = this.handleCache.get(id)
      
      if (!handle) {
        return {
          success: false,
          error: 'No file handle available for this document'
        }
      }

      const file = await handle.getFile()
      const content = await file.text()
      
      const doc: Document = {
        id: parseInt(id, 10),
        name: file.name,
        content,
        updated: file.lastModified,
        storage: 'disk',
        lastSaved: file.lastModified,
        isDirty: false,
        fileHandle: handle
      }
      
      return { success: true, data: doc }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load from disk'
      }
    }
  }

  async delete(id: string): Promise<StorageResult> {
    // For disk storage, we just remove from cache
    // We don't actually delete the file from disk
    this.handleCache.delete(id)
    return { success: true }
  }

  async list(): Promise<StorageResult<StorageDocumentMeta[]>> {
    // List all documents with cached handles
    const meta: StorageDocumentMeta[] = []
    
    for (const [id, handle] of this.handleCache.entries()) {
      try {
        const file = await handle.getFile()
        meta.push({
          id,
          name: file.name,
          size: file.size,
          updated: file.lastModified,
          created: file.lastModified
        })
      } catch {
        // Handle invalid, remove from cache
        this.handleCache.delete(id)
      }
    }
    
    return { success: true, data: meta }
  }

  async exists(id: string): Promise<boolean> {
    const handle = this.handleCache.get(id)
    if (!handle) return false
    
    return verifyFileHandle(handle)
  }

  /**
   * Open a new file from disk
   */
  async openFile(): Promise<StorageResult<Document>> {
    try {
      const result = await openFileFromDisk()
      
      const doc: Document = {
        id: Date.now(),
        name: result.name,
        content: result.content,
        updated: Date.now(),
        storage: 'disk',
        lastSaved: Date.now(),
        isDirty: false,
        fileHandle: result.handle
      }
      
      // Cache the handle
      this.handleCache.set(String(doc.id), result.handle)
      
      return { success: true, data: doc }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to open file'
      }
    }
  }
}

// ============================================
// CLOUD STORAGE PROVIDER (Placeholder)
// ============================================

/**
 * Provider for cloud storage (Cloudflare R2)
 * This is a placeholder for Phase 4 implementation
 */
export class CloudStorageProvider implements StorageProvider {
  readonly type: StorageType = 'cloud'
  
  private apiEndpoint: string = ''
  private authToken: string | null = null

  isAvailable(): boolean {
    // Cloud storage requires authentication
    return this.authToken !== null && this.apiEndpoint !== ''
  }

  /**
   * Configure cloud storage endpoint and authentication
   */
  configure(endpoint: string, token: string): void {
    this.apiEndpoint = endpoint
    this.authToken = token
  }

  /**
   * Clear authentication
   */
  logout(): void {
    this.authToken = null
  }

  async save(_doc: Document): Promise<StorageResult<Document>> {
    if (!this.isAvailable()) {
      return { success: false, error: 'Cloud storage not configured' }
    }
    
    // Placeholder - will be implemented in Phase 4
    return { success: false, error: 'Cloud storage not yet implemented' }
  }

  async load(_id: string): Promise<StorageResult<Document>> {
    if (!this.isAvailable()) {
      return { success: false, error: 'Cloud storage not configured' }
    }
    
    // Placeholder - will be implemented in Phase 4
    return { success: false, error: 'Cloud storage not yet implemented' }
  }

  async delete(_id: string): Promise<StorageResult> {
    if (!this.isAvailable()) {
      return { success: false, error: 'Cloud storage not configured' }
    }
    
    // Placeholder - will be implemented in Phase 4
    return { success: false, error: 'Cloud storage not yet implemented' }
  }

  async list(): Promise<StorageResult<StorageDocumentMeta[]>> {
    if (!this.isAvailable()) {
      return { success: false, error: 'Cloud storage not configured' }
    }
    
    // Placeholder - will be implemented in Phase 4
    return { success: false, error: 'Cloud storage not yet implemented' }
  }

  async exists(_id: string): Promise<boolean> {
    return false
  }
}

// ============================================
// UNIFIED STORAGE MANAGER
// ============================================

/**
 * Unified storage manager that coordinates between providers
 */
export class StorageManager {
  private providers: Map<StorageType, StorageProvider> = new Map()
  private _defaultProvider: StorageType = 'local'

  constructor() {
    // Initialize providers
    this.providers.set('local', new LocalStorageProvider())
    this.providers.set('disk', new DiskStorageProvider())
    this.providers.set('cloud', new CloudStorageProvider())
  }

  /**
   * Get default provider type
   */
  get defaultProvider(): StorageType {
    return this._defaultProvider
  }

  /**
   * Get a specific provider
   */
  getProvider(type: StorageType): StorageProvider | undefined {
    return this.providers.get(type)
  }

  /**
   * Get the local storage provider
   */
  get local(): LocalStorageProvider {
    return this.providers.get('local') as LocalStorageProvider
  }

  /**
   * Get the disk storage provider
   */
  get disk(): DiskStorageProvider {
    return this.providers.get('disk') as DiskStorageProvider
  }

  /**
   * Get the cloud storage provider
   */
  get cloud(): CloudStorageProvider {
    return this.providers.get('cloud') as CloudStorageProvider
  }

  /**
   * Set the default provider
   */
  setDefault(type: StorageType): void {
    if (this.providers.get(type)?.isAvailable()) {
      this._defaultProvider = type
    }
  }

  /**
   * Get available storage types
   */
  getAvailableTypes(): StorageType[] {
    const available: StorageType[] = []
    for (const [type, provider] of this.providers) {
      if (provider.isAvailable()) {
        available.push(type)
      }
    }
    return available
  }

  /**
   * Save document to appropriate storage
   */
  async save(doc: Document): Promise<StorageResult<Document>> {
    const provider = this.providers.get(doc.storage)
    
    if (!provider) {
      return { success: false, error: `Unknown storage type: ${doc.storage}` }
    }
    
    if (!provider.isAvailable()) {
      // Fallback to local storage
      const localProvider = this.providers.get('local')!
      const result = await localProvider.save({ ...doc, storage: 'local' })
      
      if (result.success) {
        return {
          ...result,
          error: `${doc.storage} storage unavailable, saved to local`
        }
      }
      return result
    }
    
    return provider.save(doc)
  }

  /**
   * Load document from storage
   */
  async load(id: string, type: StorageType): Promise<StorageResult<Document>> {
    const provider = this.providers.get(type)
    
    if (!provider || !provider.isAvailable()) {
      return { success: false, error: `Storage type ${type} is not available` }
    }
    
    return provider.load(id)
  }

  /**
   * Delete document from storage
   */
  async delete(id: string, type: StorageType): Promise<StorageResult> {
    const provider = this.providers.get(type)
    
    if (!provider) {
      return { success: false, error: `Unknown storage type: ${type}` }
    }
    
    return provider.delete(id)
  }

  /**
   * Migrate document between storage types
   */
  async migrate(doc: Document, options: MigrationOptions): Promise<StorageResult<Document>> {
    const sourceProvider = this.providers.get(options.sourceType)
    const targetProvider = this.providers.get(options.targetType)
    
    if (!sourceProvider || !targetProvider) {
      return { success: false, error: 'Invalid source or target storage type' }
    }
    
    if (!targetProvider.isAvailable()) {
      return { success: false, error: `Target storage ${options.targetType} is not available` }
    }
    
    // Save to target
    const migratedDoc: Document = {
      ...doc,
      storage: options.targetType
    }
    
    const saveResult = await targetProvider.save(migratedDoc)
    
    if (!saveResult.success) {
      return saveResult
    }
    
    // Delete from source if requested
    if (options.deleteSource && sourceProvider.isAvailable()) {
      await sourceProvider.delete(String(doc.id))
    }
    
    return saveResult
  }

  /**
   * Sync document content from disk (re-read file)
   */
  async syncFromDisk(doc: Document): Promise<StorageResult<Document>> {
    if (doc.storage !== 'disk' || !doc.fileHandle) {
      return { success: false, error: 'Document is not a disk file' }
    }
    
    const diskProvider = this.disk
    return diskProvider.load(String(doc.id))
  }
}

// Singleton instance
export const storageManager = new StorageManager()
