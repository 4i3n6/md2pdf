# SDD - Documentos e Persistencia

## 1. Objetivo
Definir o comportamento de CRUD de documentos e a persistencia local do conteudo.

## 2. Escopo
- Criar, renomear, editar e deletar documentos.
- Manter um documento default quando nao ha dados.
- Persistencia local em localStorage.

## 3. Componentes e Responsabilidades
- `src/services/documentManager.ts`: fonte de verdade de documentos.
- `src/main.ts`: estado UI (`state`) e eventos de edicao.
- `src/services/uiRenderer.ts`: renderiza lista de documentos.

## 4. Fluxo principal
1. `documentManager.init()` carrega dados de `md2pdf-docs-v3` ou migra de `md2pdf-docs-v2` quando necessario.
2. `state.docs` e `state.currentId` sao definidos.
3. Edicoes atualizam `content`/`updated` e agendam autosave com debounce.
4. Criacao/importacao adiciona o documento no topo da lista e persiste.
5. Exclusao exige confirmacao e impede lista vazia.

## 5. Dados e Persistencia
- Chave: `md2pdf-docs-v3`.
- Migracao idempotente: `md2pdf-docs-v2` -> `md2pdf-docs-v3` se v3 estiver vazio.
- Modelo:
  - `id: number`
  - `name: string`
  - `content: string`
  - `updated: number`
  - `lastSaved: number | null`
- Preferencias por doc: `md2pdf-doc-prefs-<id>` com `font` e `align`.

## 6. Interfaces (UI/APIs)
- Lista de documentos: `#documents-list`.
- Input de nome: `#doc-name`.
- Botao de novo documento: `#new-doc-btn`.

## 7. Erros e Logs
- `DocumentManager` loga via `Logger` quando disponivel.
- Falhas de parse/salvamento em localStorage geram `Logger.error()`.

## 8. Seguranca e Privacidade
- Dados ficam apenas no navegador do usuario.

## 9. Performance e Limites
- Autosave com debounce (800ms) para reduzir gravacoes.
- Tamanho total estimado via `JSON.stringify(docs).length`.

## 10. Testes e Validacao
- Verificar criacao, renomeio, deletar e persistencia apos reload.

## 11. Riscos e Pendencias
- Quota de localStorage pode impedir novos saves.
- Fechar a aba antes do debounce pode perder os ultimos caracteres.
- `lastSaved` e atualizado apenas em save efetivo.
