import { createContext, useContext } from "react";
import { SiteSettings, DEFAULT_SETTINGS } from "./api";

// Default business info — used for the very first render before the live
// settings load, and as a fallback if the fetch fails.
export const DEFAULTS: SiteSettings = DEFAULT_SETTINGS;

export interface SettingsContextValue {
  settings: SiteSettings;
  /** Display phone, e.g. "(865) 236-9240" */
  phone: string;
  /** Ready-to-use tel: href derived from the phone digits */
  telHref: string;
  /** Ready-to-use sms: href derived from the phone digits */
  smsHref: string;
  /** Display + mailto email */
  email: string;
  mailtoHref: string;
}

export function buildValue(settings: SiteSettings): SettingsContextValue {
  const phone = settings.contactPhone || DEFAULTS.contactPhone;
  const email = settings.contactEmail || DEFAULTS.contactEmail;
  const digits = phone.replace(/[^\d+]/g, "");
  return {
    settings,
    phone,
    telHref: `tel:${digits}`,
    smsHref: `sms:${digits}`,
    email,
    mailtoHref: `mailto:${email}`,
  };
}

export const SettingsContext = createContext<SettingsContextValue | null>(null);

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    // Allows components to render outside the provider (e.g. tests) with defaults.
    return buildValue(DEFAULTS);
  }
  return ctx;
}
