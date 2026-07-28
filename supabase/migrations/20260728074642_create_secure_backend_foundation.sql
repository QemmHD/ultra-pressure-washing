-- Ultra Pressure Washing backend security foundation.
--
-- This migration is intentionally additive:
--   * it does not inspect, alter, rename, or drop legacy tables;
--   * it does not create an admin account;
--   * it does not enable customer review submission or file uploads;
--   * it stages MFA through private.admin_users.mfa_required, which defaults
--     to false until every approved administrator has enrolled a factor.

begin;

-- Fail closed instead of changing privileges on an unknown pre-existing
-- schema. If production already has a schema named private, inventory it and
-- revise this migration in a new review before applying anything.
do $migration$
begin
  if exists (
    select 1
    from pg_catalog.pg_namespace
    where nspname = 'private'
  ) then
    raise exception
      'Schema private already exists; inventory it before applying this migration.';
  end if;
end;
$migration$;

create schema private;

comment on schema private is
  'Non-exposed application data and helper functions. Do not add this schema to the Supabase Data API.';

revoke all on schema private from public;
revoke all on schema private from anon, authenticated;
grant usage on schema private to service_role;

create table private.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'admin',
  active boolean not null default true,
  mfa_required boolean not null default false,
  invited_by uuid references auth.users (id) on delete set null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint admin_users_role_check
    check (role in ('owner', 'admin', 'editor'))
);

comment on table private.admin_users is
  'Server-managed allowlist for authenticated administrators. MFA remains staged until mfa_required is enabled after enrollment.';

create table public.quote_requests (
  id uuid primary key default gen_random_uuid(),
  idempotency_key uuid not null,
  first_name text not null,
  last_name text not null,
  phone text not null,
  email text,
  property_address text not null,
  service_ids text[] not null,
  contact_preference text not null,
  status text not null default 'new',
  source text not null default 'website',
  client_started_at timestamp with time zone,
  ip_hash text,
  user_agent text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint quote_requests_idempotency_key_key unique (idempotency_key),
  constraint quote_requests_first_name_check
    check (char_length(btrim(first_name)) between 1 and 80),
  constraint quote_requests_last_name_check
    check (char_length(btrim(last_name)) between 1 and 80),
  constraint quote_requests_phone_check
    check (char_length(btrim(phone)) between 7 and 32),
  constraint quote_requests_email_check
    check (
      email is null
      or char_length(btrim(email)) between 3 and 160
    ),
  constraint quote_requests_property_address_check
    check (char_length(btrim(property_address)) between 5 and 200),
  constraint quote_requests_service_ids_check
    check (
      cardinality(service_ids) between 1 and 8
      and service_ids <@ array[
        'house-building-soft-wash',
        'roof-washing',
        'concrete-driveway-cleaning',
        'window-cleaning',
        'gutter-cleaning',
        'deck-patio-cleaning',
        'fence-cleaning',
        'commercial-exterior-cleaning'
      ]::text[]
    ),
  constraint quote_requests_contact_preference_check
    check (contact_preference in ('call', 'text')),
  constraint quote_requests_status_check
    check (
      status in (
        'new',
        'contacted',
        'scheduled',
        'completed',
        'archived',
        'spam'
      )
    ),
  constraint quote_requests_source_check
    check (char_length(btrim(source)) between 1 and 32),
  constraint quote_requests_ip_hash_check
    check (ip_hash is null or ip_hash ~ '^[0-9a-f]{64}$'),
  constraint quote_requests_user_agent_check
    check (user_agent is null or char_length(user_agent) <= 512)
);

comment on table public.quote_requests is
  'Durable quote intake. Direct browser access is denied; production writes must use the guarded server endpoint.';

create table public.quote_notification_deliveries (
  id bigint generated always as identity primary key,
  quote_id uuid not null
    references public.quote_requests (id) on delete cascade,
  provider text not null,
  status text not null default 'pending',
  provider_status integer,
  attempt_count integer not null default 0,
  last_error text,
  attempted_at timestamp with time zone,
  delivered_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint quote_notification_deliveries_quote_provider_key
    unique (quote_id, provider),
  constraint quote_notification_deliveries_provider_check
    check (provider in ('chariot', 'ntfy')),
  constraint quote_notification_deliveries_status_check
    check (status in ('pending', 'sent', 'failed', 'disabled')),
  constraint quote_notification_deliveries_provider_status_check
    check (
      provider_status is null
      or provider_status between 100 and 599
    ),
  constraint quote_notification_deliveries_attempt_count_check
    check (attempt_count >= 0),
  constraint quote_notification_deliveries_last_error_check
    check (last_error is null or char_length(last_error) <= 1000),
  constraint quote_notification_deliveries_sent_check
    check (status <> 'sent' or delivered_at is not null)
);

comment on table public.quote_notification_deliveries is
  'One delivery state per quote and provider. Failures remain observable without losing the stored quote.';

create table public.customer_reviews (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  customer_email text,
  customer_phone text,
  display_name text,
  review_text text not null,
  rating smallint not null,
  service_id text,
  project_location text,
  location_verified boolean not null default false,
  consent_to_publish boolean not null default false,
  status text not null default 'pending',
  moderated_by uuid references auth.users (id) on delete set null,
  moderated_at timestamp with time zone,
  moderation_note text,
  published_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint customer_reviews_customer_name_check
    check (char_length(btrim(customer_name)) between 1 and 120),
  constraint customer_reviews_customer_email_check
    check (
      customer_email is null
      or char_length(btrim(customer_email)) between 3 and 160
    ),
  constraint customer_reviews_customer_phone_check
    check (
      customer_phone is null
      or char_length(btrim(customer_phone)) between 7 and 32
    ),
  constraint customer_reviews_display_name_check
    check (
      display_name is null
      or char_length(btrim(display_name)) between 1 and 120
    ),
  constraint customer_reviews_review_text_check
    check (char_length(btrim(review_text)) between 10 and 2000),
  constraint customer_reviews_rating_check
    check (rating between 1 and 5),
  constraint customer_reviews_service_id_check
    check (
      service_id is null
      or service_id in (
        'house-building-soft-wash',
        'roof-washing',
        'concrete-driveway-cleaning',
        'window-cleaning',
        'gutter-cleaning',
        'deck-patio-cleaning',
        'fence-cleaning',
        'commercial-exterior-cleaning'
      )
    ),
  constraint customer_reviews_project_location_check
    check (
      project_location is null
      or char_length(btrim(project_location)) between 2 and 120
    ),
  constraint customer_reviews_status_check
    check (status in ('pending', 'approved', 'rejected', 'archived')),
  constraint customer_reviews_moderation_note_check
    check (
      moderation_note is null
      or char_length(moderation_note) <= 1000
    ),
  constraint customer_reviews_approved_check
    check (
      status <> 'approved'
      or (
        consent_to_publish
        and display_name is not null
        and char_length(btrim(display_name)) > 0
        and moderated_by is not null
        and moderated_at is not null
        and published_at is not null
      )
    ),
  constraint customer_reviews_rejected_check
    check (
      status <> 'rejected'
      or (
        moderated_by is not null
        and moderated_at is not null
        and published_at is null
      )
    )
);

comment on table public.customer_reviews is
  'Moderated customer feedback. Submission and uploads remain disabled until a separately reviewed release.';

create index quote_requests_created_at_idx
  on public.quote_requests (created_at desc);

create index quote_requests_status_created_at_idx
  on public.quote_requests (status, created_at desc);

create index quote_requests_ip_hash_created_at_idx
  on public.quote_requests (ip_hash, created_at desc)
  where ip_hash is not null;

create index quote_requests_normalized_phone_created_at_idx
  on public.quote_requests (
    (pg_catalog.regexp_replace(phone, '[^0-9]', '', 'g')),
    created_at desc
  );

create index quote_notification_deliveries_quote_id_idx
  on public.quote_notification_deliveries (quote_id);

create index quote_notification_deliveries_status_idx
  on public.quote_notification_deliveries (status, attempted_at);

create index customer_reviews_status_published_at_idx
  on public.customer_reviews (status, published_at desc);

create function private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
begin
  new.updated_at = pg_catalog.statement_timestamp();
  return new;
end;
$function$;

comment on function private.set_updated_at() is
  'Maintains updated_at for backend-owned records. Not callable through the Data API.';

revoke all on function private.set_updated_at()
  from public, anon, authenticated, service_role;

create trigger admin_users_set_updated_at
before update on private.admin_users
for each row execute function private.set_updated_at();

create trigger quote_requests_set_updated_at
before update on public.quote_requests
for each row execute function private.set_updated_at();

create trigger quote_notification_deliveries_set_updated_at
before update on public.quote_notification_deliveries
for each row execute function private.set_updated_at();

create trigger customer_reviews_set_updated_at
before update on public.customer_reviews
for each row execute function private.set_updated_at();

create function private.seed_quote_notification_deliveries()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
begin
  insert into public.quote_notification_deliveries (quote_id, provider)
  values
    (new.id, 'chariot'),
    (new.id, 'ntfy');

  return new;
end;
$function$;

comment on function private.seed_quote_notification_deliveries() is
  'Creates both notification delivery records atomically with a new quote.';

revoke all on function private.seed_quote_notification_deliveries()
  from public, anon, authenticated, service_role;

create trigger quote_requests_seed_notification_deliveries
after insert on public.quote_requests
for each row execute function private.seed_quote_notification_deliveries();

create function public.create_quote_request(
  p_quote_id uuid,
  p_idempotency_key uuid,
  p_first_name text,
  p_last_name text,
  p_phone text,
  p_email text,
  p_property_address text,
  p_service_ids text[],
  p_contact_preference text,
  p_source text,
  p_status text,
  p_client_started_at timestamp with time zone,
  p_ip_hash text,
  p_user_agent text
)
returns table (
  outcome text,
  quote_id uuid,
  retry_after_seconds integer
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  existing_quote_id uuid;
  inserted_quote_id uuid;
  normalized_phone text;
  recent_ip_count integer;
  daily_ip_count integer;
  recent_phone_count integer;
begin
  if p_ip_hash is null or p_ip_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'A valid pseudonymous IP hash is required.';
  end if;

  -- Serialize submissions from the same pseudonymous address and normalized
  -- phone so concurrent requests cannot race through the durable limits.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('quote-ip:' || p_ip_hash, 0)
  );

  select request.id
  into existing_quote_id
  from public.quote_requests as request
  where request.idempotency_key = p_idempotency_key
  limit 1;

  if existing_quote_id is not null then
    return query
      select 'duplicate'::text, existing_quote_id, null::integer;
    return;
  end if;

  normalized_phone := pg_catalog.regexp_replace(p_phone, '[^0-9]', '', 'g');
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('quote-phone:' || normalized_phone, 0)
  );

  select
    count(*) filter (
      where request.created_at >= pg_catalog.now() - interval '15 minutes'
    )::integer,
    count(*) filter (
      where request.created_at >= pg_catalog.now() - interval '24 hours'
    )::integer
  into recent_ip_count, daily_ip_count
  from public.quote_requests as request
  where request.ip_hash = p_ip_hash
    and request.created_at >= pg_catalog.now() - interval '24 hours';

  select count(*)::integer
  into recent_phone_count
  from public.quote_requests as request
  where request.created_at >= pg_catalog.now() - interval '15 minutes'
    and pg_catalog.regexp_replace(request.phone, '[^0-9]', '', 'g')
      = normalized_phone;

  if recent_ip_count >= 5 or recent_phone_count >= 3 then
    return query
      select 'rate_limited'::text, null::uuid, 900::integer;
    return;
  end if;

  if daily_ip_count >= 20 then
    return query
      select 'rate_limited'::text, null::uuid, 86400::integer;
    return;
  end if;

  insert into public.quote_requests (
    id,
    idempotency_key,
    first_name,
    last_name,
    phone,
    email,
    property_address,
    service_ids,
    contact_preference,
    source,
    status,
    client_started_at,
    ip_hash,
    user_agent
  )
  values (
    p_quote_id,
    p_idempotency_key,
    p_first_name,
    p_last_name,
    p_phone,
    nullif(p_email, ''),
    p_property_address,
    p_service_ids,
    p_contact_preference,
    p_source,
    p_status,
    p_client_started_at,
    p_ip_hash,
    p_user_agent
  )
  on conflict (idempotency_key) do nothing
  returning id into inserted_quote_id;

  if inserted_quote_id is not null then
    return query
      select 'created'::text, inserted_quote_id, null::integer;
    return;
  end if;

  select request.id
  into existing_quote_id
  from public.quote_requests as request
  where request.idempotency_key = p_idempotency_key
  limit 1;

  return query
    select 'duplicate'::text, existing_quote_id, null::integer;
end;
$function$;

comment on function public.create_quote_request(
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
) is
  'Atomically enforces durable quote limits, idempotency, storage, and notification-row seeding for the trusted server.';

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

grant execute on function public.create_quote_request(
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
) to service_role;

create function public.get_current_admin_access()
returns table (
  role text,
  active boolean,
  mfa_required boolean
)
language sql
stable
security definer
set search_path = ''
as $function$
  select
    admin_user.role,
    admin_user.active,
    admin_user.mfa_required
  from private.admin_users as admin_user
  where admin_user.user_id = (select auth.uid())
    and admin_user.active
  limit 1;
$function$;

comment on function public.get_current_admin_access() is
  'Returns only the signed-in caller''s active admin membership. Server endpoints enforce AAL2 before exposing customer data.';

revoke all on function public.get_current_admin_access()
  from public, anon, authenticated, service_role;
grant execute on function public.get_current_admin_access()
  to authenticated;

alter table private.admin_users enable row level security;
alter table public.quote_requests enable row level security;
alter table public.quote_notification_deliveries enable row level security;
alter table public.customer_reviews enable row level security;

-- No anon or authenticated table policies are intentional. Public-site and
-- admin data operations must pass through server-side endpoints.
revoke all on table private.admin_users
  from public, anon, authenticated, service_role;

revoke all on table public.quote_requests
  from public, anon, authenticated, service_role;
grant select, update on table public.quote_requests
  to service_role;

revoke all on table public.quote_notification_deliveries
  from public, anon, authenticated, service_role;
grant select, update
  on table public.quote_notification_deliveries
  to service_role;

revoke all on table public.customer_reviews
  from public, anon, authenticated, service_role;
grant select, update on table public.customer_reviews
  to service_role;

revoke all on sequence public.quote_notification_deliveries_id_seq
  from public, anon, authenticated, service_role;

commit;
