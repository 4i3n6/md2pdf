/**
 * PWA Service Worker Registration
 * 
 * NOTA: Em desenvolvimento, o VitePWA não gera Service Worker.
 * Este arquivo só registra o SW em produção.
 * O VitePWA já injeta o registro automaticamente via 'injectRegister: script-defer'.
 */

export function registerServiceWorker(): void {
  // Não registrar SW em desenvolvimento - VitePWA não gera SW em dev mode
  if (import.meta.env.DEV) {
    console.log('[PWA] Service Worker desabilitado em desenvolvimento');
    return;
  }

  if (!('serviceWorker' in navigator)) {
    console.log('[PWA] Service Worker não suportado neste navegador');
    return;
  }

  // Em produção, o VitePWA já injeta o registro via registerSW.js
  // Este código é apenas um fallback de segurança
  window.addEventListener('load', async () => {
    try {
      // Verificar se já existe um SW registrado (pelo VitePWA)
      const existingRegistration = await navigator.serviceWorker.getRegistration('/');
      if (existingRegistration) {
        console.log('[PWA] Service Worker já registrado pelo VitePWA');
        
        // Listener para atualizações
        existingRegistration.addEventListener('updatefound', () => {
          const newWorker = existingRegistration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[PWA] Nova versão disponível - recarregue para atualizar');
              }
            });
          }
        });
        return;
      }

      // Fallback: registrar manualmente se VitePWA não registrou
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      console.log('[PWA] Service Worker registrado (fallback):', registration.scope);
    } catch (error) {
      // Silenciar erro em dev, logar apenas em produção
      if (import.meta.env.PROD) {
        console.error('[PWA] Falha ao registrar Service Worker:', error);
      }
    }
  });
}

// Registrar automaticamente na inicialização
registerServiceWorker();
