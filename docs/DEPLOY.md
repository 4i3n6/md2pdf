# Deploy - MD2PDF

## Visao geral
Projeto estatico gerado via Vite. O build produz arquivos em `dist/` prontos para qualquer host estatico.

## Build
```bash
npm install
npm run build
```

- Build script inclui `scripts/build-manual.mjs`.
- Saida em `dist/`.
- Recomendado: Node 18+.

## Provedores suportados

### Netlify
- Config: `netlify.toml`.
- Redirects: `_redirects`.
- Headers: `_headers`.
- Deploy: publicar `dist/`.
- Headers de seguranca: `X-Frame-Options`, `X-Content-Type-Options`, `X-XSS-Protection`, `Referrer-Policy`, `Permissions-Policy`.

### Vercel
- Config: `vercel.json`.
- Deploy: publicar `dist/`.
- Headers de seguranca: `X-Frame-Options`, `X-Content-Type-Options`, `X-XSS-Protection`, `Referrer-Policy`, `Permissions-Policy`.

### Qualquer host estatico
- Publique `dist/`.
- Garanta rewrite de `/app` para `/app.html`.

## Rotas importantes
- `/` -> `index.html`
- `/app` -> `app.html`
- `/manual/*` -> paginas do manual
- `/pt/*` -> versao PT

## Checklist pre-deploy
- `npm run build` sem erros.
- `npm run preview` funcionando.
- Verificar `/app` e `/pt/app`.
