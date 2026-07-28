# Supabase backend security foundation

This directory contains local, reviewable Supabase configuration and migrations.
It is not linked to a hosted project, and the migration has not been applied to
local, preview, or production data.

## Scope

`20260728074642_create_secure_backend_foundation.sql` creates only new objects:

- `private.admin_users`
- `public.quote_requests`
- `public.quote_notification_deliveries`
- `public.customer_reviews`
- private timestamp and notification-seeding trigger functions
- `public.create_quote_request(...)` for atomic idempotency, durable rate
  limiting, storage, and notification-row creation
- `public.get_current_admin_access()`

The migration deliberately does not inspect or alter legacy `quotes`, `reviews`,
or `settings` tables. It creates no Auth users, review uploads, Storage buckets,
customer reviews, settings rows, or production credentials.

## Access model

- `anon` and `authenticated` have no table privileges on the new tables.
- `service_role` receives only `select` and `update` on the three runtime data
  tables. It receives no direct table `delete`, direct table `insert`,
  administrator-membership, or sequence privilege.
- The quote-intake RPC is `security definer`, has an empty `search_path`, uses
  fully qualified object names, and is executable only by `service_role`. It
  contains the only approved insert path for quotes and seeded notification
  rows.
- Every new table has RLS enabled, with no direct browser CRUD policy.
- An authenticated caller can invoke `get_current_admin_access()`, which returns
  only that caller's active membership.
- The authorization helper is `security definer`, has an empty `search_path`,
  uses fully qualified object names, and has execution revoked from every role
  except `authenticated`.
- The service-role or secret key must never appear in client code, `VITE_`
  variables, source-controlled environment files, or preview environments.

## Staged MFA

The application requires AAL2 for every quote/review data endpoint and guides a
new approved admin through TOTP enrollment before loading customer data.
`private.admin_users.mfa_required` still defaults to `false` so the membership
check can support that first enrollment safely.

After approved administrators have enrolled and tested verified factors, create
a new migration with the Supabase CLI. That migration must first fail closed if
any active administrator lacks a verified factor, then set `mfa_required` to
`true`. The server authorization layer enforces that flag as defense in depth,
in addition to the unconditional AAL2 requirement on customer-data endpoints.

Do not edit the existing migration to activate MFA after it has been reviewed or
applied. Use a new migration so the policy change remains auditable.

## Production preflight

Before any hosted migration:

1. Confirm the exact production Supabase project reference.
2. Confirm the project is active and take an encrypted schema and relevant-data
   backup outside Git.
3. Inventory existing tables, columns, constraints, grants, policies, functions,
   triggers, Auth settings, and migration history without querying customer PII.
4. Run the migration against a disposable local or staging Supabase project.
5. Verify direct `anon` and `authenticated` CRUD is denied.
6. Verify the user-token admin RPC returns only the caller's active membership.
7. Verify duplicate idempotency keys cannot create two quotes.
8. Verify IP and normalized-phone limits return `rate_limited` without storing
   or notifying.
9. Verify a quote insert atomically creates one `chariot` and one `ntfy`
   delivery row.
10. Run Supabase Security and Performance Advisors.
11. Obtain separate approval before linking or applying the migration.

## Administrator enrollment

Create Auth users through an approved administrative workflow. Do not permit
public signup. After each account exists, add its immutable Auth UUID to
`private.admin_users` with the minimum required role. Never authorize from
user-editable metadata.

No email addresses, passwords, recovery codes, TOTP secrets, access tokens, or
service keys belong in migrations or repository documentation.

## Review uploads

Customer review submission and photo uploads remain disabled. No Storage bucket
or policy is created here. A future upload migration must be independently
reviewed for private-object access, MIME and file-signature validation, byte and
dimension limits, random object paths, metadata removal, moderation, and
data-retention requirements.

## Rollback

Use `rollback/contain_backend_security.sql` only as a reviewed emergency
containment procedure. It preserves all tables and records, revokes the admin
RPC, and deactivates memberships. Application rollback must target the safe
non-sending Public Foundation build, never the legacy browser-write build.

Permanent object removal is intentionally absent. Export and verify retained
records before proposing any destructive cleanup in a separate migration.
