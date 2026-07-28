export const APPROVED_STAGING_SUPABASE_PROJECT_REF =
  "viqqtslzjvuuuncspjrt";

export type BackendRuntimeMode = "production" | "staging";

interface BackendRuntimeInput {
  stagingEnabled: boolean;
  deployContext: string;
  published: boolean;
  supabaseProjectRef: string;
}

/**
 * Production keeps its existing published-production requirement. Staging is
 * a separate, explicit mode restricted to the owner-approved Supabase project
 * and an unpublished Netlify deploy preview.
 */
export function resolveBackendRuntimeMode(
  input: BackendRuntimeInput,
): BackendRuntimeMode | null {
  if (input.stagingEnabled) {
    return input.deployContext === "deploy-preview" &&
        input.published === false &&
        input.supabaseProjectRef ===
          APPROVED_STAGING_SUPABASE_PROJECT_REF
      ? "staging"
      : null;
  }

  return input.deployContext === "production" && input.published
    ? "production"
    : null;
}
