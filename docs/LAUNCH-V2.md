# AFRISTEM — Launch-readiness handover, v2

**28 September 2026. This supersedes the operational sections of the v1 handover.**

## Hostinger preparation update — v2.1

See [DEPLOY-HOSTINGER.md](DEPLOY-HOSTINGER.md) for current deployment settings. This update adds a cross-platform production entry point, Node 22 selection, private persistent-storage guards, five hosting configuration tests, and a production build/restart smoke test. Storage guards require `DATA_DIR` and `PERSISTENT_STORAGE_CONFIRMED=true` for live production and Hostinger targets. The managed-hosting path must be outside deployment-managed folders.

Code preparation and local tests are complete; no Hostinger account, DNS, managed-storage persistence, Docker deployment, live payment or SMTP delivery has been verified.

## What changed in this continuation

The public website and original colour combination are preserved. This release strengthens the launch foundation rather than starting the deferred LMS.

### 1. A proper staff workspace

- Named accounts, with separate Owner, Admissions and Finance roles.
- Owner-controlled staff creation, role assignment, suspension/restoration and password reset.
- Temporary passwords expire after 24 hours and must be changed before accessing school records.
- Password hashing, protected sessions, CSRF tokens, idle expiration and failed-login lockouts.
- Immediate session revocation on suspension, role changes, password reset or password change.
- Audit entries attribute staff changes, application review, downloads, exports, payment checks and other important operations to a named actor.
- Paginated/searchable applications and server-generated filtered exports.
- Separate views for payment reconciliation, email status, audit history and launch configuration.

Finance staff cannot browse learner applications or educator documents. Admissions staff cannot manage staff accounts or perform payment reconciliation. Owners should assign the narrowest role that fits each person's actual work.

### 2. Safer payment attempts

The website still does not collect card details. Paystack hosted checkout is supported but remains disabled without explicit activation and credentials.

Each new application keeps one payment reference. Double clicks, page retries and concurrent requests do not generate a fresh reference. An uncertain provider response is retained for investigation. Finance staff can ask Paystack to verify an existing attempt without creating a charge.

Both callback verification and signed webhook processing check amount, currency and reference. Repeated successful callbacks/webhooks create only one local receipt notice. Legacy applications with several v1 attempts are preserved and blocked from creating another attempt until investigated.

This deliberately favours safety over automatic recharging: a failed or unresolved attempt can require a conversation with finance. There is no automatic replacement-reference, refund, dispute or settlement workflow. The finance total is verified admission fees, not net revenue after refunds/reversals.

### 3. Durable email, without surprise sends

Application acknowledgements, application-status notices and payment receipts are queued with their database changes. An SMTP worker processes due messages, records acceptance, retries transient failures and exposes failures to the owner.

- With mail off, notices are **held**. They never start sending just because someone adds SMTP settings later.
- With preview SMTP on, **all mail goes to a single configured test inbox**, not to applicant addresses.
- A real live SMTP configuration must remove the test-inbox override.
- Held and accepted messages cannot be resent from the dashboard. Only failed notices have an explicit retry action.
- Staff invitation passwords are not emailed; owners share one-time-view credentials securely.
- SMTP acceptance is not guaranteed delivery. A crash after SMTP acceptance but before the database update can produce a duplicate on retry. This is disclosed in the UI and uses a stable Message-ID to help, not guarantee, deduplication.

No real applicant email was sent while building this release. Provider keys and SMTP secrets were not supplied.

### 4. Recovery and deployment preparation

New commands support a consistent SQLite backup, referenced PDF copies, hash verification, restore into a new directory, and controlled account recovery. Restores invalidate sessions and hold in-flight/queued notices. Backup files contain sensitive data and are not automatically encrypted; the operator must encrypt and secure retained copies.

Docker Compose and a Caddy HTTPS reverse-proxy configuration are included. They require a real domain, DNS and a hosting environment. Docker was not available here, so the container recipe has not been built or deployed in this workspace.

## What was verified

**34 automated tests passed on Node 22.23.3 for v2.1**, covering:

- Original application validation and calendar-date checks.
- Named-account authentication, temporary-password enforcement, password reset and session expiration.
- Role boundaries, CSRF, foreign-origin rejection, account lockout and suspension.
- Server pagination, CSV formula neutralisation, private PDF storage/download and audit identity.
- Concurrent checkout, retained references, uncertain provider replies, multiple legacy attempts and trusted checkout-host validation.
- Exact raw HTTP webhook signatures, amount/currency mismatch, duplicate receipts and non-downgrading verified payment status.
- Preview email redirection, held-message isolation, queue deduplication, bounded SMTP retries and recovery of interrupted sends.
- Configuration guardrails, legacy database migration and backup/restore integrity checks.

Browser regression tests passed for the public site, student and teacher applications, status tracking, admin application review, resource search, quizzes and mobile navigation. New staff browser checks passed for seven workspace sections, staff creation, required password change, finance-only navigation, suspension and sign-out at phone, tablet and desktop widths.

Payment and mail tests use injected controlled services. A real merchant checkout, provider-originated webhook, SMTP credentials and inbox delivery have **not** been validated. Automated tests do not replace security, accessibility, real-device, resilience or load testing.

## Try the new workspace

1. Open the live preview, then visit `/admin`.
2. Use the email and password from the separate private preview-access file. The login now needs both.
3. Open **Team & access**. Create a fictional admissions or finance colleague if you want to test the workflow.
4. Save the temporary password securely; it is shown once. Sign in as the colleague in another browser session and set a new passphrase.
5. Review **Email queue**, **Activity log** and **Launch checklist**.
6. Use **My security** for your own password. Changing it signs out every session for that account.

Preview credentials are not in the downloadable source archive. On your own fresh development installation, credentials are created in `data/preview-access.json`. Treat that file as a secret and delete it when it is no longer needed.

## Required owner/deployer decisions

### Domain and environment

- Confirm the domain you actually control; do not assume ownership of the blueprint's suggested domain.
- Configure `PUBLIC_URL=https://your-domain` and DNS. No trailing path or embedded credentials.
- Use supported Node 22 LTS for deployment, a private persistent data volume and HTTPS.
- Set a strong named owner account at first start. Never share one owner password across the team.
- Keep `LAUNCH_MODE=preview` until the approved launch. `NODE_ENV=production` alone only switches to the compiled build.
- Set the exact trusted-proxy hop count. The supplied Caddy Compose layout uses one.

### Legal, educational and safeguarding review

- Approve the school identity, programme availability, current tuition, office contacts and admissions process.
- Approve privacy, terms, refund/cancellation and child-safeguarding policies with appropriate professional advice.
- Appoint a safeguarding lead and verified escalation routes. Define staff screening, reporting, supervision and parent-visible communication procedures.
- Set retention/deletion periods, data rights handling and processor/hosting disclosures, including the SMTP service when enabled.
- Verify media rights and approve the illustrative hero image. Do not present stock people as actual recruited teachers or enrolled learners.
- `POLICIES_APPROVED=true` is an **owner attestation**, not a legal certification or a substitute for publishing the approved text.

### Payment provider test plan

1. Use a Paystack test key, HTTPS `PUBLIC_URL`, and `PAYMENTS_ENABLED=true` in preview.
2. Configure `https://your-domain/api/payments/webhook` in the merchant dashboard.
3. Create a fictional student application and test hosted checkout success and failure.
4. Repeat initialization, click twice, refresh during payment and replay the callback; confirm a single durable reference.
5. Confirm real Paystack webhooks reach the app and duplicate deliveries do not produce extra local receipts.
6. Simulate a network timeout, then reconcile the original attempt from Finance. Never advise a parent to pay again solely because a browser page timed out.
7. Test wrong reference, wrong amount/currency and unexpected response handling.
8. Verify receipts and compare local records with the merchant dashboard. Define refund, abandoned-checkout and dispute procedures.
9. Only after merchant approval and operational sign-off, activate a live key with `LAUNCH_MODE=live`. No fee beyond the supplied ₦1,000 admission form amount is collected by this release.

### Email provider test plan

1. Set `MAIL_DELIVERY=smtp`, SMTP host/port/user/password, TLS mode and a verified plain sender email in `MAIL_FROM`.
2. In preview, set `MAIL_TEST_RECIPIENT` to an inbox the owner controls. Every message is redirected there.
3. Use **Email queue → Queue a test email to me** and verify both SMTP acceptance and actual receipt in that inbox.
4. Configure the sender domain's SPF, DKIM and DMARC with the provider. Check spam placement, formatting and reply handling.
5. Test application acknowledgements, status notices and payment receipts. Check that the body contains no unnecessary child details.
6. Test bad SMTP credentials, unavailable service and manual retry. Confirm messages become failed after five attempts in a retry cycle.
7. Remember that held preview notices are not released automatically. Do not bulk-send old test data.
8. When approved for live operation, remove `MAIL_TEST_RECIPIENT` and use `LAUNCH_MODE=live`. Monitor failures and define a delivery-support process. SMTP acceptance alone does not prove an inbox received the notice.

## Backups and disaster recovery

### Create a backup

```bash
npm run backup
```

The default destination is a timestamped directory under `DATA_DIR/backups`; `BACKUP_DIR` can point elsewhere. The tool writes a manifest only after referenced files are copied successfully. It records completion for the owner's launch checklist.

Use a scheduled operator job and encrypted off-site storage. The in-app “recorded backup” check only reflects a recent local backup metadata file, not encryption, an off-site copy or a proven restore drill. File hashes catch corruption, not malicious replacement of both the backup and its manifest.

### Restore safely

1. Stop the application and disable external notification/payment activity while investigating.
2. Preserve the current data volume separately; never overwrite the only existing copy.
3. Restore to an empty directory:

```bash
DATA_DIR=/new/private/data npm run restore -- /secure/backup-directory --confirm-new-directory
```

4. The tool checks hashes, SQLite integrity and document presence, remaps private paths, clears sessions and holds pending email.
5. Reconcile Paystack activity after the backup timestamp before reopening payment flows. Restoring an older local database does not undo charges made at the provider.
6. Check SMTP provider logs for messages sent after the snapshot; do not blindly resend.
7. Start the app pointing to the restored directory, inspect records, test downloads, and only then resume normal traffic.

The deployment still uses one instance with local SQLite. For multiple instances or substantially larger loads, migrate to PostgreSQL, private object storage, shared rate-limit/session storage and a managed job queue first.

## Account recovery

The owner can reset another staff member from Team & access. The colleague receives a temporary credential, not a recovered old password; current sessions are revoked.

If the owner is locked out, an authorised host operator can run:

```bash
npm run staff:recover -- owner@example.com
```

This operates only on an existing active account, does not grant extra roles, records the recovery, and writes a temporary credential to a private file inside `DATA_DIR`. Share securely and remove that file afterwards. Host-level access remains highly privileged.

## Production gaps still requiring attention

- MFA or an approved identity provider; ownership verification for staff email identities.
- Malware scanning/quarantine for uploaded PDFs. Size, type and signature checks are not a scanner.
- Formal privacy/safeguarding procedures, approved policies and retention/deletion automation.
- Real merchant/SMTP tests, delivery monitoring and support escalation.
- Independent security/accessibility review; production load and recovery exercises.
- TLS/DNS, host monitoring, alerting, patches, encrypted off-site backups and operational ownership.
- CMS, learner/guardian accounts, LMS, timetables, assignments, live classrooms and WhatsApp API messaging remain separate future work.

No “all systems ready” claim is made. The release gives the school stronger working infrastructure and an explicit path to complete launch preparation safely.
