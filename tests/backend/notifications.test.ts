import { describe, expect, test } from "bun:test";
import {
  createChariotNotifier,
  createNtfyNotifier,
} from "../../netlify/functions/_shared/notifications";
import type { QuoteSubmission } from "../../netlify/functions/_shared/quote-types";

const submission: QuoteSubmission = {
  firstName: "Taylor",
  lastName: "Example",
  phone: "(865) 555-0100",
  email: "taylor@example.test",
  address: "100 Test Lane, Sevierville, TN",
  services: ["window-cleaning"],
  contactPreference: "text",
  idempotencyKey: "6e454bec-d092-4df5-b6c3-cb3ad15b7ed5",
  formStartedAt: "2026-07-28T12:00:00.000Z",
  website: "",
};

describe("quote notification adapters", () => {
  test("disabled providers never call fetch", async () => {
    let calls = 0;
    const fetchImpl = (async () => {
      calls += 1;
      throw new Error("disabled provider called fetch");
    }) as unknown as typeof fetch;

    const results = await Promise.all([
      createChariotNotifier({
        enabled: false,
        endpoint: "https://chariotai.com/api/forms/submit",
        token: "not-used",
        fetchImpl,
      }).send("quote-id", submission),
      createNtfyNotifier({
        enabled: false,
        baseUrl: "https://ntfy.sh",
        topic: "not-used",
        accessToken: "not-used",
        fetchImpl,
      }).send("quote-id", submission),
    ]);

    expect(calls).toBe(0);
    expect(results.map((result) => result.status)).toEqual([
      "disabled",
      "disabled",
    ]);
  });

  test("Chariot receives the server credential and complete lead fields", async () => {
    let capturedUrl = "";
    let capturedInit: RequestInit | undefined;
    const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
      capturedUrl = String(input);
      capturedInit = init;
      return new Response("ok", { status: 200 });
    }) as unknown as typeof fetch;
    const notifier = createChariotNotifier({
      enabled: true,
      endpoint: "https://chariotai.com/api/forms/submit",
      token: "server-only-token",
      fetchImpl,
    });

    expect(await notifier.send("quote-id", submission)).toMatchObject({
      status: "sent",
      providerStatus: 200,
    });
    expect(capturedUrl).toBe("https://chariotai.com/api/forms/submit");
    expect(capturedInit?.method).toBe("POST");
    expect(capturedInit?.redirect).toBe("error");
    expect(capturedInit?.body).toBeInstanceOf(FormData);
    const body = capturedInit?.body as FormData;
    expect(body.get("_chariot_form_token")).toBe("server-only-token");
    expect(body.get("First Name")).toBe(submission.firstName);
    expect(body.get("Phone")).toBe(submission.phone);
    expect(body.get("Property Address")).toBe(submission.address);
    expect(body.get("Services")).toBe("Window Cleaning");
  });

  test("ntfy receives authentication and a minimal PII-free alert", async () => {
    let capturedUrl = "";
    let capturedInit: RequestInit | undefined;
    const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
      capturedUrl = String(input);
      capturedInit = init;
      return new Response("ok", { status: 200 });
    }) as unknown as typeof fetch;
    const notifier = createNtfyNotifier({
      enabled: true,
      baseUrl: "https://ntfy.sh",
      topic: "private-topic-1234",
      accessToken: "private-access-token",
      fetchImpl,
    });

    expect(await notifier.send("quote-id", submission)).toMatchObject({
      status: "sent",
      providerStatus: 200,
    });
    expect(capturedUrl).toBe("https://ntfy.sh/private-topic-1234");
    expect(capturedInit?.headers).toMatchObject({
      Authorization: "Bearer private-access-token",
    });
    expect(capturedInit?.redirect).toBe("error");

    const message = String(capturedInit?.body);
    expect(message).toContain("Reference: quote-id");
    expect(message).toContain("Preferred contact: text");
    for (const privateValue of [
      submission.firstName,
      submission.lastName,
      submission.phone,
      submission.email!,
      submission.address,
    ]) {
      expect(message).not.toContain(privateValue);
    }
  });

  test("provider failures and timeouts remain isolated results", async () => {
    const rejectedFetch = (async () =>
      new Response("rejected", { status: 503 })) as unknown as typeof fetch;
    const timeoutFetch = ((_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener(
          "abort",
          () => reject(new DOMException("aborted", "AbortError")),
          { once: true },
        );
      })) as unknown as typeof fetch;

    const rejected = await createChariotNotifier({
      enabled: true,
      endpoint: "https://chariotai.com/api/forms/submit",
      token: "server-only-token",
      fetchImpl: rejectedFetch,
    }).send("quote-id", submission);
    const timedOut = await createNtfyNotifier({
      enabled: true,
      baseUrl: "https://ntfy.sh",
      topic: "private-topic-1234",
      accessToken: "private-access-token",
      fetchImpl: timeoutFetch,
      timeoutMs: 1,
    }).send("quote-id", submission);

    expect(rejected).toEqual({
      status: "failed",
      providerStatus: 503,
      errorCode: "provider_rejected",
    });
    expect(timedOut).toEqual({
      status: "failed",
      providerStatus: null,
      errorCode: "provider_timeout",
    });
  });
});
