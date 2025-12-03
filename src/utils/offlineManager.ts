/**
 * Gerenciador de Estado Offline
 * Detecta conectividade e gerencia operações offline/online
 */

import type { SyncQueueItem, ConnectivityStatus } from '@/types/index'

type StatusChangeCallback = (isOnline: boolean) => void

class OfflineManager {
  private isOnline: boolean = navigator.onLine
  private callbacks: StatusChangeCallback[] = []
  private syncQueue: SyncQueueItem[] = []

  /**
   * Inicializa o gerenciador de conectividade
   */
  init(): void {
    window.addEventListener('online', () => this.handleOnline())
    window.addEventListener('offline', () => this.handleOffline())

    // Verificação periódica de conectividade (fallback)
    setInterval(() => this.checkConnectivity(), 10000)
  }

  /**
   * Registra callback para mudanças de estado
   */
  onStatusChange(callback: StatusChangeCallback): void {
    this.callbacks.push(callback)
  }

  /**
   * Notifica todos os listeners
   */
  private notifyListeners(isOnline: boolean): void {
    this.callbacks.forEach((cb) => {
      try {
        cb(isOnline)
      } catch (e) {
        console.error('Erro em callback de conectividade:', e)
      }
    })
  }

  /**
   * Handler quando volta online
   */
  private handleOnline(): void {
    if (!this.isOnline) {
      this.isOnline = true
      this.updateUI()
      this.notifyListeners(true)

      // Processa fila de sincronização
      this.processSyncQueue()
    }
  }

  /**
   * Handler quando fica offline
   */
  private handleOffline(): void {
    if (this.isOnline) {
      this.isOnline = false
      this.updateUI()
      this.notifyListeners(false)
    }
  }

  /**
   * Verifica conectividade fazendo requisição leve
   */
  private checkConnectivity(): void {
    fetch('/', { method: 'HEAD', cache: 'no-store' })
      .then(() => {
        if (!this.isOnline) this.handleOnline()
      })
      .catch(() => {
        if (this.isOnline) this.handleOffline()
      })
  }

  /**
   * Atualiza UI com status de conectividade
   */
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

  /**
   * Adiciona operação à fila de sincronização
   */
  addToSyncQueue(operation: Omit<SyncQueueItem, 'id' | 'timestamp'>): void {
    const queueItem: SyncQueueItem = {
      ...operation,
      timestamp: Date.now(),
      id: Math.random().toString(36).substr(2, 9)
    }
    this.syncQueue.push(queueItem)

    // Persiste fila em localStorage
    this.persistSyncQueue()
  }

  /**
   * Persiste fila de sincronização em localStorage
   */
  private persistSyncQueue(): void {
    try {
      localStorage.setItem('md2pdf-sync-queue', JSON.stringify(this.syncQueue))
    } catch (e) {
      console.error('Erro ao persistir fila de sync:', e)
    }
  }

  /**
   * Carrega fila de sincronização do localStorage
   */
  loadSyncQueue(): void {
    try {
      const stored = localStorage.getItem('md2pdf-sync-queue')
      if (stored) {
        this.syncQueue = JSON.parse(stored) as SyncQueueItem[]
      }
    } catch (e) {
      console.error('Erro ao carregar fila de sync:', e)
    }
  }

  /**
   * Processa fila de sincronização quando volta online
   */
  private processSyncQueue(): void {
    if (this.syncQueue.length === 0) return

    console.log(`Processando ${this.syncQueue.length} operações de sincronização...`)

    const processed: string[] = []
    this.syncQueue.forEach((op) => {
      try {
        if (op.type === 'save') {
          // Operação já foi salva localmente, apenas remove da fila
          processed.push(op.id)
        }
      } catch (e) {
        console.error('Erro ao processar operação de sync:', e)
      }
    })

    // Remove operações processadas
    this.syncQueue = this.syncQueue.filter((op) => !processed.includes(op.id))
    this.persistSyncQueue()

    if (processed.length > 0) {
      console.log(`✓ ${processed.length} operações sincronizadas`)
    }
  }

  /**
   * Retorna status atual
   */
  getStatus(): ConnectivityStatus {
    return {
      isOnline: this.isOnline,
      queueSize: this.syncQueue.length,
      timestamp: Date.now()
    }
  }

  /**
   * Retorna se está online
   */
  getIsOnline(): boolean {
    return this.isOnline
  }
}

export default new OfflineManager()
