import { describe, expect, test } from "bun:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createQuoteRepositoryFromClient } from "../../netlify/functions/_shared/quote-repository";
import type { StoredQuoteInput } from "../../netlify/functions/_shared/quote-types";

const quote: StoredQuoteInput = {
  id: "e11ae391-e477-455e-896c-4bf80f80f315",
  idempotencyKey: "3d88a0f2-d2d4-4cb4-acaa-266075daeb07",
  firstName: "Jordan",
  lastName: "Taylor",
  phone: "(865) 555-0100",
  email: null,
  propertyAddress: "100 Example Road, Sevierville, TN",
  serviceIds: ["window-cleaning"],
  contactPreference: "text",
  source: "website",
  status: "new",
  clientStartedAt: "2026-07-28T11:59:55.000Z",
  ipHash: "a".repeat(64),
  userAgent: "Repository test",
};

describe("Supabase quote repository", () => {
  test("uses the atomic create_quote_request RPC contract", async () => {
    const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
    const client = {
      async rpc(name: string, args: Record<string, unknown>) {
        calls.push({ name, args });
        return {
          data: [
            {
              outcome: "created",
              quote_id: quote.id,
              retry_after_seconds: null,
            },
          ],
          error: null,
        };
      },
    } as unknown as SupabaseClient;

    const repository = createQuoteRepositoryFromClient(client);
    const result = await repository.createQuote(quote);

    expect(result).toEqual({
      outcome: "created",
      quoteId: quote.id,
      retryAfterSeconds: null,
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      name: "create_quote_request",
      args: {
        p_quote_id: quote.id,
        p_idempotency_key: quote.idempotencyKey,
        p_ip_hash: quote.ipHash,
        p_service_ids: ["window-cleaning"],
      },
    });
  });

  test("normalizes a database rate-limit response", async () => {
    const client = {
      async rpc() {
        return {
          data: [
            {
              outcome: "rate_limited",
              quote_id: null,
              retry_after_seconds: 90.2,
            },
          ],
          error: null,
        };
      },
    } as unknown as SupabaseClient;

    const repository = createQuoteRepositoryFromClient(client);
    await expect(repository.createQuote(quote)).resolves.toEqual({
      outcome: "rate_limited",
      quoteId: null,
      retryAfterSeconds: 91,
    });
  });
});
