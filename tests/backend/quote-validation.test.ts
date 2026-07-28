import { describe, expect, test } from "bun:test";
import {
  MAX_QUOTE_BODY_BYTES,
  validateQuoteSubmission,
} from "../../netlify/functions/_shared/quote-validation";

const NOW = Date.parse("2026-07-28T12:00:00.000Z");

function validPayload() {
  return {
    firstName: "Jordan",
    lastName: "Taylor",
    phone: "(865) 555-0100",
    email: "",
    address: "100 Example Road, Sevierville, TN",
    services: ["window-cleaning"],
    contactPreference: "text",
    idempotencyKey: "3d88a0f2-d2d4-4cb4-acaa-266075daeb07",
    formStartedAt: "2026-07-28T11:59:55.000Z",
    website: "",
  };
}

describe("quote validation", () => {
  test("accepts a bounded canonical submission", () => {
    const result = validateQuoteSubmission(validPayload(), NOW);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.submission.email).toBeUndefined();
      expect(result.submission.services).toEqual(["window-cleaning"]);
    }
  });

  test("rejects unknown fields and noncanonical services", () => {
    const result = validateQuoteSubmission(
      {
        ...validPayload(),
        services: ["surface-sealing"],
        unexpected: "not allowed",
      },
      NOW,
    );
    expect(result).toMatchObject({
      ok: false,
      code: "invalid_payload",
    });
  });

  test("rejects a filled honeypot and implausibly fast completion", () => {
    expect(
      validateQuoteSubmission({ ...validPayload(), website: "spam.test" }, NOW),
    ).toMatchObject({ ok: false, code: "spam_rejected" });

    expect(
      validateQuoteSubmission(
        {
          ...validPayload(),
          formStartedAt: "2026-07-28T11:59:59.500Z",
        },
        NOW,
      ),
    ).toMatchObject({ ok: false, code: "spam_rejected" });
  });

  test("keeps the documented request bound small", () => {
    expect(MAX_QUOTE_BODY_BYTES).toBe(16_384);
  });
});
