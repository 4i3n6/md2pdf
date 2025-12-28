# SDD - i18n e Acessibilidade

## 1. Objetivo
Documentar o sistema de internacionalizacao e os requisitos de acessibilidade.

## 2. Escopo
- Idioma baseado no path (`/pt` ou default `en`).
- Traducoes em `src/i18n/en.ts` e `src/i18n/pt.ts`.
- Atributos ARIA e navegacao por teclado.

## 3. Componentes e Responsabilidades
- `src/i18n/index.ts`: detecta idioma e resolve strings.
- `src/main.ts`: usa `t()` em logs e tempos.
- `app.html` e `pt/app.html`: textos e ARIA.

## 4. Fluxo principal
1. `initI18n()` escolhe idioma pelo path.
2. `getLocale()` define formato de hora para logs.
3. Textos do HTML sao estaticos (versao EN/PT).

## 5. Dados e Persistencia
- Nao ha persistencia de idioma (baseado em URL).

## 6. Interfaces (UI/APIs)
- `t(key, params)` para strings dinamicas.
- Atributos `aria-*`, roles e skip link.

## 7. Erros e Logs
- Chaves ausentes retornam o proprio `key`.

## 8. Seguranca e Privacidade
- i18n nao coleta dados do usuario.

## 9. Performance e Limites
- Resolucao de chaves e simples (objeto em memoria).

## 10. Testes e Validacao
- Abrir `/pt/app` e validar idioma PT.
- Testar tab/enter na lista de documentos.

## 11. Riscos e Pendencias
- UI possui textos hardcoded fora de i18n.
