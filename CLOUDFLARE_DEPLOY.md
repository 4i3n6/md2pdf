# 🚀 Deploy no Cloudflare Pages

## Visão Geral

Este projeto está configurado para deploy no Cloudflare Pages com otimizações específicas.

## Configurações do Build

### Cloudflare Pages Dashboard

Ao conectar seu repositório no Cloudflare Pages, use as seguintes configurações:

```
Framework preset: None
Build command: npm run build
Build output directory: dist
```

### Variáveis de Ambiente

Nenhuma variável de ambiente é necessária. O projeto roda 100% no client-side.

## Arquivos de Configuração

### `_headers`
Define headers de segurança e cache:
- Headers de segurança (X-Frame-Options, CSP, etc)
- Cache de 1 ano para assets estáticos
- Automaticamente copiado para `dist/` durante o build

### `_redirects`
Configura SPA routing:
- Redireciona todas as rotas para index.html
- Mantém funcionamento correto do preview

## Deploy Manual

### Via Wrangler CLI

```bash
# Instalar Wrangler
npm install -g wrangler

# Login
wrangler login

# Build
npm run build

# Deploy
wrangler pages deploy dist --project-name=md2pdf
```

### Via Dashboard

1. Acesse [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Vá para **Workers & Pages**
3. Clique em **Create application**
4. Selecione **Pages** > **Connect to Git**
5. Selecione seu repositório
6. Configure:
   - Build command: `npm run build`
   - Build output: `dist`
7. Clique em **Save and Deploy**

## Deploy Automático via Git

### Setup

1. Conecte seu repositório GitHub/GitLab ao Cloudflare Pages
2. Configure branch de produção (geralmente `main` ou `master`)
3. Habilite **Automatic deployments**

### Workflow

```
git push origin main
  ↓
Cloudflare detecta push
  ↓
Executa npm run build
  ↓
Deploy automático
  ↓
🎉 Site live em seconds
```

## Domínio Customizado

### Adicionar Domínio

1. No Cloudflare Pages dashboard
2. Vá para seu projeto
3. **Custom domains** > **Set up a custom domain**
4. Digite seu domínio
5. Siga instruções de DNS

### DNS Setup

Se seu domínio já está no Cloudflare:
- Automático! ✨

Se não:
- Adicione CNAME apontando para `yourproject.pages.dev`

## Performance

### Otimizações Incluídas

- ✅ Minificação de JS (Terser)
- ✅ Code splitting automático
- ✅ Cache de 1 ano para assets
- ✅ Brotli compression (Cloudflare auto)
- ✅ CDN global (Cloudflare Edge)

### Métricas Esperadas

- **First Contentful Paint**: < 1.0s
- **Time to Interactive**: < 2.5s
- **Lighthouse Score**: 95-100

## Monitoramento

### Cloudflare Analytics

Disponível gratuitamente:
- Pageviews
- Unique visitors
- Countries
- Referrers
- Devices

Acesse em: **Your Project** > **Analytics**

### Web Analytics (Opcional)

Habilite Cloudflare Web Analytics:
1. No dashboard do projeto
2. **Analytics** > **Web Analytics**
3. **Enable Web Analytics**

## Troubleshooting

### Build Falha

**Erro: `npm install failed`**
```bash
# Limpe node_modules e package-lock
rm -rf node_modules package-lock.json
npm install
git add package-lock.json
git commit -m "fix: update package-lock"
git push
```

**Erro: `Build output not found`**
- Verifique se `dist` está no `.gitignore`
- Confirme que `npm run build` gera a pasta `dist`

### Site não carrega

**404 errors:**
- Verifique se `_redirects` está em `dist/`
- Confirme conteúdo: `/* /index.html 200`

**Assets não carregam:**
- Verifique paths relativos no código
- Confirme que assets estão em `dist/assets/`

### Performance Issues

**Bundle muito grande:**
```bash
# Analise o bundle
npm install -D rollup-plugin-visualizer
# Adicione ao vite.config.js
```

**Fontes lentas:**
- Preconnect já configurado no HTML
- Considere self-hosting de fontes

## Rollback

### Via Dashboard

1. **Deployments** > Selecione versão anterior
2. **...** > **Rollback to this deployment**

### Via CLI

```bash
wrangler pages deployment list --project-name=md2pdf
wrangler pages deployment rollback <deployment-id>
```

## Custos

### Cloudflare Pages Free Tier

- ✅ 500 builds/mês
- ✅ Unlimited requests
- ✅ Unlimited bandwidth
- ✅ 1 build por vez

**Este projeto**: 100% gratuito! 🎉

### Quando Precisa Pagar?

- > 500 builds/mês: $20/mês (Unlimited builds)
- Builds simultâneos: $20/mês
- Build paralelos: A partir de $20/mês

## Checklist de Deploy

Antes de fazer o primeiro deploy:

- [ ] Build local funciona (`npm run build`)
- [ ] Preview local funciona (`npm run preview`)
- [ ] `_headers` e `_redirects` na raiz do projeto
- [ ] `.gitignore` não inclui `_headers` e `_redirects`
- [ ] package.json tem script `build` configurado
- [ ] Todas as dependências em `package.json`
- [ ] Teste em Chrome, Firefox, Safari

## Comandos Úteis

```bash
# Build de produção
npm run build

# Preview local da build
npm run preview

# Test build completo
npm run build && npm run preview

# Limpar e rebuild
rm -rf dist node_modules
npm install
npm run build
```

## Links Úteis

- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [Cloudflare Dashboard](https://dash.cloudflare.com)
- [Wrangler CLI Docs](https://developers.cloudflare.com/workers/wrangler/)
- [Cloudflare Community](https://community.cloudflare.com/)

## Suporte

Problemas com deploy?

1. Verifique [Cloudflare Status](https://www.cloudflarestatus.com/)
2. Consulte [Community Forum](https://community.cloudflare.com/)
3. Abra ticket no Cloudflare Dashboard

---

**Versão**: 3.0.0  
**Última atualização**: 2025-12-01  
**Status**: ✅ PRONTO PARA CLOUDFLARE PAGES
