# Deploy - MD2PDF

## Visao Geral

Projeto configurado para deploy no Cloudflare Pages com otimizacoes de producao.

- **Dominio**: https://md2pdf.xyz
- **Repositorio**: https://github.com/zzkteam/md2pdf
- **Conta**: Cloudflare IDC BR

## Configuracoes do Build

```
Build command: npm run build
Output directory: dist
Node version: 18+
```

## Deploy Automatico

Push para `main` dispara deploy automatico:

```
git push origin main
  |
  v
Cloudflare detecta push
  |
  v
Executa npm run build
  |
  v
Deploy automatico (~30s)
```

## Deploy Manual via CLI

```bash
# Instalar Wrangler
npm install -g wrangler

# Login
wrangler login

# Build local
npm run build

# Deploy
wrangler pages deploy dist --project-name=md2pdf
```

## Arquivos de Configuracao

### `_headers`
Headers de seguranca e cache:
- X-Frame-Options, CSP, X-Content-Type-Options
- Cache de 1 ano para assets estaticos

### `_redirects`
SPA routing - redireciona rotas para index.html

## Checklist Pre-Deploy

- [ ] Build local funciona: `npm run build`
- [ ] Preview funciona: `npm run preview`
- [ ] Zero erros no console
- [ ] Lighthouse > 95
- [ ] Testado em Chrome, Firefox, Safari

## Performance

### Otimizacoes Incluidas
- Minificacao JS (Terser)
- Code splitting automatico
- Brotli compression (Cloudflare)
- CDN global (Cloudflare Edge)
- Cache 1 ano para assets

### Metricas Esperadas
- First Contentful Paint: < 1.0s
- Time to Interactive: < 2.5s
- Lighthouse Score: 95-100

## Rollback

### Via Dashboard
1. Deployments > Selecione versao anterior
2. ... > Rollback to this deployment

### Via CLI
```bash
wrangler pages deployment list --project-name=md2pdf
wrangler pages deployment rollback <deployment-id>
```

## Troubleshooting

### Build Falha
```bash
rm -rf node_modules package-lock.json dist
npm install
npm run build
```

### 404 Errors
- Verificar se `_redirects` esta em `dist/`
- Conteudo: `/* /index.html 200`

### Assets nao Carregam
- Verificar paths relativos
- Confirmar assets em `dist/assets/`

## Comandos Uteis

```bash
# Build producao
npm run build

# Preview local
npm run preview

# Limpar e rebuild
rm -rf dist node_modules && npm install && npm run build
```

## Custos

Cloudflare Pages Free Tier:
- 500 builds/mes
- Requests ilimitados
- Bandwidth ilimitado
- 1 build simultaneo

**Este projeto**: 100% gratuito

---

**Versao**: 3.0.0
**Ultima atualizacao**: 2025-12-08
