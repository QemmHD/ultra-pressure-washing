const SUPABASE_PROJECT_REF_PATTERN = /^[a-z0-9]{20}$/;

export function getSupabaseProjectUrl(
  projectRef: string | undefined,
): string {
  const normalizedRef = projectRef?.trim().toLowerCase() ?? "";
  if (!SUPABASE_PROJECT_REF_PATTERN.test(normalizedRef)) return "";
  return `https://${normalizedRef}.supabase.co`;
}

export function isAllowedSupabaseProjectUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const projectRef = url.hostname.split(".", 1)[0] ?? "";
    return (
      url.protocol === "https:" &&
      url.port === "" &&
      url.username === "" &&
      url.password === "" &&
      url.hostname === `${projectRef}.supabase.co` &&
      SUPABASE_PROJECT_REF_PATTERN.test(projectRef) &&
      url.pathname === "/" &&
      url.search === "" &&
      url.hash === ""
    );
  } catch {
    return false;
  }
}
