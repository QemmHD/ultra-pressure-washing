import type { ServiceId } from "../data/services";
import {
  getBrowserBackendRuntimeMode,
  type BackendRuntimeMode,
} from "./backend-runtime";

export const PREVIEW_QUOTE_MESSAGE = "Preview mode — no request was sent.";
export const STAGING_QUOTE_MESSAGE =
  "Staging test saved — fake data was stored only in the isolated staging database. No notification was sent.";

export type QuoteSubmissionMode = BackendRuntimeMode;

export interface QuoteSubmissionPayload {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: string;
  services: ServiceId[];
  contactPreference: "call" | "text";
  idempotencyKey: string;
  formStartedAt: string;
  website: string;
}

interface QuoteApiResponse {
  ok: boolean;
  message?: string;
  code?: string;
  fieldErrors?: Record<string, string[]>;
}

export class QuoteSubmissionError extends Error {
  constructor(
    message: string,
    readonly code = "quote_submission_failed",
    readonly fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "QuoteSubmissionError";
  }
}

export function isLiveQuoteSubmissionAvailable(): boolean {
  return getQuoteSubmissionMode() === "production";
}

export function getQuoteSubmissionMode(): QuoteSubmissionMode {
  const runtimeMode = getBrowserBackendRuntimeMode();

  if (
    runtimeMode === "production" &&
    import.meta.env.VITE_QUOTE_MODE === "live"
  ) {
    return "production";
  }

  if (runtimeMode === "staging") {
    return "staging";
  }

  return "preview";
}

export function isQuoteSubmissionAvailable(): boolean {
  return getQuoteSubmissionMode() !== "preview";
}

export async function submitQuoteRequest(
  payload: QuoteSubmissionPayload,
): Promise<string> {
  const submissionMode = getQuoteSubmissionMode();

  if (submissionMode === "preview") {
    return PREVIEW_QUOTE_MESSAGE;
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch("/api/quote", {
      method: "POST",
      cache: "no-store",
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      redirect: "error",
      referrerPolicy: "strict-origin",
      signal: controller.signal,
    });

    const result = await readResponse(response);
    if (!response.ok || !result.ok) {
      throw new QuoteSubmissionError(
        result.message ??
          "We could not safely send your request. Please call or text us.",
        result.code,
        result.fieldErrors,
      );
    }

    if (submissionMode === "staging") return STAGING_QUOTE_MESSAGE;

    return (
      result.message ??
      "Thanks — your quote request was received. We respond within 24 hours."
    );
  } catch (error) {
    if (error instanceof QuoteSubmissionError) throw error;
    throw new QuoteSubmissionError(
      error instanceof DOMException && error.name === "AbortError"
        ? "The request timed out. Please try once more, or call or text us."
        : "We could not safely send your request. Please call or text us.",
      error instanceof DOMException && error.name === "AbortError"
        ? "request_timeout"
        : "network_error",
    );
  } finally {
    window.clearTimeout(timeout);
  }
}

async function readResponse(response: Response): Promise<QuoteApiResponse> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return {
      ok: false,
      code: "invalid_response",
      message: "We could not safely send your request. Please call or text us.",
    };
  }

  try {
    return (await response.json()) as QuoteApiResponse;
  } catch {
    return {
      ok: false,
      code: "invalid_response",
      message: "We could not safely send your request. Please call or text us.",
    };
  }
}
