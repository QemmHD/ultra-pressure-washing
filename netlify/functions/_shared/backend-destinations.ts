export {
  getSupabaseProjectUrl,
  isAllowedSupabaseProjectUrl,
} from "../../../src/lib/supabase-project";

export const NTFY_API_ORIGIN = "https://ntfy.sh";

export function isAllowedNtfyApiUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.origin === NTFY_API_ORIGIN &&
      url.pathname === "/" &&
      url.search === "" &&
      url.hash === ""
    );
  } catch {
    return false;
  }
}
