import { logError, logInfo, logSuccess } from '@/utils/logger'

export function registerServiceWorker(): void {
  if (import.meta.env.DEV) {
    logInfo('[PWA] Service Worker disabled in development');
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations()
        .then((registrations) => {
          if (registrations.length === 0) return;
          return Promise.all(registrations.map((registration) => registration.unregister()))
            .then(() => {
              logSuccess('[PWA] Service Worker removed in development');
            })
        })
        .catch((error) => {
          const errorMsg = error instanceof Error ? error.message : String(error);
          logError(`[PWA] Failed to remove Service Worker in dev: ${errorMsg}`);
        });
    }
    if ('caches' in window) {
      caches.keys()
        .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
        .then(() => {
          logSuccess('[PWA] Cache cleared in development');
        })
        .catch((error) => {
          const errorMsg = error instanceof Error ? error.message : String(error);
          logError(`[PWA] Failed to clear cache in dev: ${errorMsg}`);
        });
    }
    return;
  }

  if (!('serviceWorker' in navigator)) {
    logInfo('[PWA] Service Worker not supported in this browser');
    return;
  }

  window.addEventListener('load', async () => {
    try {
      const existingRegistration = await navigator.serviceWorker.getRegistration('/');
      if (existingRegistration) {
        logInfo('[PWA] Service Worker already registered by VitePWA');

        existingRegistration.addEventListener('updatefound', () => {
          const newWorker = existingRegistration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                logInfo('[PWA] New version available - reload to update');
              }
            });
          }
        });
        return;
      }

      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      logInfo(`[PWA] Service Worker registered (fallback): ${registration.scope}`);
    } catch (error) {
      if (import.meta.env.PROD) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logError(`[PWA] Failed to register Service Worker: ${errorMsg}`);
      }
    }
  });
}

registerServiceWorker();
