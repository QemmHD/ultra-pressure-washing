import { SERVICE_LIST_TEXT } from "./services";

export type LocationSlug = "sevierville" | "pigeon-forge" | "gatlinburg";

export interface LocationPage {
  slug: LocationSlug;
  city: string;
  state: "Tennessee";
  shortLocation: string;
  path: string;
  eyebrow: string;
  introduction: string;
  detail: string;
  projectIds: string[];
}

export const LOCATION_PAGES: readonly LocationPage[] = [
  {
    slug: "sevierville",
    city: "Sevierville",
    state: "Tennessee",
    shortLocation: "Sevierville, TN",
    path: "/pressure-washing-sevierville",
    eyebrow: "Based in Sevierville",
    introduction:
      "Ultra Pressure Washing & Window Cleaning provides pressure washing and exterior cleaning for homes, rental properties, and businesses in Sevierville.",
    detail:
      `Choose from ${SERVICE_LIST_TEXT}. Quotes are based on the property information you share, and photographs or an in-person evaluation may be requested when needed.`,
    projectIds: [
      "sevierville-patio-wash",
      "sevierville-house-soft-wash",
    ],
  },
  {
    slug: "pigeon-forge",
    city: "Pigeon Forge",
    state: "Tennessee",
    shortLocation: "Pigeon Forge, TN",
    path: "/pressure-washing-pigeon-forge",
    eyebrow: "Serving Pigeon Forge",
    introduction:
      "Ultra Pressure Washing & Window Cleaning serves Pigeon Forge with exterior cleaning for homes, cabins, rental properties, and commercial exteriors.",
    detail:
      `Available work includes ${SERVICE_LIST_TEXT}. Tell us about the property and the surfaces you want cleaned so we can prepare the next step in your quote.`,
    projectIds: [],
  },
  {
    slug: "gatlinburg",
    city: "Gatlinburg",
    state: "Tennessee",
    shortLocation: "Gatlinburg, TN",
    path: "/pressure-washing-gatlinburg",
    eyebrow: "Serving Gatlinburg",
    introduction:
      "Ultra Pressure Washing & Window Cleaning provides exterior cleaning for Gatlinburg homes, cabins, rental properties, and commercial exteriors.",
    detail:
      `Services include ${SERVICE_LIST_TEXT}. Access, surface condition, and the requested scope are reviewed as part of the quote process.`,
    projectIds: [],
  },
] as const;

export const LOCATION_BY_SLUG = new Map(
  LOCATION_PAGES.map((location) => [location.slug, location]),
);

export const SERVICE_AREAS = [
  { label: "Sevier County", path: undefined },
  { label: "Sevierville", path: "/pressure-washing-sevierville" },
  { label: "Pigeon Forge", path: "/pressure-washing-pigeon-forge" },
  { label: "Gatlinburg", path: "/pressure-washing-gatlinburg" },
  { label: "Kodak", path: undefined },
  { label: "Dandridge", path: undefined },
  { label: "Knox County", path: undefined },
  { label: "Seymour", path: undefined },
  { label: "Wears Valley", path: undefined },
] as const;
