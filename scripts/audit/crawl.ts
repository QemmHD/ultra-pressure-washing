import { createHash } from "node:crypto";
import {
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import path from "node:path";
import * as cheerio from "cheerio";
import { PUBLIC_ROUTES } from "../../src/data/routes";
import {
  AUDITED_ROUTES,
  BUILD_ROOT,
  localAuditUrl,
  markdownCell,
  normalizeWhitespace,
  resolveRunDir,
  routeHtmlFile,
  writeJson,
  writeText,
} from "./common";
import { withStaticAuditServer } from "./static-server";

type Severity = "warning" | "failure";

interface CrawlFinding {
  severity: Severity;
  category: "seo" | "performance" | "accessibility" | "security" | "conversion";
  check: string;
  route: string;
  evidence: string;
  recommendation: string;
}

interface LinkRecord {
  source: string;
  href: string;
  targetPath?: string;
  targetKind: "internal" | "external" | "contact" | "fragment";
  status?: number;
  fragmentExists?: boolean;
}

interface RouteCrawlResult {
  path: string;
  status: number;
  internalLinks: number;
  externalLinks: number;
  contactLinks: number;
  imageCount: number;
  scriptCount: number;
  stylesheetCount: number;
  requestCount: number;
  htmlBytes: number;
  findings: CrawlFinding[];
}

const forbiddenBundlePatterns: ReadonlyArray<{
  label: string;
  pattern: RegExp;
}> = [
  { label: "Vite admin password", pattern: /VITE_ADMIN_PASSWORD/i },
  { label: "Supabase service-role secret", pattern: /service[_-]?role/i },
  { label: "Supabase REST endpoint", pattern: /https:\/\/[^"' ]+\.supabase\.co\/rest/i },
  { label: "ntfy endpoint", pattern: /https:\/\/ntfy\.sh\//i },
  { label: "Chariot API endpoint", pattern: /https:\/\/[^"' ]*chariot[^"' ]*\/api/i },
];

function addFinding(
  findings: CrawlFinding[],
  severity: Severity,
  category: CrawlFinding["category"],
  check: string,
  route: string,
  evidence: string,
  recommendation: string,
): void {
  findings.push({
    severity,
    category,
    check,
    route,
    evidence,
    recommendation,
  });
}

function listFiles(directory: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...listFiles(filePath));
    else if (entry.isFile()) files.push(filePath);
  }
  return files;
}

function extractSrcsetUrls(srcset: string): string[] {
  return srcset
    .split(",")
    .map((candidate) => candidate.trim().split(/\s+/)[0] ?? "")
    .filter(Boolean);
}

function asInternalPath(rawUrl: string, baseUrl: string): string | undefined {
  try {
    const resolved = new URL(rawUrl, `${baseUrl}/`);
    if (
      resolved.hostname === "127.0.0.1" ||
      resolved.hostname === "localhost" ||
      resolved.hostname === "ultrapressurewashing.net" ||
      resolved.hostname === "www.ultrapressurewashing.net"
    ) {
      return `${resolved.pathname}${resolved.search}${resolved.hash}`;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

function getDocumentForPath(routePath: string): cheerio.CheerioAPI | undefined {
  const cleanPath = routePath.split(/[?#]/)[0] || "/";
  const filePath = routeHtmlFile(cleanPath);
  try {
    return cheerio.load(readFileSync(filePath, "utf8"));
  } catch {
    return undefined;
  }
}

function hasFragment(routePath: string): boolean {
  const parsed = new URL(routePath, "https://ultrapressurewashing.net");
  if (!parsed.hash) return true;
  const $ = getDocumentForPath(parsed.pathname);
  if (!$) return false;
  const id = decodeURIComponent(parsed.hash.slice(1));
  return $(`[id="${id.replace(/"/g, '\\"')}"]`).length > 0;
}

async function inspectRoute(
  baseUrl: string,
  routePath: string,
  links: LinkRecord[],
): Promise<RouteCrawlResult> {
  const findings: CrawlFinding[] = [];
  const response = await fetch(localAuditUrl(baseUrl, routePath), {
    redirect: "manual",
  });
  const html = await response.text();
  const $ = cheerio.load(html);
  const htmlBytes = Buffer.byteLength(html);
  const resources = new Set<string>();

  $(
    "script[src], link[rel='stylesheet'][href], link[rel='modulepreload'][href], link[rel='preload'][href], link[rel='icon'][href], link[rel='apple-touch-icon'][href], link[rel='manifest'][href], img[src], source[src], iframe[src]",
  ).each(
    (_, element) => {
      const resource =
        $(element).attr("src") ?? $(element).attr("href") ?? "";
      if (resource) resources.add(resource);
    },
  );
  $("img[srcset], source[srcset]").each((_, element) => {
    for (const resource of extractSrcsetUrls(
      $(element).attr("srcset") ?? "",
    )) {
      resources.add(resource);
    }
  });

  for (const resource of resources) {
    const internalPath = asInternalPath(resource, baseUrl);
    if (!internalPath) continue;
    const resourceResponse = await fetch(
      localAuditUrl(baseUrl, internalPath.split("#")[0]!),
      {
        method: "HEAD",
        redirect: "manual",
      },
    );
    if (resourceResponse.status >= 400) {
      addFinding(
        findings,
        "failure",
        /\.(?:avif|gif|jpe?g|png|svg|webp)(?:[?#]|$)/i.test(resource)
          ? "accessibility"
          : "performance",
        "Broken local resource",
        routePath,
        `${resource} returned HTTP ${resourceResponse.status}.`,
        "Restore the referenced build asset or remove the stale reference.",
      );
    }
  }

  const routeLinks: LinkRecord[] = [];
  $("a[href]").each((_, element) => {
    const href = ($(element).attr("href") ?? "").trim();
    if (!href) return;
    if (/^(?:tel|sms|mailto):/i.test(href)) {
      routeLinks.push({
        source: routePath,
        href,
        targetKind: "contact",
      });
      return;
    }
    if (href.startsWith("#")) {
      routeLinks.push({
        source: routePath,
        href,
        targetPath: `${routePath}${href}`,
        targetKind: "fragment",
        fragmentExists: hasFragment(`${routePath}${href}`),
      });
      return;
    }
    const internalPath = asInternalPath(href, baseUrl);
    if (internalPath) {
      routeLinks.push({
        source: routePath,
        href,
        targetPath: internalPath,
        targetKind: "internal",
      });
      return;
    }
    if (/^https?:\/\//i.test(href)) {
      routeLinks.push({
        source: routePath,
        href,
        targetKind: "external",
      });
      if ($(element).attr("target") === "_blank") {
        const rel = ($(element).attr("rel") ?? "")
          .toLowerCase()
          .split(/\s+/);
        if (!rel.includes("noopener") || !rel.includes("noreferrer")) {
          addFinding(
            findings,
            "failure",
            "security",
            "External-link isolation",
            routePath,
            `${href} opens a new tab without both noopener and noreferrer.`,
            "Add rel=\"noopener noreferrer\".",
          );
        }
      }
    }
  });
  links.push(...routeLinks);

  for (const link of routeLinks) {
    if (
      link.targetKind === "fragment" &&
      link.fragmentExists === false
    ) {
      addFinding(
        findings,
        "failure",
        "seo",
        "Broken fragment",
        routePath,
        `${link.href} does not match an element ID on the page.`,
        "Point the link to a real, unique element ID.",
      );
    }
  }

  $("form").each((_, element) => {
    const action = ($(element).attr("action") ?? "").trim();
    if (action && /^https?:\/\//i.test(action)) {
      addFinding(
        findings,
        "failure",
        "security",
        "External form target",
        routePath,
        `Form action points to ${action}.`,
        "Keep Public Foundation forms non-sending.",
      );
    }
  });

  const insecureResourceReferences: string[] = [];
  $("[src], [href], [action], [poster], [srcset]").each((_, element) => {
    for (const attribute of ["src", "href", "action", "poster", "srcset"]) {
      const value = ($(element).attr(attribute) ?? "").trim();
      if (!value) continue;
      const candidates =
        attribute === "srcset"
          ? value.split(",").map((candidate) => candidate.trim().split(/\s+/)[0] ?? "")
          : [value];
      for (const candidate of candidates) {
        if (/^http:\/\//i.test(candidate) && !candidate.startsWith(baseUrl)) {
          insecureResourceReferences.push(`${attribute}=${candidate}`);
        }
      }
    }
  });
  if (insecureResourceReferences.length > 0) {
    addFinding(
      findings,
      "failure",
      "security",
      "Mixed content",
      routePath,
      `Found ${insecureResourceReferences.length} insecure resource reference(s).`,
      "Use HTTPS for all public external resources.",
    );
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html")) {
    addFinding(
      findings,
      "failure",
      "security",
      "Content type",
      routePath,
      `Received "${contentType || "(missing)"}" for an HTML route.`,
      "Serve HTML documents with text/html.",
    );
  }
  if (
    response.headers.get("x-content-type-options")?.toLowerCase() !== "nosniff"
  ) {
    addFinding(
      findings,
      "warning",
      "security",
      "Content-type protection",
      routePath,
      "X-Content-Type-Options is not present in the local static response.",
      "Apply nosniff in the later approved Netlify configuration.",
    );
  }

  return {
    path: routePath,
    status: response.status,
    internalLinks: routeLinks.filter(
      (link) =>
        link.targetKind === "internal" || link.targetKind === "fragment",
    ).length,
    externalLinks: routeLinks.filter(
      (link) => link.targetKind === "external",
    ).length,
    contactLinks: routeLinks.filter(
      (link) => link.targetKind === "contact",
    ).length,
    imageCount: $("img").length,
    scriptCount: $("script[src], script[type='module']").length,
    stylesheetCount: $("link[rel='stylesheet']").length,
    requestCount: resources.size + 1,
    htmlBytes,
    findings,
  };
}

async function resolveInternalLinks(
  baseUrl: string,
  links: LinkRecord[],
  findings: CrawlFinding[],
): Promise<void> {
  const targets = new Map<string, LinkRecord[]>();
  for (const link of links) {
    if (link.targetKind !== "internal" || !link.targetPath) continue;
    const target = link.targetPath.split("#")[0]!;
    const records = targets.get(target) ?? [];
    records.push(link);
    targets.set(target, records);
  }

  for (const [target, records] of targets) {
    const response = await fetch(localAuditUrl(baseUrl, target), {
      method: "HEAD",
      redirect: "manual",
    });
    for (const record of records) {
      record.status = response.status;
      record.fragmentExists = hasFragment(record.targetPath ?? "");
    }
    if (response.status >= 400) {
      for (const record of records) {
        addFinding(
          findings,
          "failure",
          "seo",
          "Broken internal link",
          record.source,
          `${record.href} returned HTTP ${response.status}.`,
          "Point the link to an approved route or asset.",
        );
      }
    }
    for (const record of records) {
      if (record.fragmentExists === false) {
        addFinding(
          findings,
          "failure",
          "seo",
          "Broken internal fragment",
          record.source,
          `${record.href} points to a missing element ID.`,
          "Point the link to an existing section.",
        );
      }
    }
  }
}

function inspectBundles(findings: CrawlFinding[]): Array<{
  file: string;
  bytes: number;
}> {
  const assetsDirectory = path.join(BUILD_ROOT, "assets");
  const files = listFiles(assetsDirectory).filter((filePath) =>
    /\.(?:js|css)$/i.test(filePath),
  );
  const inventory = files.map((filePath) => ({
    file: path.relative(BUILD_ROOT, filePath).replaceAll("\\", "/"),
    bytes: statSync(filePath).size,
  }));
  for (const filePath of files.filter((candidate) => candidate.endsWith(".js"))) {
    const source = readFileSync(filePath, "utf8");
    for (const forbidden of forbiddenBundlePatterns) {
      const match = source.match(forbidden.pattern);
      if (!match) continue;
      addFinding(
        findings,
        "failure",
        "security",
        "Client-bundle secret or endpoint scan",
        "(bundle)",
        `${path.relative(BUILD_ROOT, filePath)} contains a match for ${forbidden.label}. The matched value is intentionally redacted.`,
        "Remove production credentials and write endpoints from the Public Foundation client graph.",
      );
    }
  }
  return inventory;
}

function inspectDuplicateContent(
  results: RouteCrawlResult[],
  findings: CrawlFinding[],
): void {
  const byHash = new Map<string, string[]>();
  for (const result of results) {
    if (!PUBLIC_ROUTES.some((route) => route.path === result.path)) continue;
    const $ = cheerio.load(readFileSync(routeHtmlFile(result.path), "utf8"));
    const text = normalizeWhitespace($("main").text())
      .toLowerCase()
      .replace(/\d+/g, "#");
    const digest = createHash("sha256").update(text).digest("hex");
    const routes = byHash.get(digest) ?? [];
    routes.push(result.path);
    byHash.set(digest, routes);
  }
  for (const routes of byHash.values()) {
    if (routes.length < 2) continue;
    addFinding(
      findings,
      "warning",
      "seo",
      "Exact duplicate content",
      routes.join(", "),
      `The normalized main content is identical across ${routes.join(", ")}.`,
      "Give each indexable route a distinct and truthful purpose.",
    );
  }
}

function inspectOrphans(
  links: LinkRecord[],
  findings: CrawlFinding[],
): string[] {
  const orphanRoutes: string[] = [];
  for (const route of PUBLIC_ROUTES) {
    if (route.path === "/") continue;
    const incoming = links.some((link) => {
      if (link.source === route.path || !link.targetPath) return false;
      return (
        new URL(link.targetPath, "https://ultrapressurewashing.net").pathname ===
        route.path
      );
    });
    if (!incoming) {
      orphanRoutes.push(route.path);
      addFinding(
        findings,
        "failure",
        "seo",
        "Orphan page",
        route.path,
        "No other public route links to this page.",
        "Add a useful contextual, navigation, or footer link.",
      );
    }
  }
  return orphanRoutes;
}

function toMarkdown(
  generatedAt: string,
  baseUrl: string,
  routes: RouteCrawlResult[],
  findings: CrawlFinding[],
  links: LinkRecord[],
  orphanRoutes: string[],
): string {
  const lines = [
    "# Full-site crawl and security scan",
    "",
    `- Generated: ${generatedAt}`,
    `- Local target: ${baseUrl}`,
    "- External links were inventoried but not contacted.",
    "- HSTS, compression, cache, Referrer-Policy, and Permissions-Policy require a later approved deployment-context check.",
    "",
    "## Route summary",
    "",
    "| Route | HTTP | HTML bytes | Requests | Internal links | External links | Images | Findings |",
    "|---|---:|---:|---:|---:|---:|---:|---:|",
  ];
  for (const route of routes) {
    lines.push(
      `| ${markdownCell(route.path)} | ${route.status} | ${route.htmlBytes} | ${route.requestCount} | ${route.internalLinks} | ${route.externalLinks} | ${route.imageCount} | ${route.findings.length} |`,
    );
  }
  lines.push(
    "",
    "## Broken links",
    "",
  );
  const brokenLinks = links.filter(
    (link) =>
      (typeof link.status === "number" && link.status >= 400) ||
      link.fragmentExists === false,
  );
  if (brokenLinks.length === 0) {
    lines.push("- Pass: no broken internal route, asset, or fragment links detected.");
  } else {
    for (const link of brokenLinks) {
      lines.push(
        `- ${link.source} -> ${link.href} (${link.status ?? "fragment missing"})`,
      );
    }
  }
  lines.push("", "## Orphan pages", "");
  if (orphanRoutes.length === 0) {
    lines.push(
      "- Pass: every public interior route has an incoming internal link.",
    );
  }
  if (orphanRoutes.length > 0) {
    for (const route of orphanRoutes) lines.push(`- ${route}`);
  }
  lines.push("", "## Findings", "");
  if (findings.length === 0) {
    lines.push("- Pass: no crawl, bundle, or static-response issues detected.");
  } else {
    for (const finding of findings) {
      lines.push(
        `- **${finding.severity.toUpperCase()} — ${finding.category}/${finding.check} (${finding.route}):** ` +
          `${finding.evidence} Recommended: ${finding.recommendation}`,
      );
    }
  }
  return lines.join("\n");
}

const runDir = resolveRunDir();
const generatedAt = new Date().toISOString();

const exitCode = await withStaticAuditServer(async (baseUrl) => {
  const links: LinkRecord[] = [];
  const routes: RouteCrawlResult[] = [];
  for (const route of AUDITED_ROUTES) {
    routes.push(await inspectRoute(baseUrl, route.path, links));
  }

  const findings = routes.flatMap((route) => route.findings);
  await resolveInternalLinks(baseUrl, links, findings);
  const bundleInventory = inspectBundles(findings);
  inspectDuplicateContent(routes, findings);
  const orphanRoutes = inspectOrphans(links, findings);

  for (const route of routes) {
    const expected = AUDITED_ROUTES.find(
      (candidate) => candidate.path === route.path,
    )?.expectedStatus;
    if (typeof expected === "number" && route.status !== expected) {
      addFinding(
        findings,
        "failure",
        "seo",
        "HTTP status",
        route.path,
        `Expected ${expected}; received ${route.status}.`,
        "Fix the generated file or static routing.",
      );
    }
  }

  const failureCount = findings.filter(
    (finding) => finding.severity === "failure",
  ).length;
  const warningCount = findings.filter(
    (finding) => finding.severity === "warning",
  ).length;
  const externalLinks = [
    ...new Set(
      links
        .filter((link) => link.targetKind === "external")
        .map((link) => link.href),
    ),
  ].sort();
  const report = {
    generatedAt,
    baseUrl,
    status: failureCount > 0 ? "failure" : warningCount > 0 ? "warning" : "pass",
    failureCount,
    warningCount,
    routes,
    links,
    externalLinks: {
      checked: false,
      reason:
        "External URLs are inventoried without network requests to keep the audit non-sending and deterministic.",
      urls: externalLinks,
    },
    orphanRoutes,
    bundleInventory,
    findings,
  };
  writeJson(path.join(runDir, "crawl", "report.json"), report);
  writeText(
    path.join(runDir, "crawl", "report.md"),
    toMarkdown(generatedAt, baseUrl, routes, findings, links, orphanRoutes),
  );
  writeJson(path.join(runDir, "crawl", "broken-links.json"), {
    generatedAt,
    broken: links.filter(
      (link) =>
        (typeof link.status === "number" && link.status >= 400) ||
        link.fragmentExists === false,
    ),
  });
  writeJson(path.join(runDir, "crawl", "external-links.json"), {
    generatedAt,
    checked: false,
    urls: externalLinks,
  });
  process.stdout.write(
    `Crawl audit: ${report.status}; ${failureCount} failure(s), ${warningCount} warning(s).\n`,
  );
  return failureCount > 0 ? 1 : 0;
});

process.exitCode = exitCode;
