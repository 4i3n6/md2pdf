import { StorageKeys } from '@/constants'
import type { SyncQueueItem, ConnectivityStatus } from '@/types/index'
import { logError, logInfo, logSuccess } from '@/utils/logger'
import { storageGetJson, storageSetJson } from '@/utils/storage'

type StatusChangeCallback = (isOnline: boolean) => void

class OfflineManager {
  private isOnline: boolean = navigator.onLine
  private callbacks: StatusChangeCallback[] = []
  private syncQueue: SyncQueueItem[] = []
  private initialized: boolean = false

  init(): void {
    if (this.initialized) return
    this.initialized = true

    window.addEventListener('online', () => this.handleOnline())
    window.addEventListener('offline', () => this.handleOffline())

    setInterval(() => this.checkConnectivity(), 10000)
    this.updateUI()
  }

  onStatusChange(callback: StatusChangeCallback): void {
    this.callbacks.push(callback)
  }

  private notifyListeners(isOnline: boolean): void {
    this.callbacks.forEach((cb) => {
      try {
        cb(isOnline)
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : String(e)
        logError(`Error in connectivity callback: ${errorMsg}`)
      }
    })
  }

  private handleOnline(): void {
    if (!this.isOnline) {
      this.isOnline = true
      this.updateUI()
      this.notifyListeners(true)
      this.processSyncQueue()
    }
  }

  private handleOffline(): void {
    if (this.isOnline) {
      this.isOnline = false
      this.updateUI()
      this.notifyListeners(false)
    }
  }

  private checkConnectivity(): void {
    fetch('/', { method: 'HEAD', cache: 'no-store' })
      .then(() => {
        if (!this.isOnline) this.handleOnline()
      })
      .catch(() => {
        if (this.isOnline) this.handleOffline()
      })
  }

  private updateUI(): void {
    const statusEl = document.querySelector('.system-status')
    if (!statusEl) return

    if (this.isOnline) {
      statusEl.textContent = 'ONLINE'
      statusEl.className = 'metric status-ok system-status'
    } else {
      statusEl.textContent = 'OFFLINE'
      statusEl.className = 'metric status-warning system-status'
    }
  }

  addToSyncQueue(operation: Omit<SyncQueueItem, 'id' | 'timestamp'>): void {
    const queueItem: SyncQueueItem = {
      ...operation,
      timestamp: Date.now(),
      id: Math.random().toString(36).substr(2, 9)
    }
    this.syncQueue.push(queueItem)
    this.persistSyncQueue()
  }

  private persistSyncQueue(): void {
    storageSetJson(
      StorageKeys.syncQueue,
      this.syncQueue,
      (msg) => logError(msg)
    )
  }

  loadSyncQueue(): void {
    const stored = storageGetJson<SyncQueueItem[]>(
      StorageKeys.syncQueue,
      (msg) => logError(msg)
    )
    if (stored && Array.isArray(stored)) {
      this.syncQueue = stored
    }
  }

  private processSyncQueue(): void {
    if (this.syncQueue.length === 0) return

    logInfo(`Processing ${this.syncQueue.length} sync operation(s)...`)

    const processed: string[] = []
    this.syncQueue.forEach((op) => {
      try {
        if (op.type === 'save') {
          processed.push(op.id)
        }
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : String(e)
        logError(`Error processing sync operation: ${errorMsg}`)
      }
    })

    this.syncQueue = this.syncQueue.filter((op) => !processed.includes(op.id))
    this.persistSyncQueue()

    if (processed.length > 0) {
      logSuccess(`${processed.length} operation(s) synced`)
    }
  }

  getStatus(): ConnectivityStatus {
    return {
      isOnline: this.isOnline,
      queueSize: this.syncQueue.length,
      timestamp: Date.now()
    }
  }

  getIsOnline(): boolean {
    return this.isOnline
  }
}

export default new OfflineManager()
