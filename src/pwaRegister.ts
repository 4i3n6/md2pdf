/**
 * PWA Service Worker Registration
 * 
 * NOTA: Em desenvolvimento, o VitePWA não gera Service Worker.
 * Este arquivo só registra o SW em produção.
 * O VitePWA já injeta o registro automaticamente via 'injectRegister: script-defer'.
 */

import { logErro, logInfo } from '@/utils/logger'

export function registerServiceWorker(): void {
  // Não registrar SW em desenvolvimento - VitePWA não gera SW em dev mode
  if (import.meta.env.DEV) {
    logInfo('[PWA] Service Worker desabilitado em desenvolvimento');
    return;
  }

  if (!('serviceWorker' in navigator)) {
    logInfo('[PWA] Service Worker nao suportado neste navegador');
    return;
  }

  // Em produção, o VitePWA já injeta o registro via registerSW.js
  // Este código é apenas um fallback de segurança
  window.addEventListener('load', async () => {
    try {
      // Verificar se já existe um SW registrado (pelo VitePWA)
      const existingRegistration = await navigator.serviceWorker.getRegistration('/');
      if (existingRegistration) {
        logInfo('[PWA] Service Worker ja registrado pelo VitePWA');
        
        // Listener para atualizações
        existingRegistration.addEventListener('updatefound', () => {
          const newWorker = existingRegistration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                logInfo('[PWA] Nova versao disponivel - recarregue para atualizar');
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

      logInfo(`[PWA] Service Worker registrado (fallback): ${registration.scope}`);
    } catch (error) {
      // Silenciar erro em dev, logar apenas em produção
      if (import.meta.env.PROD) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logErro(`[PWA] Falha ao registrar Service Worker: ${errorMsg}`);
      }
    }
  });
}

// Registrar automaticamente na inicialização
registerServiceWorker();
