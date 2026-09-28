# Source review and migration decisions

Reviewed 28 September 2026.

## Inputs

- Owner-supplied website: https://drive.google.com/file/d/1jpVYLDIIoABFinsIhzuCGQT9havyiunF/view
- Owner-supplied school blueprint: https://docs.google.com/document/d/1fqrkvgoiSx2POstEwmip5qmNCo_hQNxtZFwyVZu8i6k/edit

The 139 MiB outer ZIP contains a WPvivid backup: database, themes, two plugin parts, uploads, content, WordPress core and package information. `original-backup-inventory.json` records that inventory. We inspected the database's public page blocks, Astra settings, navigation/branding information and uploaded imagery. Legacy WordPress PHP and plugins were not executed. The old database and credentials are not distributed with the rebuilt app.

## Palette preserved from the actual saved Astra settings

| Role | Existing value | Treatment |
|---|---|---|
| Primary accent | `#ff6210` | Calls to action, icons, accent details |
| Hover accent | `#f15808` | Button hover |
| Heading / dark surface | `#1c0d0a` | Headings, footer, dark feature sections |
| Body text | `#353535` | Supporting content |
| Warm background | `#fef1e4` | Hero, mentorship, calls to action |
| White | `#ffffff` | Reading surfaces and cards |

The document's blue/green palette was a possible branding direction, not the saved design. The owner's explicit instruction not to change the current combination took precedence. Secondary neutral tints support borders and muted text.

The original typography settings used Rubik body text and Georgia headings. The upgrade uses locally hosted Manrope and DM Sans for readability, with a Georgia italic accent to retain warmth. Font OFL licences are bundled. The atom wordmark is a new treatment, not an assertion of an existing official school logo.

## Existing public site

The database contains the published Home, About, Services, Contact and Blog pages. The homepage had general online-learning, mentorship, digital-skills and assessment copy, alongside repeated team sections and inherited generic educator names. Other imported imagery and template pages were also present.

Rebuild decisions:

- Convert generic Services into four explicit programme pathways.
- Replace template copy with the school-specific offering in the blueprint.
- Remove inherited educator identities and unverified social proof. Do not invent teacher recruitment outcomes.
- Replace ambiguous Start Learning links with registration, programme discovery and free learning calls to action.
- Replace WordPress form/plugin dependencies with validated Node API endpoints and private persistence.
- Keep the supplied phone, WhatsApp, email, office address, hours, programme levels and subject lists.
- Keep the ₦1,000 admission form fee; do not invent tuition.
- Do not claim certificates are issued. The blueprint's explicit FAQ says no, even though a later roadmap mentions certificates.
- Keep live classrooms and full LMS deferred, as explicitly requested in the blueprint.
- Use the no-certificate, no-guaranteed-result wording consistently across FAQs, terms and programme copy.
- Do not assume ownership of `adss.org` or switch an existing live domain. `PUBLIC_URL` must be supplied by the owner.

## Media provenance

The six optimised WebP assets were adapted from the owner's backup:

- `mentor.webp`: pexels-photo-5905748.jpeg (cropped for the new layout).
- `primary.webp`: pexels-photo-8926542-8926542.
- `junior.webp`: pexels-photo-7869137-7869137.
- `senior.webp`: pexels-photo-6075913-6075913.
- `exam.webp`: pexels-photo-5905712.jpeg.
- `online.webp`: pexels-photo-5905749.jpeg.

`learner.webp` is newly generated AI illustrative imagery; it does not represent a real AFRISTEM learner or an endorsement. Existing stock media likewise is illustrative, not a claim about enrolled students or employed staff. Confirm permissions for the inherited assets before public launch.

## Copywriting direction

Warm, precise and parent-aware. The central distinction is **“We don’t just teach. We mentor.”** We explain the difference between attendance, understanding and growth without promising scores or guaranteed outcomes.

Global welcome is qualified by curriculum and time-zone fit. The offer is Nigeria-focused education available online, not an unsupported claim of accreditation in every jurisdiction. Technical and legal roadmap items are clearly labelled as planned or draft.
