import { SERVICE_BY_ID } from "../../../src/data/services";
import type {
  NotificationResult,
  QuoteNotifier,
} from "./quote-types";

const NOTIFICATION_TIMEOUT_MS = 8_000;

export function createChariotNotifier(options: {
  enabled: boolean;
  endpoint: string;
  token: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}): QuoteNotifier {
  return {
    provider: "chariot",
    async send(quoteId, submission) {
      if (!options.enabled) return disabled();

      const formData = new FormData();
      formData.append("_chariot_form_token", options.token);
      formData.append("_chariot_form_name", "New Quote Request");
      formData.append("Reference", quoteId);
      formData.append("First Name", submission.firstName);
      formData.append("Last Name", submission.lastName);
      formData.append("Phone", submission.phone);
      formData.append("Email", submission.email ?? "Not provided");
      formData.append("Property Address", submission.address);
      formData.append(
        "Services",
        submission.services
          .map((serviceId) => SERVICE_BY_ID.get(serviceId)?.title ?? serviceId)
          .join(", "),
      );
      formData.append("Preferred Contact", submission.contactPreference);

      return sendWithTimeout(
        options.fetchImpl ?? fetch,
        options.endpoint,
        {
          method: "POST",
          headers: { Accept: "application/json" },
          body: formData,
        },
        options.timeoutMs,
      );
    },
  };
}

export function createNtfyNotifier(options: {
  enabled: boolean;
  baseUrl: string;
  topic: string;
  accessToken: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}): QuoteNotifier {
  return {
    provider: "ntfy",
    async send(quoteId, submission) {
      if (!options.enabled) return disabled();

      const endpoint = new URL(
        encodeURIComponent(options.topic),
        ensureTrailingSlash(options.baseUrl),
      ).toString();

      return sendWithTimeout(
        options.fetchImpl ?? fetch,
        endpoint,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${options.accessToken}`,
            "Content-Type": "text/plain; charset=utf-8",
            Priority: "high",
            Tags: "bell",
            Title: "New quote request — Ultra Pressure Washing",
          },
          body: [
            `Reference: ${quoteId}`,
            `Preferred contact: ${submission.contactPreference}`,
            "Sign in to the secure admin dashboard for customer details.",
          ].join("\n"),
        },
        options.timeoutMs,
      );
    },
  };
}

function disabled(): NotificationResult {
  return {
    status: "disabled",
    providerStatus: null,
    errorCode: null,
  };
}

async function sendWithTimeout(
  fetchImpl: typeof fetch,
  url: string,
  init: RequestInit,
  timeoutMs = NOTIFICATION_TIMEOUT_MS,
): Promise<NotificationResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(url, {
      ...init,
      redirect: "error",
      signal: controller.signal,
    });
    if (!response.ok) {
      return {
        status: "failed",
        providerStatus: response.status,
        errorCode: "provider_rejected",
      };
    }
    return {
      status: "sent",
      providerStatus: response.status,
      errorCode: null,
    };
  } catch (error) {
    return {
      status: "failed",
      providerStatus: null,
      errorCode:
        error instanceof DOMException && error.name === "AbortError"
          ? "provider_timeout"
          : "provider_unavailable",
    };
  } finally {
    clearTimeout(timeout);
  }
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}
