import { describe, expect, test } from "bun:test";
import { SITE } from "../../src/data/site";
import {
  resolveBackendRuntimeMode,
  STAGING_PREVIEW_ORIGIN,
  STAGING_SUPABASE_PROJECT_REF,
} from "../../src/lib/backend-runtime";

const PRODUCTION_SUPABASE_PROJECT_REF = "aqvwswyejzccozthisai";

function resolve(
  overrides: Partial<Parameters<typeof resolveBackendRuntimeMode>[0]> = {},
) {
  return resolveBackendRuntimeMode({
    isProductionBuild: true,
    currentOrigin: STAGING_PREVIEW_ORIGIN,
    stagingEnabled: "true",
    stagingPreviewOrigin: STAGING_PREVIEW_ORIGIN,
    supabaseProjectRef: STAGING_SUPABASE_PROJECT_REF,
    ...overrides,
  });
}

describe("browser backend runtime gate", () => {
  test("allows only the exact integrated staging origin and project", () => {
    expect(resolve()).toBe("staging");
    expect(
      resolve({
        currentOrigin:
          "https://deploy-preview-3--ultrapressurewashing.netlify.app",
      }),
    ).toBe("preview");
    expect(
      resolve({
        stagingPreviewOrigin:
          "https://deploy-preview-3--ultrapressurewashing.netlify.app",
      }),
    ).toBe("preview");
    expect(resolve({ stagingEnabled: "false" })).toBe("preview");
  });

  test("rejects the production Supabase project in staging", () => {
    expect(
      resolve({ supabaseProjectRef: PRODUCTION_SUPABASE_PROJECT_REF }),
    ).toBe("preview");
    expect(resolve({ supabaseProjectRef: "abcdefghijklmnopqrst" })).toBe(
      "preview",
    );
  });

  test("keeps local and ordinary preview builds non-sending", () => {
    expect(resolve({ isProductionBuild: false })).toBe("preview");
    expect(resolve({ stagingEnabled: undefined })).toBe("preview");
  });

  test("preserves the production-origin mode independently", () => {
    expect(
      resolve({
        currentOrigin: SITE.domain,
        stagingEnabled: undefined,
        stagingPreviewOrigin: undefined,
        supabaseProjectRef: PRODUCTION_SUPABASE_PROJECT_REF,
      }),
    ).toBe("production");
  });
});
