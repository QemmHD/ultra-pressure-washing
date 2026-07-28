import { describe, expect, test } from "bun:test";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dir, "..", "..");
const migrationPath = path.join(
  projectRoot,
  "supabase",
  "migrations",
  "20260728074642_create_secure_backend_foundation.sql",
);
const containmentPath = path.join(
  projectRoot,
  "supabase",
  "rollback",
  "contain_backend_security.sql",
);
const migration = readFileSync(migrationPath, "utf8");
const containment = readFileSync(containmentPath, "utf8");

const testPrelude = `
  create role anon nologin noinherit nobypassrls;
  create role authenticated nologin noinherit nobypassrls;
  create role service_role nologin noinherit bypassrls;

  create schema auth;
  revoke all on schema auth from public;
  grant usage on schema auth to authenticated, service_role;

  create table auth.users (
    id uuid primary key
  );

  create function auth.uid()
  returns uuid
  language sql
  stable
  security invoker
  set search_path = ''
  as $function$
    select nullif(
      pg_catalog.current_setting('request.jwt.claim.sub', true),
      ''
    )::uuid;
  $function$;

  revoke all on function auth.uid()
    from public, anon, authenticated, service_role;
  grant execute on function auth.uid()
    to authenticated, service_role;
`;

interface VersionRow {
  major: number;
  version: string;
}

interface OutcomeRow {
  outcome: "created" | "duplicate" | "rate_limited";
  quote_id: string | null;
  retry_after_seconds: number | null;
}

interface QuoteInput {
  quoteId?: string;
  idempotencyKey?: string;
  phone?: string;
  ipHash?: string;
  serviceId?: string;
}

describe("Supabase migration execution in disposable PGlite", () => {
  test(
    "applies the exact migration and enforces the object, RLS, and grant contract",
    async () => {
      const db = await createMigratedDatabase();

      try {
        const tableRows = await db.query<{
          qualified_name: string;
          rls_enabled: boolean;
        }>(`
          select
            namespace.nspname || '.' || relation.relname as qualified_name,
            relation.relrowsecurity as rls_enabled
          from pg_catalog.pg_class as relation
          join pg_catalog.pg_namespace as namespace
            on namespace.oid = relation.relnamespace
          where (namespace.nspname, relation.relname) in (
            ('private', 'admin_users'),
            ('public', 'quote_requests'),
            ('public', 'quote_notification_deliveries'),
            ('public', 'customer_reviews')
          )
          order by qualified_name;
        `);

        expect(tableRows.rows).toEqual([
          { qualified_name: "private.admin_users", rls_enabled: true },
          { qualified_name: "public.customer_reviews", rls_enabled: true },
          {
            qualified_name: "public.quote_notification_deliveries",
            rls_enabled: true,
          },
          { qualified_name: "public.quote_requests", rls_enabled: true },
        ]);

        const triggerRows = await db.query<{ trigger_name: string }>(`
          select trigger.tgname as trigger_name
          from pg_catalog.pg_trigger as trigger
          where not trigger.tgisinternal
          order by trigger.tgname;
        `);
        expect(triggerRows.rows.map((row) => row.trigger_name)).toEqual([
          "admin_users_set_updated_at",
          "customer_reviews_set_updated_at",
          "quote_notification_deliveries_set_updated_at",
          "quote_requests_seed_notification_deliveries",
          "quote_requests_set_updated_at",
        ]);

        const indexRows = await db.query<{ index_name: string }>(`
          select indexname as index_name
          from pg_catalog.pg_indexes
          where schemaname = 'public'
            and indexname in (
              'quote_requests_created_at_idx',
              'quote_requests_status_created_at_idx',
              'quote_requests_ip_hash_created_at_idx',
              'quote_requests_normalized_phone_created_at_idx',
              'quote_notification_deliveries_quote_id_idx',
              'quote_notification_deliveries_status_idx',
              'customer_reviews_status_published_at_idx'
            )
          order by indexname;
        `);
        expect(indexRows.rows).toHaveLength(7);

        const functionRows = await db.query<{
          function_name: string;
          security_definer: boolean;
          settings: string[] | null;
        }>(`
          select
            procedure.proname as function_name,
            procedure.prosecdef as security_definer,
            procedure.proconfig as settings
          from pg_catalog.pg_proc as procedure
          join pg_catalog.pg_namespace as namespace
            on namespace.oid = procedure.pronamespace
          where (namespace.nspname, procedure.proname) in (
            ('public', 'create_quote_request'),
            ('public', 'get_current_admin_access'),
            ('private', 'set_updated_at'),
            ('private', 'seed_quote_notification_deliveries')
          )
          order by function_name;
        `);
        expect(functionRows.rows).toHaveLength(4);
        for (const functionRow of functionRows.rows) {
          expect(functionRow.settings).toContain("search_path=\"\"");
        }
        expect(
          functionRows.rows.find(
            (row) => row.function_name === "create_quote_request",
          )?.security_definer,
        ).toBe(true);
        expect(
          functionRows.rows.find(
            (row) => row.function_name === "get_current_admin_access",
          )?.security_definer,
        ).toBe(true);
        expect(
          functionRows.rows.find((row) => row.function_name === "set_updated_at")
            ?.security_definer,
        ).toBe(false);

        const privilegeRows = await db.query<{
          anon_select: boolean;
          authenticated_select: boolean;
          service_select: boolean;
          service_update: boolean;
          service_insert: boolean;
          service_delete: boolean;
          service_quote_rpc: boolean;
          anon_quote_rpc: boolean;
          authenticated_admin_rpc: boolean;
          anon_admin_rpc: boolean;
        }>(`
          select
            pg_catalog.has_table_privilege(
              'anon',
              'public.quote_requests',
              'select'
            ) as anon_select,
            pg_catalog.has_table_privilege(
              'authenticated',
              'public.quote_requests',
              'select'
            ) as authenticated_select,
            pg_catalog.has_table_privilege(
              'service_role',
              'public.quote_requests',
              'select'
            ) as service_select,
            pg_catalog.has_table_privilege(
              'service_role',
              'public.quote_requests',
              'update'
            ) as service_update,
            pg_catalog.has_table_privilege(
              'service_role',
              'public.quote_requests',
              'insert'
            ) as service_insert,
            pg_catalog.has_table_privilege(
              'service_role',
              'public.quote_requests',
              'delete'
            ) as service_delete,
            pg_catalog.has_function_privilege(
              'service_role',
              'public.create_quote_request(uuid,uuid,text,text,text,text,text,text[],text,text,text,timestamp with time zone,text,text)',
              'execute'
            ) as service_quote_rpc,
            pg_catalog.has_function_privilege(
              'anon',
              'public.create_quote_request(uuid,uuid,text,text,text,text,text,text[],text,text,text,timestamp with time zone,text,text)',
              'execute'
            ) as anon_quote_rpc,
            pg_catalog.has_function_privilege(
              'authenticated',
              'public.get_current_admin_access()',
              'execute'
            ) as authenticated_admin_rpc,
            pg_catalog.has_function_privilege(
              'anon',
              'public.get_current_admin_access()',
              'execute'
            ) as anon_admin_rpc;
        `);
        expect(privilegeRows.rows[0]).toEqual({
          anon_select: false,
          authenticated_select: false,
          service_select: true,
          service_update: true,
          service_insert: false,
          service_delete: false,
          service_quote_rpc: true,
          anon_quote_rpc: false,
          authenticated_admin_rpc: true,
          anon_admin_rpc: false,
        });

        await expectRoleDenied(
          db,
          "anon",
          "select * from public.quote_requests;",
        );
        await expectRoleDenied(
          db,
          "authenticated",
          "select * from public.quote_requests;",
        );
        await expectRoleDenied(
          db,
          "service_role",
          `
            insert into public.quote_requests (
              idempotency_key,
              first_name,
              last_name,
              phone,
              property_address,
              service_ids,
              contact_preference,
              ip_hash
            )
            values (
              '10000000-0000-4000-8000-000000000001',
              'Direct',
              'Insert',
              '8655550000',
              '100 Test Street',
              array['window-cleaning'],
              'call',
              '${"0".repeat(64)}'
            );
          `,
        );
      } finally {
        await db.close();
      }
    },
    60_000,
  );

  test(
    "executes quote RPC behavior, constraints, and caller-scoped admin access",
    async () => {
      const db = await createMigratedDatabase();

      try {
        await db.exec("set role service_role;");
        let created: OutcomeRow;
        try {
          created = await callQuote(db, {
            quoteId: "20000000-0000-4000-8000-000000000001",
            idempotencyKey: "21000000-0000-4000-8000-000000000001",
            phone: "8655551000",
            ipHash: "a".repeat(64),
          });
          expect(created).toEqual({
            outcome: "created",
            quote_id: "20000000-0000-4000-8000-000000000001",
            retry_after_seconds: null,
          });

          const duplicate = await callQuote(db, {
            quoteId: "20000000-0000-4000-8000-000000000002",
            idempotencyKey: "21000000-0000-4000-8000-000000000001",
            phone: "8655551000",
            ipHash: "a".repeat(64),
          });
          expect(duplicate).toEqual({
            outcome: "duplicate",
            quote_id: "20000000-0000-4000-8000-000000000001",
            retry_after_seconds: null,
          });

          for (let index = 0; index < 3; index += 1) {
            const phoneOutcome = await callQuote(db, {
              phone: "8655552000",
              ipHash: index.toString(16).padStart(64, "0"),
            });
            expect(phoneOutcome.outcome).toBe("created");
          }
          const phoneLimited = await callQuote(db, {
            phone: "8655552000",
            ipHash: "f".repeat(64),
          });
          expect(phoneLimited).toEqual({
            outcome: "rate_limited",
            quote_id: null,
            retry_after_seconds: 900,
          });

          const recentIpHash = "b".repeat(64);
          for (let index = 0; index < 5; index += 1) {
            const ipOutcome = await callQuote(db, {
              phone: `865600${String(index).padStart(4, "0")}`,
              ipHash: recentIpHash,
            });
            expect(ipOutcome.outcome).toBe("created");
          }
          const recentIpLimited = await callQuote(db, {
            phone: "8656009999",
            ipHash: recentIpHash,
          });
          expect(recentIpLimited).toEqual({
            outcome: "rate_limited",
            quote_id: null,
            retry_after_seconds: 900,
          });

          const dailyIpHash = "c".repeat(64);
          for (let index = 0; index < 20; index += 1) {
            const dailyOutcome = await callQuote(db, {
              phone: `865700${String(index).padStart(4, "0")}`,
              ipHash: dailyIpHash,
            });
            expect(dailyOutcome.outcome).toBe("created");
            await db.query(
              `
                update public.quote_requests
                set created_at = pg_catalog.now() - interval '16 minutes'
                where id = $1::uuid;
              `,
              [dailyOutcome.quote_id],
            );
          }
          const dailyIpLimited = await callQuote(db, {
            phone: "8657009999",
            ipHash: dailyIpHash,
          });
          expect(dailyIpLimited).toEqual({
            outcome: "rate_limited",
            quote_id: null,
            retry_after_seconds: 86_400,
          });
        } finally {
          await db.exec("reset role;");
        }

        const quoteCount = await db.query<{ count: number }>(`
          select count(*)::integer as count
          from public.quote_requests
          where idempotency_key = '21000000-0000-4000-8000-000000000001';
        `);
        expect(quoteCount.rows[0]?.count).toBe(1);

        const deliveryRows = await db.query<{
          provider: string;
          status: string;
        }>(`
          select provider, status
          from public.quote_notification_deliveries
          where quote_id = '20000000-0000-4000-8000-000000000001'
          order by provider;
        `);
        expect(deliveryRows.rows).toEqual([
          { provider: "chariot", status: "pending" },
          { provider: "ntfy", status: "pending" },
        ]);

        await expectFailure(
          db.query(`
            insert into public.customer_reviews (
              customer_name,
              review_text,
              rating,
              status
            )
            values (
              'Unmoderated Customer',
              'This review must never be approved without consent and moderation.',
              5,
              'approved'
            );
          `),
          /customer_reviews_approved_check/i,
        );
        await db.query(`
          insert into public.customer_reviews (
            customer_name,
            review_text,
            rating
          )
          values (
            'Pending Customer',
            'This review remains private and pending moderation.',
            5
          );
        `);
        const reviewRows = await db.query<{ status: string }>(`
          select status
          from public.customer_reviews;
        `);
        expect(reviewRows.rows).toEqual([{ status: "pending" }]);

        const activeAdminId = "30000000-0000-4000-8000-000000000001";
        const inactiveAdminId = "30000000-0000-4000-8000-000000000002";
        const nonAdminId = "30000000-0000-4000-8000-000000000003";
        await db.exec(`
          insert into auth.users (id)
          values
            ('${activeAdminId}'),
            ('${inactiveAdminId}'),
            ('${nonAdminId}');

          insert into private.admin_users (
            user_id,
            role,
            active,
            mfa_required
          )
          values
            ('${activeAdminId}', 'owner', true, true),
            ('${inactiveAdminId}', 'editor', false, false);
        `);

        await db.exec("set role authenticated;");
        try {
          await setAuthUser(db, activeAdminId);
          const activeAccess = await db.query<{
            role: string;
            active: boolean;
            mfa_required: boolean;
          }>("select * from public.get_current_admin_access();");
          expect(activeAccess.rows).toEqual([
            { role: "owner", active: true, mfa_required: true },
          ]);

          await setAuthUser(db, inactiveAdminId);
          const inactiveAccess = await db.query(
            "select * from public.get_current_admin_access();",
          );
          expect(inactiveAccess.rows).toHaveLength(0);

          await setAuthUser(db, nonAdminId);
          const nonAdminAccess = await db.query(
            "select * from public.get_current_admin_access();",
          );
          expect(nonAdminAccess.rows).toHaveLength(0);
        } finally {
          await db.exec("reset role;");
        }
      } finally {
        await db.close();
      }
    },
    60_000,
  );

  test(
    "fails closed when the private schema already exists",
    async () => {
      const db = await createTestDatabase();

      try {
        await db.exec("create schema private;");
        await expectFailure(
          db.exec(migration),
          /Schema private already exists; inventory it before applying this migration/i,
        );
        await db.exec("rollback;");

        const relationRows = await db.query<{ quote_table: string | null }>(`
          select pg_catalog.to_regclass('public.quote_requests')::text
            as quote_table;
        `);
        expect(relationRows.rows).toEqual([{ quote_table: null }]);
      } finally {
        await db.close();
      }
    },
    60_000,
  );

  test(
    "executes emergency containment without deleting retained data",
    async () => {
      const db = await createMigratedDatabase();

      try {
        const adminId = "40000000-0000-4000-8000-000000000001";
        await db.exec(`
          insert into auth.users (id)
          values ('${adminId}');

          insert into private.admin_users (user_id, role, active)
          values ('${adminId}', 'owner', true);
        `);

        await db.exec("set role service_role;");
        let quote: OutcomeRow;
        try {
          quote = await callQuote(db, {
            quoteId: "41000000-0000-4000-8000-000000000001",
            idempotencyKey: "42000000-0000-4000-8000-000000000001",
            phone: "8655554000",
            ipHash: "d".repeat(64),
          });
          expect(quote.outcome).toBe("created");
        } finally {
          await db.exec("reset role;");
        }

        await db.exec(containment);

        const retainedRows = await db.query<{
          quote_count: number;
          active_admin_count: number;
        }>(`
          select
            (
              select count(*)::integer
              from public.quote_requests
              where id = '41000000-0000-4000-8000-000000000001'
            ) as quote_count,
            (
              select count(*)::integer
              from private.admin_users
              where active
            ) as active_admin_count;
        `);
        expect(retainedRows.rows).toEqual([
          { quote_count: 1, active_admin_count: 0 },
        ]);

        const privilegeRows = await db.query<{
          quote_rpc: boolean;
          admin_rpc: boolean;
        }>(`
          select
            pg_catalog.has_function_privilege(
              'service_role',
              'public.create_quote_request(uuid,uuid,text,text,text,text,text,text[],text,text,text,timestamp with time zone,text,text)',
              'execute'
            ) as quote_rpc,
            pg_catalog.has_function_privilege(
              'authenticated',
              'public.get_current_admin_access()',
              'execute'
            ) as admin_rpc;
        `);
        expect(privilegeRows.rows).toEqual([
          { quote_rpc: false, admin_rpc: false },
        ]);
      } finally {
        await db.close();
      }
    },
    60_000,
  );
});

async function createTestDatabase(): Promise<PGlite> {
  const db = await PGlite.create("memory://");
  const versionRows = await db.query<VersionRow>(`
    select
      (pg_catalog.current_setting('server_version_num')::integer / 10000)
        as major,
      pg_catalog.version() as version;
  `);
  expect(versionRows.rows[0]?.major).toBe(17);
  await db.exec(testPrelude);
  return db;
}

async function createMigratedDatabase(): Promise<PGlite> {
  const db = await createTestDatabase();
  try {
    await db.exec(migration);
    return db;
  } catch (error) {
    await db.close();
    throw error;
  }
}

async function callQuote(
  db: PGlite,
  input: QuoteInput = {},
): Promise<OutcomeRow> {
  const quoteId = input.quoteId ?? crypto.randomUUID();
  const idempotencyKey = input.idempotencyKey ?? crypto.randomUUID();
  const phone = input.phone ?? "8655559999";
  const ipHash = input.ipHash ?? "e".repeat(64);
  const serviceId = input.serviceId ?? "window-cleaning";

  const result = await db.query<OutcomeRow>(
    `
      select *
      from public.create_quote_request(
        $1::uuid,
        $2::uuid,
        $3::text,
        $4::text,
        $5::text,
        $6::text,
        $7::text,
        array[$8::text]::text[],
        $9::text,
        $10::text,
        $11::text,
        $12::timestamp with time zone,
        $13::text,
        $14::text
      );
    `,
    [
      quoteId,
      idempotencyKey,
      "Local",
      "Rehearsal",
      phone,
      null,
      "100 Local Test Street, Sevierville, TN",
      serviceId,
      "call",
      "website",
      "new",
      new Date(Date.now() - 10_000).toISOString(),
      ipHash,
      "PGlite migration rehearsal",
    ],
  );

  const outcome = result.rows[0];
  if (!outcome) {
    throw new Error("Quote RPC returned no outcome row.");
  }
  return outcome;
}

async function setAuthUser(db: PGlite, userId: string): Promise<void> {
  await db.query(
    `
      select pg_catalog.set_config(
        'request.jwt.claim.sub',
        $1::text,
        false
      );
    `,
    [userId],
  );
}

async function expectRoleDenied(
  db: PGlite,
  role: "anon" | "authenticated" | "service_role",
  sql: string,
): Promise<void> {
  await db.exec(`set role ${role};`);
  try {
    await expectFailure(db.query(sql), /permission denied/i);
  } finally {
    await db.exec("reset role;");
  }
}

async function expectFailure(
  promise: Promise<unknown>,
  expectedMessage: RegExp,
): Promise<void> {
  try {
    await promise;
  } catch (error) {
    expect(String(error)).toMatch(expectedMessage);
    return;
  }
  throw new Error(`Expected operation to fail with ${expectedMessage}.`);
}
