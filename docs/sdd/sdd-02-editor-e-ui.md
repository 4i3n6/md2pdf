# SDD - Editor e UI

## 1. Objetivo
Descrever o editor Markdown, controles de UI e interacoes de entrada.

## 2. Escopo
- Editor CodeMirror.
- Quick tags e atalhos de teclado.
- Splitter redimensionavel entre editor e preview.
- Bloqueio de mobile (viewport pequeno).

## 3. Componentes e Responsabilidades
- `src/main.ts`: inicializa CodeMirror, atalhos e controles.
- `src/services/uiRenderer.ts`: renderiza lista e preview.
- `app.html` e `pt/app.html`: layout e elementos de UI.

## 4. Fluxo principal
1. `initEditor()` cria `EditorView` com tema e extensoes.
2. `updateListener` detecta `docChanged` e dispara salvar/preview/validacao.
3. Quick tags inserem Markdown/HTML no cursor ou selecao.
4. Splitter ajusta largura e salva ratio.

## 5. Dados e Persistencia
- Splitter ratio: `md2pdf-splitter-ratio`.
- Preferencias de preview por doc: `md2pdf-doc-prefs-<id>`.

## 6. Interfaces (UI/APIs)
- Editor: `#editor`.
- Quick tags: `.quick-tags-container`.
- Splitter: `#workspace-splitter`.
- Botoes: `#new-doc-btn`, `#force-save-btn`, `#copy-md-btn`.

## 7. Erros e Logs
- Falhas de selecao ou insercao geram logs no `Logger`.
- Erros em `EditorView` nao quebram o app (guardas por null).

## 8. Seguranca e Privacidade
- Insercao de HTML e controlada e sanitizada no preview.
- Sem acesso a rede a partir do editor.

## 9. Performance e Limites
- Debounce de preview e validacao reduz custo por tecla.
- Splitter usa `mousemove` no documento; pode gerar custo em drag.

## 10. Testes e Validacao
- Atalhos: Ctrl/Cmd+S, Ctrl/Cmd+Shift+E, Ctrl/Cmd+Shift+P, Ctrl/Cmd+N.
- Quick tags: inserir e desfazer no editor.
- Splitter: arrastar e persistir ratio.

## 11. Riscos e Pendencias
- Autosave a cada tecla pode gerar jank em documentos grandes.
- Bloqueio mobile depende apenas de width (`< 768`).
