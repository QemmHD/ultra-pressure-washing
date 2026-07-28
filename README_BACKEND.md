# Backend Security Architecture

The backend implementation is intentionally fail-closed until the appropriate
Supabase project, reviewed migrations, owner accounts, and context-scoped
Netlify environment values are separately approved.

The public site has two operating modes:

- `VITE_QUOTE_MODE=preview` or missing: the quote form validates locally and
  displays `Preview mode — no request was sent.` No request leaves the browser.
- `VITE_QUOTE_MODE=live`: the browser may call the same-origin `/api/quote`
  endpoint. The Function still rejects the request unless it is running in the
  published production deploy for the expected Netlify site and the server-side
  intake kill switch is enabled.
- An explicitly approved integrated staging rehearsal may instead set
  `VITE_STAGING_BACKEND_ENABLED=true` and an exact
  `VITE_STAGING_PREVIEW_ORIGIN`. That path is accepted only for the
  source-pinned staging project and exact deploy-preview origin. Its response
  states that the request was stored only in isolated staging, and both
  notification providers must remain disabled.

Ordinary deploy previews, branch deploys, and local builds remain in preview
mode. A temporary integrated staging preview may receive only staging
credentials, with server secrets limited to Functions scope. Production
credentials must never enter a preview.

## Components

- `netlify/functions/submit-quote.ts` is the production quote boundary.
- `netlify/functions/_shared/` contains strict validation, environment guards,
  persistence, notification, and redacted logging helpers.
- `src/lib/quote-client.ts` is the browser adapter. It never contains a provider
  credential or Supabase secret key.
- `src/lib/supabase-client.ts` provides the public Supabase Auth client only
  when the public project URL and publishable key are configured.
- `src/lib/admin-api.ts` sends authenticated admin requests without inventing
  or persisting a separate browser admin token.
- `supabase/migrations/` contains additive schema and RLS changes generated
  through the pinned Supabase CLI.

The legacy `src/lib/api.ts` browser-write architecture must not be restored.

## Quote Processing Order

1. Reject every context except an exact published production deploy or an
   explicitly enabled, exact-origin staging deploy preview; also reject
   wrong-site, disabled, or malformed requests.
2. Validate bounded JSON against the canonical service IDs.
3. Apply platform and durable rate controls.
4. Atomically claim the idempotency key and store the quote.
5. Send enabled notification channels with explicit timeouts.
6. Record each notification result.
7. Return a generic result without exposing customer data, internal request
   identifiers, or provider responses.

A notification failure must never erase a safely stored quote or cause a retry
to create duplicate notifications.

## Authentication and Authorization

- Admin authentication uses Supabase Auth.
- Authorization is tied to immutable Auth user IDs in the database.
- Browser-editable `user_metadata` is never an authorization source.
- Sensitive admin operations require an active admin membership and an AAL2
  session after TOTP enrollment is activated.
- RLS and explicit grants are the database authorization boundary.
- A Supabase secret/service key is server-only and must never enter a client
  bundle, public environment variable, log, or source map.

Public signup must remain disabled. Owner accounts are created by a trusted
Dashboard or server-side invitation process only after the exact production
project is confirmed.

## Reviews

Customer review submission and photo uploads remain disabled during the first
backend-security release. The schema supports moderation, but no review becomes
public unless it is genuine, consented, and explicitly approved.

Do not add review or aggregate-rating structured data until approved reviews are
actually visible.

## Environment Configuration

Use `.env.example` only as a list of names. Never add real values to it.

Public browser values:

- `VITE_SUPABASE_PROJECT_REF`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_ADMIN_AUTH_ENABLED`
- `VITE_QUOTE_MODE`
- `VITE_STAGING_BACKEND_ENABLED`
- `VITE_STAGING_PREVIEW_ORIGIN`
- `VITE_ADMIN_PASSWORD_RECOVERY_ENABLED`

Server-only values are listed in `.env.example` without values. Configure them
in Netlify with Functions scope and only the approved deploy context. Do not
put them in `netlify.toml` or prefix them with `VITE_`.

The server accepts a 20-character `SUPABASE_PROJECT_REF`, then constructs the
only permitted server destination as
`https://<project-ref>.supabase.co`. It never sends a server key or user bearer
token to an arbitrary configured URL. The browser independently constructs its
Auth URL from `VITE_SUPABASE_PROJECT_REF`, which must identify that same
approved project. ntfy delivery is similarly pinned to the exact
`https://ntfy.sh` origin; there is no configurable notification host.

Both server routes require the exact approved origin, expected Netlify site ID,
and an explicit server kill switch. Production additionally requires the
published production deploy context. Staging additionally requires the
unpublished `deploy-preview` context, a source-pinned staging project reference,
and disabled Chariot and ntfy adapters. Admin data endpoints always require an
AAL2 session.

Generate `QUOTE_IP_HASH_SECRET` from at least 32 random bytes. Rotating that
secret intentionally breaks correlation with older pseudonymous IP hashes and
temporarily resets IP-based durable rate-limit continuity.

## Temporary Integrated Staging Rehearsal

The owner-approved integrated staging path is deliberately narrow:

- It accepts only the exact deploy-preview origin configured in both the
  browser build and Functions environment.
- It accepts only the source-pinned staging Supabase project reference.
- Its Supabase secret key and IP-hash secret are staging-only, secret-marked,
  Functions-scoped values.
- Chariot and ntfy must both be explicitly disabled. Any enabled notification
  provider makes the staging Function fail closed.
- Password recovery, signup, invitations, magic links, review submission, and
  uploads remain disabled so the rehearsal sends no email, SMS, review,
  notification, or production request.
- Production password recovery is also fail-closed until
  `VITE_ADMIN_PASSWORD_RECOVERY_ENABLED=true` is separately configured in the
  approved production build.
- The browser displays a staging banner and a staging-specific quote result so
  a fake test lead cannot be confused with a production request.

Because a repository deploy-preview context can be shared by future pull
requests, staging credentials are temporary. Remove the staging context values
and rebuild the preview after the rehearsal. Never reuse a staging secret in
production.

## Local Verification

```text
bun install --frozen-lockfile
bun run typecheck
bun run lint
bun run test:backend
bun run build
bun run audit:backend
```

The Supabase CLI is pinned in `devDependencies`. Discover current commands with
`bunx supabase --help` before using them.

`tests/backend/migration-pglite.test.ts` executes the exact migration unchanged
inside disposable PostgreSQL 17-compatible PGlite. It verifies the schema,
grants, RLS flags, RPCs, constraints, rate limits, and containment procedure
without contacting a hosted database. PGlite is single-connection and does not
provide Supabase Auth, PostgREST, Advisors, or the production schema, so a
disposable Supabase/staging rehearsal remains mandatory.

Do not link or apply migrations to a hosted project as a substitute for local
testing or without the separate production approvals.

## Production Gate

Production remains blocked until all of the following are separately approved:

1. Confirm the exact production Supabase project.
2. Capture schema, grants, policies, affected data, and Storage backups.
3. Rehearse migrations and RLS tests in an isolated environment.
4. Rotate the exposed Chariot credential and ntfy topic/token.
5. Create separate owner Auth accounts and complete TOTP enrollment.
6. Configure production-only Netlify values without printing them.
7. Verify a non-sending integrated deploy preview.
8. Enable the production-only browser capability flags only after the
   database, accounts, MFA, server environment, and rollback checks pass.
9. Approve a retention and deletion policy for quote contact details, property
   addresses, IP hashes, user agents, and notification records.
10. Inventory and approve how legacy `quotes`, `reviews`, and `settings` remain
    accessible or are migrated before replacing the actively used admin flow.
11. Approve the exact database migration and rollback SQL.
12. Resolve or explicitly accept the React Router v7 RSC-only advisory. This
    build has RSC and server route actions disabled, but the required v7 line
    does not yet have a patched published release.
13. Approve the exact full application commit SHA.
14. Run one separately approved tagged production canary.

If production intake must be stopped, disable `QUOTE_SUBMISSION_ENABLED`.
Application rollback must use the safe non-sending Public Foundation build, not
the insecure legacy browser-write implementation.
