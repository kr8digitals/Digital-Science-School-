# Optional AFRISTEM operational configuration

**No custom environment variables are needed for an initial public-only deployment.** Read [DEPLOY-HOSTINGER.md](DEPLOY-HOSTINGER.md) first. This document replaces the auto-imported environment template; it contains no usable credentials.

## Activate admissions and staff access

Supply these values privately in your host's environment settings only when the storage requirements are confirmed:

| Name | Required value |
|---|---|
| `DATA_DIR` | Absolute private persistent folder, outside managed deployment folders and application source. Obtain the actual path from your host; do not guess it. |
| `PERSISTENT_STORAGE_CONFIRMED` | `true` after verifying the chosen storage survives redeploys and supports SQLite. This attests to your verification; it cannot prove durability. |
| `ADMIN_EMAIL` | Owner's real email address, for the first account only. |
| `ADMIN_PASSWORD` | A unique, randomly generated password/passphrase of 16–256 characters. Keep it in a password manager, not Git or chat. |

Existing accounts are never reset from bootstrap environment variables. After confirming access, remove the bootstrap password from the host's environment. Owner bootstrap currently does not require a forced first-password change; newly invited staff do. There is no shared default production password.

## Non-secret defaults and overrides

| Name | Default / notes |
|---|---|
| `PUBLIC_URL` | `https://digitalschool.afristemglobal.org` at application startup; override for another real hostname. No path or query. |
| `PORT` | Platform-provided value; otherwise `3000`. Bind address is `0.0.0.0`. |
| `NODE_ENV` | Forced to `production` by `app.js`; use `npm run dev` for development. |
| `HOSTING_TARGET` | Configured full production defaults to `hostinger-managed`; Compose selects `hostinger-vps`. |
| `LAUNCH_MODE` | `preview`; select `live` only after operational and policy approval. |
| `TRUST_PROXY_HOPS` | `1`; verify against the actual hosting proxy chain. Use `0` for direct local access. |
| `POLICIES_APPROVED` | `false`; owner attestation after real legal/safeguarding review, required for live mode. |
| `UPLOAD_SCANNING_REVIEWED` | `false`; owner attestation only, not an implemented malware scanner. |
| `BACKUP_DIR` | Private backups folder under `DATA_DIR`, unless overridden. Encrypt and retain an off-site copy too. |
| `SCHOOL_DOMAIN` | VPS/Compose only: your owned hostname, without `https://`. |

## Payments — leave disabled initially

| Name | Value / notes |
|---|---|
| `PAYMENTS_ENABLED` | Defaults to `false`; explicit `true` activates the integration after testing. |
| `PAYSTACK_SECRET_KEY` | Merchant-issued secret, never committed. Test key in preview; live key only in live mode. |

Requires an operational database and a real HTTPS `PUBLIC_URL`. Merchant webhook: `/api/payments/webhook`. The supplied admission form fee remains ₦1,000 NGN. Do not publish a secret or invent a placeholder key to pass validation.

## Email — leave off initially

| Name | Value / notes |
|---|---|
| `MAIL_DELIVERY` | Defaults to `off`; `smtp` after configuration and testing. |
| `SMTP_HOST` | Provider's SMTP hostname. |
| `SMTP_PORT` | Defaults to `587`. |
| `SMTP_SECURE` | Defaults to `false` (STARTTLS required); use `true` for provider-supported implicit TLS. |
| `SMTP_USER` | Provider-issued username. |
| `SMTP_PASSWORD` | Provider-issued secret. |
| `MAIL_FROM` | Verified plain sender email address. |
| `MAIL_TEST_RECIPIENT` | Required controlled test inbox for preview SMTP; remove before live delivery. |

Old held notices are never automatically released when SMTP is enabled. SMTP acceptance is not guaranteed inbox delivery. See [LAUNCH-V2.md](LAUNCH-V2.md) for provider testing and recovery.

## Checks

`npm run check:config` reports public-only versus operational configuration without printing secrets. Production storage checks remain enforced. Public-only status means there is no persistent admissions system active yet, not that the entire school is launch-ready.
