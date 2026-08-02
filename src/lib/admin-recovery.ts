import type { AuthFlowType } from "@supabase/supabase-js";

const ADMIN_PATH = "/admin";

function readUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function hasImplicitRecoverySession(url: URL): boolean {
  const fragment = new URLSearchParams(url.hash.slice(1));

  return (
    fragment.get("type") === "recovery" &&
    Boolean(fragment.get("access_token")) &&
    Boolean(fragment.get("refresh_token"))
  );
}

/**
 * Supabase dashboard-generated recovery links can use the browser-only
 * implicit flow, while recovery requests made by this app use PKCE. Select
 * the implicit parser only for a complete recovery fragment on /admin so the
 * normal sign-in and PKCE recovery paths remain unchanged.
 */
export function resolveAdminAuthFlowType(currentHref: string): AuthFlowType {
  const url = readUrl(currentHref);

  if (url?.pathname === ADMIN_PATH && hasImplicitRecoverySession(url)) {
    return "implicit";
  }

  return "pkce";
}

/**
 * Recovery emails that fall back to the production Site URL can land on the
 * homepage with credentials in the URL fragment. Move that browser-only
 * fragment to /admin before hydration; fragments are not sent to Netlify.
 */
export function getAdminRecoveryRedirectUrl(
  currentHref: string,
  productionOrigin: string,
): string | null {
  const url = readUrl(currentHref);

  if (
    !url ||
    url.origin !== productionOrigin ||
    url.pathname === ADMIN_PATH ||
    !hasImplicitRecoverySession(url)
  ) {
    return null;
  }

  url.pathname = ADMIN_PATH;
  return url.toString();
}
