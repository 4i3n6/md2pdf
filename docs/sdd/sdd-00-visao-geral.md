# SDD - Visao Geral

## 1. Objetivo
Descrever a arquitetura e o fluxo principal do MD2PDF como aplicacao web client-side, com editor, preview e impressao em PDF.

## 2. Escopo
- App principal em `/app` e `/pt/app` (entrada: `app.html`, `pt/app.html`).
- Landing pages em `/` e `/pt/` (entrada: `index.html`, `pt/index.html`).
- Sem backend; dados ficam no navegador (localStorage).

## 3. Componentes e Responsabilidades
- `src/main.ts`: bootstrap, estado global, eventos e integracao de features.
- `src/services/documentManager.ts`: CRUD de documentos e persistencia.
- `src/services/uiRenderer.ts`: renderizacao de lista e preview.
- `src/processors/*`: parse de markdown, validacao, imagens, mermaid e YAML.
- `src/utils/*`: impressao, relatorios, offline, cache e updates.
- `src/styles.css` e `src/styles-print.css`: layout e estilos de impressao.

## 4. Fluxo principal
1. `initI18n()` define idioma por path.
2. Logger global e estado (`state`) sao criados.
3. `OfflineManager` e `SWUpdateNotifier` sao inicializados.
4. `documentManager.init()` carrega documentos do localStorage.
5. CodeMirror e listeners sao iniciados.
6. Preview, validacao e metricas sao atualizados por debounce.

## 5. Dados e Persistencia
- Documentos: `md2pdf-docs-v3` (`src/services/documentManager.ts`).
- Preferencias por documento: `md2pdf-doc-prefs-<id>` (`src/main.ts`).
- Splitter ratio: `md2pdf-splitter-ratio` (`src/main.ts`).
- Cache de imagens: `md2pdf-image-cache-v1` (`src/utils/imageCache.ts`).
- Fila offline: `md2pdf-sync-queue` (`src/utils/offlineManager.ts`).

## 6. Interfaces (UI/APIs)
- Layout em grid com top bar, sidebar e workspace.
- Editor (CodeMirror) + preview A4 lado a lado.
- Navegacao por teclado em lista de documentos.

## 7. Erros e Logs
- Logger global em `window.Logger` para logar no painel do app.
- Alguns modulos ainda usam `console.*` (riscos de log removido em build).

## 8. Seguranca e Privacidade
- Processamento 100% client-side.
- HTML sanitizado com DOMPurify (`src/processors/markdownProcessor.ts`).
- Mermaid em `securityLevel: 'strict'`.

## 9. Performance e Limites
- Preview e validacao com debounce (300-500ms).
- Redimensionamento de imagens em lotes (`maxConcurrent = 5`).
- Limite de armazenamento dependente do browser (localStorage).

## 10. Testes e Validacao
- Checklist manual em `docs/TESTING.md`.

## 11. Riscos e Pendencias
- Logs removidos em build podem esconder falhas.
- Sem migracao automatica de storage entre chaves.
