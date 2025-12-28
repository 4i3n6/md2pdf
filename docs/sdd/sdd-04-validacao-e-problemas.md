# SDD - Validacao e Problemas

## 1. Objetivo
Descrever a validacao sintatica de Markdown e a exibicao de problemas no editor.

## 2. Escopo
- Validacao de headings, links, imagens, enfase, blockquote, code blocks e tabelas.
- Tooltips no editor e painel de problemas.
- Aplicacao de sugestoes (fix).

## 3. Componentes e Responsabilidades
- `src/processors/markdownValidator.ts`: regras e mensagens.
- `src/main.ts`: decoracoes do CodeMirror, tooltips e painel.

## 4. Fluxo principal
1. `validateMarkdown(content)` retorna erros e warnings.
2. `updateEditorDiagnostics()` converte issues em decoracoes.
3. `renderProblemsPanel()` lista problemas e aciona navegacao.
4. `applyFix()` aplica sugestao no texto.

## 5. Dados e Persistencia
- Issues atuais ficam em memoria (`currentIssues`).

## 6. Interfaces (UI/APIs)
- Painel: `#problems-panel`.
- Badge: `#problems-count`.
- Tooltip: `.md-tooltip`.

## 7. Erros e Logs
- Erros de decoracao sao ignorados para nao quebrar o editor.
- Quantidade de erros/avisos e logada via `Logger`.

## 8. Seguranca e Privacidade
- Mensagens sao escapadas antes de inserir HTML.

## 9. Performance e Limites
- Validacao debounced (300ms).
- Regras sao baseadas em regex (nao parse completo do Markdown).

## 10. Testes e Validacao
- Inserir `#Heading` sem espaco e verificar aviso.
- Inserir `[]()` para erro de link vazio.
- Inserir bloco de codigo sem fechamento e verificar erro.

## 11. Riscos e Pendencias
- Validacao de tabelas usa regex simples e pode ter falso positivo.
- Linha de tabelas usa `indexOf` e pode apontar linha errada em repeticoes.
