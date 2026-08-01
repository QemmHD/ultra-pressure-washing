import { readFileSync } from "node:fs";
import path from "node:path";
import * as cheerio from "cheerio";
import {
  ADMIN_ROUTE,
  NOT_FOUND_ROUTE,
  PUBLIC_ROUTES,
  type SiteRoute,
} from "../../src/data/routes";
import {
  AUDITED_ROUTES,
  BUILD_ROOT,
  expectedCanonical,
  localAuditUrl,
  markdownCell,
  normalizeWhitespace,
  resolveRunDir,
  routeHtmlFile,
  writeJson,
  writeText,
} from "./common";
import { withStaticAuditServer } from "./static-server";

type Severity = "pass" | "warning" | "failure";

interface Finding {
  check: string;
  severity: Exclude<Severity, "pass">;
  evidence: string;
  sourceFile: string;
  recommendation: string;
}

interface RouteSeoResult {
  path: string;
  expectedStatus: number;
  actualStatus: number;
  overall: Severity;
  title: string;
  description: string;
  canonical: string;
  robots: string;
  h1: string[];
  headingSequence: string[];
  wordCount: number;
  internalLinkCount: number;
  externalLinkCount: number;
  imageCount: number;
  structuredDataTypes: string[];
  findings: Finding[];
}

const BANNED_SCHEMA_TYPES = new Set([
  "AggregateRating",
  "HomeAndConstructionBusiness",
  "LocalBusiness",
  "Review",
]);
const ALLOWED_SCHEMA_TYPES = new Set([
  "Organization",
  "WebSite",
  "WebPage",
  "BreadcrumbList",
  "ListItem",
]);
const REQUIRED_INDEXABLE_SCHEMA_TYPES = [
  "Organization",
  "WebSite",
  "WebPage",
] as const;

const UNSUPPORTED_CONTENT_PATTERNS: ReadonlyArray<{
  label: string;
  pattern: RegExp;
}> = [
  {
    label: "surface sealing service",
    pattern:
      /\b(?:surface\s+sealing|sealing\s+services?|sealing\s+quote|quote\s+options?.{0,20}sealing)\b/i,
  },
  { label: "Google rating", pattern: /\b(?:5[.-]?star|5\.0)\b.*\bGoogle\b/i },
  { label: "fake customer Sarah M.", pattern: /\bSarah\s+M\.?\b/i },
  { label: "fake customer James T.", pattern: /\bJames\s+T\.?\b/i },
  { label: "fake customer Robert L.", pattern: /\bRobert\s+L\.?\b/i },
  {
    label: "formal satisfaction guarantee",
    pattern: /\b(?:100%\s+satisfaction|satisfaction\s+guarantee)\b/i,
  },
  { label: "same-day response", pattern: /\bsame[- ]day\b/i },
  {
    label: "within-hours response",
    pattern: /\bwithin\s+(?:a\s+)?few\s+hours?\b/i,
  },
];

function addFinding(
  findings: Finding[],
  route: SiteRoute,
  severity: Exclude<Severity, "pass">,
  check: string,
  evidence: string,
  recommendation: string,
): void {
  findings.push({
    check,
    severity,
    evidence,
    sourceFile: route.sourceFile,
    recommendation,
  });
}

function findSchemaTypes(value: unknown, types = new Set<string>()): Set<string> {
  if (Array.isArray(value)) {
    for (const entry of value) findSchemaTypes(entry, types);
    return types;
  }
  if (!value || typeof value !== "object") return types;

  const record = value as Record<string, unknown>;
  const rawType = record["@type"];
  if (typeof rawType === "string") types.add(rawType);
  if (Array.isArray(rawType)) {
    for (const item of rawType) {
      if (typeof item === "string") types.add(item);
    }
  }
  for (const entry of Object.values(record)) findSchemaTypes(entry, types);
  return types;
}

function titleForRoute(routePath: string): string {
  return routePath === "/this-page-does-not-exist"
    ? NOT_FOUND_ROUTE.title
    : (AUDITED_ROUTES.find((route) => route.path === routePath)?.title ?? "");
}

function descriptionForRoute(routePath: string): string {
  return routePath === "/this-page-does-not-exist"
    ? NOT_FOUND_ROUTE.description
    : (AUDITED_ROUTES.find((route) => route.path === routePath)?.description ??
        "");
}

function routeForFinding(routePath: string): SiteRoute {
  if (routePath === "/this-page-does-not-exist") return NOT_FOUND_ROUTE;
  return (
    AUDITED_ROUTES.find((route) => route.path === routePath) ?? NOT_FOUND_ROUTE
  );
}

function routeOverall(findings: Finding[]): Severity {
  if (findings.some((finding) => finding.severity === "failure")) {
    return "failure";
  }
  if (findings.length > 0) return "warning";
  return "pass";
}

async function inspectRoute(
  baseUrl: string,
  route: (typeof AUDITED_ROUTES)[number],
): Promise<RouteSeoResult> {
  const findingRoute = routeForFinding(route.path);
  const findings: Finding[] = [];
  const response = await fetch(localAuditUrl(baseUrl, route.path), {
    redirect: "manual",
  });
  const html = await response.text();
  const $ = cheerio.load(html);
  const title = normalizeWhitespace($("title").first().text());
  const description = normalizeWhitespace(
    $('meta[name="description"]').first().attr("content") ?? "",
  );
  const canonicalElements = $('link[rel="canonical"]');
  const canonical = canonicalElements.first().attr("href") ?? "";
  const robots = normalizeWhitespace(
    $('meta[name="robots"]').first().attr("content") ?? "",
  ).toLowerCase();
  const h1 = $("h1")
    .toArray()
    .map((element) => normalizeWhitespace($(element).text()));
  const headings = $("h1, h2, h3, h4, h5, h6")
    .toArray()
    .map((element) => ({
      level: Number.parseInt(element.tagName.slice(1), 10),
      text: normalizeWhitespace($(element).text()),
    }));
  const mainText = normalizeWhitespace($("main").text());
  const wordCount = mainText ? mainText.split(/\s+/).length : 0;
  const internalLinks = new Set<string>();
  const externalLinks = new Set<string>();
  $("a[href]").each((_, element) => {
    const href = $(element).attr("href") ?? "";
    if (
      href.startsWith("/") ||
      href.startsWith("#") ||
      href.startsWith("https://ultrapressurewashing.net")
    ) {
      internalLinks.add(href);
    } else if (/^https?:\/\//i.test(href)) {
      externalLinks.add(href);
    }
  });

  if (response.status !== route.expectedStatus) {
    addFinding(
      findings,
      findingRoute,
      "failure",
      "HTTP status",
      `Expected ${route.expectedStatus}; received ${response.status}.`,
      "Fix the generated route file or static-server route mapping.",
    );
  }

  const shouldIndex = route.indexable;
  const hasNoIndex = /\bnoindex\b/.test(robots);
  if ((shouldIndex && hasNoIndex) || (!shouldIndex && !hasNoIndex)) {
    addFinding(
      findings,
      findingRoute,
      "failure",
      "Indexability",
      `robots="${robots || "(missing)"}"; expected ${
        shouldIndex ? "indexable" : "noindex"
      }.`,
      "Make the initial HTML robots directive agree with canonical route data.",
    );
  }

  const expectedRouteCanonical = expectedCanonical(route.path);
  if (canonicalElements.length !== 1 || canonical !== expectedRouteCanonical) {
    addFinding(
      findings,
      findingRoute,
      "failure",
      "Canonical",
      `Found ${canonicalElements.length} canonical tag(s), value "${
        canonical || "(missing)"
      }"; expected "${expectedRouteCanonical}".`,
      "Render exactly one self-referencing non-www HTTPS canonical.",
    );
  }

  const expectedTitle = titleForRoute(route.path);
  if (!title || title !== expectedTitle) {
    addFinding(
      findings,
      findingRoute,
      "failure",
      "Page title",
      `Found "${title || "(missing)"}"; expected "${expectedTitle}".`,
      "Render the canonical route title in the built HTML.",
    );
  } else if (
    route.indexable &&
    (title.length < 40 || title.length > 60)
  ) {
    addFinding(
      findings,
      findingRoute,
      "warning",
      "Page title length",
      `${title.length} characters.`,
      "Keep the title readable; aim for roughly 40–60 characters when natural.",
    );
  }

  const expectedDescription = descriptionForRoute(route.path);
  if (!description || description !== expectedDescription) {
    addFinding(
      findings,
      findingRoute,
      "failure",
      "Meta description",
      `Found "${description || "(missing)"}"; expected "${expectedDescription}".`,
      "Render the canonical route description in the built HTML.",
    );
  } else if (
    route.indexable &&
    (description.length < 120 || description.length > 160)
  ) {
    addFinding(
      findings,
      findingRoute,
      "warning",
      "Meta description length",
      `${description.length} characters.`,
      "Keep the description useful; aim for roughly 120–160 characters when natural.",
    );
  }

  const expectedH1 =
    route.path === "/this-page-does-not-exist" ? NOT_FOUND_ROUTE.h1 : route.h1;
  if (h1.length !== 1 || h1[0] !== expectedH1) {
    addFinding(
      findings,
      findingRoute,
      "failure",
      "Primary heading",
      `Found ${h1.length} H1 element(s): ${JSON.stringify(h1)}; expected "${expectedH1}".`,
      "Render exactly one visible H1 that matches the route source of truth.",
    );
  }

  for (let index = 1; index < headings.length; index += 1) {
    const previous = headings[index - 1]!;
    const current = headings[index]!;
    if (current.level > previous.level + 1) {
      addFinding(
        findings,
        findingRoute,
        "warning",
        "Heading hierarchy",
        `${previous.text} (H${previous.level}) is followed by ${current.text} (H${current.level}).`,
        "Avoid skipped heading levels where they obscure document structure.",
      );
      break;
    }
  }

  if (!$("html").attr("lang")) {
    addFinding(
      findings,
      findingRoute,
      "failure",
      "Page language",
      "The html element has no lang attribute.",
      'Set html lang="en" in the shared root document.',
    );
  }
  if ($('meta[name="viewport"]').length !== 1) {
    addFinding(
      findings,
      findingRoute,
      "failure",
      "Mobile viewport",
      `Found ${$('meta[name="viewport"]').length} viewport meta tags.`,
      "Render exactly one responsive viewport meta tag.",
    );
  }
  if ($('meta[name="keywords"]').length > 0) {
    addFinding(
      findings,
      findingRoute,
      "failure",
      "Meta keywords",
      "A meta keywords tag remains in the built HTML.",
      "Remove the obsolete meta keywords tag.",
    );
  }

  const socialChecks: ReadonlyArray<[string, string, string]> = [
    ["Open Graph title", 'meta[property="og:title"]', title],
    ["Open Graph description", 'meta[property="og:description"]', description],
    ["Open Graph URL", 'meta[property="og:url"]', expectedRouteCanonical],
    ["Twitter title", 'meta[name="twitter:title"]', title],
    ["Twitter description", 'meta[name="twitter:description"]', description],
  ];
  for (const [label, selector, expected] of socialChecks) {
    const actual = $(selector).first().attr("content") ?? "";
    if (actual !== expected) {
      addFinding(
        findings,
        findingRoute,
        "failure",
        label,
        `Found "${actual || "(missing)"}"; expected "${expected}".`,
        "Keep social metadata route-specific and consistent with visible metadata.",
      );
    }
  }

  for (const selector of ['meta[property="og:image"]', 'meta[name="twitter:image"]']) {
    const value = $(selector).first().attr("content") ?? "";
    if (!/^https:\/\/ultrapressurewashing\.net\//.test(value)) {
      addFinding(
        findings,
        findingRoute,
        "failure",
        "Social image",
        `${selector} contains "${value || "(missing)"}".`,
        "Use an absolute HTTPS image URL on the canonical domain.",
      );
    }
  }

  $("img").each((_, element) => {
    const image = $(element);
    const source = image.attr("src") ?? "(missing src)";
    if (image.attr("alt") === undefined) {
      addFinding(
        findings,
        findingRoute,
        "failure",
        "Image alternative text",
        `${source} has no alt attribute.`,
        "Use accurate alt text for meaningful images and empty alt text for decorative images.",
      );
    }
    if (!image.attr("width") || !image.attr("height")) {
      addFinding(
        findings,
        findingRoute,
        "warning",
        "Image dimensions",
        `${source} is missing width or height.`,
        "Declare intrinsic dimensions to reduce layout shift.",
      );
    }
  });

  const schemaTypes = new Set<string>();
  $('script[type="application/ld+json"]').each((_, element) => {
    try {
      const parsed = JSON.parse($(element).text()) as unknown;
      findSchemaTypes(parsed, schemaTypes);
    } catch (error) {
      addFinding(
        findings,
        findingRoute,
        "failure",
        "Structured data",
        `Invalid JSON-LD: ${error instanceof Error ? error.message : String(error)}`,
        "Emit valid JSON from the shared structured-data component.",
      );
    }
  });
  for (const type of schemaTypes) {
    if (BANNED_SCHEMA_TYPES.has(type)) {
      addFinding(
        findings,
        findingRoute,
        "failure",
        "Structured data claims",
        `Unsupported schema type "${type}" is present.`,
        "Use only the approved minimal Organization, WebSite, WebPage, and visible BreadcrumbList schema.",
      );
    } else if (!ALLOWED_SCHEMA_TYPES.has(type)) {
      addFinding(
        findings,
        findingRoute,
        "failure",
        "Structured data allowlist",
        `Schema type "${type}" is outside the approved Public Foundation allowlist.`,
        "Use only Organization, WebSite, WebPage, BreadcrumbList, and its ListItem children.",
      );
    }
  }
  if (route.indexable) {
    for (const requiredType of REQUIRED_INDEXABLE_SCHEMA_TYPES) {
      if (!schemaTypes.has(requiredType)) {
        addFinding(
          findings,
          findingRoute,
          "failure",
          "Required structured data",
          `${requiredType} is missing from this indexable route.`,
          "Include the truthful minimal Organization, WebSite, and WebPage graph on every indexable route.",
        );
      }
    }
  }
  const hasVisibleBreadcrumb =
    $('nav[aria-label="Breadcrumb"]').length > 0;
  const hasBreadcrumbSchema = schemaTypes.has("BreadcrumbList");
  if (hasVisibleBreadcrumb && route.indexable && !hasBreadcrumbSchema) {
    addFinding(
      findings,
      findingRoute,
      "failure",
      "Breadcrumb structured data",
      "A visible breadcrumb exists, but BreadcrumbList JSON-LD is missing.",
      "Keep the visible breadcrumb and BreadcrumbList markup in agreement.",
    );
  }
  if (!hasVisibleBreadcrumb && hasBreadcrumbSchema) {
    addFinding(
      findings,
      findingRoute,
      "failure",
      "Breadcrumb visibility",
      "BreadcrumbList JSON-LD is present without a visible breadcrumb.",
      "Render a matching visible breadcrumb or remove the BreadcrumbList markup.",
    );
  }

  for (const { label, pattern } of UNSUPPORTED_CONTENT_PATTERNS) {
    const match = mainText.match(pattern);
    if (match) {
      addFinding(
        findings,
        findingRoute,
        "failure",
        "Unsupported claim",
        `${label}: "${match[0]}".`,
        "Remove the unsupported claim without inventing replacement facts.",
      );
    }
  }

  if (
    route.indexable &&
    (route.kind === "commercial" || route.kind === "location") &&
    wordCount < 300
  ) {
    addFinding(
      findings,
      findingRoute,
      "warning",
      "Content depth",
      `${wordCount} visible main-content words.`,
      "Add useful, truthful content only when it helps the route satisfy its purpose; do not pad for a score.",
    );
  }

  return {
    path: route.path,
    expectedStatus: route.expectedStatus,
    actualStatus: response.status,
    overall: routeOverall(findings),
    title,
    description,
    canonical,
    robots,
    h1,
    headingSequence: headings.map(
      (heading) => `H${heading.level}: ${heading.text}`,
    ),
    wordCount,
    internalLinkCount: internalLinks.size,
    externalLinkCount: externalLinks.size,
    imageCount: $("img").length,
    structuredDataTypes: [...schemaTypes].sort(),
    findings,
  };
}

function applyDuplicateFindings(results: RouteSeoResult[]): void {
  const publicResults = results.filter((result) =>
    PUBLIC_ROUTES.some((route) => route.path === result.path),
  );
  for (const key of ["title", "description"] as const) {
    const byValue = new Map<string, RouteSeoResult[]>();
    for (const result of publicResults) {
      const value = result[key];
      const matches = byValue.get(value) ?? [];
      matches.push(result);
      byValue.set(value, matches);
    }
    for (const [value, matches] of byValue) {
      if (!value || matches.length < 2) continue;
      for (const result of matches) {
        const route = routeForFinding(result.path);
        addFinding(
          result.findings,
          route,
          "failure",
          `Duplicate ${key}`,
          `"${value}" is shared by ${matches.map((match) => match.path).join(", ")}.`,
          `Give every public route a unique ${key}.`,
        );
        result.overall = routeOverall(result.findings);
      }
    }
  }
}

function inspectGlobalSeo(results: RouteSeoResult[]): Finding[] {
  const findings: Finding[] = [];
  const sitemapPath = path.join(BUILD_ROOT, "sitemap.xml");
  const robotsPath = path.join(BUILD_ROOT, "robots.txt");
  const sitemap = readFileSync(sitemapPath, "utf8");
  const robots = readFileSync(robotsPath, "utf8");
  const sitemapUrls = [
    ...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g),
  ].map((match) => match[1]!);
  const expectedUrls = PUBLIC_ROUTES.filter((route) => route.sitemap).map(
    (route) => expectedCanonical(route.path),
  );

  for (const expected of expectedUrls) {
    if (!sitemapUrls.includes(expected)) {
      addFinding(
        findings,
        ADMIN_ROUTE,
        "failure",
        "Sitemap coverage",
        `${expected} is missing from sitemap.xml.`,
        "Generate the sitemap from canonical public route data.",
      );
    }
  }
  for (const route of PUBLIC_ROUTES.filter((candidate) => candidate.sitemap)) {
    const canonical = expectedCanonical(route.path);
    if (!route.lastModified || !/^\d{4}-\d{2}-\d{2}$/.test(route.lastModified)) {
      addFinding(
        findings,
        route,
        "failure",
        "Sitemap last modified date",
        `${canonical} does not have a valid source-controlled YYYY-MM-DD lastModified value.`,
        "Record the date of the route's latest meaningful content change.",
      );
      continue;
    }
    const expectedEntry = `<loc>${canonical}</loc>\n    <lastmod>${route.lastModified}</lastmod>`;
    if (!sitemap.includes(expectedEntry)) {
      addFinding(
        findings,
        route,
        "failure",
        "Sitemap last modified date",
        `${canonical} is missing its accurate <lastmod>${route.lastModified}</lastmod> value.`,
        "Generate sitemap lastmod values from the canonical route source.",
      );
    }
  }
  for (const actual of sitemapUrls) {
    if (!expectedUrls.includes(actual)) {
      addFinding(
        findings,
        ADMIN_ROUTE,
        "failure",
        "Sitemap eligibility",
        `${actual} is not an approved public canonical route.`,
        "Exclude admin, 404, redirected, and unknown routes from the sitemap.",
      );
    }
  }
  if (
    !/^\s*Sitemap:\s*https:\/\/ultrapressurewashing\.net\/sitemap\.xml\s*$/im.test(
      robots,
    )
  ) {
    addFinding(
      findings,
      ADMIN_ROUTE,
      "failure",
      "Robots sitemap",
      "robots.txt does not point to the canonical production sitemap.",
      "Add the exact non-www HTTPS sitemap URL.",
    );
  }
  if (/^\s*Disallow:\s*\/admin\/?\s*$/im.test(robots)) {
    addFinding(
      findings,
      ADMIN_ROUTE,
      "failure",
      "Admin robots handling",
      "robots.txt blocks /admin, preventing crawlers from reading its noindex metadata.",
      "Allow the initial HTML to be crawled and enforce noindex in the document and future response header.",
    );
  }

  const unknown = results.find(
    (result) => result.path === "/this-page-does-not-exist",
  );
  if (!unknown || unknown.actualStatus !== 404) {
    addFinding(
      findings,
      NOT_FOUND_ROUTE,
      "failure",
      "Soft 404",
      "The deliberate unknown URL did not return HTTP 404.",
      "Serve the branded 404 document with a true 404 status.",
    );
  }
  return findings;
}

function toMarkdown(
  generatedAt: string,
  baseUrl: string,
  results: RouteSeoResult[],
  globalFindings: Finding[],
): string {
  const lines = [
    "# Built-output SEO audit",
    "",
    `- Generated: ${generatedAt}`,
    `- Local target: ${baseUrl}`,
    `- Public routes: ${PUBLIC_ROUTES.length}`,
    `- Special cases: /admin and /this-page-does-not-exist`,
    "",
    "## Route summary",
    "",
    "| Route | Status | Indexability | Title | Description | Canonical | H1 | Words | Findings |",
    "|---|---:|---|---|---|---|---|---:|---:|",
  ];
  for (const result of results) {
    lines.push(
      `| ${markdownCell(result.path)} | ${result.actualStatus} | ${markdownCell(
        result.robots,
      )} | ${result.title ? "pass" : "failure"} | ${
        result.description ? "pass" : "failure"
      } | ${result.canonical ? "pass" : "failure"} | ${
        result.h1.length === 1 ? "pass" : "failure"
      } | ${result.wordCount} | ${result.findings.length} (${result.overall}) |`,
    );
  }

  lines.push("", "## Route-by-route evidence", "");
  for (const result of results) {
    lines.push(`### ${result.path}`, "");
    if (result.findings.length === 0) {
      lines.push("- Pass: no built-output SEO issues detected.", "");
      continue;
    }
    for (const finding of result.findings) {
      lines.push(
        `- **${finding.severity.toUpperCase()} — ${finding.check}:** ${finding.evidence} ` +
          `Source: \`${finding.sourceFile}\`. Recommended: ${finding.recommendation}`,
      );
    }
    lines.push("");
  }

  lines.push("## Global sitemap and robots checks", "");
  if (globalFindings.length === 0) {
    lines.push("- Pass: sitemap, robots, and unknown-route checks passed.");
  } else {
    for (const finding of globalFindings) {
      lines.push(
        `- **${finding.severity.toUpperCase()} — ${finding.check}:** ${finding.evidence} ` +
          `Recommended: ${finding.recommendation}`,
      );
    }
  }
  return lines.join("\n");
}

const runDir = resolveRunDir();
const generatedAt = new Date().toISOString();

const exitCode = await withStaticAuditServer(async (baseUrl) => {
  const results: RouteSeoResult[] = [];
  for (const route of AUDITED_ROUTES) {
    results.push(await inspectRoute(baseUrl, route));
  }
  applyDuplicateFindings(results);
  const globalFindings = inspectGlobalSeo(results);
  const failureCount =
    results.reduce(
      (total, result) =>
        total +
        result.findings.filter((finding) => finding.severity === "failure")
          .length,
      0,
    ) +
    globalFindings.filter((finding) => finding.severity === "failure").length;
  const warningCount =
    results.reduce(
      (total, result) =>
        total +
        result.findings.filter((finding) => finding.severity === "warning")
          .length,
      0,
    ) +
    globalFindings.filter((finding) => finding.severity === "warning").length;

  const report = {
    generatedAt,
    baseUrl,
    buildRoot: BUILD_ROOT,
    routeCount: results.length,
    failureCount,
    warningCount,
    status: failureCount > 0 ? "failure" : warningCount > 0 ? "warning" : "pass",
    routes: results,
    globalFindings,
    filesInspected: AUDITED_ROUTES.map((route) => routeHtmlFile(route.path)),
  };
  writeJson(path.join(runDir, "seo", "report.json"), report);
  writeText(
    path.join(runDir, "seo", "report.md"),
    toMarkdown(generatedAt, baseUrl, results, globalFindings),
  );
  process.stdout.write(
    `SEO audit: ${report.status}; ${failureCount} failure(s), ${warningCount} warning(s).\n`,
  );
  return failureCount > 0 ? 1 : 0;
});

process.exitCode = exitCode;
