/**
 * Gerenciador de Estado Offline
 * Detecta conectividade e gerencia operações offline/online
 */

import { ChavesStorage } from '@/constants'
import type { SyncQueueItem, ConnectivityStatus } from '@/types/index'
import { logErro, logInfo, logSucesso } from '@/utils/logger'
import { storageGetJson, storageSetJson } from '@/utils/storage'

type StatusChangeCallback = (isOnline: boolean) => void

class OfflineManager {
  private isOnline: boolean = navigator.onLine
  private callbacks: StatusChangeCallback[] = []
  private syncQueue: SyncQueueItem[] = []
  private initialized: boolean = false

  /**
   * Inicializa o gerenciador de conectividade
   */
  init(): void {
    if (this.initialized) return
    this.initialized = true

    window.addEventListener('online', () => this.handleOnline())
    window.addEventListener('offline', () => this.handleOffline())

    // Verificação periódica de conectividade (fallback)
    setInterval(() => this.checkConnectivity(), 10000)

    // Garantir que a UI reflita o status inicial (especialmente ao abrir offline)
    this.updateUI()
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
        const errorMsg = e instanceof Error ? e.message : String(e)
        logErro(`Erro em callback de conectividade: ${errorMsg}`)
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
    storageSetJson(
      ChavesStorage.filaSync,
      this.syncQueue,
      (msg) => logErro(msg)
    )
  }

  /**
   * Carrega fila de sincronização do localStorage
   */
  loadSyncQueue(): void {
    const stored = storageGetJson<SyncQueueItem[]>(
      ChavesStorage.filaSync,
      (msg) => logErro(msg)
    )
    if (stored && Array.isArray(stored)) {
      this.syncQueue = stored
    }
  }

  /**
   * Processa fila de sincronização quando volta online
   */
  private processSyncQueue(): void {
    if (this.syncQueue.length === 0) return

    logInfo(`Processando ${this.syncQueue.length} operacoes de sincronizacao...`)

    const processed: string[] = []
    this.syncQueue.forEach((op) => {
      try {
        if (op.type === 'save') {
          // Operação já foi salva localmente, apenas remove da fila
          processed.push(op.id)
        }
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : String(e)
        logErro(`Erro ao processar operacao de sync: ${errorMsg}`)
      }
    })

    // Remove operações processadas
    this.syncQueue = this.syncQueue.filter((op) => !processed.includes(op.id))
    this.persistSyncQueue()

    if (processed.length > 0) {
      logSucesso(`${processed.length} operacoes sincronizadas`)
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
