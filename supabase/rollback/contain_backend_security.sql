-- EMERGENCY CONTAINMENT ONLY
--
-- Review before running. This file is deliberately outside supabase/migrations
-- and must never be applied automatically.
--
-- It preserves every admin membership, quote, notification delivery, and
-- customer review. It does not drop or truncate any object. The application
-- should be rolled back separately to the safe, non-sending Public Foundation
-- build.

begin;

-- Stop user-token admin authorization immediately while preserving membership
-- records for investigation and recovery.
revoke all on function public.get_current_admin_access()
  from public, anon, authenticated, service_role;

revoke all on function public.create_quote_request(
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text[],
  text,
  text,
  text,
  timestamp with time zone,
  text,
  text
) from public, anon, authenticated, service_role;

update private.admin_users
set
  active = false,
  updated_at = pg_catalog.statement_timestamp()
where active;

-- Reassert that the new customer-data tables cannot be reached directly by a
-- browser role. Keep service_role access so authorized recovery/export tooling
-- can preserve new records.
revoke all on table public.quote_requests
  from public, anon, authenticated;

revoke all on table public.quote_notification_deliveries
  from public, anon, authenticated;

revoke all on table public.customer_reviews
  from public, anon, authenticated;

revoke all on table private.admin_users
  from public, anon, authenticated;

commit;

-- Recovery is a separate, reviewed forward migration:
--   1. correct the application or authorization issue;
--   2. restore approved admin memberships;
--   3. require tested MFA where approved;
--   4. grant EXECUTE on public.get_current_admin_access() to authenticated;
--   5. verify all RLS/grant tests before production traffic resumes.
