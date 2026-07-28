import { SITE } from "../data/site";

export type BackendRuntimeMode = "preview" | "staging" | "production";

export const STAGING_SUPABASE_PROJECT_REF = "viqqtslzjvuuuncspjrt";
export const STAGING_PREVIEW_ORIGIN =
  "https://deploy-preview-2--ultrapressurewashing.netlify.app";

interface BackendRuntimeInput {
  isProductionBuild: boolean;
  currentOrigin: string;
  stagingEnabled?: string;
  stagingPreviewOrigin?: string;
  supabaseProjectRef?: string;
}

/**
 * Resolves the browser's backend destination without trusting deploy-preview
 * environment values on their own.
 *
 * The integrated staging rehearsal is pinned in source control to one preview
 * origin and one isolated Supabase project. Any other preview, origin, or
 * project ref fails closed to the non-sending preview mode.
 */
export function resolveBackendRuntimeMode({
  isProductionBuild,
  currentOrigin,
  stagingEnabled,
  stagingPreviewOrigin,
  supabaseProjectRef,
}: BackendRuntimeInput): BackendRuntimeMode {
  if (!isProductionBuild) return "preview";

  if (currentOrigin === SITE.domain) {
    return "production";
  }

  const normalizedProjectRef =
    supabaseProjectRef?.trim().toLowerCase() ?? "";

  if (
    stagingEnabled === "true" &&
    currentOrigin === STAGING_PREVIEW_ORIGIN &&
    stagingPreviewOrigin === STAGING_PREVIEW_ORIGIN &&
    normalizedProjectRef === STAGING_SUPABASE_PROJECT_REF
  ) {
    return "staging";
  }

  return "preview";
}

export function getBrowserBackendRuntimeMode(): BackendRuntimeMode {
  if (typeof window === "undefined") return "preview";

  const productionFlag: unknown = import.meta.env.PROD;

  return resolveBackendRuntimeMode({
    isProductionBuild:
      productionFlag === true || productionFlag === "true",
    currentOrigin: window.location.origin,
    stagingEnabled: import.meta.env.VITE_STAGING_BACKEND_ENABLED,
    stagingPreviewOrigin: import.meta.env.VITE_STAGING_PREVIEW_ORIGIN,
    supabaseProjectRef: import.meta.env.VITE_SUPABASE_PROJECT_REF,
  });
}
