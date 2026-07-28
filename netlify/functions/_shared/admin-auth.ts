import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  adminProblem,
  getAdminEnv,
  type AdminProblem,
} from "./admin-runtime";
import {
  getSupabaseProjectUrl,
  isAllowedSupabaseProjectUrl,
} from "./backend-destinations";

export type AdminRole = "owner" | "admin" | "editor";

export interface AdminAccessRow {
  role: AdminRole;
  active: boolean;
  mfa_required: boolean;
}

export interface AdminPolicyOptions {
  requireAal2?: boolean;
  requireWrite?: boolean;
}

export interface AdminPolicyFailure {
  status: number;
  code: string;
  error: string;
}

export interface VerifiedAdmin {
  userId: string;
  email: string | null;
  aal: "aal1" | "aal2";
  role: AdminRole;
  mfaRequired: boolean;
  userClient: SupabaseClient;
}

export type AdminAuthorizationResult =
  | { ok: true; admin: VerifiedAdmin }
  | { ok: false; response: Response };

function getBearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization");
  const match = authorization?.match(/^Bearer ([A-Za-z0-9._~-]+)$/);
  const token = match?.[1];

  if (!token || token.length > 8_192) return null;
  return token;
}

function createRequestClient(
  url: string,
  key: string,
  accessToken?: string,
): SupabaseClient {
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
    ...(accessToken
      ? {
          global: {
            headers: { Authorization: `Bearer ${accessToken}` },
          },
        }
      : {}),
  });
}

export async function authorizeAdmin(
  request: Request,
  options: AdminPolicyOptions = {},
): Promise<AdminAuthorizationResult> {
  const token = getBearerToken(request);
  if (!token) {
    return {
      ok: false,
      response: adminProblem(
        401,
        "session_required",
        "A verified admin session is required.",
      ),
    };
  }

  const supabaseUrl = getSupabaseProjectUrl(
    getAdminEnv("SUPABASE_PROJECT_REF"),
  );
  const publishableKey = getAdminEnv("SUPABASE_PUBLISHABLE_KEY");
  if (!isAllowedSupabaseProjectUrl(supabaseUrl) || !publishableKey) {
    return {
      ok: false,
      response: adminProblem(
        503,
        "admin_unavailable",
        "Secure administration is not configured.",
      ),
    };
  }

  const authClient = createRequestClient(supabaseUrl, publishableKey);
  const [
    { data: claimsData, error: claimsError },
    { data: userData, error: userError },
  ] = await Promise.all([
    authClient.auth.getClaims(token),
    authClient.auth.getUser(token),
  ]);

  if (
    claimsError ||
    !claimsData?.claims ||
    userError ||
    !userData.user
  ) {
    return {
      ok: false,
      response: adminProblem(
        401,
        "invalid_session",
        "The admin session is invalid or expired.",
      ),
    };
  }

  const claims = claimsData.claims as Record<string, unknown>;
  const userId = typeof claims.sub === "string" ? claims.sub : null;
  const email = userData.user.email ?? null;
  const aal = claims.aal === "aal2" ? "aal2" : "aal1";

  if (!userId || userData.user.id !== userId) {
    return {
      ok: false,
      response: adminProblem(
        401,
        "invalid_session",
        "The admin session has no verified user identity.",
      ),
    };
  }

  const userClient = createRequestClient(
    supabaseUrl,
    publishableKey,
    token,
  );
  const { data: accessRows, error: accessError } = await userClient.rpc(
    "get_current_admin_access",
  );

  if (accessError) {
    console.error("admin_authorization_rpc_failed");
    return {
      ok: false,
      response: adminProblem(
        503,
        "authorization_unavailable",
        "Admin authorization could not be verified.",
      ),
    };
  }

  const access = (Array.isArray(accessRows)
    ? accessRows[0]
    : accessRows) as AdminAccessRow | null | undefined;

  const policyFailure = evaluateAdminAccessPolicy(access, aal, options);
  if (policyFailure) {
    return {
      ok: false,
      response: adminProblem(
        policyFailure.status,
        policyFailure.code,
        policyFailure.error,
      ),
    };
  }

  const authorizedAccess = access as AdminAccessRow;

  return {
    ok: true,
    admin: {
      userId,
      email,
      aal,
      role: authorizedAccess.role,
      mfaRequired: authorizedAccess.mfa_required,
      userClient,
    },
  };
}

export function evaluateAdminAccessPolicy(
  access: AdminAccessRow | null | undefined,
  aal: "aal1" | "aal2",
  options: AdminPolicyOptions = {},
): AdminPolicyFailure | null {
  if (!access?.active) {
    return {
      status: 403,
      code: "admin_access_denied",
      error: "This account is not an active administrator.",
    };
  }

  if ((access.mfa_required || options.requireAal2) && aal !== "aal2") {
    return {
      status: 403,
      code: "mfa_required",
      error: "Multi-factor verification is required.",
    };
  }

  if (
    options.requireWrite &&
    access.role !== "owner" &&
    access.role !== "admin"
  ) {
    return {
      status: 403,
      code: "write_access_denied",
      error: "This admin role has read-only access.",
    };
  }

  return null;
}

export function createAdminServiceClient():
  | { ok: true; client: SupabaseClient }
  | { ok: false; problem: AdminProblem } {
  const supabaseUrl = getSupabaseProjectUrl(
    getAdminEnv("SUPABASE_PROJECT_REF"),
  );
  const secretKey = getAdminEnv("SUPABASE_SECRET_KEY");

  if (!isAllowedSupabaseProjectUrl(supabaseUrl) || !secretKey) {
    return {
      ok: false,
      problem: {
        error: "Secure admin storage is not configured.",
        code: "admin_storage_unavailable",
      },
    };
  }

  return {
    ok: true,
    client: createRequestClient(supabaseUrl, secretKey),
  };
}
