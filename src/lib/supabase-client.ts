import {
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";
import { SITE } from "../data/site";
import {
  getSupabaseProjectUrl,
  isAllowedSupabaseProjectUrl,
} from "./supabase-project";

const supabaseUrl = getSupabaseProjectUrl(
  import.meta.env.VITE_SUPABASE_PROJECT_REF,
);
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
const adminAuthEnabled =
  import.meta.env.VITE_ADMIN_AUTH_ENABLED === "true";

let browserClient: SupabaseClient | null = null;

/**
 * Admin authentication is an explicit, production-only capability.
 *
 * Branch deploys and local builds intentionally omit VITE_ADMIN_AUTH_ENABLED,
 * so they fail closed even if somebody accidentally supplies a Supabase URL.
 */
export function isAdminAuthConfigured(): boolean {
  return (
    typeof window !== "undefined" &&
    window.location.origin === SITE.domain &&
    adminAuthEnabled &&
    isAllowedSupabaseProjectUrl(supabaseUrl) &&
    Boolean(supabasePublishableKey)
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
    browserClient = createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: "pkce",
        persistSession: true,
      },
    });
  }

  return browserClient;
}

export const ADMIN_PASSWORD_RECOVERY_URL = `${SITE.domain}/admin`;
