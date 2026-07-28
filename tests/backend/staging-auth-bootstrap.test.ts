import { afterEach, describe, expect, test } from "bun:test";
import type { Context } from "@netlify/functions";
import {
  handleStagingAuthBootstrap,
} from "../../netlify/functions/staging-auth-bootstrap";
import {
  APPROVED_STAGING_SUPABASE_PROJECT_REF,
} from "../../netlify/functions/_shared/backend-runtime-context";

const ORIGIN =
  "https://deploy-preview-2--ultrapressurewashing.netlify.app";
const SITE_ID = "approved-site";
const TOKEN =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
const USER_ID = "019f7ac4-372e-7b6f-9e0a-f166fae926b8";
const originalEnvironment = {
  adminEnabled: process.env.ADMIN_BACKEND_ENABLED,
  adminOrigin: process.env.ADMIN_ALLOWED_ORIGIN,
  bootstrapEnabled: process.env.STAGING_AUTH_BOOTSTRAP_ENABLED,
  bootstrapToken: process.env.STAGING_AUTH_BOOTSTRAP_TOKEN,
  siteId: process.env.EXPECTED_NETLIFY_SITE_ID,
  stagingEnabled: process.env.STAGING_BACKEND_ENABLED,
  projectRef: process.env.SUPABASE_PROJECT_REF,
};

afterEach(() => {
  restoreEnvironment(
    "ADMIN_BACKEND_ENABLED",
    originalEnvironment.adminEnabled,
  );
  restoreEnvironment(
    "ADMIN_ALLOWED_ORIGIN",
    originalEnvironment.adminOrigin,
  );
  restoreEnvironment(
    "STAGING_AUTH_BOOTSTRAP_ENABLED",
    originalEnvironment.bootstrapEnabled,
  );
  restoreEnvironment(
    "STAGING_AUTH_BOOTSTRAP_TOKEN",
    originalEnvironment.bootstrapToken,
  );
  restoreEnvironment(
    "EXPECTED_NETLIFY_SITE_ID",
    originalEnvironment.siteId,
  );
  restoreEnvironment(
    "STAGING_BACKEND_ENABLED",
    originalEnvironment.stagingEnabled,
  );
  restoreEnvironment(
    "SUPABASE_PROJECT_REF",
    originalEnvironment.projectRef,
  );
});

function enableBootstrap() {
  process.env.ADMIN_BACKEND_ENABLED = "true";
  process.env.ADMIN_ALLOWED_ORIGIN = ORIGIN;
  process.env.STAGING_AUTH_BOOTSTRAP_ENABLED = "true";
  process.env.STAGING_AUTH_BOOTSTRAP_TOKEN = TOKEN;
  process.env.EXPECTED_NETLIFY_SITE_ID = SITE_ID;
  process.env.STAGING_BACKEND_ENABLED = "true";
  process.env.SUPABASE_PROJECT_REF =
    APPROVED_STAGING_SUPABASE_PROJECT_REF;
}

function stagingContext(
  options: {
    deployContext?: string;
    published?: boolean;
    siteId?: string;
  } = {},
): Context {
  return {
    deploy: {
      context: options.deployContext ?? "deploy-preview",
      published: options.published ?? false,
    },
    site: {
      id: options.siteId ?? SITE_ID,
    },
  } as unknown as Context;
}

function request(
  body: Record<string, unknown>,
  options: { origin?: string; token?: string } = {},
): Request {
  const origin = options.origin ?? ORIGIN;
  return new Request(`${origin}/api/staging/auth-bootstrap`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: origin,
      "Sec-Fetch-Site": "same-origin",
      ...(options.token === undefined
        ? { "X-Staging-Bootstrap-Token": TOKEN }
        : options.token
          ? { "X-Staging-Bootstrap-Token": options.token }
          : {}),
    },
    body: JSON.stringify(body),
  });
}

function fakeDependencies(
  overrides: {
    createUser?: (
      input: Record<string, unknown>,
    ) => Promise<FakeUserResult>;
    getUserById?: (userId: string) => Promise<FakeUserResult>;
    deleteUser?: (
      userId: string,
      shouldSoftDelete: boolean,
    ) => Promise<FakeDeleteResult>;
  } = {},
) {
  let factoryCalls = 0;
  const createCalls: Record<string, unknown>[] = [];
  const deleteCalls: Array<[string, boolean]> = [];

  return {
    state: {
      get factoryCalls() {
        return factoryCalls;
      },
      createCalls,
      deleteCalls,
    },
    dependencies: {
      createAuthAdmin() {
        factoryCalls += 1;
        return {
          async createUser(input: Record<string, unknown>) {
            createCalls.push(input);
            return overrides.createUser
              ? overrides.createUser(input)
              : {
                  data: {
                    user: {
                      id: USER_ID,
                      email:
                        "ultra-integrated-staging@example.com",
                      app_metadata: {
                        purpose:
                          "integrated-staging-rehearsal",
                        staging_preview: "deploy-preview-2",
                      },
                    },
                  },
                  error: null,
                };
          },
          async getUserById(userId: string) {
            return overrides.getUserById
              ? overrides.getUserById(userId)
              : {
                  data: {
                    user: {
                      id: userId,
                      email:
                        "ultra-integrated-staging@example.com",
                      app_metadata: {
                        purpose:
                          "integrated-staging-rehearsal",
                        staging_preview: "deploy-preview-2",
                      },
                    },
                  },
                  error: null,
                };
          },
          async deleteUser(
            userId: string,
            shouldSoftDelete: boolean,
          ) {
            deleteCalls.push([userId, shouldSoftDelete]);
            return overrides.deleteUser
              ? overrides.deleteUser(userId, shouldSoftDelete)
              : { data: {}, error: null };
          },
        };
      },
    },
  };
}

interface FakeUserResult {
  data: {
    user: {
      id: string;
      email?: string;
      app_metadata?: Record<string, unknown>;
    } | null;
  };
  error: { message: string } | null;
}

interface FakeDeleteResult {
  data: unknown;
  error: { message: string } | null;
}

describe("temporary staging Auth bootstrap", () => {
  test("fails closed before initializing Supabase when disabled or unauthorized", async () => {
    enableBootstrap();
    const fake = fakeDependencies();
    const responses: Response[] = [];

    delete process.env.STAGING_AUTH_BOOTSTRAP_ENABLED;
    responses.push(
      await handleStagingAuthBootstrap(
        request({ action: "create", password: "A".repeat(24) }),
        stagingContext(),
        fake.dependencies,
      ),
    );

    process.env.STAGING_AUTH_BOOTSTRAP_ENABLED = "true";
    responses.push(
      await handleStagingAuthBootstrap(
        request(
          { action: "create", password: "A".repeat(24) },
          { token: "" },
        ),
        stagingContext(),
        fake.dependencies,
      ),
    );

    responses.push(
      await handleStagingAuthBootstrap(
        request({ action: "create", password: "A".repeat(24) }),
        stagingContext({ deployContext: "production", published: true }),
        fake.dependencies,
      ),
    );

    responses.push(
      await handleStagingAuthBootstrap(
        request({ action: "create", password: "A".repeat(24) }),
        stagingContext({ deployContext: "branch-deploy" }),
        fake.dependencies,
      ),
    );

    responses.push(
      await handleStagingAuthBootstrap(
        request({ action: "create", password: "A".repeat(24) }),
        stagingContext({ published: true }),
        fake.dependencies,
      ),
    );

    process.env.SUPABASE_PROJECT_REF = "abcdefghijklmnopqrst";
    responses.push(
      await handleStagingAuthBootstrap(
        request({ action: "create", password: "A".repeat(24) }),
        stagingContext(),
        fake.dependencies,
      ),
    );
    process.env.SUPABASE_PROJECT_REF =
      APPROVED_STAGING_SUPABASE_PROJECT_REF;

    responses.push(
      await handleStagingAuthBootstrap(
        request({ action: "create", password: "A".repeat(24) }),
        stagingContext({ siteId: "wrong-site" }),
        fake.dependencies,
      ),
    );

    responses.push(
      await handleStagingAuthBootstrap(
        request(
          { action: "create", password: "A".repeat(24) },
          { origin: "https://attacker.example" },
        ),
        stagingContext(),
        fake.dependencies,
      ),
    );

    expect(responses.map((response) => response.status)).toEqual([
      404,
      404,
      404,
      404,
      404,
      404,
      404,
      404,
    ]);
    expect(fake.state.factoryCalls).toBe(0);
  });

  test("creates only the fixed disposable account without exposing credentials", async () => {
    enableBootstrap();
    const fake = fakeDependencies();
    const response = await handleStagingAuthBootstrap(
      request({
        action: "create",
        password: "Long-Staging-Password-123!",
      }),
      stagingContext(),
      fake.dependencies,
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toEqual({ userId: USER_ID, status: "created" });
    expect(JSON.stringify(body)).not.toContain("Password");
    expect(JSON.stringify(body)).not.toContain(TOKEN);
    expect(fake.state.createCalls).toEqual([
      {
        email: "ultra-integrated-staging@example.com",
        password: "Long-Staging-Password-123!",
        email_confirm: true,
        app_metadata: {
          purpose: "integrated-staging-rehearsal",
          staging_preview: "deploy-preview-2",
        },
      },
    ]);
    expect(response.headers.has("access-control-allow-origin")).toBe(
      false,
    );
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  test("rejects extra fields, short passwords, and duplicate creation", async () => {
    enableBootstrap();
    const duplicate = fakeDependencies({
      createUser: async () => ({
        data: { user: null },
        error: { message: "duplicate" },
      }),
    });

    const [extraField, shortPassword, conflict] =
      await Promise.all([
        handleStagingAuthBootstrap(
          request({
            action: "create",
            password: "Long-Staging-Password-123!",
            email: "attacker@example.com",
          }),
          stagingContext(),
          duplicate.dependencies,
        ),
        handleStagingAuthBootstrap(
          request({ action: "create", password: "too-short" }),
          stagingContext(),
          duplicate.dependencies,
        ),
        handleStagingAuthBootstrap(
          request({
            action: "create",
            password: "Long-Staging-Password-123!",
          }),
          stagingContext(),
          duplicate.dependencies,
        ),
      ]);

    expect(extraField.status).toBe(400);
    expect(shortPassword.status).toBe(400);
    expect(conflict.status).toBe(409);
    expect(duplicate.state.createCalls).toHaveLength(1);
  });

  test("deletes only the marked fixed account", async () => {
    enableBootstrap();
    const accepted = fakeDependencies();
    const acceptedResponse = await handleStagingAuthBootstrap(
      request({ action: "delete", userId: USER_ID }),
      stagingContext(),
      accepted.dependencies,
    );

    const wrongEmail = fakeDependencies({
      getUserById: async () => ({
        data: {
          user: {
            id: USER_ID,
            email: "someone-else@example.com",
            app_metadata: {
              purpose: "integrated-staging-rehearsal",
              staging_preview: "deploy-preview-2",
            },
          },
        },
        error: null,
      }),
    });
    const wrongEmailResponse = await handleStagingAuthBootstrap(
      request({ action: "delete", userId: USER_ID }),
      stagingContext(),
      wrongEmail.dependencies,
    );

    const wrongMarker = fakeDependencies({
      getUserById: async () => ({
        data: {
          user: {
            id: USER_ID,
            email: "ultra-integrated-staging@example.com",
            app_metadata: { purpose: "something-else" },
          },
        },
        error: null,
      }),
    });
    const wrongMarkerResponse = await handleStagingAuthBootstrap(
      request({ action: "delete", userId: USER_ID }),
      stagingContext(),
      wrongMarker.dependencies,
    );

    expect(acceptedResponse.status).toBe(200);
    expect(accepted.state.deleteCalls).toEqual([[USER_ID, false]]);
    expect(wrongEmailResponse.status).toBe(404);
    expect(wrongEmail.state.deleteCalls).toHaveLength(0);
    expect(wrongMarkerResponse.status).toBe(404);
    expect(wrongMarker.state.deleteCalls).toHaveLength(0);
  });
});

function restoreEnvironment(
  name: string,
  value: string | undefined,
) {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}
