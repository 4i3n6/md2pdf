# Deployment

md2pdf produces a fully static output. Any host that can serve static files works.

## Build

```bash
npm install
npm run build
```

Output: `./dist`. Requires Node 18+. Build script includes `scripts/build-manual.mjs` for manual page generation.

## Cloudflare Pages

Connect the repository and set:

- **Build command:** `npm run build`
- **Output directory:** `dist`

The `_redirects` and `_headers` files in the repo root are picked up automatically by Cloudflare Pages. They handle route rewrites and security headers.

## Generic static host

Serve `./dist`. The host must rewrite `/app` to `/app.html`. All other routes are file-based.

## Routes

| Path | File |
|---|---|
| `/` | `index.html` |
| `/app` | `app.html` (rewrite required) |
| `/manual/*` | `manual/*/index.html` |
| `/pt/*` | `pt/*/index.html` |

## Security headers

Configured in `_headers`:

- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: no-referrer`
- `Permissions-Policy: interest-cohort=()`
- Long-lived cache on `/assets/*`, `/sw.js` no-cache

## Pre-deploy checklist

- `npm run build` exits with code 0
- `npm run preview` loads `/`, `/app`, `/pt/app`
- `npm run typecheck` reports zero errors
