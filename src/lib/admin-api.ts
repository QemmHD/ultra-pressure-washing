import { getAdminSupabaseClient } from "./supabase-client";

export type AdminRole = "owner" | "admin" | "editor";
export type QuoteStatus =
  | "new"
  | "contacted"
  | "scheduled"
  | "completed"
  | "archived"
  | "spam";
export type ReviewStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "archived";

export interface AdminSession {
  userId: string;
  email: string | null;
  role: AdminRole;
  aal: "aal1" | "aal2";
  mfaRequired: boolean;
}

export interface AdminQuote {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  propertyAddress: string;
  serviceIds: string[];
  contactPreference: "call" | "text";
  status: QuoteStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AdminReview {
  id: string;
  customerDisplayName: string;
  reviewText: string;
  rating: number;
  serviceId: string | null;
  status: ReviewStatus;
  consentToPublish: boolean;
  createdAt: string;
  moderatedAt: string | null;
}

interface ApiErrorBody {
  error?: string;
  code?: string;
}

export class AdminApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(message: string, status: number, code = "admin_request_failed") {
    super(message);
    this.name = "AdminApiError";
    this.status = status;
    this.code = code;
  }
}

async function getAccessToken(): Promise<string> {
  const client = getAdminSupabaseClient();
  if (!client) {
    throw new AdminApiError(
      "Secure administration is not configured for this build.",
      503,
      "admin_unavailable",
    );
  }

  const { data, error } = await client.auth.getSession();
  const token = data.session?.access_token;

  if (error || !token) {
    throw new AdminApiError(
      "Your secure session has expired. Sign in again.",
      401,
      "session_required",
    );
  }

  return token;
}

async function adminRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = await getAccessToken();
  const response = await fetch(path, {
    ...init,
    cache: "no-store",
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
    redirect: "error",
  });

  const body = (await response.json().catch(() => ({}))) as T & ApiErrorBody;

  if (!response.ok) {
    throw new AdminApiError(
      body.error ?? "The secure admin request could not be completed.",
      response.status,
      body.code,
    );
  }

  return body;
}

export function verifyAdminSession(): Promise<AdminSession> {
  return adminRequest<AdminSession>("/api/admin/session");
}

export async function listAdminQuotes(): Promise<AdminQuote[]> {
  const response = await adminRequest<{ quotes: AdminQuote[] }>(
    "/api/admin/quotes",
  );
  return response.quotes;
}

export async function updateAdminQuoteStatus(
  id: string,
  status: QuoteStatus,
): Promise<AdminQuote> {
  const response = await adminRequest<{ quote: AdminQuote }>(
    `/api/admin/quotes/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    },
  );
  return response.quote;
}

export async function listAdminReviews(): Promise<AdminReview[]> {
  const response = await adminRequest<{ reviews: AdminReview[] }>(
    "/api/admin/reviews",
  );
  return response.reviews;
}

export async function updateAdminReviewStatus(
  id: string,
  status: ReviewStatus,
): Promise<AdminReview> {
  const response = await adminRequest<{ review: AdminReview }>(
    `/api/admin/reviews/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    },
  );
  return response.review;
}
