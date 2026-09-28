> Historical v1 handover. For the current implementation, read README.md and docs/LAUNCH-V2.md. The limitations described below reflect the first release, not v2.

# AFRISTEM — Owner handover

**28 September 2026 · Phase 1 rebuild**

## What you now have

A functioning Node.js application with a React frontend, Express API and SQLite database. It replaces the public-facing WordPress implementation while keeping the original orange, cream, dark-brown and white identity.

The experience centres on one promise: **we don’t just teach; we mentor.** The rewritten content explains programmes clearly, gives parents practical next steps, and avoids unsupported performance claims.

### Included in this release

| Area | Delivered |
|---|---|
| Public website | Homepage, About, programmes, four programme detail pages, How it works, educators, FAQs, contact, fees |
| Admissions | Four-step student application, validation, guardian consent, application reference, persistent database |
| Recruitment | Three-step teacher application, private PDF attachments, review workflow |
| Operations | Protected admin dashboard, search/filter, applicant records, document downloads, status changes, CSV export |
| Self-service | Reference + email application tracking |
| Free learning | Six original study guides, topic filters, search, text downloads, five-question STEM quiz with explanations |
| Discovery | Interactive two-question programme matcher |
| Global usability | Country fields, international phone input, time-zone selection, phone/tablet/desktop layouts, locally hosted fonts |
| Contact | WhatsApp, email and telephone links plus a stored contact form |
| Payments | Paystack hosted-checkout initialization, server verification, signed webhook and receipt view; disabled without credentials |
| Trust | Draft privacy, terms and safeguarding pages; no invented staff, testimonials or results |

### Explicitly not live

- Student, teacher and parent LMS accounts and dashboards.
- Live classrooms, video hosting, lesson recordings, assignments, attendance or course management.
- Automatic email or WhatsApp message delivery.
- Student-account creation after payment.
- A content-editing CMS, individual administrator identities or MFA.
- Tuition collection, refunds, subscription billing or multi-currency checkout.
- AI tutoring or adaptive assessments.

A future-portal page explains the planned features rather than offering a fake login. This follows the source document's phased approach.

## Try the preview

1. Open the AFRISTEM School live preview.
2. Explore a programme and follow Register.
3. Use **fictional data only** to complete the student form.
4. Save the application reference and use it with the guardian email on Track an application.
5. Visit `/admin`. The development password is in `data/preview-admin.txt` in the workspace. It is excluded from the source ZIP.
6. Review the application, change its status, and check tracking again.
7. Try the programme finder, resource filters and STEM quiz.

If the host browser blocks administrator cookies in an embedded preview, open the app in its own tab. No external merchant charge or automatic notification is sent without separately configured services.

## Test results

- Eight automated validation tests passed.
- Complete student and teacher browser submission journeys passed.
- Private PDF submission and authenticated review flow passed.
- Admin sign-in, persisted status changes and sign-out passed.
- Tracking with reference + guardian email passed.
- STEM quiz produced 5/5 for the expected answers and rendered all explanations.
- Resource category filtering, search, article navigation and text download passed.
- Programme matching, contact submission and mobile navigation passed.
- Fifteen routes were checked at 390, 768 and 1440 px without horizontal overflow.
- Unauthorized admin requests returned 401; development private-file requests returned 403; foreign-origin writes returned 403; invalid student payload returned 400.
- Production build compiled and rendered deep routes, the content API, quiz and local imagery.
- `npm audit --omit=dev` reported zero known vulnerabilities at the time of testing.

These checks are not a penetration test, a formal accessibility audit, load testing or a guarantee against future vulnerabilities. Real payment-provider transactions, webhook delivery from Paystack and real device/network testing remain to be completed. The Dockerfile is supplied as a deployment starting point; a container build was not run in this workspace.

## Before collecting real applications or payments

### School decisions and content

- Confirm the actual domain you own and intend to use. The blueprint names both adss.org and afristemschools.org in different contexts.
- Approve the rewritten website copy and final school name/wordmark.
- Confirm current admission fee, tuition, lesson schedules, subject availability and admissions response procedure.
- Confirm whether the programme supplements existing schooling and communicate any local educational requirements.
- Publish only verified teacher profiles and consented testimonials when available.
- Verify rights for original stock images and approve the illustrative AI hero.

### Child safety and privacy

- Have qualified advisers review privacy, service terms, safeguarding, refund and cancellation rules.
- Appoint a safeguarding lead and publish verified reporting and escalation routes.
- Establish credential/background checks, a staff code of conduct and guardian-visible communication practices.
- Decide recording/media-consent rules and the treatment of learners' information.
- Set and publish retention/deletion periods, data rights procedures, hosting region and processor disclosures.
- Review applicable Nigerian data protection obligations and requirements in countries you actually serve. No automatic compliance claim is made.

### Technical operations

- Deploy behind HTTPS on a supported Node runtime with a persistent private disk. Do not use the temporary preview as your production school server.
- Set a strong unique `ADMIN_PASSWORD`; restrict admin access further with identity-aware access or an approved identity provider.
- Add named staff accounts, least-privilege roles, MFA and an auditable account lifecycle before expanding the admissions team. The current audit trail records status changes, not individual staff identities.
- Configure backups, restore testing, monitoring, alerts, patching and incident response.
- Add malware scanning/quarantine for teacher uploads. MIME and file-signature checks are not malware scanning.
- Add transactional email/WhatsApp only after selecting providers and setting appropriate consent and delivery handling.
- Add an approved cookie/privacy flow if analytics, marketing scripts or other non-essential tracking are introduced. None is included now.
- Confirm production rate-limit proxy settings; the supplied server expects one trusted reverse-proxy hop.
- Run security, accessibility, real-mobile, low-bandwidth and load tests.
- Consider server-rendering or pre-rendering public pages and route-specific metadata for stronger search indexing; this release uses a client-rendered React app.

### Payments

- Configure Paystack **test** credentials and the real HTTPS `PUBLIC_URL` first.
- Configure `/api/payments/webhook` in the merchant dashboard.
- Test successful, failed, abandoned, delayed and duplicate payment scenarios, amount/currency mismatch and webhook retries.
- Add checkout idempotency and reconciliation for simultaneous pending attempts before enabling live payments.
- Confirm published refund terms and merchant support responsibilities.
- Only after approval, use a live merchant key and set `LAUNCH_MODE=live`.

## Roadmap: build next, in the right order

### Phase 2 — The connected online school

Verified learner/guardian/teacher identities and roles; programme admission; class and subject assignment; time-zone-aware timetables; teacher-approved classroom links; assignments; attendance; assessment results. Start with a trusted live-meeting provider instead of building video infrastructure immediately.

### Phase 3 — A parent never has to guess

Guardian-linked progress views, weekly learning summaries, teacher comments, mentor goal plans, attendance alerts and clear payment history. Make reports useful with “what improved / what needs attention / what to do next”, not only averages.

### Phase 4 — Personalised, responsible growth

Subject-level revision recommendations, larger reviewed question banks, adaptive practice, project portfolios, accessible low-bandwidth lessons and selected language support. Any AI assistant should be age-appropriate, supervised, privacy-preserving and grounded in teacher-approved content.

### Infrastructure for wider scale

PostgreSQL and migrations; private object storage with short-lived download links; a shared cache/session/rate-limit store; queued notification jobs; CDN-served assets; monitored backups; load tests; regional performance checks; accessibility reviews; server-rendered public content. SQLite is a practical single-instance starting point, not a claim of unlimited concurrent capacity.

## Files and editing

- `README.md`: installation, environment variables, architecture and payment setup.
- `docs/SOURCE-AUDIT.md`: palette evidence, source review and migration decisions.
- `docs/WEBSITE-COPY.md`: editable text export of public page copy.
- `AFRISTEM-Website-Copy.docx`: editorial review copy supplied alongside the source archive.
- `server/content.js`: programmes, resources, FAQs and quiz content.
- `src/main.jsx`: remaining page copy and user journeys.
- `src/style.css`: colour tokens, layout and mobile styling.

The distributable ZIP excludes old WordPress credentials, runtime data, uploaded test documents, the preview admin password, node_modules and generated build output. Install dependencies and run `npm run build` after extraction. Keep the original WordPress backup archived separately.
