/**
 * PWA Service Worker Registration
 * Gerencia o registro automático do Service Worker
 */

export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) {
    console.log('Service Worker não suportado');
    return;
  }

  window.addEventListener('load', async () => {
    try {
      // Em dev, o Vite PWA injeta automaticamente
      // Em produção, usamos /sw.js diretamente
      const scriptPath = import.meta.env.MODE === 'development' 
        ? '/dev-sw.js?dev-sw' 
        : '/sw.js';

      const registration = await navigator.serviceWorker.register(scriptPath, {
        scope: '/',
        type: 'module'
      });

      console.log('Service Worker registrado com sucesso:', registration);

      // Listener para atualizações
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('Nova versão do SW disponível - recarregue para atualizar');
            }
          });
        }
      });
    } catch (error) {
      console.error('Falha ao registrar Service Worker:', error);
    }
  });
}

// Registrar automaticamente na inicialização
registerServiceWorker();
