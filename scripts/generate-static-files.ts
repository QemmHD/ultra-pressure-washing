import { writeFile } from "node:fs/promises";
import { PUBLIC_ROUTES } from "../src/data/routes";
import { SITE } from "../src/data/site";

const sitemapRoutes = PUBLIC_ROUTES.filter((route) => route.sitemap);
const urls = sitemapRoutes
  .map((route) => {
    const canonical = `${SITE.domain}${route.path === "/" ? "" : route.path}`;
    return `  <url>\n    <loc>${canonical}</loc>\n  </url>`;
  })
  .join("\n");

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

const robots = `User-agent: *
Allow: /

Sitemap: ${SITE.domain}/sitemap.xml
`;

await Promise.all([
  writeFile("public/sitemap.xml", sitemap, "utf8"),
  writeFile("public/robots.txt", robots, "utf8"),
]);

console.log(
  `Generated sitemap.xml and robots.txt for ${sitemapRoutes.length} public routes.`,
);
