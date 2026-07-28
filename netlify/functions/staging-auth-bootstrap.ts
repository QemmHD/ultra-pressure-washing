import type { Config, Context } from "@netlify/functions";
import { createAdminServiceClient } from "./_shared/admin-auth";
import {
  APPROVED_STAGING_SUPABASE_PROJECT_REF,
} from "./_shared/backend-runtime-context";
import {
  adminJson,
  adminProblem,
  enforceProductionAdminContext,
  getAdminEnv,
  methodNotAllowed,
  readBoundedAdminJson,
} from "./_shared/admin-runtime";

const STAGING_PREVIEW_ORIGIN =
  "https://deploy-preview-2--ultrapressurewashing.netlify.app";
const STAGING_ACCOUNT_EMAIL =
  "ultra-integrated-staging@example.com";
const STAGING_ACCOUNT_MARKER = "integrated-staging-rehearsal";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface BootstrapUser {
  id: string;
  email?: string;
  app_metadata?: Record<string, unknown>;
}

interface BootstrapAuthAdmin {
  createUser(input: {
    email: string;
    password: string;
    email_confirm: boolean;
    app_metadata: Record<string, unknown>;
  }): Promise<{
    data: { user: BootstrapUser | null };
    error: { message: string } | null;
  }>;
  getUserById(userId: string): Promise<{
    data: { user: BootstrapUser | null };
    error: { message: string } | null;
  }>;
  deleteUser(userId: string, shouldSoftDelete: boolean): Promise<{
    data: unknown;
    error: { message: string } | null;
  }>;
}

interface BootstrapDependencies {
  createAuthAdmin(): BootstrapAuthAdmin | null;
}

const defaultDependencies: BootstrapDependencies = {
  createAuthAdmin() {
    const result = createAdminServiceClient();
    return result.ok
      ? (result.client.auth.admin as BootstrapAuthAdmin)
      : null;
  },
};

export async function handleStagingAuthBootstrap(
  request: Request,
  context: Context,
  dependencies: BootstrapDependencies = defaultDependencies,
): Promise<Response> {
  const contextFailure = enforceProductionAdminContext(request, context);
  if (contextFailure) return contextFailure;

  if (request.method !== "POST") {
    return methodNotAllowed(["POST"]);
  }

  if (!hasExactStagingBootstrapContext(context)) {
    return adminProblem(
      404,
      "bootstrap_unavailable",
      "The staging authentication rehearsal is unavailable.",
    );
  }

  const suppliedToken = request.headers.get(
    "x-staging-bootstrap-token",
  );
  const expectedToken = getAdminEnv("STAGING_AUTH_BOOTSTRAP_TOKEN");
  if (!(await tokensMatch(suppliedToken, expectedToken))) {
    return adminProblem(
      404,
      "bootstrap_unavailable",
      "The staging authentication rehearsal is unavailable.",
    );
  }

  const body = await readBoundedAdminJson(request, 1_024);
  if (!body || typeof body.action !== "string") {
    return adminProblem(
      400,
      "invalid_request",
      "A valid staging rehearsal request is required.",
    );
  }

  const authAdmin = dependencies.createAuthAdmin();
  if (!authAdmin) {
    return adminProblem(
      503,
      "bootstrap_unavailable",
      "The staging authentication rehearsal is unavailable.",
    );
  }

  if (body.action === "create") {
    return createStagingUser(body, authAdmin);
  }

  if (body.action === "delete") {
    return deleteStagingUser(body, authAdmin);
  }

  return adminProblem(
    400,
    "invalid_request",
    "A valid staging rehearsal request is required.",
  );
}

async function createStagingUser(
  body: Record<string, unknown>,
  authAdmin: BootstrapAuthAdmin,
): Promise<Response> {
  if (
    !hasExactKeys(body, ["action", "password"]) ||
    typeof body.password !== "string" ||
    body.password.length < 20 ||
    body.password.length > 128
  ) {
    return adminProblem(
      400,
      "invalid_request",
      "A valid staging rehearsal request is required.",
    );
  }

  const { data, error } = await authAdmin.createUser({
    email: STAGING_ACCOUNT_EMAIL,
    password: body.password,
    email_confirm: true,
    app_metadata: {
      purpose: STAGING_ACCOUNT_MARKER,
      staging_preview: "deploy-preview-2",
    },
  });

  if (error || !data.user) {
    return adminProblem(
      409,
      "bootstrap_conflict",
      "The disposable staging account already exists or could not be created.",
    );
  }

  return adminJson(
    {
      userId: data.user.id,
      status: "created",
    },
    { status: 201 },
  );
}

async function deleteStagingUser(
  body: Record<string, unknown>,
  authAdmin: BootstrapAuthAdmin,
): Promise<Response> {
  if (
    !hasExactKeys(body, ["action", "userId"]) ||
    typeof body.userId !== "string" ||
    !UUID_PATTERN.test(body.userId)
  ) {
    return adminProblem(
      400,
      "invalid_request",
      "A valid staging rehearsal request is required.",
    );
  }

  const { data, error } = await authAdmin.getUserById(body.userId);
  const user = data.user;
  if (
    error ||
    !user ||
    user.id !== body.userId ||
    user.email !== STAGING_ACCOUNT_EMAIL ||
    user.app_metadata?.purpose !== STAGING_ACCOUNT_MARKER ||
    user.app_metadata?.staging_preview !== "deploy-preview-2"
  ) {
    return adminProblem(
      404,
      "staging_account_not_found",
      "The disposable staging account was not found.",
    );
  }

  const deletion = await authAdmin.deleteUser(body.userId, false);
  if (deletion.error) {
    return adminProblem(
      503,
      "bootstrap_delete_failed",
      "The disposable staging account could not be deleted.",
    );
  }

  return adminJson({
    userId: body.userId,
    status: "deleted",
  });
}

function hasExactStagingBootstrapContext(context: Context): boolean {
  return (
    getAdminEnv("STAGING_AUTH_BOOTSTRAP_ENABLED") === "true" &&
    getAdminEnv("STAGING_BACKEND_ENABLED") === "true" &&
    getAdminEnv("SUPABASE_PROJECT_REF") ===
      APPROVED_STAGING_SUPABASE_PROJECT_REF &&
    getAdminEnv("ADMIN_ALLOWED_ORIGIN") === STAGING_PREVIEW_ORIGIN &&
    context.deploy.context === "deploy-preview" &&
    context.deploy.published === false
  );
}

async function tokensMatch(
  supplied: string | null,
  expected: string | undefined,
): Promise<boolean> {
  if (
    !supplied ||
    !expected ||
    supplied.length > 256 ||
    expected.length < 43 ||
    expected.length > 256
  ) {
    return false;
  }

  const encoder = new TextEncoder();
  const [suppliedHash, expectedHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(supplied)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  const suppliedBytes = new Uint8Array(suppliedHash);
  const expectedBytes = new Uint8Array(expectedHash);
  let difference = 0;

  for (let index = 0; index < suppliedBytes.length; index += 1) {
    difference |= suppliedBytes[index] ^ expectedBytes[index];
  }

  return difference === 0;
}

function hasExactKeys(
  value: Record<string, unknown>,
  expectedKeys: readonly string[],
): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();
  return (
    actual.length === expected.length &&
    actual.every((key, index) => key === expected[index])
  );
}

export default function stagingAuthBootstrap(
  request: Request,
  context: Context,
): Promise<Response> {
  return handleStagingAuthBootstrap(request, context);
}

export const config: Config = {
  path: "/api/staging/auth-bootstrap",
  method: ["POST"],
  rateLimit: {
    action: "rate_limit",
    aggregateBy: ["ip"],
    windowLimit: 3,
    windowSize: 60,
  },
};
