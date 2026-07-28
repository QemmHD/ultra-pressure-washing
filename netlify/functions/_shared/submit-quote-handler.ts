import type {
  QuoteEnvironment,
  QuoteRuntimeContext,
} from "./environment";
import { readBoundedRequestText } from "./bounded-body";
import {
  getConfigurationError,
  getRequestGateError,
} from "./environment";
import type {
  QuoteNotifier,
  QuoteRepository,
  SafeLogger,
} from "./quote-types";
import {
  MAX_QUOTE_BODY_BYTES,
  validateQuoteSubmission,
} from "./quote-validation";

const JSON_HEADERS = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};

export interface QuoteHandlerDependencies {
  repository: QuoteRepository;
  notifiers: readonly QuoteNotifier[];
  logger: SafeLogger;
  now?: () => number;
  randomUuid?: () => string;
  hashIp?: (ip: string, secret: string) => Promise<string>;
}

export async function handleQuoteRequest(
  request: Request,
  context: QuoteRuntimeContext,
  environment: QuoteEnvironment,
  dependencies: QuoteHandlerDependencies,
): Promise<Response> {
  if (request.method !== "POST") {
    return jsonResponse(405, {
      ok: false,
      code: "method_not_allowed",
      message: "Method not allowed.",
    }, { Allow: "POST" });
  }

  const configurationError = getConfigurationError(environment);
  if (configurationError) {
    dependencies.logger.warn("quote_configuration_blocked", {
      requestId: context.requestId,
      code: configurationError,
    });
    return unavailable();
  }

  const gateError = getRequestGateError(request, context, environment);
  if (gateError) {
    dependencies.logger.warn("quote_request_blocked", {
      requestId: context.requestId,
      code: gateError,
    });
    return unavailable();
  }

  const contentType = request.headers
    .get("content-type")
    ?.split(";", 1)[0]
    .trim()
    .toLowerCase();
  if (contentType !== "application/json") {
    return jsonResponse(415, {
      ok: false,
      code: "unsupported_media_type",
      message: "Submit the form as JSON.",
    });
  }

  const boundedBody = await readBoundedRequestText(
    request,
    MAX_QUOTE_BODY_BYTES,
  );
  if (!boundedBody.ok && boundedBody.reason === "too_large") {
    return payloadTooLarge();
  }
  if (!boundedBody.ok) return invalidRequest();

  let body: unknown;
  try {
    body = JSON.parse(boundedBody.text);
  } catch {
    return invalidRequest();
  }

  const validation = validateQuoteSubmission(
    body,
    dependencies.now?.() ?? Date.now(),
  );
  if (!validation.ok) {
    dependencies.logger.info("quote_validation_rejected", {
      requestId: context.requestId,
      code: validation.code,
    });
    return jsonResponse(400, {
      ok: false,
      code: validation.code,
      message: "Please review the form and try again.",
      ...(validation.code === "invalid_payload" && validation.fieldErrors
        ? { fieldErrors: validation.fieldErrors }
        : {}),
    });
  }

  const quoteId =
    dependencies.randomUuid?.() ?? crypto.randomUUID();
  let ipHash: string;
  try {
    ipHash = await (
      dependencies.hashIp ?? hashIpAddress
    )(context.ip, environment.ipHashSecret);
  } catch {
    dependencies.logger.error("quote_ip_hash_failed", {
      requestId: context.requestId,
      code: "ip_hash_failed",
    });
    return unavailable();
  }

  let stored;
  try {
    stored = await dependencies.repository.createQuote({
      id: quoteId,
      idempotencyKey: validation.submission.idempotencyKey,
      firstName: validation.submission.firstName,
      lastName: validation.submission.lastName,
      phone: validation.submission.phone,
      email: validation.submission.email ?? null,
      propertyAddress: validation.submission.address,
      serviceIds: validation.submission.services,
      contactPreference: validation.submission.contactPreference,
      source: "website",
      status: "new",
      clientStartedAt: validation.submission.formStartedAt,
      ipHash,
      userAgent: truncateUserAgent(request.headers.get("user-agent")),
    });
  } catch {
    dependencies.logger.error("quote_storage_failed", {
      requestId: context.requestId,
      code: "quote_storage_failed",
    });
    return jsonResponse(503, {
      ok: false,
      code: "temporarily_unavailable",
      message:
        "We could not safely save your request. Please call or text us instead.",
    });
  }

  if (stored.outcome === "rate_limited") {
    const retryAfterSeconds = stored.retryAfterSeconds ?? 60;
    dependencies.logger.warn("quote_rate_limited", {
      requestId: context.requestId,
      code: "database_rate_limit",
      retryAfterSeconds,
    });
    return jsonResponse(
      429,
      {
        ok: false,
        code: "rate_limited",
        message:
          "Too many requests were received. Please wait before trying again.",
        retryAfterSeconds,
      },
      { "Retry-After": String(retryAfterSeconds) },
    );
  }

  if (stored.outcome === "duplicate") {
    dependencies.logger.info("quote_duplicate_accepted", {
      requestId: context.requestId,
      code: "duplicate",
    });
    return successResponse(true);
  }

  if (!stored.quoteId) {
    dependencies.logger.error("quote_storage_failed", {
      requestId: context.requestId,
      code: "missing_quote_id",
    });
    return jsonResponse(503, {
      ok: false,
      code: "temporarily_unavailable",
      message:
        "We could not safely save your request. Please call or text us instead.",
    });
  }

  const storedQuoteId = stored.quoteId;
  dependencies.logger.info("quote_stored", {
    requestId: context.requestId,
    quoteId: storedQuoteId,
  });

  await Promise.all(
    dependencies.notifiers.map(async (notifier) => {
      const attemptedAt = new Date(
        dependencies.now?.() ?? Date.now(),
      ).toISOString();
      let result;
      try {
        result = await notifier.send(
          storedQuoteId,
          validation.submission,
        );
      } catch {
        result = {
          status: "failed" as const,
          providerStatus: null,
          errorCode: "provider_unavailable",
        };
      }

      try {
        await dependencies.repository.recordNotification({
          quoteId: storedQuoteId,
          provider: notifier.provider,
          status: result.status,
          providerStatus: result.providerStatus,
          lastError: result.errorCode,
          attemptedAt,
          deliveredAt:
            result.status === "sent"
              ? new Date(dependencies.now?.() ?? Date.now()).toISOString()
              : null,
        });
      } catch {
        dependencies.logger.error("notification_record_failed", {
          requestId: context.requestId,
          quoteId: storedQuoteId,
          provider: notifier.provider,
          code: "notification_storage_failed",
        });
      }

      const logFields = {
        requestId: context.requestId,
        quoteId: storedQuoteId,
        provider: notifier.provider,
        status: result.status,
        ...(result.errorCode ? { code: result.errorCode } : {}),
      };
      if (result.status === "failed") {
        dependencies.logger.warn("quote_notification_failed", logFields);
      } else {
        dependencies.logger.info("quote_notification_finished", logFields);
      }
    }),
  );

  return successResponse(false);
}

export async function hashIpAddress(
  ip: string,
  secret: string,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(ip || "unknown"),
  );
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function truncateUserAgent(value: string | null): string | null {
  return value ? value.slice(0, 256) : null;
}

function successResponse(duplicate: boolean): Response {
  return jsonResponse(200, {
    ok: true,
    duplicate,
    message:
      "Thanks — your quote request was received. We respond within 24 hours.",
  });
}

function unavailable(): Response {
  return jsonResponse(503, {
    ok: false,
    code: "quote_submission_unavailable",
    message:
      "Online quote requests are unavailable here. Please call or text us.",
  });
}

function invalidRequest(): Response {
  return jsonResponse(400, {
    ok: false,
    code: "invalid_payload",
    message: "Please review the form and try again.",
  });
}

function payloadTooLarge(): Response {
  return jsonResponse(413, {
    ok: false,
    code: "payload_too_large",
    message: "The request is too large.",
  });
}

function jsonResponse(
  status: number,
  value: Record<string, unknown>,
  extraHeaders: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { ...JSON_HEADERS, ...extraHeaders },
  });
}
