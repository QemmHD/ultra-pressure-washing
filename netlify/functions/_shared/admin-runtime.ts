import type { Context } from "@netlify/functions";
import { readBoundedRequestText } from "./bounded-body";
import { resolveBackendRuntimeMode } from "./backend-runtime-context";

interface NetlifyRuntime {
  env: {
    get(name: string): string | undefined;
  };
}

export interface AdminProblem {
  error: string;
  code: string;
}

export function getAdminEnv(name: string): string | undefined {
  const runtime = (globalThis as typeof globalThis & {
    Netlify?: NetlifyRuntime;
  }).Netlify;

  return runtime?.env.get(name) ?? process.env[name];
}

export function adminJson(
  body: unknown,
  init: ResponseInit = {},
): Response {
  const headers = new Headers(init.headers);
  headers.set("Cache-Control", "no-store, max-age=0");
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Referrer-Policy", "no-referrer");
  headers.set("X-Content-Type-Options", "nosniff");

  return new Response(JSON.stringify(body), {
    ...init,
    headers,
  });
}

export function adminProblem(
  status: number,
  code: string,
  error: string,
): Response {
  return adminJson({ error, code } satisfies AdminProblem, { status });
}

/**
 * Admin APIs are deliberately unavailable outside either the published
 * production site or the explicitly approved isolated staging preview.
 */
export function enforceProductionAdminContext(
  request: Request,
  context: Context,
): Response | null {
  const enabled = getAdminEnv("ADMIN_BACKEND_ENABLED") === "true";
  const stagingEnabled =
    getAdminEnv("STAGING_BACKEND_ENABLED") === "true";
  const expectedSiteId = getAdminEnv("EXPECTED_NETLIFY_SITE_ID");
  const allowedOrigin = getAdminEnv("ADMIN_ALLOWED_ORIGIN");
  const supabaseProjectRef =
    getAdminEnv("SUPABASE_PROJECT_REF")?.trim() ?? "";
  const runtimeMode = resolveBackendRuntimeMode({
    stagingEnabled,
    deployContext: context.deploy.context,
    published: context.deploy.published,
    supabaseProjectRef,
  });
  const isExpectedSite =
    Boolean(expectedSiteId) && context.site.id === expectedSiteId;
  const requestUrl = safeUrl(request.url);
  const expectedOrigin = safeHttpsOrigin(allowedOrigin);
  const suppliedOrigin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  const isCanonicalStagingOrigin =
    runtimeMode !== "staging" || allowedOrigin === expectedOrigin;
  const isExpectedOrigin =
    Boolean(expectedOrigin) &&
    isCanonicalStagingOrigin &&
    requestUrl?.origin === expectedOrigin &&
    (!suppliedOrigin || safeUrl(suppliedOrigin)?.origin === expectedOrigin) &&
    (!fetchSite || fetchSite === "same-origin");

  if (!enabled || !runtimeMode || !isExpectedSite || !isExpectedOrigin) {
    return adminProblem(
      404,
      "admin_unavailable",
      "Secure administration is unavailable in this deploy context.",
    );
  }

  return null;
}

export function methodNotAllowed(allowed: readonly string[]): Response {
  return adminJson(
    {
      error: "Method not allowed.",
      code: "method_not_allowed",
    } satisfies AdminProblem,
    {
      status: 405,
      headers: { Allow: allowed.join(", ") },
    },
  );
}

export async function readBoundedAdminJson(
  request: Request,
  maxBytes = 1_024,
): Promise<Record<string, unknown> | null> {
  const contentType = request.headers
    .get("content-type")
    ?.split(";", 1)[0]
    .trim()
    .toLowerCase();
  if (contentType !== "application/json") return null;

  const body = await readBoundedRequestText(request, maxBytes);
  if (!body.ok) return null;

  try {
    const parsed = JSON.parse(body.text) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

function safeUrl(value: string | undefined): URL | null {
  if (!value) return null;
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function safeHttpsOrigin(value: string | undefined): string | null {
  const url = safeUrl(value);
  return url?.protocol === "https:" && url.pathname === "/"
    ? url.origin
    : null;
}
