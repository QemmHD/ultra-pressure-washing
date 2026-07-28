import { afterEach, describe, expect, test } from "bun:test";
import type { Context } from "@netlify/functions";
import adminQuotes from "../../netlify/functions/admin-quotes";
import adminReviews from "../../netlify/functions/admin-reviews";
import adminSession from "../../netlify/functions/admin-session";
import { evaluateAdminAccessPolicy } from "../../netlify/functions/_shared/admin-auth";
import { readBoundedAdminJson } from "../../netlify/functions/_shared/admin-runtime";

const previousAdminEnabled = process.env.ADMIN_BACKEND_ENABLED;
const previousExpectedSiteId = process.env.EXPECTED_NETLIFY_SITE_ID;
const previousAdminAllowedOrigin = process.env.ADMIN_ALLOWED_ORIGIN;

afterEach(() => {
  if (previousAdminEnabled === undefined) {
    delete process.env.ADMIN_BACKEND_ENABLED;
  } else {
    process.env.ADMIN_BACKEND_ENABLED = previousAdminEnabled;
  }

  if (previousExpectedSiteId === undefined) {
    delete process.env.EXPECTED_NETLIFY_SITE_ID;
  } else {
    process.env.EXPECTED_NETLIFY_SITE_ID = previousExpectedSiteId;
  }

  if (previousAdminAllowedOrigin === undefined) {
    delete process.env.ADMIN_ALLOWED_ORIGIN;
  } else {
    process.env.ADMIN_ALLOWED_ORIGIN = previousAdminAllowedOrigin;
  }
});

function context(
  options: {
    deployContext?: string;
    published?: boolean;
    siteId?: string;
  } = {},
): Context {
  return {
    deploy: {
      context: options.deployContext ?? "production",
      published: options.published ?? true,
    },
    site: {
      id: options.siteId ?? "approved-site",
    },
  } as unknown as Context;
}

function enableAdminBackend() {
  process.env.ADMIN_BACKEND_ENABLED = "true";
  process.env.ADMIN_ALLOWED_ORIGIN = "https://example.test";
  process.env.EXPECTED_NETLIFY_SITE_ID = "approved-site";
}

describe("secure admin Netlify functions", () => {
  test("fail closed when the explicit admin switch is absent", async () => {
    delete process.env.ADMIN_BACKEND_ENABLED;
    process.env.EXPECTED_NETLIFY_SITE_ID = "approved-site";

    const response = await adminSession(
      new Request("https://example.test/api/admin/session"),
      context(),
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({
      code: "admin_unavailable",
    });
  });

  test("fail closed outside a published production deploy", async () => {
    enableAdminBackend();

    const previewResponse = await adminSession(
      new Request("https://example.test/api/admin/session"),
      context({ deployContext: "deploy-preview", published: false }),
    );
    const wrongSiteResponse = await adminSession(
      new Request("https://example.test/api/admin/session"),
      context({ siteId: "unapproved-site" }),
    );

    expect(previewResponse.status).toBe(404);
    expect(wrongSiteResponse.status).toBe(404);
  });

  test("fail closed on an unexpected request or supplied origin", async () => {
    enableAdminBackend();

    const wrongRequestOrigin = await adminSession(
      new Request("https://alternate.example/api/admin/session"),
      context(),
    );
    const wrongSuppliedOrigin = await adminSession(
      new Request("https://example.test/api/admin/session", {
        headers: { Origin: "https://attacker.example" },
      }),
      context(),
    );

    expect(wrongRequestOrigin.status).toBe(404);
    expect(wrongSuppliedOrigin.status).toBe(404);
  });

  test("requires a bearer session before any protected data operation", async () => {
    enableAdminBackend();

    const [sessionResponse, quoteResponse, reviewResponse] = await Promise.all([
      adminSession(
        new Request("https://example.test/api/admin/session"),
        context(),
      ),
      adminQuotes(
        new Request("https://example.test/api/admin/quotes"),
        context(),
      ),
      adminReviews(
        new Request("https://example.test/api/admin/reviews"),
        context(),
      ),
    ]);

    expect(sessionResponse.status).toBe(401);
    expect(quoteResponse.status).toBe(401);
    expect(reviewResponse.status).toBe(401);
  });

  test("returns no permissive cross-origin headers", async () => {
    enableAdminBackend();

    const response = await adminSession(
      new Request("https://example.test/api/admin/session", {
        headers: { Origin: "https://attacker.example" },
      }),
      context(),
    );

    expect(response.headers.has("access-control-allow-origin")).toBe(false);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });

  test("bounds JSON by actual encoded bytes when Content-Length is absent", async () => {
    const oversizedRequest = new Request(
      "https://example.test/api/admin/reviews/example",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ padding: "é".repeat(600) }),
      },
    );

    expect(oversizedRequest.headers.get("content-length")).toBeNull();
    expect(await readBoundedAdminJson(oversizedRequest, 1_024)).toBeNull();
  });

  test("accepts only bounded JSON objects for admin mutations", async () => {
    const validRequest = new Request(
      "https://example.test/api/admin/quotes/example",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ status: "contacted" }),
      },
    );
    const textRequest = new Request(
      "https://example.test/api/admin/quotes/example",
      {
        method: "PATCH",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ status: "contacted" }),
      },
    );

    expect(await readBoundedAdminJson(validRequest)).toEqual({
      status: "contacted",
    });
    expect(await readBoundedAdminJson(textRequest)).toBeNull();
  });

  test("denies inactive memberships and AAL1 customer-data access", () => {
    expect(
      evaluateAdminAccessPolicy(
        { role: "owner", active: false, mfa_required: false },
        "aal2",
      )?.code,
    ).toBe("admin_access_denied");
    expect(
      evaluateAdminAccessPolicy(
        { role: "owner", active: true, mfa_required: false },
        "aal1",
        { requireAal2: true },
      )?.code,
    ).toBe("mfa_required");
    expect(
      evaluateAdminAccessPolicy(
        { role: "owner", active: true, mfa_required: true },
        "aal1",
      )?.code,
    ).toBe("mfa_required");
  });

  test("keeps editors read-only and permits AAL2 owner/admin writes", () => {
    expect(
      evaluateAdminAccessPolicy(
        { role: "editor", active: true, mfa_required: true },
        "aal2",
        { requireAal2: true, requireWrite: true },
      )?.code,
    ).toBe("write_access_denied");
    expect(
      evaluateAdminAccessPolicy(
        { role: "owner", active: true, mfa_required: true },
        "aal2",
        { requireAal2: true, requireWrite: true },
      ),
    ).toBeNull();
    expect(
      evaluateAdminAccessPolicy(
        { role: "admin", active: true, mfa_required: false },
        "aal2",
        { requireAal2: true, requireWrite: true },
      ),
    ).toBeNull();
  });
});
