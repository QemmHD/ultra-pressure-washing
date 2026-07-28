import {
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";
import { SITE } from "../data/site";
import {
  getBrowserBackendRuntimeMode,
  STAGING_SUPABASE_PROJECT_REF,
} from "./backend-runtime";
import {
  getSupabaseProjectUrl,
  isAllowedSupabaseProjectUrl,
} from "./supabase-project";

const supabaseProjectRef =
  import.meta.env.VITE_SUPABASE_PROJECT_REF?.trim().toLowerCase() ?? "";
const supabaseUrl = getSupabaseProjectUrl(
  supabaseProjectRef,
);
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
const adminAuthEnabled =
  import.meta.env.VITE_ADMIN_AUTH_ENABLED === "true";
const adminPasswordRecoveryEnabled =
  import.meta.env.VITE_ADMIN_PASSWORD_RECOVERY_ENABLED === "true";

let browserClient: SupabaseClient | null = null;

/**
 * Admin authentication is an explicit, production-only capability.
 *
 * Branch deploys and local builds intentionally omit VITE_ADMIN_AUTH_ENABLED,
 * so they fail closed even if somebody accidentally supplies a Supabase URL.
 */
export function isAdminAuthConfigured(): boolean {
  const runtimeMode = getBrowserBackendRuntimeMode();
  const destinationAllowed =
    runtimeMode === "production" ||
    (runtimeMode === "staging" &&
      supabaseProjectRef === STAGING_SUPABASE_PROJECT_REF);

  return (
    typeof window !== "undefined" &&
    destinationAllowed &&
    (runtimeMode === "staging" || adminAuthEnabled) &&
    isAllowedSupabaseProjectUrl(supabaseUrl) &&
    Boolean(supabasePublishableKey)
  );
}

export function isAdminPasswordRecoveryAvailable(): boolean {
  return (
    adminPasswordRecoveryEnabled &&
    getBrowserBackendRuntimeMode() === "production" &&
    isAdminAuthConfigured()
  );
}

export function getAdminSupabaseClient(): SupabaseClient | null {
  if (
    typeof window === "undefined" ||
    !isAdminAuthConfigured() ||
    !supabaseUrl ||
    !supabasePublishableKey
  ) {
    return null;
  }

  if (!browserClient) {
    const runtimeMode = getBrowserBackendRuntimeMode();
    browserClient = createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: runtimeMode === "production",
        flowType: "pkce",
        persistSession: true,
      },
    });
  }

  return browserClient;
}

export const ADMIN_PASSWORD_RECOVERY_URL = `${SITE.domain}/admin`;
