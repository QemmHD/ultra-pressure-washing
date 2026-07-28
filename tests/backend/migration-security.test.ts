import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dir, "..", "..");
const migrationPath = path.join(
  projectRoot,
  "supabase",
  "migrations",
  "20260728074642_create_secure_backend_foundation.sql",
);
const rollbackPath = path.join(
  projectRoot,
  "supabase",
  "rollback",
  "contain_backend_security.sql",
);
const configPath = path.join(projectRoot, "supabase", "config.toml");

const migration = executableSql(readFileSync(migrationPath, "utf8"));
const rollback = executableSql(readFileSync(rollbackPath, "utf8"));
const config = readFileSync(configPath, "utf8");

function executableSql(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/--.*$/gm, " ")
    .replace(/\s+/g, " ")
    .trim();
}

describe("Supabase security migration contract", () => {
  test("is additive and never mutates the named legacy tables", () => {
    expect(migration).toMatch(/^begin;/i);
    expect(migration).toMatch(/commit;$/i);

    for (const legacyTable of ["quotes", "reviews", "settings"]) {
      expect(migration).not.toMatch(
        new RegExp(
          `\\b(?:alter\\s+table|drop\\s+table|truncate|delete\\s+from|update|insert\\s+into)\\s+(?:public\\.)?${legacyTable}\\b`,
          "i",
        ),
      );
    }
    expect(migration).not.toMatch(/\binsert\s+into\s+auth\.users\b/i);
    expect(migration).not.toMatch(/\binsert\s+into\s+private\.admin_users\b/i);
    expect(migration).not.toMatch(/\bstorage\.(?:buckets|objects)\b/i);
  });

  test("enables RLS and denies browser table privileges exactly", () => {
    const protectedTables = [
      "private.admin_users",
      "public.quote_requests",
      "public.quote_notification_deliveries",
      "public.customer_reviews",
    ];

    for (const table of protectedTables) {
      expect(migration).toMatch(
        new RegExp(
          `alter\\s+table\\s+${escapeRegExp(table)}\\s+enable\\s+row\\s+level\\s+security`,
          "i",
        ),
      );
      expect(migration).toMatch(
        new RegExp(
          `revoke\\s+all\\s+on\\s+table\\s+${escapeRegExp(table)}\\s+from\\s+public,\\s*anon,\\s*authenticated,\\s*service_role`,
          "i",
        ),
      );
    }
    expect(migration).not.toMatch(
      /grant[^;]*on\s+table\s+private\.admin_users[^;]*to\s+service_role/i,
    );
    for (const table of [
      "public.quote_requests",
      "public.quote_notification_deliveries",
      "public.customer_reviews",
    ]) {
      expect(migration).toMatch(
        new RegExp(
          `grant\\s+select,\\s*update(?:\\s+on\\s+table)?\\s+${escapeRegExp(table)}\\s+to\\s+service_role`,
          "i",
        ),
      );
    }
    expect(migration).not.toMatch(
      /grant[^;]*\b(?:insert|delete)\b[^;]*to\s+service_role/i,
    );
    expect(migration).not.toMatch(
      /grant[^;]*on\s+sequence\s+public\.quote_notification_deliveries_id_seq[^;]*to\s+service_role/i,
    );
    expect(migration).not.toMatch(/\bcreate\s+policy\b/i);
  });

  test("restricts RPC identities and uses fixed search paths", () => {
    const quoteFunction = functionBody(
      migration,
      "public.create_quote_request",
      "comment on function public.create_quote_request",
    );
    expect(quoteFunction).toMatch(/\bsecurity\s+definer\b/i);
    expect(quoteFunction).toMatch(/\bset\s+search_path\s*=\s*''/i);
    expect(migration).toMatch(
      /revoke\s+all\s+on\s+function\s+public\.create_quote_request\([\s\S]*?\)\s+from\s+public,\s*anon,\s*authenticated,\s*service_role/i,
    );
    expect(migration).toMatch(
      /grant\s+execute\s+on\s+function\s+public\.create_quote_request\([\s\S]*?\)\s+to\s+service_role/i,
    );

    const adminFunction = functionBody(
      migration,
      "public.get_current_admin_access",
      "comment on function public.get_current_admin_access",
    );
    expect(adminFunction).toMatch(/\bsecurity\s+definer\b/i);
    expect(adminFunction).toMatch(/\bset\s+search_path\s*=\s*''/i);
    expect(adminFunction).toMatch(/\bauth\.uid\(\)/i);
    expect(adminFunction).toMatch(
      /admin_user\.user_id\s*=\s*\(select\s+auth\.uid\(\)\)/i,
    );
    expect(migration).toMatch(
      /revoke\s+all\s+on\s+function\s+public\.get_current_admin_access\(\)\s+from\s+public,\s*anon,\s*authenticated,\s*service_role/i,
    );
    expect(migration).toMatch(
      /grant\s+execute\s+on\s+function\s+public\.get_current_admin_access\(\)\s+to\s+authenticated/i,
    );
  });

  test("keeps quote intake atomic, idempotent, and durably rate limited", () => {
    expect(migration).toMatch(
      /constraint\s+quote_requests_idempotency_key_key\s+unique\s*\(idempotency_key\)/i,
    );
    expect(migration.match(/pg_advisory_xact_lock/gi)).toHaveLength(2);
    expect(migration).toMatch(/quote-ip:/i);
    expect(migration).toMatch(/quote-phone:/i);
    expect(migration).toMatch(/recent_ip_count\s*>=\s*5/i);
    expect(migration).toMatch(/daily_ip_count\s*>=\s*20/i);
    expect(migration).toMatch(/recent_phone_count\s*>=\s*3/i);
    expect(migration).toMatch(
      /create\s+index\s+quote_requests_ip_hash_created_at_idx/i,
    );
    expect(migration).toMatch(
      /create\s+index\s+quote_requests_normalized_phone_created_at_idx/i,
    );
    expect(migration).toMatch(
      /create\s+trigger\s+quote_requests_seed_notification_deliveries[\s\S]*?after\s+insert\s+on\s+public\.quote_requests/i,
    );
    expect(migration).toMatch(
      /insert\s+into\s+public\.quote_notification_deliveries[\s\S]*?'chariot'[\s\S]*?'ntfy'/i,
    );
  });

  test("requires consent and moderation before review approval", () => {
    expect(migration).toMatch(
      /status\s*<>\s*'approved'[\s\S]*?consent_to_publish[\s\S]*?display_name\s+is\s+not\s+null[\s\S]*?moderated_by\s+is\s+not\s+null[\s\S]*?published_at\s+is\s+not\s+null/i,
    );
    expect(migration).toMatch(
      /status\s+text\s+not\s+null\s+default\s+'pending'/i,
    );
  });

  test("keeps local Auth closed and rollback non-destructive", () => {
    expect(config).toMatch(/\[auth\][\s\S]*?enable_signup\s*=\s*false/i);
    expect(config).toMatch(
      /\[auth\.mfa\.totp\][\s\S]*?enroll_enabled\s*=\s*true[\s\S]*?verify_enabled\s*=\s*true/i,
    );
    expect(rollback).not.toMatch(
      /\b(?:drop|truncate|delete\s+from)\s+(?:table\s+)?(?:private|public)\./i,
    );
    expect(rollback).toMatch(
      /update\s+private\.admin_users\s+set\s+active\s*=\s*false/i,
    );
    expect(rollback).toMatch(
      /revoke\s+all\s+on\s+function\s+public\.create_quote_request/i,
    );
  });
});

function functionBody(
  sql: string,
  functionName: string,
  endMarker: string,
): string {
  const start = sql.toLowerCase().indexOf(`create function ${functionName}`);
  const end = sql.toLowerCase().indexOf(endMarker.toLowerCase(), start);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return sql.slice(start, end);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
