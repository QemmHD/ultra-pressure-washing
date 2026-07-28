import type { MetaDescriptor } from "react-router";
import { SITE } from "./site";

export type RouteKind =
  | "home"
  | "commercial"
  | "location"
  | "utility"
  | "admin"
  | "not-found";

export interface SiteRoute {
  path: string;
  title: string;
  description: string;
  h1: string;
  primaryTopic: string;
  indexable: boolean;
  sitemap: boolean;
  kind: RouteKind;
  sourceFile: string;
  breadcrumb: string;
}

export const PUBLIC_ROUTES: readonly SiteRoute[] = [
  {
    path: "/",
    title: "Sevierville Pressure Washing—Ultra Pressure Washing",
    description:
      "Licensed and insured pressure washing and exterior cleaning in Sevierville and East Tennessee. Call, text, or request a quote anytime.",
    h1: SITE.motto,
    primaryTopic: "pressure washing Sevierville TN",
    indexable: true,
    sitemap: true,
    kind: "home",
    sourceFile: "src/pages/Home.tsx",
    breadcrumb: "Home",
  },
  {
    path: "/services",
    title: "Exterior Cleaning Services | Ultra Pressure Washing",
    description:
      "Explore pressure washing, soft washing, roof, concrete, window, gutter, deck, patio, fence, and commercial exterior cleaning services.",
    h1: "Pressure Washing & Exterior Cleaning Services",
    primaryTopic: "pressure washing and exterior cleaning services",
    indexable: true,
    sitemap: true,
    kind: "commercial",
    sourceFile: "src/pages/Services.tsx",
    breadcrumb: "Services",
  },
  {
    path: "/before-after",
    title: "Pressure Washing Before & After | Ultra Pressure Washing",
    description:
      "Explore real before-and-after photographs from exterior cleaning projects completed by Ultra Pressure Washing across East Tennessee.",
    h1: "Pressure Washing Before & After Gallery",
    primaryTopic: "pressure washing before and after gallery",
    indexable: true,
    sitemap: true,
    kind: "commercial",
    sourceFile: "src/pages/BeforeAfter.tsx",
    breadcrumb: "Before & After",
  },
  {
    path: "/reviews",
    title: "Customer Review Information | Ultra Pressure Washing",
    description:
      "Ultra publishes customer feedback only after it is verified and approved. No approved reviews or Google rating are currently available.",
    h1: "Customer Reviews",
    primaryTopic: "Ultra Pressure Washing customer reviews",
    indexable: true,
    sitemap: true,
    kind: "commercial",
    sourceFile: "src/pages/Reviews.tsx",
    breadcrumb: "Reviews",
  },
  {
    path: "/process",
    title: "Our Pressure Washing Process | Ultra Pressure Washing",
    description:
      "Learn how to request a quote, share property details, review the scope, schedule service, and prepare for exterior cleaning.",
    h1: "Our Pressure Washing Process",
    primaryTopic: "pressure washing process",
    indexable: true,
    sitemap: true,
    kind: "commercial",
    sourceFile: "src/pages/Process.tsx",
    breadcrumb: "Process",
  },
  {
    path: "/faq",
    title: "Pressure Washing FAQ | Ultra Pressure Washing East Tennessee",
    description:
      "Straightforward answers about exterior cleaning, quotes, preparation, service areas, payment methods, and cleaning expectations.",
    h1: "Pressure Washing Frequently Asked Questions",
    primaryTopic: "pressure washing frequently asked questions",
    indexable: true,
    sitemap: true,
    kind: "commercial",
    sourceFile: "src/pages/FAQ.tsx",
    breadcrumb: "FAQ",
  },
  {
    path: "/pressure-washing-sevierville",
    title: "Sevierville Exterior Cleaning | Ultra Pressure Washing",
    description:
      "Pressure washing and exterior cleaning in Sevierville, Tennessee, from a locally owned, owner-operated, licensed and insured business.",
    h1: "Pressure Washing in Sevierville, TN",
    primaryTopic: "pressure washing Sevierville TN",
    indexable: true,
    sitemap: true,
    kind: "location",
    sourceFile: "src/routes/city-sevierville.tsx",
    breadcrumb: "Sevierville",
  },
  {
    path: "/pressure-washing-pigeon-forge",
    title: "Pigeon Forge Pressure Washing | Ultra Pressure Washing",
    description:
      "Request pressure washing and exterior cleaning for homes, cabins, rentals, and commercial exteriors in Pigeon Forge, Tennessee.",
    h1: "Pressure Washing in Pigeon Forge, TN",
    primaryTopic: "pressure washing Pigeon Forge TN",
    indexable: true,
    sitemap: true,
    kind: "location",
    sourceFile: "src/routes/city-pigeon-forge.tsx",
    breadcrumb: "Pigeon Forge",
  },
  {
    path: "/pressure-washing-gatlinburg",
    title: "Gatlinburg Pressure Washing TN | Ultra Pressure Washing",
    description:
      "Request pressure washing and exterior cleaning for homes, cabins, rentals, and commercial exteriors in Gatlinburg, Tennessee.",
    h1: "Pressure Washing in Gatlinburg, TN",
    primaryTopic: "pressure washing Gatlinburg TN",
    indexable: true,
    sitemap: true,
    kind: "location",
    sourceFile: "src/routes/city-gatlinburg.tsx",
    breadcrumb: "Gatlinburg",
  },
  {
    path: "/privacy-policy",
    title: "Website Privacy Policy | Ultra Pressure Washing",
    description:
      "Read the privacy policy for Ultra Pressure Washing & Window Cleaning and learn how to contact the business with questions.",
    h1: "Privacy Policy",
    primaryTopic: "privacy policy",
    indexable: true,
    sitemap: true,
    kind: "utility",
    sourceFile: "src/pages/PrivacyPolicy.tsx",
    breadcrumb: "Privacy Policy",
  },
  {
    path: "/terms-of-service",
    title: "Terms of Service | Ultra Pressure Washing",
    description:
      "Read the website and service terms for Ultra Pressure Washing & Window Cleaning, a Sevierville-based exterior cleaning business.",
    h1: "Terms of Service",
    primaryTopic: "terms of service",
    indexable: true,
    sitemap: true,
    kind: "utility",
    sourceFile: "src/pages/TermsOfService.tsx",
    breadcrumb: "Terms of Service",
  },
] as const;

export const ADMIN_ROUTE: SiteRoute = {
  path: "/admin",
  title: "Secure Admin | Ultra Pressure Washing",
  description:
    "Protected administrative access for Ultra Pressure Washing.",
  h1: "Admin Dashboard",
  primaryTopic: "administration",
  indexable: false,
  sitemap: false,
  kind: "admin",
  sourceFile: "src/pages/Admin.tsx",
  breadcrumb: "Admin",
};

export const NOT_FOUND_ROUTE: SiteRoute = {
  path: "/404",
  title: "Page Not Found | Ultra Pressure Washing",
  description: "The requested page could not be found.",
  h1: "Page Not Found",
  primaryTopic: "page not found",
  indexable: false,
  sitemap: false,
  kind: "not-found",
  sourceFile: "src/pages/NotFound.tsx",
  breadcrumb: "Page Not Found",
};

export const ALL_ROUTES = [
  ...PUBLIC_ROUTES,
  ADMIN_ROUTE,
  NOT_FOUND_ROUTE,
] as const;

export const PRIMARY_NAVIGATION = [
  { name: "Services", href: "/services" },
  { name: "Gallery", href: "/before-after" },
  { name: "Reviews", href: "/reviews" },
  { name: "Process", href: "/process" },
  { name: "FAQ", href: "/faq" },
] as const;

export const ROUTE_BY_PATH = new Map(
  ALL_ROUTES.map((route) => [route.path, route]),
);

export const PRERENDER_PATHS = ALL_ROUTES.map((route) => route.path);

export function getRoute(path: string): SiteRoute {
  return ROUTE_BY_PATH.get(path) ?? NOT_FOUND_ROUTE;
}

export function createRouteMeta(route: SiteRoute): MetaDescriptor[] {
  const canonical = `${SITE.domain}${route.path === "/" ? "" : route.path}`;
  const image = `${SITE.domain}/hero-bg.jpg`;
  const robots = route.indexable ? "index, follow" : "noindex, nofollow";

  return [
    { title: route.title },
    { name: "description", content: route.description },
    { name: "robots", content: robots },
    { tagName: "link", rel: "canonical", href: canonical },
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: SITE.name },
    { property: "og:title", content: route.title },
    { property: "og:description", content: route.description },
    { property: "og:url", content: canonical },
    { property: "og:image", content: image },
    {
      property: "og:image:alt",
      content: "Ultra Pressure Washing & Window Cleaning",
    },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: route.title },
    { name: "twitter:description", content: route.description },
    { name: "twitter:image", content: image },
    {
      name: "twitter:image:alt",
      content: "Ultra Pressure Washing & Window Cleaning",
    },
  ];
}
