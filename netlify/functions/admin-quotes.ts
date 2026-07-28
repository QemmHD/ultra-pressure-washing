import type { Config, Context } from "@netlify/functions";
import { authorizeAdmin, createAdminServiceClient } from "./_shared/admin-auth";
import {
  adminJson,
  adminProblem,
  enforceProductionAdminContext,
  methodNotAllowed,
  readBoundedAdminJson,
} from "./_shared/admin-runtime";

const QUOTE_COLUMNS = [
  "id",
  "first_name",
  "last_name",
  "phone",
  "email",
  "property_address",
  "service_ids",
  "contact_preference",
  "status",
  "created_at",
  "updated_at",
].join(",");

const QUOTE_STATUSES = new Set([
  "new",
  "contacted",
  "scheduled",
  "completed",
  "archived",
  "spam",
]);

interface QuoteRow {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string | null;
  property_address: string;
  service_ids: string[] | null;
  contact_preference: "call" | "text";
  status: string;
  created_at: string;
  updated_at: string;
}

function quoteResponse(row: QuoteRow) {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone,
    email: row.email,
    propertyAddress: row.property_address,
    serviceIds: row.service_ids ?? [],
    contactPreference: row.contact_preference,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function quoteIdFromPath(request: Request): string | null {
  const match = new URL(request.url).pathname.match(
    /^\/api\/admin\/quotes\/([0-9a-f-]+)$/i,
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
    !QUOTE_STATUSES.has(body.status)
  ) {
    return null;
  }

  return body.status;
}

export default async function adminQuotes(
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
      .from("quote_requests")
      .select(QUOTE_COLUMNS)
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      console.error("admin_quote_list_failed");
      return adminProblem(
        503,
        "quote_list_unavailable",
        "Quote requests could not be loaded.",
      );
    }

    return adminJson({
      quotes: ((data ?? []) as unknown as QuoteRow[]).map(quoteResponse),
    });
  }

  if (request.method === "PATCH") {
    const authorization = await authorizeAdmin(request, {
      requireAal2: true,
      requireWrite: true,
    });
    if (!authorization.ok) return authorization.response;

    const id = quoteIdFromPath(request);
    if (!id) {
      return adminProblem(400, "invalid_quote_id", "The quote ID is invalid.");
    }

    const status = await parseStatus(request);
    if (!status) {
      return adminProblem(
        400,
        "invalid_quote_status",
        "Choose a valid quote status.",
      );
    }

    const service = createAdminServiceClient();
    if (!service.ok) {
      return adminProblem(503, service.problem.code, service.problem.error);
    }

    const { data, error } = await service.client
      .from("quote_requests")
      .update({ status })
      .eq("id", id)
      .select(QUOTE_COLUMNS)
      .maybeSingle();

    if (error) {
      console.error("admin_quote_update_failed");
      return adminProblem(
        503,
        "quote_update_failed",
        "The quote status could not be updated.",
      );
    }
    if (!data) {
      return adminProblem(404, "quote_not_found", "Quote request not found.");
    }

    return adminJson({ quote: quoteResponse(data as unknown as QuoteRow) });
  }

  return methodNotAllowed(["GET", "PATCH"]);
}

export const config: Config = {
  path: ["/api/admin/quotes", "/api/admin/quotes/:id"],
  method: ["GET", "PATCH"],
  rateLimit: {
    action: "rate_limit",
    aggregateBy: ["ip"],
    windowLimit: 180,
    windowSize: 60,
  },
};
