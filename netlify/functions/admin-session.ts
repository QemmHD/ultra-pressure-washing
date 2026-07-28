import type { Config, Context } from "@netlify/functions";
import { authorizeAdmin } from "./_shared/admin-auth";
import {
  adminJson,
  enforceProductionAdminContext,
  methodNotAllowed,
} from "./_shared/admin-runtime";

export default async function adminSession(
  request: Request,
  context: Context,
): Promise<Response> {
  const contextFailure = enforceProductionAdminContext(request, context);
  if (contextFailure) return contextFailure;
  if (request.method !== "GET") return methodNotAllowed(["GET"]);

  const authorization = await authorizeAdmin(request);
  if (!authorization.ok) return authorization.response;

  const { admin } = authorization;
  return adminJson({
    userId: admin.userId,
    email: admin.email,
    role: admin.role,
    aal: admin.aal,
    mfaRequired: admin.mfaRequired,
  });
}

export const config: Config = {
  path: "/api/admin/session",
  method: ["GET"],
  rateLimit: {
    action: "rate_limit",
    aggregateBy: ["ip"],
    windowLimit: 120,
    windowSize: 60,
  },
};
