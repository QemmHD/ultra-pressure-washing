import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  NotificationDelivery,
  QuoteRepository,
  StoredQuoteInput,
  StoredQuoteResult,
} from "./quote-types";

export function createQuoteRepository(
  supabaseUrl: string,
  supabaseSecretKey: string,
): QuoteRepository {
  const client = createClient(supabaseUrl, supabaseSecretKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
    global: {
      headers: {
        "X-Client-Info": "ultra-pressure-washing-netlify-function",
      },
    },
  });

  return createQuoteRepositoryFromClient(client);
}

export function createQuoteRepositoryFromClient(
  client: SupabaseClient,
): QuoteRepository {
  return new SupabaseQuoteRepository(client);
}

class SupabaseQuoteRepository implements QuoteRepository {
  constructor(private readonly client: SupabaseClient) {}

  async createQuote(input: StoredQuoteInput): Promise<StoredQuoteResult> {
    const { data, error } = await this.client
      .rpc("create_quote_request", {
        p_quote_id: input.id,
        p_idempotency_key: input.idempotencyKey,
        p_first_name: input.firstName,
        p_last_name: input.lastName,
        p_phone: input.phone,
        p_email: input.email,
        p_property_address: input.propertyAddress,
        p_service_ids: input.serviceIds,
        p_contact_preference: input.contactPreference,
        p_source: input.source,
        p_status: input.status,
        p_client_started_at: input.clientStartedAt,
        p_ip_hash: input.ipHash,
        p_user_agent: input.userAgent,
      });

    if (error) {
      throw new QuoteRepositoryError("quote_storage_failed");
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!isQuoteCreationRow(row)) {
      throw new QuoteRepositoryError("invalid_quote_creation_result");
    }

    return {
      outcome: row.outcome,
      quoteId: typeof row.quote_id === "string" ? row.quote_id : null,
      retryAfterSeconds: normalizeRetryAfter(row.retry_after_seconds),
    };
  }

  async recordNotification(delivery: NotificationDelivery): Promise<void> {
    const { data, error } = await this.client
      .from("quote_notification_deliveries")
      .update({
        status: delivery.status,
        provider_status: delivery.providerStatus,
        attempt_count: 1,
        last_error: delivery.lastError,
        attempted_at: delivery.attemptedAt,
        delivered_at: delivery.deliveredAt,
      })
      .eq("quote_id", delivery.quoteId)
      .eq("provider", delivery.provider)
      .select("id")
      .maybeSingle();

    if (error || !data) {
      throw new QuoteRepositoryError("notification_storage_failed");
    }
  }
}

export class QuoteRepositoryError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = "QuoteRepositoryError";
  }
}

interface QuoteCreationRow {
  outcome: "created" | "duplicate" | "rate_limited";
  quote_id?: unknown;
  retry_after_seconds?: unknown;
}

function isQuoteCreationRow(value: unknown): value is QuoteCreationRow {
  if (!value || typeof value !== "object") return false;
  const outcome = (value as { outcome?: unknown }).outcome;
  return (
    outcome === "created" ||
    outcome === "duplicate" ||
    outcome === "rate_limited"
  );
}

function normalizeRetryAfter(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.max(1, Math.min(86_400, Math.ceil(value)));
}
