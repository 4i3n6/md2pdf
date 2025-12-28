# SDD - PWA, Offline e Atualizacoes

## 1. Objetivo
Descrever o suporte offline, service worker e notificacao de atualizacoes.

## 2. Escopo
- Detectar status online/offline.
- Registrar service worker em producao.
- Notificar usuario sobre nova versao.

## 3. Componentes e Responsabilidades
- `src/utils/offlineManager.ts`: status online/offline e fila de sync.
- `src/utils/swUpdateNotifier.ts`: banner de atualizacao.
- `src/pwaRegister.ts`: registro do service worker.
- `vite.config.ts`: configuracao do VitePWA.

## 4. Fluxo principal
1. `OfflineManager.init()` registra listeners de online/offline.
2. `checkConnectivity()` faz `HEAD /` a cada 10s.
3. Service worker e registrado no `load` (prod).
4. `SWUpdateNotifier` observa `controllerchange` e exibe banner.

## 5. Dados e Persistencia
- Fila offline: `md2pdf-sync-queue` (operacoes futuras, hoje apenas limpa).

## 6. Interfaces (UI/APIs)
- Badge de status: `.system-status`.
- Banner de update: `#update-banner`.

## 7. Erros e Logs
- Falhas de SW e conectividade sao logadas em `console.*`.

## 8. Seguranca e Privacidade
- Service worker nao envia dados; apenas cache de assets.

## 9. Performance e Limites
- VitePWA usa `generateSW` com precache de assets.
- Nao ha `runtimeCaching` configurado no Workbox.

## 10. Testes e Validacao
- Desligar rede e validar badge OFFLINE.
- Forcar update do SW e verificar banner.

## 11. Riscos e Pendencias
- Logs podem sumir no build (Terser drop_console).
- Fila de sync nao processa operacoes reais (placeholder).
