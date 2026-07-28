import { describe, expect, test } from "bun:test";
import type {
  QuoteEnvironment,
  QuoteRuntimeContext,
} from "../../netlify/functions/_shared/environment";
import {
  APPROVED_STAGING_SUPABASE_PROJECT_REF,
} from "../../netlify/functions/_shared/backend-runtime-context";
import { handleQuoteRequest } from "../../netlify/functions/_shared/submit-quote-handler";
import type {
  NotificationDelivery,
  QuoteNotifier,
  QuoteRepository,
  SafeLogger,
  StoredQuoteInput,
  StoredQuoteResult,
} from "../../netlify/functions/_shared/quote-types";

const NOW = Date.parse("2026-07-28T12:00:00.000Z");
const QUOTE_ID = "e11ae391-e477-455e-896c-4bf80f80f315";

const environment: QuoteEnvironment = {
  submissionEnabled: true,
  stagingBackendEnabled: false,
  allowedOrigin: "https://ultrapressurewashing.net",
  expectedSiteId: "expected-site-id",
  ipHashSecret: "a-test-only-secret-with-at-least-32-characters",
  supabaseProjectRef: "abcdefghijklmnopqrst",
  supabaseUrl: "https://abcdefghijklmnopqrst.supabase.co",
  supabaseSecretKey: "test-secret-key",
  chariotEnabled: false,
  chariotEndpoint: "",
  chariotToken: "",
  ntfyEnabled: false,
  ntfyBaseUrl: "",
  ntfyTopic: "",
  ntfyAccessToken: "",
};

const productionContext: QuoteRuntimeContext = {
  deployContext: "production",
  published: true,
  siteId: "expected-site-id",
  ip: "192.0.2.10",
  requestId: "request-1",
};

function payload() {
  return {
    firstName: "Jordan",
    lastName: "Taylor",
    phone: "(865) 555-0100",
    email: "jordan@example.test",
    address: "100 Example Road, Sevierville, TN",
    services: ["window-cleaning"],
    contactPreference: "text",
    idempotencyKey: "3d88a0f2-d2d4-4cb4-acaa-266075daeb07",
    formStartedAt: "2026-07-28T11:59:55.000Z",
    website: "",
  };
}

function request(
  body: unknown = payload(),
  options: {
    origin?: string;
    contentType?: string;
    url?: string;
  } = {},
): Request {
  return new Request(
    options.url ?? "https://ultrapressurewashing.net/api/quote",
    {
      method: "POST",
      headers: {
        "Content-Type": options.contentType ?? "application/json",
        Origin:
          options.origin === undefined
            ? "https://ultrapressurewashing.net"
            : options.origin,
        "User-Agent": "Backend security test",
      },
      body: JSON.stringify(body),
    },
  );
}

function repository(
  events: string[],
  result: StoredQuoteResult = {
    outcome: "created",
    quoteId: QUOTE_ID,
    retryAfterSeconds: null,
  },
): QuoteRepository & {
  stored: StoredQuoteInput[];
  deliveries: NotificationDelivery[];
} {
  const stored: StoredQuoteInput[] = [];
  const deliveries: NotificationDelivery[] = [];
  return {
    stored,
    deliveries,
    async createQuote(input) {
      events.push("stored");
      stored.push(input);
      return result;
    },
    async recordNotification(delivery) {
      events.push(`recorded:${delivery.provider}`);
      deliveries.push(delivery);
    },
  };
}

function notifier(
  provider: "chariot" | "ntfy",
  events: string[],
  status: "sent" | "failed" = "sent",
): QuoteNotifier {
  return {
    provider,
    async send() {
      events.push(`notified:${provider}`);
      return {
        status,
        providerStatus: status === "sent" ? 200 : 502,
        errorCode: status === "sent" ? null : "provider_rejected",
      };
    },
  };
}

function logger(): SafeLogger & {
  entries: Array<{ event: string; fields: Record<string, unknown> }>;
} {
  const entries: Array<{
    event: string;
    fields: Record<string, unknown>;
  }> = [];
  return {
    entries,
    info(event, fields) {
      entries.push({ event, fields });
    },
    warn(event, fields) {
      entries.push({ event, fields });
    },
    error(event, fields) {
      entries.push({ event, fields });
    },
  };
}

function dependencies(
  repo: QuoteRepository,
  notifiers: readonly QuoteNotifier[],
  safeLogger: SafeLogger = logger(),
) {
  return {
    repository: repo,
    notifiers,
    logger: safeLogger,
    now: () => NOW,
    randomUuid: () => QUOTE_ID,
    hashIp: async () => "hashed-ip-only",
  };
}

describe("secure quote handler", () => {
  test("fails closed outside a published production deploy", async () => {
    const events: string[] = [];
    const response = await handleQuoteRequest(
      request(),
      { ...productionContext, deployContext: "deploy-preview", published: false },
      environment,
      dependencies(repository(events), []),
    );

    expect(response.status).toBe(503);
    expect(events).toEqual([]);
  });

  test("accepts only the explicit isolated staging deploy preview", async () => {
    const stagingOrigin =
      "https://deploy-preview-2--ultrapressurewashing.netlify.app";
    const stagingEnvironment: QuoteEnvironment = {
      ...environment,
      stagingBackendEnabled: true,
      allowedOrigin: stagingOrigin,
      supabaseProjectRef: APPROVED_STAGING_SUPABASE_PROJECT_REF,
      supabaseUrl:
        `https://${APPROVED_STAGING_SUPABASE_PROJECT_REF}.supabase.co`,
    };
    const stagingContext: QuoteRuntimeContext = {
      ...productionContext,
      deployContext: "deploy-preview",
      published: false,
    };
    const events: string[] = [];
    const response = await handleQuoteRequest(
      request(payload(), {
        origin: stagingOrigin,
        url: `${stagingOrigin}/api/quote`,
      }),
      stagingContext,
      stagingEnvironment,
      dependencies(repository(events), []),
    );
    const result = (await response.json()) as {
      ok: boolean;
      message: string;
    };

    expect(response.status).toBe(200);
    expect(events).toEqual(["stored"]);
    expect(result).toMatchObject({
      ok: true,
      message:
        "Staging preview — this test request was saved only to the isolated staging database. No notification was sent.",
    });
  });

  test("fails staging closed on deploy, project, site, origin, or notification mismatch", async () => {
    const stagingOrigin =
      "https://deploy-preview-2--ultrapressurewashing.netlify.app";
    const stagingEnvironment: QuoteEnvironment = {
      ...environment,
      stagingBackendEnabled: true,
      allowedOrigin: stagingOrigin,
      supabaseProjectRef: APPROVED_STAGING_SUPABASE_PROJECT_REF,
      supabaseUrl:
        `https://${APPROVED_STAGING_SUPABASE_PROJECT_REF}.supabase.co`,
    };
    const stagingContext: QuoteRuntimeContext = {
      ...productionContext,
      deployContext: "deploy-preview",
      published: false,
    };
    const stagingRequest = request(payload(), {
      origin: stagingOrigin,
      url: `${stagingOrigin}/api/quote`,
    });
    const cases: Array<{
      environment: QuoteEnvironment;
      context: QuoteRuntimeContext;
      request: Request;
    }> = [
      {
        environment: stagingEnvironment,
        context: { ...stagingContext, deployContext: "branch-deploy" },
        request: stagingRequest.clone(),
      },
      {
        environment: stagingEnvironment,
        context: { ...stagingContext, published: true },
        request: stagingRequest.clone(),
      },
      {
        environment: {
          ...stagingEnvironment,
          supabaseProjectRef: "abcdefghijklmnopqrst",
          supabaseUrl: "https://abcdefghijklmnopqrst.supabase.co",
        },
        context: stagingContext,
        request: stagingRequest.clone(),
      },
      {
        environment: stagingEnvironment,
        context: { ...stagingContext, siteId: "wrong-site" },
        request: stagingRequest.clone(),
      },
      {
        environment: stagingEnvironment,
        context: stagingContext,
        request: request(payload(), {
          origin: "https://attacker.example",
          url: `${stagingOrigin}/api/quote`,
        }),
      },
      {
        environment: {
          ...stagingEnvironment,
          chariotEnabled: true,
          chariotEndpoint: "https://chariotai.com/api/forms/test",
          chariotToken: "test-token",
        },
        context: stagingContext,
        request: stagingRequest.clone(),
      },
      {
        environment: {
          ...stagingEnvironment,
          ntfyEnabled: true,
          ntfyBaseUrl: "https://ntfy.sh",
          ntfyTopic: "valid-test-topic-1234",
          ntfyAccessToken: "test-token",
        },
        context: stagingContext,
        request: stagingRequest.clone(),
      },
    ];

    for (const testCase of cases) {
      const events: string[] = [];
      const response = await handleQuoteRequest(
        testCase.request,
        testCase.context,
        testCase.environment,
        dependencies(repository(events), []),
      );

      expect(response.status).toBe(503);
      expect(events).toEqual([]);
    }
  });

  test("fails closed for every required production configuration gate", async () => {
    const invalidEnvironments: QuoteEnvironment[] = [
      { ...environment, submissionEnabled: false },
      { ...environment, allowedOrigin: "" },
      { ...environment, expectedSiteId: "" },
      { ...environment, ipHashSecret: "too-short" },
      { ...environment, supabaseUrl: "" },
      {
        ...environment,
        supabaseUrl: "https://abcdefghijklmnopqrst.supabase.co.attacker.test",
      },
      { ...environment, supabaseSecretKey: "" },
      { ...environment, chariotEnabled: true, chariotEndpoint: "" },
      {
        ...environment,
        ntfyEnabled: true,
        ntfyBaseUrl: "https://ntfy.sh",
        ntfyTopic: "too-short",
        ntfyAccessToken: "token",
      },
      {
        ...environment,
        ntfyEnabled: true,
        ntfyBaseUrl: "https://ntfy.sh.attacker.test",
        ntfyTopic: "valid-test-topic-1234",
        ntfyAccessToken: "token",
      },
    ];

    for (const invalidEnvironment of invalidEnvironments) {
      const events: string[] = [];
      const response = await handleQuoteRequest(
        request(),
        productionContext,
        invalidEnvironment,
        dependencies(repository(events), []),
      );
      expect(response.status).toBe(503);
      expect(events).toEqual([]);
    }
  });

  test("fails closed for a mismatched origin or Netlify site", async () => {
    const events: string[] = [];
    const wrongOrigin = await handleQuoteRequest(
      request(payload(), { origin: "https://attacker.example" }),
      productionContext,
      environment,
      dependencies(repository(events), []),
    );
    const wrongSite = await handleQuoteRequest(
      request(),
      { ...productionContext, siteId: "wrong-site" },
      environment,
      dependencies(repository(events), []),
    );

    expect(wrongOrigin.status).toBe(503);
    expect(wrongSite.status).toBe(503);
    expect(events).toEqual([]);
  });

  test("rejects invalid JSON-like media types before storage", async () => {
    const events: string[] = [];
    const response = await handleQuoteRequest(
      request(payload(), { contentType: "application/jsonp" }),
      productionContext,
      environment,
      dependencies(repository(events), []),
    );

    expect(response.status).toBe(415);
    expect(events).toEqual([]);
  });

  test("stores before notifying and persists independent outcomes", async () => {
    const events: string[] = [];
    const repo = repository(events);
    const response = await handleQuoteRequest(
      request(),
      productionContext,
      environment,
      dependencies(repo, [
        notifier("chariot", events),
        notifier("ntfy", events, "failed"),
      ]),
    );

    expect(response.status).toBe(200);
    expect(events[0]).toBe("stored");
    expect(events.indexOf("notified:chariot")).toBeGreaterThan(0);
    expect(events.indexOf("notified:ntfy")).toBeGreaterThan(0);
    expect(repo.stored[0]).toMatchObject({
      email: "jordan@example.test",
      ipHash: "hashed-ip-only",
      status: "new",
      serviceIds: ["window-cleaning"],
    });
    expect(repo.deliveries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ provider: "chariot", status: "sent" }),
        expect.objectContaining({
          provider: "ntfy",
          status: "failed",
          lastError: "provider_rejected",
        }),
      ]),
    );
  });

  test("does not notify again for an idempotent duplicate", async () => {
    const events: string[] = [];
    const repo = repository(events, {
      outcome: "duplicate",
      quoteId: null,
      retryAfterSeconds: null,
    });
    const response = await handleQuoteRequest(
      request(),
      productionContext,
      environment,
      dependencies(repo, [notifier("chariot", events)]),
    );
    const result = (await response.json()) as { duplicate: boolean };

    expect(response.status).toBe(200);
    expect(result.duplicate).toBe(true);
    expect(events).toEqual(["stored"]);
  });

  test("returns Retry-After and never notifies when the database rate limit applies", async () => {
    const events: string[] = [];
    const repo = repository(events, {
      outcome: "rate_limited",
      quoteId: null,
      retryAfterSeconds: 90,
    });
    const response = await handleQuoteRequest(
      request(),
      productionContext,
      environment,
      dependencies(repo, [notifier("chariot", events)]),
    );
    const result = (await response.json()) as {
      code: string;
      retryAfterSeconds: number;
    };

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("90");
    expect(result).toMatchObject({
      code: "rate_limited",
      retryAfterSeconds: 90,
    });
    expect(events).toEqual(["stored"]);
  });

  test("never notifies when durable storage fails", async () => {
    const events: string[] = [];
    const repo: QuoteRepository = {
      async createQuote() {
        events.push("storage-attempted");
        throw new Error("database details must not escape");
      },
      async recordNotification() {
        events.push("unexpected-record");
      },
    };
    const response = await handleQuoteRequest(
      request(),
      productionContext,
      environment,
      dependencies(repo, [notifier("chariot", events)]),
    );

    expect(response.status).toBe(503);
    expect(events).toEqual(["storage-attempted"]);
    expect(await response.text()).not.toContain("database details");
  });

  test("fails closed before storage when IP pseudonymization fails", async () => {
    const events: string[] = [];
    const repo = repository(events);
    const deps = dependencies(repo, []);
    deps.hashIp = async () => {
      throw new Error("hash unavailable");
    };

    const response = await handleQuoteRequest(
      request(),
      productionContext,
      environment,
      deps,
    );

    expect(response.status).toBe(503);
    expect(events).toEqual([]);
  });

  test("rejects oversized bodies before storage", async () => {
    const events: string[] = [];
    const response = await handleQuoteRequest(
      request({ ...payload(), firstName: "x".repeat(17_000) }),
      productionContext,
      environment,
      dependencies(repository(events), []),
    );

    expect(response.status).toBe(413);
    expect(events).toEqual([]);
  });

  test("logs only safe identifiers rather than submitted PII", async () => {
    const events: string[] = [];
    const safeLogger = logger();
    await handleQuoteRequest(
      request(),
      productionContext,
      environment,
      dependencies(repository(events), [], safeLogger),
    );

    const serialized = JSON.stringify(safeLogger.entries);
    expect(serialized).not.toContain("Jordan");
    expect(serialized).not.toContain("100 Example Road");
    expect(serialized).not.toContain("(865)");
    expect(serialized).toContain(QUOTE_ID);
  });
});
