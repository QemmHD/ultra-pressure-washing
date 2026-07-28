import { describe, expect, test } from "bun:test";
import {
  isAllowedNtfyApiUrl,
  NTFY_API_ORIGIN,
} from "../../netlify/functions/_shared/backend-destinations";
import {
  getSupabaseProjectUrl,
  isAllowedSupabaseProjectUrl,
} from "../../src/lib/supabase-project";

describe("server destination allowlists", () => {
  test("constructs an official Supabase URL only from a valid project ref", () => {
    expect(getSupabaseProjectUrl("abcdefghijklmnopqrst")).toBe(
      "https://abcdefghijklmnopqrst.supabase.co",
    );
    expect(getSupabaseProjectUrl("ABCDEFGHIJKLMNOPQRST")).toBe(
      "https://abcdefghijklmnopqrst.supabase.co",
    );
    expect(getSupabaseProjectUrl("too-short")).toBe("");
    expect(getSupabaseProjectUrl("abcdefghijklmnopqr.s")).toBe("");
  });

  test("rejects lookalike, credentialed, port, and path Supabase URLs", () => {
    expect(
      isAllowedSupabaseProjectUrl(
        "https://abcdefghijklmnopqrst.supabase.co",
      ),
    ).toBe(true);
    expect(
      isAllowedSupabaseProjectUrl(
        "https://abcdefghijklmnopqrst.supabase.co.attacker.test",
      ),
    ).toBe(false);
    expect(
      isAllowedSupabaseProjectUrl(
        "https://user:password@abcdefghijklmnopqrst.supabase.co",
      ),
    ).toBe(false);
    expect(
      isAllowedSupabaseProjectUrl(
        "https://abcdefghijklmnopqrst.supabase.co:8443",
      ),
    ).toBe(false);
    expect(
      isAllowedSupabaseProjectUrl(
        "https://abcdefghijklmnopqrst.supabase.co/rest",
      ),
    ).toBe(false);
  });

  test("pins ntfy delivery to the exact official API origin", () => {
    expect(NTFY_API_ORIGIN).toBe("https://ntfy.sh");
    expect(isAllowedNtfyApiUrl("https://ntfy.sh")).toBe(true);
    expect(isAllowedNtfyApiUrl("https://ntfy.sh/")).toBe(true);
    expect(isAllowedNtfyApiUrl("https://ntfy.sh.attacker.test")).toBe(false);
    expect(isAllowedNtfyApiUrl("https://ntfy.sh/topic")).toBe(false);
    expect(isAllowedNtfyApiUrl("http://ntfy.sh")).toBe(false);
  });
});
