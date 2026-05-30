import { useEffect, useState, ReactNode } from "react";
import { fetchSettings, SiteSettings } from "./api";
import { DEFAULTS, SettingsContext, buildValue } from "./settings-context";

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULTS);

  useEffect(() => {
    let active = true;
    fetchSettings().then((s) => {
      if (active) setSettings(s);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <SettingsContext.Provider value={buildValue(settings)}>
      {children}
    </SettingsContext.Provider>
  );
}
