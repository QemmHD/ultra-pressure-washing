import { SITE } from "../data/site";
import type { SiteRoute } from "../data/routes";

interface StructuredDataProps {
  route: SiteRoute;
  includeBreadcrumb?: boolean;
}

export default function StructuredData({
  route,
  includeBreadcrumb = route.path !== "/",
}: StructuredDataProps) {
  if (!route.indexable) return null;

  const canonical = `${SITE.domain}${route.path === "/" ? "" : route.path}`;
  const graph: Record<string, unknown>[] = [
    {
      "@type": "Organization",
      "@id": `${SITE.domain}/#organization`,
      name: SITE.name,
      url: SITE.domain,
      logo: `${SITE.domain}/logo-icon-512.png`,
      telephone: SITE.phone,
      email: SITE.email,
      sameAs: Object.values(SITE.social),
    },
    {
      "@type": "WebSite",
      "@id": `${SITE.domain}/#website`,
      url: SITE.domain,
      name: SITE.name,
      publisher: { "@id": `${SITE.domain}/#organization` },
    },
    {
      "@type": "WebPage",
      "@id": `${canonical}#webpage`,
      url: canonical,
      name: route.title,
      description: route.description,
      isPartOf: { "@id": `${SITE.domain}/#website` },
      about: { "@id": `${SITE.domain}/#organization` },
    },
  ];

  if (includeBreadcrumb) {
    graph.push({
      "@type": "BreadcrumbList",
      "@id": `${canonical}#breadcrumb`,
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: SITE.domain,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: route.breadcrumb,
          item: canonical,
        },
      ],
    });
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": graph,
        }),
      }}
    />
  );
}
