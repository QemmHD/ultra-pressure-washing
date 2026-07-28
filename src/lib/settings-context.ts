import { createContext, useContext } from "react";
import { SITE, SITE_LINKS } from "../data/site";

export interface SiteSettings {
  heroHeadlineLine1: string;
  heroHeadlineLine2: string;
  heroSubtext: string;
  offerEnabled: boolean;
  offerText: string;
  contactPhone: string;
  contactEmail: string;
  hiddenServices: string[];
}
export const DEFAULTS: SiteSettings = {
  heroHeadlineLine1: SITE.mottoLines[0],
  heroHeadlineLine2: SITE.mottoLines[1],
  heroSubtext: SITE.heroSupportingLine,
  offerEnabled: true,
  offerText: SITE.offer,
  contactPhone: SITE.phone,
  contactEmail: SITE.email,
  hiddenServices: [],
};

export interface SettingsContextValue {
  settings: SiteSettings;
  phone: string;
  telHref: string;
  smsHref: string;
  email: string;
  mailtoHref: string;
}

export const STATIC_SETTINGS_VALUE: SettingsContextValue = {
  settings: DEFAULTS,
  phone: SITE.phone,
  telHref: SITE_LINKS.phone,
  smsHref: SITE_LINKS.text,
  email: SITE.email,
  mailtoHref: SITE_LINKS.email,
};

export const SettingsContext =
  createContext<SettingsContextValue>(STATIC_SETTINGS_VALUE);

export function useSettings(): SettingsContextValue {
  return useContext(SettingsContext);
}
