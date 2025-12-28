# PWA e Offline - MD2PDF

## Visao geral
O MD2PDF funciona como PWA com service worker gerado pelo VitePWA e suporte offline basico. O app e 100% client-side; dados ficam em localStorage.

## Componentes principais
- `src/utils/offlineManager.ts`: detecta online/offline e atualiza UI.
- `src/utils/swUpdateNotifier.ts`: exibe banner quando ha update.
- `src/pwaRegister.ts`: registra o service worker em producao.
- `vite.config.ts`: configuracao do VitePWA (generateSW).

## Registro do Service Worker
- Registro manual em `window.load` (prod).
- `injectRegister: false` no VitePWA, entao o registro e feito pelo `pwaRegister.ts`.
- Fallback: registra `/sw.js` se nao houver SW ativo.

## Cache e offline
- Workbox gera um precache com `globPatterns` de assets estaticos.
- `navigateFallback: /app.html` para rotas do app.
- `navigateFallbackDenylist` bloqueia `/manual`, `/pt/manual` e `/`.
- Nao ha `runtimeCaching` configurado (somente precache).

## Detecao de conectividade
- `navigator.onLine` + eventos `online/offline`.
- Verificacao ativa com `HEAD /` a cada 10s.
- UI: badge `.system-status` alterna ONLINE/OFFLINE.

## Notificacao de atualizacoes
- `SWUpdateNotifier` escuta `controllerchange`.
- Verifica updates a cada 30 minutos via `registration.update()`.
- Banner visual com botao de recarregar.

## Limites e observacoes
- Logs de PWA usam `console.*` (podem ser removidos no build).
- Fila de sync (`md2pdf-sync-queue`) e apenas placeholder.

