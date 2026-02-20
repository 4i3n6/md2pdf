# SDD - Evolucao Enterprise (Plano de Melhoria)

## 1. Objetivo
Elevar o nivel de profissionalismo do MD2PDF, mantendo arquitetura simples e preparada para evolucao sem over-engineering.

## 2. Escopo
- Confiabilidade do ciclo de edicao/salvamento/impressoes.
- Observabilidade basica (logs consistentes no painel do app).
- Qualidade de build e validacoes minimas de CI.
- Seguranca basica de headers e alinhamento de configuracoes.
- Ferramentas simples de backup/exportacao de documentos.

Fora de escopo:
- Backend, autenticacao, multiusuario ou sincronizacao cloud.
- Telemetria, analytics ou dependencias externas novas sem justificativa.

## 3. Componentes e Responsabilidades
- `src/services/documentManager.ts`: migracao de storage e semantica de save.
- `src/utils/printUtils.ts`: validacao de impressao com DOM real.
- `src/main.ts`: logger global, captura de erros e status do save.
- `src/utils/*`: substituicao de `console.*` por `Logger`.
- `vite.config.ts`, `_headers`: security header alignment.
- `scripts/*`: injecao de metadata de versao (se necessario).

## 4. Fluxo principal (pos-melhoria)
1. App inicia e registra Logger global + captura de erros.
2. `DocumentManager` tenta migrar `md2pdf-docs-v2` -> `md2pdf-docs-v3` (se existir).
3. Editor atualiza `updated` em edicao e `lastSaved` apenas em save efetivo.
4. Validacao de impressao mede elementos do preview real antes do `print()`.

## 5. Dados e Persistencia
- Manter `md2pdf-docs-v3` como chave principal.
- Adicionar migracao idempotente de `md2pdf-docs-v2`.
- Exportacao completa (all docs) como arquivo unico.

## 6. Interfaces (UI/APIs)
- Status de save reflete edicao vs salvo.
- Logs do sistema mostram erros reais (sem depender de `console.*`).
- Acao de backup/restaure (UI simples com confirmacao).

## 7. Erros e Logs
- `window.onerror` e `unhandledrejection` logam via `Logger.error`.
- Remover `console.*` de modulos criticos (print/offline/processor).
- Manter mensagens concisas e em PT-BR (com fallback EN).

## 8. Seguranca e Privacidade
- Alinhar headers basicos entre ambientes:
  - `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`.
- CSP simples (quando aplicavel ao host) sem quebrar fontes do Google.
- Sem envio de dados para terceiros.

## 9. Performance e Limites
- Debounce no autosave (800ms).
- Evitar re-render de lista em toda tecla.
- Validacao de impressao deve ser rapida e nao bloquear UI.

## 10. Testes e Validacao
- Adicionar `npm run typecheck` (tsc --noEmit).
- CI basico: `npm ci`, `npm run build`, `npm run typecheck`.
- Smoke test manual atualizado no `docs/TESTING.md`.

## 11. Riscos e Pendencias
- Migracao de storage precisa ser segura e nao apagar dados.
- Logs no build dependem da substituicao de `console.*`.
- Backup/restaure exige atencao para sobrescrita.

## Anexo A - Gitflow e Sprints

### Gitflow (padrao minimo)
- `main`: releases estaveis.
- `develop`: integracao (quando existir).
- `feature/*`: desenvolvimento de funcionalidades.
- `release/*`: preparacao de release.
- `hotfix/*`: correcoes urgentes em producao.

### Branch para este trabalho
- `feature/enterprise-evolucao` (base: branch atual).

### Sprints propostos (sem over-engineering)

Sprint 1 - Confiabilidade e observabilidade
- Migracao `md2pdf-docs-v2` -> `v3`.
- Corrigir validacao de impressao com DOM real.
- Captura global de erros no Logger.
- Separar `updated` vs `lastSaved` e status "dirty".

Sprint 2 - Qualidade de build e manutencao
- `npm run typecheck` + CI simples.
- Atualizar `test_app.js` (ou substituir por smoke test atual).
- Centralizar constantes (chaves, limites, breakpoints).

Sprint 3 - Enterprise readiness leve
- Alinhar headers de seguranca nos arquivos de deploy.
- Backup/restaure de todos os docs (sem backend).
- Metadata de versao consistente (UI + logs).

## Anexo B - Sprint 1 (detalhado)

Duracao sugerida: 1 semana.

### Backlog

1) Migracao de storage v2 -> v3
- Tarefas
  - Ler `md2pdf-docs-v2` quando `md2pdf-docs-v3` estiver vazio ou ausente.
  - Normalizar schema para o formato atual.
  - Persistir em `md2pdf-docs-v3` sem apagar o v2.
  - Logar sucesso/erro no Logger.
- Criterios de aceite
  - Dado `v2` existente e `v3` ausente, documentos aparecem na lista apos reload.
  - Dado `v3` existente, nenhuma migracao ocorre.
  - Migracao e idempotente (recarregar nao duplica documentos).

2) Validacao de impressao com DOM real
- Tarefas
  - Medir imagens e tabelas no DOM real do preview.
  - Aguardar carregamento de imagens antes de medir.
  - Manter fallback quando dimensoes nao estao disponiveis.
- Criterios de aceite
  - Avisos aparecem para imagens/tabelas grandes reais.
  - Nao ha erro se uma imagem falhar ao carregar.

3) Observabilidade basica
- Tarefas
  - Substituir `console.*` por `Logger` nos modulos criticos.
  - Capturar `window.onerror` e `unhandledrejection` no Logger.
- Criterios de aceite
  - Erros inesperados aparecem no painel de logs.
  - Logs essenciais persistem em build (sem depender de console).

4) Semantica de save e status
- Tarefas
  - Debounce no autosave para reduzir gravacoes por tecla.
  - Atualizar `lastSaved` apenas quando um save efetivo ocorrer.
  - Exibir status de "Nao salvo" quando houver edicao pendente.
- Criterios de aceite
  - Ao digitar, status muda para "Nao salvo".
  - Após autosave/force save, status volta para "Salvo agora".

### Definition of Done (Sprint 1)
- `npm run build` sem erros.
- Checklist manual atualizado em `docs/TESTING.md`.
- Nenhum `console.*` em caminhos criticos (print/offline/processors).
