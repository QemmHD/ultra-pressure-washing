import {
  getSupabaseProjectUrl,
  isAllowedNtfyApiUrl,
  isAllowedSupabaseProjectUrl,
  NTFY_API_ORIGIN,
} from "./backend-destinations";

export interface QuoteEnvironment {
  submissionEnabled: boolean;
  allowedOrigin: string;
  expectedSiteId: string;
  ipHashSecret: string;
  supabaseUrl: string;
  supabaseSecretKey: string;
  chariotEnabled: boolean;
  chariotEndpoint: string;
  chariotToken: string;
  ntfyEnabled: boolean;
  ntfyBaseUrl: string;
  ntfyTopic: string;
  ntfyAccessToken: string;
}

export interface QuoteRuntimeContext {
  deployContext: string;
  published: boolean;
  siteId: string;
  ip: string;
  requestId: string;
}

interface NetlifyEnvironment {
  get(name: string): string | undefined;
}

declare const Netlify: { env: NetlifyEnvironment };

function read(name: string): string {
  return Netlify.env.get(name)?.trim() ?? "";
}

export function readQuoteEnvironment(): QuoteEnvironment {
  const supabaseUrl = getSupabaseProjectUrl(read("SUPABASE_PROJECT_REF"));
  return {
    submissionEnabled: read("QUOTE_SUBMISSION_ENABLED") === "true",
    allowedOrigin: read("QUOTE_ALLOWED_ORIGIN"),
    expectedSiteId: read("EXPECTED_NETLIFY_SITE_ID"),
    ipHashSecret: read("QUOTE_IP_HASH_SECRET"),
    supabaseUrl,
    supabaseSecretKey: read("SUPABASE_SECRET_KEY"),
    chariotEnabled: read("CHARIOT_ENABLED") === "true",
    chariotEndpoint: read("CHARIOT_FORM_ENDPOINT"),
    chariotToken: read("CHARIOT_FORM_TOKEN"),
    ntfyEnabled: read("NTFY_ENABLED") === "true",
    ntfyBaseUrl: NTFY_API_ORIGIN,
    ntfyTopic: read("NTFY_TOPIC"),
    ntfyAccessToken: read("NTFY_ACCESS_TOKEN"),
  };
}

export function getConfigurationError(
  environment: QuoteEnvironment,
): string | null {
  if (!environment.submissionEnabled) return "submission_disabled";
  if (!isHttpsOrigin(environment.allowedOrigin)) return "invalid_allowed_origin";
  if (!environment.expectedSiteId) return "missing_site_id";
  if (environment.ipHashSecret.length < 32) return "weak_ip_hash_secret";
  if (!isAllowedSupabaseProjectUrl(environment.supabaseUrl)) {
    return "invalid_supabase_project_ref";
  }
  if (!environment.supabaseSecretKey) return "missing_supabase_secret";

  if (environment.chariotEnabled) {
    if (!isAllowedChariotUrl(environment.chariotEndpoint)) {
      return "invalid_chariot_endpoint";
    }
    if (!environment.chariotToken) return "missing_chariot_token";
  }

  if (environment.ntfyEnabled) {
    if (!isAllowedNtfyApiUrl(environment.ntfyBaseUrl)) {
      return "invalid_ntfy_url";
    }
    if (!/^[A-Za-z0-9_-]{16,128}$/.test(environment.ntfyTopic)) {
      return "invalid_ntfy_topic";
    }
    if (!environment.ntfyAccessToken) return "missing_ntfy_token";
  }

  return null;
}

export function getRequestGateError(
  request: Request,
  context: QuoteRuntimeContext,
  environment: QuoteEnvironment,
): string | null {
  if (context.deployContext !== "production" || !context.published) {
    return "non_production_deploy";
  }
  if (!context.siteId || context.siteId !== environment.expectedSiteId) {
    return "site_mismatch";
  }

  const expectedOrigin = normalizeOrigin(environment.allowedOrigin);
  const requestOrigin = normalizeOrigin(new URL(request.url).origin);
  const suppliedOrigin = normalizeOrigin(request.headers.get("origin") ?? "");
  if (
    !expectedOrigin ||
    requestOrigin !== expectedOrigin ||
    suppliedOrigin !== expectedOrigin
  ) {
    return "origin_mismatch";
  }

  return null;
}

function normalizeOrigin(value: string): string {
  try {
    return new URL(value).origin;
  } catch {
    return "";
  }
}

function isHttpsOrigin(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.pathname === "/";
  } catch {
    return false;
  }
}

function isAllowedChariotUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.hostname === "chariotai.com" &&
      url.pathname.startsWith("/api/forms/")
    );
  } catch {
    return false;
  }
}
