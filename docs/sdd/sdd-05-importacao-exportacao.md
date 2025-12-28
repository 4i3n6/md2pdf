# SDD - Importacao e Exportacao

## 1. Objetivo
Documentar o fluxo de importacao e exportacao de documentos Markdown.

## 2. Escopo
- Importar arquivo local (.md, .markdown, .txt).
- Exportar documento atual como arquivo .md.
- Copiar Markdown para area de transferencia.
- Backup/restauracao de todos os documentos via arquivo .json.

## 3. Componentes e Responsabilidades
- `src/main.ts`: funcoes `importMarkdownFile`, `downloadMarkdownFile`, backup/restaure e copy.
- `src/services/documentManager.ts`: cria documento importado e substitui lista no restore.

## 4. Fluxo principal
1. Usuario aciona `IMPORT MD`.
2. Arquivo e lido via `File.text()`.
3. `documentManager.createFromImport()` cria doc e atualiza editor.
4. `EXPORT MD` gera Blob e dispara download.
5. `COPY` usa `navigator.clipboard.writeText()`.
6. `BACKUP` gera JSON com docs e preferencias.
7. `RESTORE` valida JSON, confirma e substitui docs.

## 5. Dados e Persistencia
- Importacao cria novo doc em `md2pdf-docs-v3`.
- Backup gera JSON:
  - `version`, `appVersion`, `exportedAt`
  - `docs[]` com `id`, `name`, `content`, `updated`, `lastSaved`
  - `prefs` por doc (`font`, `align`)

## 6. Interfaces (UI/APIs)
- `#import-md-btn`, `#download-md-btn`, `#copy-md-btn`.
- `#backup-btn`, `#restore-btn`.
- `input[type=file]` criado dinamicamente.

## 7. Erros e Logs
- Falhas em leitura, download ou clipboard geram `Logger.error()`.

## 8. Seguranca e Privacidade
- Arquivos nao sao enviados a servidor.
- Clipboard depende de permissao do navegador.

## 9. Performance e Limites
- Importacao de arquivos grandes pode impactar localStorage.

## 10. Testes e Validacao
- Importar arquivo com UTF-8 e validar preview.
- Exportar e reimportar para validar fidelidade.
- Copiar e colar em editor externo.
- Gerar backup, limpar docs e restaurar, validando lista e preferencias.

## 11. Riscos e Pendencias
- Alguns navegadores bloqueiam clipboard sem gesto do usuario.
