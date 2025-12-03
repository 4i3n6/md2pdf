/**
 * Gerenciador de Estado Offline
 * Detecta conectividade e gerencia operações offline/online
 */

const OfflineManager = {
    isOnline: navigator.onLine,
    callbacks: [],
    syncQueue: [],
    
    /**
     * Inicializa o gerenciador de conectividade
     */
    init() {
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
        
        // Verificação periódica de conectividade (fallback)
        setInterval(() => this.checkConnectivity(), 10000);
    },
    
    /**
     * Registra callback para mudanças de estado
     */
    onStatusChange(callback) {
        this.callbacks.push(callback);
    },
    
    /**
     * Notifica todos os listeners
     */
    notifyListeners(isOnline) {
        this.callbacks.forEach(cb => {
            try {
                cb(isOnline);
            } catch (e) {
                console.error('Erro em callback de conectividade:', e);
            }
        });
    },
    
    /**
     * Handler quando volta online
     */
    handleOnline() {
        if (!this.isOnline) {
            this.isOnline = true;
            this.updateUI();
            this.notifyListeners(true);
            
            // Processa fila de sincronização
            this.processSyncQueue();
        }
    },
    
    /**
     * Handler quando fica offline
     */
    handleOffline() {
        if (this.isOnline) {
            this.isOnline = false;
            this.updateUI();
            this.notifyListeners(false);
        }
    },
    
    /**
     * Verifica conectividade fazendo requisição leve
     */
    checkConnectivity() {
        fetch('/', { method: 'HEAD', cache: 'no-store' })
            .then(() => {
                if (!this.isOnline) this.handleOnline();
            })
            .catch(() => {
                if (this.isOnline) this.handleOffline();
            });
    },
    
    /**
     * Atualiza UI com status de conectividade
     */
    updateUI() {
        const statusEl = document.querySelector('.system-status');
        if (!statusEl) return;
        
        if (this.isOnline) {
            statusEl.textContent = 'ONLINE';
            statusEl.className = 'metric status-ok system-status';
        } else {
            statusEl.textContent = 'OFFLINE';
            statusEl.className = 'metric status-warning system-status';
        }
    },
    
    /**
     * Adiciona operação à fila de sincronização
     */
    addToSyncQueue(operation) {
        this.syncQueue.push({
            ...operation,
            timestamp: Date.now(),
            id: Math.random().toString(36).substr(2, 9)
        });
        
        // Persiste fila em localStorage
        this.persistSyncQueue();
    },
    
    /**
     * Persiste fila de sincronização em localStorage
     */
    persistSyncQueue() {
        try {
            localStorage.setItem('md2pdf-sync-queue', JSON.stringify(this.syncQueue));
        } catch (e) {
            console.error('Erro ao persistir fila de sync:', e);
        }
    },
    
    /**
     * Carrega fila de sincronização do localStorage
     */
    loadSyncQueue() {
        try {
            const stored = localStorage.getItem('md2pdf-sync-queue');
            if (stored) {
                this.syncQueue = JSON.parse(stored);
            }
        } catch (e) {
            console.error('Erro ao carregar fila de sync:', e);
        }
    },
    
    /**
     * Processa fila de sincronização quando volta online
     */
    processSyncQueue() {
        if (this.syncQueue.length === 0) return;
        
        console.log(`Processando ${this.syncQueue.length} operações de sincronização...`);
        
        const processed = [];
        this.syncQueue.forEach(op => {
            try {
                if (op.type === 'save') {
                    // Operação já foi salva localmente, apenas remove da fila
                    processed.push(op.id);
                }
            } catch (e) {
                console.error('Erro ao processar operação de sync:', e);
            }
        });
        
        // Remove operações processadas
        this.syncQueue = this.syncQueue.filter(op => !processed.includes(op.id));
        this.persistSyncQueue();
        
        if (processed.length > 0) {
            console.log(`✓ ${processed.length} operações sincronizadas`);
        }
    },
    
    /**
     * Retorna status atual
     */
    getStatus() {
        return {
            isOnline: this.isOnline,
            queueSize: this.syncQueue.length,
            timestamp: Date.now()
        };
    }
};

export default OfflineManager;
