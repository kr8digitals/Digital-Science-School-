# AFRISTEM — simpler Hostinger deployment, v2.2

## Initial public website: no custom environment variables

Use these build settings:

| Setting | Value |
|---|---|
| Framework | **Express**, not static React/Vite |
| Branch | `main` |
| Node | **22.x** |
| Root directory | `./` |
| Build command | `npm run build` |
| Backend output directory, if requested | `.` (whole application root, not just `dist`) |
| Entry file | `app.js` |
| Start command, if requested | `npm start` |
| Custom environment variables | **None for the initial public website** |

The platform can supply its own `PORT`. Production mode is set by the entry point. The default public URL is **https://digitalschool.afristemglobal.org**. Vite and its React plugin are included with production dependencies so the build also works with `npm ci --omit=dev`; no `NPM_CONFIG_INCLUDE` variable is needed.

The `.env.example` that exposed a long list of optional keys has been removed. Reference values are now in [CONFIGURATION.md](CONFIGURATION.md), not an environment template.

**Existing hPanel import:** Hostinger may retain the keys it discovered from the old revision. Refresh/re-import the updated source rather than filling in 21 optional values. Blank optional values are supported for this initial public startup. Repository changes cannot delete values already saved in your hosting account. Do not clear real storage/credentials from an existing operational deployment.

## Exactly what works without configuration

- Public pages, school programmes, FAQs, resources and programme matching.
- STEM quiz and server-side grading.
- Direct school email and phone contact links.
- Responsive site design and the original colour palette.

**Not activated yet:** student and teacher application forms, PDF uploads, contact-form submissions, application tracking, staff login, payments and transactional email. Those routes show a clear availability notice rather than an unusable form. Their API endpoints reject requests with `503 SETUP_REQUIRED`; no records are accepted or silently discarded. There is no open “claim administrator” page or default owner password.

Public-only mode does not open a database, create uploads, start the mail worker or bootstrap staff credentials. Health reports `mode: public-only` and `admissionsReady: false`; HTTP 200 means the public server is running, **not** that school operations are ready. Robots indexing stays disabled in this preview mode.

This is a safe initial website deployment, **not a replacement for configuring a complete admissions system**.

## Activating the full school application later

Private persistent storage and secure owner access are genuine requirements, not optional prompts that can safely be bypassed. See [CONFIGURATION.md](CONFIGURATION.md) for the four essential values:

- An absolute `DATA_DIR` confirmed to survive updates.
- `PERSISTENT_STORAGE_CONFIRMED`, only after that confirmation.
- First-owner `ADMIN_EMAIL` and `ADMIN_PASSWORD`.

With storage configured, the existing full application starts and enforces its original security checks. Invalid storage fails startup; it does not silently fall back to a temporary database. Explicit live mode or enabled payment/email settings are not allowed to run in the public-only fallback.

Hostinger documents that `hbuilds/` and `public_html` are overwritten during deployment. Ask the host to confirm a private writable directory **outside those folders and outside the application source** with SQLite WAL support, single-process operation, backup access and retention across updates. [1](https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/)

If managed hosting cannot provide those guarantees, use the included Hostinger VPS/Docker recipe or commission an external database/private-object-storage adapter. This application does not automatically switch to MySQL, Supabase or MongoDB when one is connected in hPanel.

After configuration, test a fictional application and PDF across both a process restart and a full redeployment. Test consistent backup/restore, role-restricted access, HTTPS cookies, actual merchant test-mode callbacks and SMTP delivery before going live. Leave payments/email off until separately tested.

**Existing deployment upgrade:** retain your real `DATA_DIR` and storage confirmation. A production instance without `DATA_DIR` now starts the public website only; it will not silently open `./data`. Existing files are not deleted or moved. Back up before migrating, and never point production data at an unverified path to suppress a startup error.

## VPS alternative

The provided `compose.yaml` mounts the persistent `school-data` volume and supplies the corresponding storage settings. Create a private `.env` file yourself using the names in [CONFIGURATION.md](CONFIGURATION.md), including first-owner credentials, `SCHOOL_DOMAIN` and `PUBLIC_URL`.

```bash
touch .env
chmod 600 .env
# Edit .env privately, then:
docker compose config --quiet
docker compose up -d --build
```

Never commit `.env`, run `docker compose down -v` against school data, or expose resolved Compose output containing secrets. Use one instance, off-site encrypted backups, a stable Compose project name and tested recovery procedures. The Docker recipe is provided but has not been executed in this workspace.

## Local verification

```bash
npm ci --omit=dev
npm test
npm run build
npm run test:deploy
npm audit --omit=dev
npm start
```

Node 22 verification: 39 automated tests pass; production-only installation/build passes; public-only and configured operational startup pass; database and PDFs survive the local operational restart test. Browser checks also pass on 11 routes at phone, tablet and desktop widths, including unavailable-form notices and zero horizontal overflow. Local tests cannot verify Hostinger account settings or storage durability.

1. [Hostinger Node.js deployment guide](https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/).
