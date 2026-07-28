import type { ServiceId } from "../../../src/data/services";

export const QUOTE_STATUS_VALUES = [
  "new",
  "contacted",
  "scheduled",
  "completed",
  "archived",
  "spam",
] as const;

export type QuoteStatus = (typeof QUOTE_STATUS_VALUES)[number];
export type ContactPreference = "call" | "text";
export type NotificationProvider = "chariot" | "ntfy";
export type NotificationStatus = "disabled" | "sent" | "failed";

export interface QuoteSubmission {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  address: string;
  services: ServiceId[];
  contactPreference: ContactPreference;
  idempotencyKey: string;
  formStartedAt: string;
  website: string;
}

export interface StoredQuoteInput {
  id: string;
  idempotencyKey: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  propertyAddress: string;
  serviceIds: ServiceId[];
  contactPreference: ContactPreference;
  source: "website";
  status: QuoteStatus;
  clientStartedAt: string;
  ipHash: string;
  userAgent: string | null;
}

export type QuoteCreationOutcome = "created" | "duplicate" | "rate_limited";

export interface StoredQuoteResult {
  outcome: QuoteCreationOutcome;
  quoteId: string | null;
  retryAfterSeconds: number | null;
}

export interface NotificationDelivery {
  quoteId: string;
  provider: NotificationProvider;
  status: NotificationStatus;
  providerStatus: number | null;
  lastError: string | null;
  attemptedAt: string;
  deliveredAt: string | null;
}

export interface QuoteRepository {
  createQuote(input: StoredQuoteInput): Promise<StoredQuoteResult>;
  recordNotification(delivery: NotificationDelivery): Promise<void>;
}

export interface NotificationResult {
  status: NotificationStatus;
  providerStatus: number | null;
  errorCode: string | null;
}

export interface QuoteNotifier {
  readonly provider: NotificationProvider;
  send(
    quoteId: string,
    submission: QuoteSubmission,
  ): Promise<NotificationResult>;
}

export interface SafeLogger {
  info(event: string, fields: Record<string, string | number | boolean>): void;
  warn(event: string, fields: Record<string, string | number | boolean>): void;
  error(event: string, fields: Record<string, string | number | boolean>): void;
}
