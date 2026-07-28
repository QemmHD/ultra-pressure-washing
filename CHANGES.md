# Ultra Pressure Washing — Site Change Log

Track of every meaningful change made between sessions.

---

## 2026-07-28 — Backend security implementation in progress

- Created the local stacked branch `codex/backend-security` from Public
  Foundation commit `389f6ec67217558908d9766e1ee6f69d3f49174d`.
- Added a production-gated Netlify Function architecture for quote intake with
  strict server validation, idempotency, rate controls, storage-before-
  notification ordering, provider timeouts, and PII-redacted logging.
- Added Supabase Auth client support and fail-closed authenticated admin
  architecture. No browser password or fabricated localStorage admin token is
  used.
- Added additive Supabase migration scaffolding for secure quote storage,
  moderated reviews, admin authorization, RLS, and explicit grants.
- Kept local, branch, and deploy-preview quote forms non-sending.
- Removed the obsolete browser-side API module containing direct database
  writes and exposed notification credentials.
- Added pinned backend dependencies and security-focused tests and audits.
- Updated the aligned React Router v7 packages, Vite, Sharp, and audit tooling
  dependencies to their latest compatible patched releases and pinned safe
  transitive versions where the upstream range lagged.
- Pinned browser and server Supabase traffic to a validated project reference
  and ntfy traffic to the exact official origin so credentials, bearer tokens,
  and server secrets cannot be sent to an arbitrary configured host.
- Narrowed `service_role` table grants and moved quote insertion behind the
  fixed-search-path RPC.
- Added a disposable PostgreSQL 17-compatible PGlite rehearsal that executes
  the exact migration unchanged and verifies grants, RLS flags, RPC behavior,
  durable limits, moderation constraints, and containment locally.

No commit, push, hosted database change, Netlify setting change, or production
deployment was performed as part of this local implementation.

---

## 2026-05-19 — Full site audit & bug fixes

### Bug fixes
- `App.tsx` — Added missing routes for `/privacy-policy` and `/terms-of-service` (both pages existed but were 404)
- `Admin.tsx` — Fixed logout bug: "Sign Out" now calls `logoutAdmin()` which clears localStorage token; previously the token persisted and you'd be auto-logged back in on refresh
- `Admin.tsx` — Removed unused `TrendingUp` import
- `Header.tsx` — Fixed mobile "Get Your Free Quote" button: changed from `<Link to="/#quote-form">` to `<a href="/#quote-form">` (React Router Link was eating the hash on non-home pages)
- `Footer.tsx` — Fixed "Request Free Estimate" button href from `#quote-form` to `/#quote-form` (was only working from home page)
- `Home.tsx` — Removed unused `ChevronDown` import
- `Process.tsx` — Removed unused `Link` import
- `Reviews.tsx` — Removed "Prototype notice" customer-visible text; replaced with professional thank-you line

### Improvements
- `FAQ.tsx` — Added CTA section at bottom (call button + quote button) to match every other page
- `NotFound.tsx` — Completely restyled 404 page to match site design (was plain gray text); added "Go Home" and "Call Us" buttons

### Audit findings (no code change needed)
- Admin password security: `VITE_ADMIN_PASSWORD` is client-side only — anyone with DevTools can find it. This is an inherent limitation of a frontend-only site. `.env` is gitignored so it won't be committed.
- `og:image` in index.html uses relative `/hero-bg.jpg` — social media scrapers need an absolute URL. Before launch, update to `https://ultrapressurewashing.net/hero-bg.jpg`
- Admin "Manage Services" toggle is in-memory only (doesn't persist to localStorage). The "+ Add Service" button does nothing. These are cosmetic admin features only.
- Home.tsx service cards (House Wash, Concrete) still use Pexels stock photos — can be replaced with real photos when available
- Favicon is a 💦 emoji — functional but could be replaced with a branded icon

---

## 2026-05-19 — Real client photos added

### Before/After Gallery — real client photos
- Created `public/gallery/` folder
- Copied 12 real job photos from `E:\Downloads\site photos` into `public/gallery/`
- Updated `src/pages/BeforeAfter.tsx` — replaced all 4 Pexels placeholder pairs with 6 real before/after pairs using local images
- Photos are paired sequentially (file 1=before, file 2=after, etc.); reorder in the `pairs` array if needed
- Titles/locations/services assigned per pair — update these to match the actual jobs if the owner knows which job each photo is from

### Before/After page added (earlier this session)
- `/before-after` route added to React Router
- `src/pages/BeforeAfter.tsx` created with drag-reveal slider component
- Nav link "Gallery" added to header pointing to `/before-after`

### General setup (earlier sessions)
- Logo: `public/logo-transparent.png` — real Ultra branding, black bg stripped via Pillow
- Quote form wired to Chariot (chariotai.com/api/forms/submit) — owner gets email per submission
- SMS push via ntfy.sh on every quote — owner installs ntfy app, subscribes to topic in `.env`
- Admin dashboard at `/admin` — password via `VITE_ADMIN_PASSWORD` env var
- Hero headline/subtext/service area driven by admin settings (localStorage)
- Netlify deployment configured: `public/_redirects` handles SPA routing
- Custom domain target: ultrapressurewashing.net
- Services page: 3 cards only (House Soft Wash, Concrete/Driveway, Roof Wash)
- Window Cleaning and Gutter Cleaning removed from service cards but kept in quote form checkboxes and footer
- Active promo: FREE Gutter Cleaning with any Roof + House Wash package

---

## Current backend activation notes

- The historical `VITE_ADMIN_PASSWORD` and browser-side `VITE_NTFY_TOPIC`
  architecture above has been superseded. Those variables must not be restored.
- Production activation requires the separately reviewed server-only environment
  variables documented in `README_BACKEND.md`; source-controlled production
  activation remains disabled.
- The generated Supabase migration must be tested against a disposable local
  database, reviewed, backed up, and explicitly approved before it is applied to
  the identified production project.
- Admin access requires an approved Supabase Auth account, membership in
  `private.admin_users`, and an enrolled TOTP factor before protected quote or
  review data can be accessed.
- Photo and gallery facts now come from the canonical project data completed
  during the Public Foundation phase.
