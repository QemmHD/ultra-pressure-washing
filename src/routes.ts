import {
  index,
  layout,
  route,
  type RouteConfig,
} from "@react-router/dev/routes";

export default [
  layout("components/Layout.tsx", [
    index("pages/Home.tsx"),
    route("services", "pages/Services.tsx"),
    route("before-after", "pages/BeforeAfter.tsx"),
    route("reviews", "pages/Reviews.tsx"),
    route("process", "pages/Process.tsx"),
    route("faq", "pages/FAQ.tsx"),
    route(
      "pressure-washing-sevierville",
      "routes/city-sevierville.tsx",
    ),
    route(
      "pressure-washing-pigeon-forge",
      "routes/city-pigeon-forge.tsx",
    ),
    route(
      "pressure-washing-gatlinburg",
      "routes/city-gatlinburg.tsx",
    ),
    route("privacy-policy", "pages/PrivacyPolicy.tsx"),
    route("terms-of-service", "pages/TermsOfService.tsx"),
    route("admin", "pages/Admin.tsx"),
    route("*", "pages/NotFound.tsx"),
  ]),
] satisfies RouteConfig;
