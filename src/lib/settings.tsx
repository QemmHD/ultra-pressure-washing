import type { ReactNode } from "react";
import {
  SettingsContext,
  STATIC_SETTINGS_VALUE,
} from "./settings-context";

/**
 * Public Foundation uses source-controlled settings only. This deliberately
 * performs no runtime fetch so prerendered content and hydrated content match,
 * and local/preview builds cannot contact production settings.
 */
export function SettingsProvider({ children }: { children: ReactNode }) {
  return (
    <SettingsContext.Provider value={STATIC_SETTINGS_VALUE}>
      {children}
    </SettingsContext.Provider>
  );
}
