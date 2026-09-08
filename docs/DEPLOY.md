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

`_headers` lives in `public/`, which Vite copies verbatim into `dist/` at build time. Cloudflare Pages reads it from the output directory, not from the repo root — with a build command configured, the repo root is never served. `npm run smoke` asserts it reaches `dist/`.

There is deliberately **no `_redirects` file**. Cloudflare Pages already resolves extensionless routes natively: `/app` serves `app.html`, and `/manual/getting-started` canonicalises to `/manual/getting-started/` with a 308 that terminates at 200. An explicit `/app /app.html 200` rewrite fights that canonicalisation — Pages redirects `/app.html` back to `/app`, producing an infinite loop. Do not reintroduce one.

## Generic static host

Serve `./dist`. Hosts that do not resolve extensionless paths need `/app` rewritten to `/app.html` and `/manual/<page>` to `/manual/<page>/index.html`. All other routes are file-based.

## Routes

| Path | File | Cloudflare Pages |
|---|---|---|
| `/` | `index.html` | native |
| `/app` | `app.html` | native — do not add a rewrite |
| `/manual/*` | `manual/*/index.html` | native, via 308 to trailing slash |
| `/pt/*` | `pt/*/index.html` | native |

## Security headers

Configured in `public/_headers`, served from `dist/_headers`:

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
