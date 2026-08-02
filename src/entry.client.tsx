import { startTransition, StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { HydratedRouter } from "react-router/dom";
import { SITE } from "./data/site";
import { getAdminRecoveryRedirectUrl } from "./lib/admin-recovery";

const recoveryRedirect = getAdminRecoveryRedirectUrl(
  window.location.href,
  SITE.domain,
);

if (recoveryRedirect) {
  window.location.replace(recoveryRedirect);
} else {
  startTransition(() => {
    hydrateRoot(
      document,
      <StrictMode>
        <HydratedRouter />
      </StrictMode>,
    );
  });
}
