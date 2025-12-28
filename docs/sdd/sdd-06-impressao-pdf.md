# SDD - Impressao e PDF

## 1. Objetivo
Definir o fluxo de impressao em PDF e o modo de preview de impressao.

## 2. Escopo
- Validacao de conteudo antes de imprimir.
- `window.print()` com titulo do documento.
- Preview de impressao via classe `print-mode`.

## 3. Componentes e Responsabilidades
- `src/utils/printUtils.ts`: validacao, print, preview e estatisticas.
- `src/utils/printReporter.ts`: checklist e estatisticas de conteudo.
- `src/styles-print.css`: layout A4 e regras de print.

## 4. Fluxo principal
1. Usuario clica `[ EXP_PDF ]`.
2. `await validatePrintContent()` gera avisos com base no DOM real do preview.
3. Usuario confirma se deseja continuar.
4. `document.title` e ajustado para nome do arquivo.
5. `window.print()` abre dialogo de impressao.
6. `afterprint` ou timeout restaura UI e titulo.

## 5. Dados e Persistencia
- Nao ha dados persistidos diretamente na impressao.

## 6. Interfaces (UI/APIs)
- Botao: `#download-btn`.
- Atalho: Ctrl/Cmd+Shift+E para imprimir.
- Preview: Ctrl/Cmd+Shift+P (toggle `print-mode`).

## 7. Erros e Logs
- Avisos de impressao sao logados via `Logger`.
- Erros em `window.print()` caem em fallback e restauram UI.

## 8. Seguranca e Privacidade
- Nenhum dado e enviado; impressao ocorre no browser.

## 9. Performance e Limites
- Validacao usa DOM conectado e aguarda imagens; pode adicionar alguns ms em docs grandes.
- Timeout de 5s para restaurar em browsers sem `afterprint`.

## 10. Testes e Validacao
- Clicar imprimir com imagens grandes e validar aviso.
- Alternar print preview e sair com ESC.

## 11. Riscos e Pendencias
- Imagens bloqueadas ou sem dimensoes podem gerar validacao parcial.
