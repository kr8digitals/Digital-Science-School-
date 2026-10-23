# Deploying on Vercel

Target: **https://digitalschool.afristemglobal.org** (Vercel project `afristem-digital-science-school`, team *KR8 Digitals*).

## What runs on Vercel

| Piece | Where | Notes |
|---|---|---|
| Public website (React + Vite) | Static build in `dist/` | Built by `npm run build` on every deployment. |
| API (`/api/*`) | One serverless function, `api/index.js` | Wraps `server/public-app.js` with Express. |
| Everything else | SPA fallback to `dist/index.html` | Keeps deep links such as `/programmes/primary` working. |

Vercel functions have **no persistent local disk**, so this target runs the
application's existing **public-only mode**:

- Programmes, resources, FAQs, the programme finder and the quiz work normally.
- Student/teacher applications, contact messages, tracking, payments and staff
  access answer **503 `SETUP_REQUIRED`**. Nothing pretends to be saved.
- **No database is created.** `better-sqlite3` is never loaded by the function,
  and no SQLite file is written to the ephemeral filesystem.

Vercel's plain `api/` directory only matches **one path segment per file** (a
`[...path].js` file is not a multi-segment catch-all there), so `vercel.json`
rewrites every `/api/*` request to the single function at `/api` with the original
suffix in `?__path=`. `api/index.js` restores that path before Express routes the
request, which keeps multi-segment routes such as `/api/admin/login` working.

`api/index.js` resolves configuration with `publicOnly: true` on purpose:
merely setting `DATA_DIR` on Vercel must not create an admissions database that
silently disappears on the next deployment.

## No environment variables required

`PUBLIC_URL` defaults to `https://digitalschool.afristemglobal.org`. Add it as a
project environment variable only if you deploy to another hostname.

Do **not** set `DATA_DIR`, `LAUNCH_MODE=live`, `PAYMENTS_ENABLED` or SMTP
settings on this project: serverless functions cannot provide the persistent
storage and email worker those features require.

## Project settings

| Setting | Value |
|---|---|
| Framework preset | Vite |
| Build command | `npm run build` |
| Output directory | `dist` |
| Install command | `npm install` (default) |
| Node.js version | 22.x (from `engines.node`, `.nvmrc` and `.node-version`) |
| Root directory | repository root |

`vercel.json` pins the build command, output directory and the SPA rewrite, so
the settings above are reproducible from the repository.

## Domain

`afristemglobal.org` is already registered to this Vercel team with Vercel
nameservers, so `digitalschool.afristemglobal.org` only needs to be added as a
project domain (**Settings → Domains → Add**). Vercel creates the DNS record in
its own zone; no registrar change is needed.

## Previewing this mode locally

```bash
npm ci --include=dev
npm run build
NODE_ENV=production node app.js   # no DATA_DIR => public-only, no database
```

Or run the serverless wrapper exactly as Vercel does:

```bash
node --input-type=module -e "import http from 'node:http';import handler from './api/index.js';http.createServer(handler).listen(3000,'0.0.0.0')"
```

## Opening admissions later

This application stores records in SQLite plus private PDF uploads on a local
disk that must persist. Vercel does not offer that. Before enabling
applications, tracking, payments or staff accounts, either:

1. Move the app to a host with a persistent volume (see `docs/DEPLOY-HOSTINGER.md`
   or the Docker recipe in the README), or
2. Port the data layer to managed PostgreSQL and private object storage, then
   replace the public-only wrapper with the full application.

Until then the site remains a working public website with an honest
"applications are not open yet" notice.
