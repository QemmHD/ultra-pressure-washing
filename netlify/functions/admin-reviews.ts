import type { Config, Context } from "@netlify/functions";
import { authorizeAdmin, createAdminServiceClient } from "./_shared/admin-auth";
import {
  adminJson,
  adminProblem,
  enforceProductionAdminContext,
  methodNotAllowed,
  readBoundedAdminJson,
} from "./_shared/admin-runtime";

const REVIEW_COLUMNS = [
  "id",
  "customer_name",
  "display_name",
  "review_text",
  "rating",
  "service_id",
  "status",
  "consent_to_publish",
  "moderated_at",
  "created_at",
].join(",");

const REVIEW_STATUSES = new Set([
  "pending",
  "approved",
  "rejected",
  "archived",
]);

interface ReviewRow {
  id: string;
  customer_name: string;
  display_name: string | null;
  review_text: string;
  rating: number;
  service_id: string | null;
  status: string;
  consent_to_publish: boolean;
  moderated_at: string | null;
  created_at: string;
}

function reviewResponse(row: ReviewRow) {
  return {
    id: row.id,
    customerDisplayName: row.display_name ?? row.customer_name,
    reviewText: row.review_text,
    rating: row.rating,
    serviceId: row.service_id,
    status: row.status,
    consentToPublish: row.consent_to_publish,
    moderatedAt: row.moderated_at,
    createdAt: row.created_at,
  };
}

function reviewIdFromPath(request: Request): string | null {
  const match = new URL(request.url).pathname.match(
    /^\/api\/admin\/reviews\/([0-9a-f-]+)$/i,
  );
  const id = match?.[1];
  return id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
    ? id
    : null;
}

async function parseStatus(request: Request): Promise<string | null> {
  const body = await readBoundedAdminJson(request);

  if (
    !body ||
    Object.keys(body).some((key) => key !== "status") ||
    typeof body.status !== "string" ||
    !REVIEW_STATUSES.has(body.status)
  ) {
    return null;
  }

  return body.status;
}

export default async function adminReviews(
  request: Request,
  context: Context,
): Promise<Response> {
  const contextFailure = enforceProductionAdminContext(request, context);
  if (contextFailure) return contextFailure;

  if (request.method === "GET") {
    const authorization = await authorizeAdmin(request, {
      requireAal2: true,
    });
    if (!authorization.ok) return authorization.response;

    const service = createAdminServiceClient();
    if (!service.ok) {
      return adminProblem(503, service.problem.code, service.problem.error);
    }

    const { data, error } = await service.client
      .from("customer_reviews")
      .select(REVIEW_COLUMNS)
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      console.error("admin_review_list_failed");
      return adminProblem(
        503,
        "review_list_unavailable",
        "Customer reviews could not be loaded.",
      );
    }

    return adminJson({
      reviews: ((data ?? []) as unknown as ReviewRow[]).map(reviewResponse),
    });
  }

  if (request.method === "PATCH") {
    const authorization = await authorizeAdmin(request, {
      requireAal2: true,
      requireWrite: true,
    });
    if (!authorization.ok) return authorization.response;

    const id = reviewIdFromPath(request);
    if (!id) {
      return adminProblem(
        400,
        "invalid_review_id",
        "The review ID is invalid.",
      );
    }

    const status = await parseStatus(request);
    if (!status) {
      return adminProblem(
        400,
        "invalid_review_status",
        "Choose a valid review status.",
      );
    }

    const service = createAdminServiceClient();
    if (!service.ok) {
      return adminProblem(503, service.problem.code, service.problem.error);
    }

    const { data: existing, error: existingError } = await service.client
      .from("customer_reviews")
      .select(REVIEW_COLUMNS)
      .eq("id", id)
      .maybeSingle();

    if (existingError) {
      console.error("admin_review_lookup_failed");
      return adminProblem(
        503,
        "review_update_failed",
        "The review could not be updated.",
      );
    }
    if (!existing) {
      return adminProblem(404, "review_not_found", "Review not found.");
    }

    const current = existing as unknown as ReviewRow;
    if (
      status === "approved" &&
      (!current.consent_to_publish || !current.display_name?.trim())
    ) {
      return adminProblem(
        409,
        "review_not_publishable",
        "Approval requires publication consent and an approved display name.",
      );
    }

    const now = new Date().toISOString();
    const moderationFields =
      status === "pending"
        ? {
            moderated_by: null,
            moderated_at: null,
            published_at: null,
          }
        : {
            moderated_by: authorization.admin.userId,
            moderated_at: now,
            published_at: status === "approved" ? now : null,
          };

    const { data, error } = await service.client
      .from("customer_reviews")
      .update({
        status,
        ...moderationFields,
      })
      .eq("id", id)
      .select(REVIEW_COLUMNS)
      .maybeSingle();

    if (error) {
      console.error("admin_review_update_failed");
      return adminProblem(
        503,
        "review_update_failed",
        "The review status could not be updated.",
      );
    }
    if (!data) {
      return adminProblem(404, "review_not_found", "Review not found.");
    }

    return adminJson({
      review: reviewResponse(data as unknown as ReviewRow),
    });
  }

  return methodNotAllowed(["GET", "PATCH"]);
}

export const config: Config = {
  path: ["/api/admin/reviews", "/api/admin/reviews/:id"],
  method: ["GET", "PATCH"],
  rateLimit: {
    action: "rate_limit",
    aggregateBy: ["ip"],
    windowLimit: 180,
    windowSize: 60,
  },
};
