import { logError } from '@/utils/logger'

type StatusChangeCallback = (isOnline: boolean) => void

class OfflineManager {
  private isOnline: boolean = navigator.onLine
  private callbacks: StatusChangeCallback[] = []
  private initialized: boolean = false

  init(): void {
    if (this.initialized) return
    this.initialized = true

    window.addEventListener('online', () => this.handleOnline())
    window.addEventListener('offline', () => this.handleOffline())

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
    }
  }

  private handleOffline(): void {
    if (this.isOnline) {
      this.isOnline = false
      this.updateUI()
      this.notifyListeners(false)
    }
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

  getIsOnline(): boolean {
    return this.isOnline
  }
}

export default new OfflineManager()
