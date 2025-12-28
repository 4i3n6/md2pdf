# SDD - Preview e Renderizacao

## 1. Objetivo
Definir o pipeline de renderizacao do Markdown para HTML seguro e o preview A4.

## 2. Escopo
- Parse de Markdown via `marked`.
- Sanitizacao com DOMPurify.
- Syntax highlighting com highlight.js.
- Controles de fonte e alinhamento no preview.

## 3. Componentes e Responsabilidades
- `src/processors/markdownProcessor.ts`: parse e sanitizacao.
- `src/main.ts`: orquestra renderizacao e controles.
- `src/services/uiRenderer.ts`: aplica HTML e processa midias.

## 4. Fluxo principal
1. `renderPreview()` ajusta conteudo por extensao (ex.: `sql`, `json`).
2. `processMarkdown()` gera HTML sanitizado.
3. `uiRenderer.renderPreview()` injeta HTML no DOM.
4. Processadores async de imagens, Mermaid e YAML sao executados.
5. `estimatePageCount()` calcula paginas estimadas para log.

## 5. Dados e Persistencia
- Preferencias por doc: `md2pdf-doc-prefs-<id>` (`font`, `align`).

## 6. Interfaces (UI/APIs)
- Preview: `#preview`.
- Controles: `#preview-font` e `.align-btn`.

## 7. Erros e Logs
- Falhas no parse retornam HTML de erro com DOMPurify.
- Processamento de midias falha de forma isolada e loga via `Logger`.

## 8. Seguranca e Privacidade
- DOMPurify permite apenas tags e atributos controlados.
- HTML inline passa por sanitizacao.

## 9. Performance e Limites
- Renderizacao debounced (300ms) para reduzir custo.
- Page count e baseado em heuristica (nao e preciso).

## 10. Testes e Validacao
- Inserir Markdown com headings, listas, code e tabelas.
- Validar que o preview respeita fonte/alinhamento selecionado.

## 11. Riscos e Pendencias
- `estimatePageCount()` usa tamanho do HTML e pode divergir do print real.
- Sanitizacao permite `style` e `data-*` especificos; revisar quando necessario.
