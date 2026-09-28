# AFRISTEM Digital Science School — v2.1

The Node.js + React rebuild now includes **launch-readiness operations**: named staff accounts, role-restricted access, payment-attempt protection, durable transactional email, and recovery tooling. The orange / cream / deep-brown / white public website remains intact.

**Status:** working, tested preview. Payment and SMTP credentials are not configured. This is not yet a live deployment, a completed LMS, or a security/compliance certification.

## Start locally

Use **Node.js 22 LTS** (this release was tested on Node 22.23.3). `.nvmrc`, `.node-version` and the package engine select Node 22.

```bash
npm ci --include=dev
npm run dev
```

Open `http://localhost:3000`; visit `/admin` for staff operations. On the first development startup, private owner credentials are written to `data/preview-access.json` (the old password-only file is retained for legacy test compatibility). Read the file locally. Never publish it.

The owner signs in with **email + password**, not the former shared admin password. Existing named accounts are never reset from environment variables on restart. If cookies are blocked in an embedded viewer, open the preview in its own browser tab.

Use only fictional learner details and test PDFs in development.

## Build and run

```bash
cp .env.example .env
# Set ADMIN_EMAIL and a unique ADMIN_PASSWORD of 16–256 characters for first startup.
# Set PUBLIC_URL to your actual HTTPS origin when preparing external integrations.
npm run check:config
npm run build
npm start
```

Use a private persistent volume for `DATA_DIR`. The server listens on `0.0.0.0:3000`, serves frontend and API on the same origin, and uses no browser-side localhost URLs. `npm start` uses the cross-platform production entry point `app.js`; it refuses to start without the compiled frontend. Use the platform-provided `PORT` on managed hosting.

Keep `LAUNCH_MODE=preview` until actual launch approval. Compilation/production serving and live business operation are separate settings.

## What works

### Public school website

Rewritten homepage, About, four programme pathways, detailed programme pages, How it works, teacher recruitment, searchable FAQs, contact, fees and draft policies. Four-step student registration; three-step teacher applications with up to three private PDFs (5 MB each); reference + email tracking; original learning guides; resource search, filters and text downloads; programme matching; a server-marked STEM quiz; direct WhatsApp/phone/email links. Country and time-zone fields support international enquiries without claiming global accreditation.

### Staff workspace

| Role | Permissions |
|---|---|
| Owner | All operations, staff creation/reset/suspension, email queue, audit log, launch checklist |
| Admissions | Application search/review, educator PDF downloads, status changes, filtered CSV export |
| Finance | Restricted billing contact/payment records and provider reconciliation; no learner profiles or educator documents |

- Unique salted scrypt password hashes; passwords are not stored in plaintext in the database.
- Temporary staff passwords shown once, expire in 24 hours, and must be changed before accessing records.
- Session cookies are HttpOnly and SameSite=Strict; Secure in production. Sessions last at most 8 hours, with a 30-minute idle timeout.
- CSRF tokens for authenticated writes, origin checks, request limits and account-level lockout after five failed attempts.
- Role changes, suspension, password reset and password changes revoke affected sessions.
- No self-suspension/demotion of the current owner; at least one active owner must remain.
- Attributed audit records for important actions. Logs are database-backed, not tamper-proof external records.
- Server-side filtered/paginated applications (25 per page), CSV exports up to 5,000 records.
- Staff, payments, notifications, audit, readiness and personal security views. Latest 250 payment/message/audit records are shown.

MFA and individual staff email verification are not included. Owners must verify colleagues before granting access and should add an approved MFA/identity layer before launch.

### Payments — disabled until explicitly enabled

Set `PAYMENTS_ENABLED=true`, `PAYSTACK_SECRET_KEY` and an HTTPS `PUBLIC_URL`. Use a test merchant key in preview. A live key is rejected in preview. Configure the merchant webhook at:

```
https://YOUR-DOMAIN/api/payments/webhook
```

The amount is fixed server-side at 100,000 kobo (₦1,000 NGN), for the admission form only.

- One durable payment reference per new application; concurrent initialization attempts are leased in SQLite.
- Repeat clicks reuse an existing pending checkout instead of creating another reference.
- Initialization timeouts retain an **uncertain** attempt. They do not silently create a replacement charge.
- Signed raw HMAC-SHA512 webhooks and server-side provider verification check reference, currency, amount and success status.
- Duplicate callbacks/webhooks do not create duplicate receipt notices; a verified local success does not downgrade due to a later failure response.
- Only expected Paystack HTTPS checkout URLs are accepted.
- Finance can check existing attempts against Paystack; this does not charge a card.
- Multiple v1 attempts for one application are preserved and block new checkout pending investigation.

**Deliberate safety limitation:** failed, abandoned, mismatched or unresolved attempts may require merchant-assisted resolution. This release does not automatically issue a replacement reference, expire provider charges, refund, settle disputes, or maintain a settlement/reversal ledger. Locally “paid” is not a substitute for checking refunds or reversals in the merchant dashboard. Actual provider behavior still needs merchant test-mode validation.

### Transactional email — off by default

Configure the SMTP fields in `.env.example`, an HTTPS `PUBLIC_URL`, and set `MAIL_DELIVERY=smtp`. TLS is required (implicit TLS when `SMTP_SECURE=true`, otherwise STARTTLS with certificate verification).

- Preview SMTP requires `MAIL_TEST_RECIPIENT`; **every** message is redirected there and subject-prefixed. No preview recipient list is mailed.
- Live SMTP refuses a leftover preview-redirect address.
- Application acknowledgements, changed student/teacher statuses and verified-payment receipts are transactionally queued in SQLite.
- Disabled delivery creates **held** records. Configuring SMTP later never releases those old messages automatically.
- Worker claims, send leases, bounded exponential retries, owner-visible failures and owner-controlled retry of failed records.
- SMTP “accepted” is not inbox “delivered”. The design is at-least-once, not exactly-once: interruption after acceptance may cause a duplicate. Stable message IDs are provided, but recipient servers need not deduplicate them.
- Owner test-email action queues only to the owner's account (or the forced preview recipient).

Staff invitation emails, WhatsApp notifications, marketing, bounce webhooks and unsubscribe/campaign features are not included. Staff temporary passwords are shared securely by the owner, not emailed automatically.

## Upgrade from v1

1. Stop the old app and back up the existing database plus private uploads before replacing files.
2. Install with `npm ci`, configure `ADMIN_EMAIL` and `ADMIN_PASSWORD` for the initial named owner, then build/start.
3. Schema migration preserves applications, documents, payments and historical audit entries. All old shared-password sessions are removed.
4. The old `ADMIN_PASSWORD` does not remain a backdoor: environment credentials bootstrap only if the staff table is empty.
5. Enable payments explicitly with `PAYMENTS_ENABLED`; simply setting a key no longer activates checkout.
6. Confirm private document paths when moving data to another host; the v2 restore tool remaps them.

Do not copy runtime data, preview passwords or `.env` into the distributable ZIP.

## Backup, restoration and recovery

```bash
npm run backup
# Restore only into a new, empty directory. Stop the app first.
DATA_DIR=/new/private/data npm run restore -- /path/to/backup --confirm-new-directory
# Authorized host-operator emergency reset for an existing active staff member:
npm run staff:recover -- owner@example.com
```

Backups include a consistent SQLite snapshot, referenced PDFs and SHA-256 integrity metadata. They contain sensitive records and password hashes and are **not encrypted by these tools**; encrypt and secure off-site copies. Hashes detect corruption but do not authenticate an untrusted backup.

Restoration refuses to overwrite data, checks file hashes and SQLite integrity, remaps document paths, clears browser sessions, and holds queued/in-flight email to avoid an automatic duplicate-send burst. Reconcile merchant activity since the snapshot before resuming payments. Restore drills and off-site retention remain operator responsibilities.

The recovery tool never creates/elevates or reactivates accounts. It writes a temporary credential to a private local file, requires a change at next sign-in and revokes sessions. Share securely, then delete that file.

## Deployment

**Hostinger:** follow [the full-stack deployment guide](docs/DEPLOY-HOSTINGER.md). Select the **Express** backend preset, not React/Vite static hosting. Build with `npm run build`, start with `npm start`, entry file `app.js`, Node 22. Keep the entire application root as the backend output.

Managed Hostinger deployments overwrite their build folders. Use `HOSTING_TARGET=hostinger-managed`, an **absolute private `DATA_DIR` outside the application, `hbuilds` and `public_html`**, and set `PERSISTENT_STORAGE_CONFIRMED=true` only after verifying persistence with the host. The app rejects unsafe configured paths. If the plan cannot provide persistent local storage, use the Hostinger VPS recipe or migrate storage before collecting real records. Merely connecting an external database in hPanel does not migrate this SQLite application.

Production live mode and either Hostinger target also require explicit persistent-storage configuration. `npm run check:config` validates production settings without printing secrets.


`Dockerfile`, `compose.yaml` and `deploy/Caddyfile` provide a Node 22 app + HTTPS reverse-proxy starting point. Set a domain you own in `SCHOOL_DOMAIN`, point DNS at the server, configure `.env` and use a persistent volume.

```bash
docker compose up -d --build
```

Docker deployment was not executed in this workspace. **Use one app instance with SQLite.** Move to PostgreSQL, private object storage, shared sessions/rate limits and a managed queue before horizontal scaling. `TRUST_PROXY_HOPS` must match the actual topology (Compose/Caddy uses one). Detailed release, provider, backup and compliance checks are in `docs/LAUNCH-V2.md`.

## Test commands

```bash
npm test                  # 34 validation/integration/recovery/hosting tests; isolated DBs and test services
npm run build
npm run test:deploy        # isolated production entry, assets, auth boundary and restart persistence
npm audit --omit=dev
# Run the preview server separately, then:
npx playwright install --with-deps chromium
npm run test:e2e           # public-site and admissions flows
npm run test:staff         # staff lifecycle and responsive workspace flows
```

Browser tests create fictional development records. Do not point them at a live school. Unit/integration payment and email tests use controlled services: they do not prove live Paystack settlement or SMTP inbox delivery.

## Files to know

- `app.js`: production entry point (Hostinger / npm start).
- `docs/DEPLOY-HOSTINGER.md`: managed Node.js and VPS setup, storage gates and acceptance tests.
- `server/app.js`: HTTP endpoints, role restrictions, public admissions, staff operations.
- `server/db.js`: schema migration and attributed audit helper.
- `server/config.js`: environment validation and launch guards.
- `server/services/auth.js`, `payments.js`, `notifications.js`: security, payment and mail services.
- `server/content.js`: programmes, FAQs, resources and questions.
- `src/main.jsx`: public pages and forms; `src/StaffWorkspace.jsx`: lazily loaded staff workspace.
- `src/style.css`, `src/operations.css`: public and operational styling using the retained palette.
- `scripts/`: backup, safe restore, staff recovery, config checks and copy export.
- `docs/SOURCE-AUDIT.md`: original backup analysis and media provenance.
- `docs/LAUNCH-V2.md`: current launch handover; `docs/PHASE1-HANDOVER.md` is historical.

The content CMS, learner/guardian LMS, classroom platform, attendance, assignments and course management remain deferred. No fabricated teacher profiles, testimonials, examination rates or tuition prices were added. Existing imagery is illustrative; the hero learner is AI-generated, not a real school enrollee.
