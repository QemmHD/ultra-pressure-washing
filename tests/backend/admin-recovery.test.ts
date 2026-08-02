import { describe, expect, test } from "bun:test";
import {
  getAdminRecoveryRedirectUrl,
  resolveAdminAuthFlowType,
} from "../../src/lib/admin-recovery";

const productionOrigin = "https://ultrapressurewashing.net";
const recoveryFragment =
  "#access_token=access-value&refresh_token=refresh-value&expires_in=3600&token_type=bearer&type=recovery";

describe("admin password recovery routing", () => {
  test("accepts a complete implicit recovery fragment only on /admin", () => {
    expect(
      resolveAdminAuthFlowType(
        `${productionOrigin}/admin${recoveryFragment}`,
      ),
    ).toBe("implicit");
  });

  test("keeps PKCE for normal admin visits and code callbacks", () => {
    expect(resolveAdminAuthFlowType(`${productionOrigin}/admin`)).toBe(
      "pkce",
    );
    expect(
      resolveAdminAuthFlowType(`${productionOrigin}/admin?code=pkce-code`),
    ).toBe("pkce");
  });

  test("does not accept incomplete or query-string token data", () => {
    expect(
      resolveAdminAuthFlowType(
        `${productionOrigin}/admin#access_token=access-value&type=recovery`,
      ),
    ).toBe("pkce");
    expect(
      resolveAdminAuthFlowType(
        `${productionOrigin}/admin?access_token=access-value&refresh_token=refresh-value&type=recovery`,
      ),
    ).toBe("pkce");
  });

  test("moves a production homepage recovery fragment to /admin unchanged", () => {
    expect(
      getAdminRecoveryRedirectUrl(
        `${productionOrigin}/${recoveryFragment}`,
        productionOrigin,
      ),
    ).toBe(`${productionOrigin}/admin${recoveryFragment}`);
  });

  test("does not redirect previews, ordinary pages, or /admin itself", () => {
    expect(
      getAdminRecoveryRedirectUrl(
        `https://preview.example/${recoveryFragment}`,
        productionOrigin,
      ),
    ).toBeNull();
    expect(
      getAdminRecoveryRedirectUrl(`${productionOrigin}/services`, productionOrigin),
    ).toBeNull();
    expect(
      getAdminRecoveryRedirectUrl(
        `${productionOrigin}/admin${recoveryFragment}`,
        productionOrigin,
      ),
    ).toBeNull();
  });
});
