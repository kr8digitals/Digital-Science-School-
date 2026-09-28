# AFRISTEM — Hostinger deployment, v2.1

Prepared 28 September 2026. Repository: https://github.com/kr8digitals/Digital-Science-School- — branch `main`.

## Deployment status and required hosting decision

This is a **full-stack Express/React application**, not a static React website. Express serves the compiled website, admissions API, protected staff workspace, private PDFs, payment callbacks and background email worker. It uses SQLite and local private file storage. Run **one application instance**; do not enable multiple workers or horizontal scaling.

The source has been tested locally on Node 22.23.3: 34 automated tests, the production build, an isolated production startup/restart test, and a production dependency audit with zero reported vulnerabilities. **It has not been deployed to Hostinger.** The existing Docker recipe has not been executed in this workspace.

Choose one supported route:

1. **Hostinger managed Node.js web app (Business / Cloud): conditional.** Hostinger must confirm that the app can write to a private directory outside deployment-managed folders, that the directory survives deployments/rollbacks/restarts, and that you can operate consistent backups and recovery. Do not collect real applications until this is tested.
2. **Hostinger VPS: recommended for the current SQLite/local-PDF design when managed persistent storage cannot be guaranteed.** Use the included Docker Compose recipe with its persistent volume, Caddy TLS and a single app instance. A VPS still needs patching, monitoring, encrypted off-site backups and restore drills.

Hostinger's documentation says `hbuilds/` and `public_html` are overwritten by deployments. A build that succeeds is **not** evidence that applicant records will survive the next deployment. [1](https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/)

## A. Managed Node.js web app

### 1. Confirm persistent storage and maintenance access first

Ask Hostinger support:

> For my managed Express Node.js app, what absolute private directory is writable by the Node process, outside `hbuilds`, `public_html` and the application source, and guaranteed to survive redeployments, rollbacks and process restarts? Does the filesystem support SQLite WAL locking for a single process? How can I run a consistent SQLite backup and the application's Node recovery scripts, given the managed SSH/npm restrictions? Is the background worker supported between requests?

Record the confirmed path. An illustrative path is `/home/ACCOUNT/domains/DOMAIN/private-afristem-data`, **not a verified Hostinger path or a value to copy blindly**. Keep data outside legacy `nodejs/` directories too; they are deployment folders, not a promised storage service. Do not point this at an existing production database for the initial test.

If the host cannot guarantee those requirements, stop here and choose the VPS route, or commission a PostgreSQL/MySQL + private object-storage adaptation. This release does **not** implement those adapters. Connecting Supabase, MongoDB or MySQL through an hPanel wizard will not make this SQLite app use them. [1](https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/)

### 2. Connect the repository

In hPanel, use **Websites → Add Website → Deploy Web App → Import Git Repository**. Connect your GitHub account through Hostinger's authorization flow and select only `kr8digitals/Digital-Science-School-` where repository scoping is offered. Select branch `main`. The repository is public and can also be imported by URL; use GitHub integration if you want automatic deployments. [1](https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/)

Do **not** put a GitHub personal access token in the application environment, repository, URL, screenshots or source files. The app does not need a GitHub token at runtime.

If a live website already uses the intended domain, back it up and plan migration before modifying that website. Do not delete an existing school website or its email configuration just to start a preview deployment. Start with a separate temporary hostname.

### 3. Build and runtime settings

Override a mistaken React/Vite autodetection:

| Setting | Value |
|---|---|
| Framework | **Express** (backend), not static React/Vite |
| Branch | `main` |
| Root directory | Repository root (`.`) |
| Node.js | **22** |
| Package manager | npm; committed `package-lock.json` |
| Install command, if editable | `npm ci --include=dev` |
| Build command | `npm run build` |
| Backend output directory, if requested | Repository root (`.`), retaining `app.js`, `server/`, `scripts/`, `package*.json`, dependencies and `dist/` |
| Entry file | **`app.js`** |
| Start command, if requested | `npm start` (equivalent to `node app.js`) |
| Listen address / port | App binds `0.0.0.0`; it reads the platform's `PORT` |
| Health check | `/api/health` |

`dist/` is only the compiled **frontend**, not the complete deployment. Do not deploy `dist/` as a static website or use it as the full backend artifact. If hPanel's backend output field does not accept the repository root, ask support how to retain the full Express application rather than discarding its API.

Build dependencies must be installed: Vite is a dev dependency. When hPanel controls dependency installation, set **`NPM_CONFIG_INCLUDE=dev`** in its environment/build configuration so production-mode installation still includes the compiler. Runtime goes through `app.js`, which always enables production serving and never starts Vite. The entry point refuses to start if `dist/index.html` is missing.

Do not upload your computer's `node_modules`; `better-sqlite3` must be installed for the host's Linux/Node 22 environment. If its install fails, inspect the build logs for native-addon/prebuilt-binary support instead of ignoring the failure.

### 4. Add environment values privately

Use Hostinger's environment-variable interface, not a committed `.env`. Copy the names from `.env.example` and supply real values privately:

```dotenv
NODE_ENV=production
NPM_CONFIG_INCLUDE=dev
HOSTING_TARGET=hostinger-managed
LAUNCH_MODE=preview
PUBLIC_URL=https://YOUR-ACTUAL-TEMPORARY-OR-CUSTOM-HOSTNAME
DATA_DIR=/ABSOLUTE/HOST-CONFIRMED/PRIVATE-PERSISTENT-DIRECTORY
PERSISTENT_STORAGE_CONFIRMED=true
ADMIN_EMAIL=YOUR-OWNER-EMAIL
ADMIN_PASSWORD=YOUR-UNIQUE-RANDOM-16-TO-256-CHARACTER-PASSPHRASE
TRUST_PROXY_HOPS=1
PAYMENTS_ENABLED=false
MAIL_DELIVERY=off
POLICIES_APPROVED=false
UPLOAD_SCANNING_REVIEWED=false
```

These are **placeholders, not usable credentials or a verified storage path**. Set `PERSISTENT_STORAGE_CONFIRMED=true` only after the host confirms the chosen storage arrangement; it is an operator attestation, not a durability guarantee. Verify `TRUST_PROXY_HOPS` against Hostinger's actual proxy chain rather than assuming the sample value. Leave `PORT` to the platform unless Hostinger specifically requires an assigned value.

- Keep Paystack/SMTP credentials empty initially. Leave payments and email off.
- `ADMIN_EMAIL` and `ADMIN_PASSWORD` bootstrap the first named owner only. Existing owner passwords are never reset on redeployment. Remove the bootstrap password from hosting variables after verifying access.
- Require HTTPS before staff sign-in; production session cookies are Secure.
- Set `PUBLIC_URL` to the actual hostname, without a path, query or trailing slash. Update it when moving from the temporary hostname to your domain.
- `.env.example` documents optional SMTP, Paystack, backup and review settings. Do not use preview credentials on a real deployment.

### 5. Deploy and verify with fictional data

1. Deploy. Confirm the build log shows the Vite build and the backend starts successfully.
2. Visit `/api/health`; expect `{"ok":true,"version":"2.1.0"}`. This is local process/database health, not a storage or provider certification.
3. Open `/`, `/programmes`, a programme detail URL and `/admin`. Refresh deep links. Confirm both the website and API work, not merely the homepage.
4. Sign in over HTTPS with the bootstrap owner, confirm the required password change and check logout/session behavior. Test role boundaries with fictional staff accounts.
5. Submit a fictional student application and a fictional teacher application with a harmless test PDF. Save their references privately.
6. In the staff workspace, verify those applications, the PDF download and the persisted owner account.
7. Use hPanel's **Restart**, repeat those checks, then **redeploy the same commit** and repeat again. Confirm data/PDFs are not inside the current build folder and have not disappeared.
8. Test rollback if you will use it. If data disappear, **do not launch** or simply toggle a confirmation flag; fix storage or switch hosting architecture.
9. Validate a consistent backup and restore to a separate private directory before real admissions. A raw copy of `school.sqlite` while WAL writes are active is not a reliable backup.
10. Remove fictional submissions through a controlled operator procedure before launch. Do not delete the entire data directory once real staff/records exist.

The managed service runs npm commands during deployment but does not provide ordinary npm commands via SSH on Business/Cloud plans. Confirm a supported maintenance mechanism for `scripts/backup.mjs`, `restore.mjs` and `recover-staff.mjs`; do not assume VPS shell instructions work on managed hosting. Never place maintenance/reset scripts on unauthenticated web routes. [1](https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/)

## B. Hostinger VPS with Docker Compose

Requirements: a Linux VPS you control, Docker Engine + Compose, domain DNS pointing to its public IP, firewall access to 80/443, and operator access for maintenance. Hostinger provides a Docker Manager workflow; this repository uses its own Compose recipe. [2](https://www.hostinger.com/support/12040815-how-to-deploy-your-first-container-with-hostinger-docker-manager/)

```bash
git clone https://github.com/kr8digitals/Digital-Science-School-.git afristem
cd afristem
cp .env.example .env
chmod 600 .env
# Edit .env privately: SCHOOL_DOMAIN, PUBLIC_URL, ADMIN_EMAIL, ADMIN_PASSWORD.
# Keep LAUNCH_MODE=preview, PAYMENTS_ENABLED=false, MAIL_DELIVERY=off initially.
docker compose config --quiet
docker compose up -d --build
docker compose ps
```

Compose sets production mode, `HOSTING_TARGET=hostinger-vps`, `DATA_DIR=/app/data`, a named `school-data` volume, and the storage attestation for that mounted volume. It uses one trusted Caddy proxy hop. The app's writable data volume is separate from its read-only application filesystem. **Never run `docker compose down -v` or delete/prune the school-data volume unless intentionally destroying its records.** Preserve the Compose project name/directory during upgrades so you do not accidentally select a new empty volume.

Caddy handles domain certificates after DNS is correct and ports 80/443 are reachable. Test HTTPS rather than assuming certificate issuance succeeded.

```bash
# Validate effective production configuration without exposing secret values.
docker compose exec school npm run check:config
# Create a consistent database + PDF backup inside the private data volume.
docker compose exec school npm run backup
```

Arrange an automated backup schedule, copy backups off the VPS, encrypt them, enforce retention, and test recovery. A local backup inside the same volume is not disaster recovery. Do not publish `docker compose config` output without `--quiet`, because resolved environment values may contain secrets.

### Updating the VPS

Back up first. Review database/schema changes and ensure the backup is safely retained off-site. Then, using the same project directory:

```bash
git pull --ff-only origin main
docker compose up -d --build
```

This should preserve the named data volume. Confirm health, sign-in, an existing application and its PDF after each update. Restoring old source code does not automatically reverse a database migration.

See [LAUNCH-V2.md](LAUNCH-V2.md) for restore and authorized staff recovery procedures. The source provides these tools; the host operator must test them in the actual environment.

## Before allowing real students, teachers or payments

- Confirm private persistent storage, single-instance operation, backup/restore and monitoring.
- Approve policies, safeguarding contacts, programme availability, media rights and retention/deletion procedures.
- Test the real merchant's **test-mode** checkout, repeated callbacks and provider webhook at `/api/payments/webhook`.
- Test SMTP with `MAIL_TEST_RECIPIENT` in preview, including actual inbox delivery and sender-domain authentication.
- Complete owner/security review, malware handling for uploaded PDFs and access review. MFA is not built in.
- Only after approval, set `LAUNCH_MODE=live` and `POLICIES_APPROVED=true`. Activate payments/email separately with verified live credentials; remove the preview email redirect for live SMTP.
- Never put a GitHub token, Paystack secret, SMTP password, private PDF, database, `.env` or staff password into this public repository.

## Troubleshooting

| Symptom | Check |
|---|---|
| Homepage works but forms/staff/API do not | Wrong static frontend preset or only `dist/` deployed; use Express and retain full backend. |
| `vite: not found` during build | Install dev dependencies with `npm ci --include=dev` / `NPM_CONFIG_INCLUDE=dev`. |
| “frontend build is missing” | Run `npm run build`; confirm `dist/index.html` is included with the backend. |
| Persistent-storage configuration error | Confirm absolute private `DATA_DIR` and storage attestation; managed paths must be outside source/deployment trees. |
| Native SQLite module error | Install dependencies on the deployment host with Node 22; do not reuse Node 20 or local machine binaries. |
| Sign-in loops | HTTPS, actual `PUBLIC_URL`, trusted proxy count and browser cookies; open the site outside an embedded frame. |
| Lost records after deploy | Stop real admissions. Check storage path/volume selection; restore only from a verified consistent backup. |
| Payment or mail inactive | Expected defaults. Follow provider testing and explicit activation instructions. |

## Official references

1. [Hostinger: add a Node.js web app, supported frameworks, build settings, deployment filesystem and managed command limits](https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/).
2. [Hostinger: deploy a container with Docker Manager](https://www.hostinger.com/support/12040815-how-to-deploy-your-first-container-with-hostinger-docker-manager/).

Hostinger screens/features may change. These settings describe this repository; account provisioning and host filesystem guarantees must be confirmed in the actual hosting account.
