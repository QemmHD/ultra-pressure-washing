import { z } from "zod";
import { SERVICE_IDS } from "../../../src/data/services";
import type { QuoteSubmission } from "./quote-types";

export const MAX_QUOTE_BODY_BYTES = 16_384;
export const MIN_FORM_COMPLETION_MS = 3_000;
export const MAX_FORM_AGE_MS = 24 * 60 * 60 * 1_000;

const humanText = (maximum: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(maximum)
    .refine((value) => !hasDisallowedControlCharacter(value));

const optionalEmail = z
  .string()
  .trim()
  .max(160)
  .refine((value) => value === "" || z.email().safeParse(value).success)
  .transform((value) => value || undefined);

export const quoteSubmissionSchema = z
  .object({
    firstName: humanText(80),
    lastName: humanText(80),
    phone: z
      .string()
      .trim()
      .min(1)
      .max(24)
      .refine((value) => {
        const digits = value.replace(/\D/g, "");
        return digits.length >= 10 && digits.length <= 15;
      }),
    email: optionalEmail,
    address: humanText(200).refine((value) => value.length >= 5),
    services: z
      .array(z.enum(SERVICE_IDS))
      .min(1)
      .max(SERVICE_IDS.length)
      .refine((values) => new Set(values).size === values.length),
    contactPreference: z.enum(["call", "text"]),
    idempotencyKey: z.uuid(),
    formStartedAt: z.iso.datetime({ offset: true }),
    website: z.string().max(200),
  })
  .strict();

export type QuoteValidationResult =
  | { ok: true; submission: QuoteSubmission }
  | {
      ok: false;
      code: "invalid_payload" | "spam_rejected";
      fieldErrors?: Record<string, string[]>;
    };

export function validateQuoteSubmission(
  value: unknown,
  now = Date.now(),
): QuoteValidationResult {
  const parsed = quoteSubmissionSchema.safeParse(value);
  if (!parsed.success) {
    return {
      ok: false,
      code: "invalid_payload",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  if (parsed.data.website.trim()) {
    return { ok: false, code: "spam_rejected" };
  }

  const startedAt = Date.parse(parsed.data.formStartedAt);
  const elapsed = now - startedAt;
  if (
    !Number.isFinite(startedAt) ||
    elapsed < MIN_FORM_COMPLETION_MS ||
    elapsed > MAX_FORM_AGE_MS
  ) {
    return { ok: false, code: "spam_rejected" };
  }

  return {
    ok: true,
    submission: parsed.data,
  };
}

function hasDisallowedControlCharacter(value: string): boolean {
  return Array.from(value).some((character) => {
    const code = character.charCodeAt(0);
    return (
      code <= 8 ||
      code === 11 ||
      code === 12 ||
      (code >= 14 && code <= 31) ||
      code === 127
    );
  });
}
