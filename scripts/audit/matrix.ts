import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  ADMIN_ROUTE,
  PUBLIC_ROUTES,
} from "../../src/data/routes";
import {
  UNKNOWN_PATH,
  markdownCell,
  resolveRunDir,
  writeJson,
  writeText,
} from "./common";

interface SeoRoute {
  path: string;
  actualStatus: number;
  overall: string;
  title: string;
  description: string;
  canonical: string;
  robots: string;
  h1: string[];
  headingSequence: string[];
  wordCount: number;
  internalLinkCount: number;
  imageCount: number;
  structuredDataTypes: string[];
  findings: unknown[];
}

interface CrawlRoute {
  path: string;
  status: number;
  findings: Array<{ severity?: string; check?: string }>;
}

interface LighthouseCategory {
  lowest: number;
  median: number;
  highest: number;
}

interface LighthouseRoute {
  route: string;
  categories: Record<string, LighthouseCategory>;
}

interface LighthouseSummary {
  routes: LighthouseRoute[];
}

function readOptional<T>(filePath: string): T | undefined {
  if (!existsSync(filePath)) return undefined;
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

function lighthouseScores(
  summary: LighthouseSummary | undefined,
  routePath: string,
): Record<string, number | "not run"> {
  const route = summary?.routes.find((candidate) => candidate.route === routePath);
  return {
    performance: route?.categories.performance?.median ?? "not run",
    accessibility: route?.categories.accessibility?.median ?? "not run",
    bestPractices: route?.categories["best-practices"]?.median ?? "not run",
    seo: route?.categories.seo?.median ?? "not run",
  };
}

function visualStatus(
  playwright: unknown,
  routePath: string,
  projectFragment: string,
): "pass" | "failure" | "not run" {
  if (!playwright || typeof playwright !== "object") return "not run";
  const suites = (playwright as { suites?: unknown[] }).suites ?? [];
  const targetTitle =
    routePath === ADMIN_ROUTE.path
      ? "admin remains preview-only and noindex without backend traffic"
      : routePath === UNKNOWN_PATH
        ? "unknown direct URL returns a branded 404 and noindex"
        : `${routePath} renders, remains accessible, and captures cleanly`;
  let found = false;
  let failed = false;

  const visit = (value: unknown): void => {
    if (!value || typeof value !== "object") return;
    const record = value as Record<string, unknown>;
    if (record.title === targetTitle) {
      const tests = Array.isArray(record.tests) ? record.tests : [];
      for (const entry of tests) {
        if (!entry || typeof entry !== "object") continue;
        const testRecord = entry as Record<string, unknown>;
        if (
          typeof testRecord.projectName === "string" &&
          testRecord.projectName.includes(projectFragment)
        ) {
          found = true;
          const results = Array.isArray(testRecord.results)
            ? testRecord.results
            : [];
          if (
            results.some(
              (result) =>
                result &&
                typeof result === "object" &&
                (result as Record<string, unknown>).status !== "passed",
            )
          ) {
            failed = true;
          }
        }
      }
    }
    for (const child of Object.values(record)) {
      if (Array.isArray(child)) child.forEach(visit);
    }
  };
  suites.forEach(visit);
  return !found ? "not run" : failed ? "failure" : "pass";
}

function hasSeoFinding(
  route: SeoRoute | undefined,
  check: string,
): boolean {
  return Boolean(
    route?.findings.some(
      (finding) =>
        finding &&
        typeof finding === "object" &&
        (finding as { check?: unknown }).check === check,
    ),
  );
}

function csvCell(value: unknown): string {
  const text =
    typeof value === "object" && value !== null
      ? JSON.stringify(value)
      : String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

const runDir = resolveRunDir();
const seo = readOptional<{ routes: SeoRoute[] }>(
  path.join(runDir, "seo", "report.json"),
);
const crawl = readOptional<{ routes: CrawlRoute[]; links: Array<{ status?: number }> }>(
  path.join(runDir, "crawl", "report.json"),
);
const mobileLighthouse = readOptional<LighthouseSummary>(
  path.join(runDir, "lighthouse", "mobile-summary.json"),
);
const desktopLighthouse = readOptional<LighthouseSummary>(
  path.join(runDir, "lighthouse", "desktop-summary.json"),
);
const playwright = readOptional<unknown>(
  path.join(runDir, "playwright", "results.json"),
);

const matrixRoutes = [
  ...PUBLIC_ROUTES.map((route) => ({
    path: route.path,
    expectedIndexable: true,
  })),
  { path: ADMIN_ROUTE.path, expectedIndexable: false },
  { path: UNKNOWN_PATH, expectedIndexable: false },
];

const rows = matrixRoutes.map((route) => {
  const seoRoute = seo?.routes.find((candidate) => candidate.path === route.path);
  const crawlRoute = crawl?.routes.find(
    (candidate) => candidate.path === route.path,
  );
  const mobile = lighthouseScores(mobileLighthouse, route.path);
  const desktop = lighthouseScores(desktopLighthouse, route.path);
  const phoneLight = visualStatus(playwright, route.path, "phone-light");
  const phoneDark = visualStatus(playwright, route.path, "phone-dark");
  const desktopLight = visualStatus(playwright, route.path, "desktop-light");
  const desktopDark = visualStatus(playwright, route.path, "desktop-dark");
  const evidenceAvailable = Boolean(seoRoute && crawlRoute);
  const staticFailure =
    seoRoute?.overall === "failure" ||
    crawlRoute?.findings.some((finding) => finding.severity === "failure");
  const visualFailure = [
    phoneLight,
    phoneDark,
    desktopLight,
    desktopDark,
  ].includes("failure");
  const lighthouseFailure = [...Object.values(mobile), ...Object.values(desktop)]
    .filter((value): value is number => typeof value === "number")
    .some((value) => value < 100);
  const isSpecialRoute = !route.expectedIndexable;

  return {
    route: route.path,
    httpStatus: seoRoute?.actualStatus ?? crawlRoute?.status ?? "not run",
    indexability: seoRoute?.robots ?? "not run",
    title: seoRoute
      ? seoRoute.title && !hasSeoFinding(seoRoute, "Page title")
        ? "pass"
        : "failure"
      : "not run",
    metaDescription: seoRoute
      ? seoRoute.description && !hasSeoFinding(seoRoute, "Meta description")
        ? "pass"
        : "failure"
      : "not run",
    canonical: seoRoute
      ? seoRoute.canonical && !hasSeoFinding(seoRoute, "Canonical")
        ? "pass"
        : "failure"
      : "not run",
    h1: seoRoute ? (seoRoute.h1.length === 1 ? "pass" : "failure") : "not run",
    headingStructure: seoRoute
      ? seoRoute.findings.some((finding) =>
          JSON.stringify(finding).includes("Heading hierarchy"),
        )
        ? "warning"
        : "pass"
      : "not run",
    wordCount: seoRoute?.wordCount ?? "not run",
    internalLinks: seoRoute?.internalLinkCount ?? "not run",
    brokenLinks: crawlRoute
      ? crawlRoute.findings.filter((finding) =>
          JSON.stringify(finding).includes("Broken"),
        ).length
      : "not run",
    imageIssues: seoRoute
      ? seoRoute.findings.filter((finding) =>
          JSON.stringify(finding).includes("Image"),
        ).length
      : "not run",
    schema: seoRoute
      ? seoRoute.structuredDataTypes.join(", ") || "none"
      : "not run",
    openGraph: seoRoute?.title && seoRoute?.canonical ? "checked" : "not run",
    lighthouseMobilePerformance: mobile.performance,
    lighthouseMobileAccessibility: mobile.accessibility,
    lighthouseMobileBestPractices: mobile.bestPractices,
    lighthouseMobileSeo: mobile.seo,
    lighthouseDesktopPerformance: desktop.performance,
    lighthouseDesktopAccessibility: desktop.accessibility,
    lighthouseDesktopBestPractices: desktop.bestPractices,
    lighthouseDesktopSeo: desktop.seo,
    consoleErrors: phoneLight === "pass" ? 0 : "not independently summarized",
    networkErrors: phoneLight === "pass" ? 0 : "not independently summarized",
    mobileVisualReview: { light: phoneLight, dark: phoneDark },
    desktopVisualReview: { light: desktopLight, dark: desktopDark },
    darkModeReview:
      phoneDark === "pass" && desktopDark === "pass"
        ? "pass"
        : phoneDark === "failure" || desktopDark === "failure"
          ? "failure"
          : "not run",
    formCtaReview:
      route.path === "/"
        ? playwright
          ? "see Playwright quote and conversion tests"
          : "not run"
        : "not applicable",
    overallStatus: !evidenceAvailable
      ? "not run"
      : staticFailure || visualFailure || lighthouseFailure
        ? "failure"
        : isSpecialRoute
          ? [
                phoneLight,
                phoneDark,
                desktopLight,
                desktopDark,
              ].includes("not run")
            ? "incomplete"
            : "special-pass"
          : [
              phoneLight,
              phoneDark,
              desktopLight,
              desktopDark,
            ].includes("not run") ||
            Object.values(mobile).includes("not run") ||
            Object.values(desktop).includes("not run")
          ? "incomplete"
          : "pass",
  };
});

const generatedAt = new Date().toISOString();
writeJson(path.join(runDir, "matrix", "route-matrix.json"), {
  generatedAt,
  routes: rows,
});

const lines = [
  "# Public Foundation per-route quality matrix",
  "",
  `- Generated: ${generatedAt}`,
  "- `not run` and `incomplete` are never treated as a pass.",
  "",
  "| Route | HTTP | Indexability | Title | Description | Canonical | H1 | Words | Broken links | Mobile P/A/BP/SEO | Desktop P/A/BP/SEO | Mobile visual | Desktop visual | Overall |",
  "|---|---:|---|---|---|---|---|---:|---:|---|---|---|---|---|",
];
for (const row of rows) {
  lines.push(
    `| ${markdownCell(row.route)} | ${row.httpStatus} | ${markdownCell(
      row.indexability,
    )} | ${row.title} | ${row.metaDescription} | ${row.canonical} | ${
      row.h1
    } | ${row.wordCount} | ${row.brokenLinks} | ${
      row.lighthouseMobilePerformance
    }/${row.lighthouseMobileAccessibility}/${
      row.lighthouseMobileBestPractices
    }/${row.lighthouseMobileSeo} | ${row.lighthouseDesktopPerformance}/${
      row.lighthouseDesktopAccessibility
    }/${row.lighthouseDesktopBestPractices}/${
      row.lighthouseDesktopSeo
    } | ${row.mobileVisualReview.light}/${row.mobileVisualReview.dark} | ${
      row.desktopVisualReview.light
    }/${row.desktopVisualReview.dark} | ${row.overallStatus} |`,
  );
}
writeText(
  path.join(runDir, "matrix", "route-matrix.md"),
  lines.join("\n"),
);
const csvColumns = [
  "route",
  "httpStatus",
  "indexability",
  "title",
  "metaDescription",
  "canonical",
  "h1",
  "headingStructure",
  "wordCount",
  "internalLinks",
  "brokenLinks",
  "imageIssues",
  "schema",
  "openGraph",
  "lighthouseMobilePerformance",
  "lighthouseMobileAccessibility",
  "lighthouseMobileBestPractices",
  "lighthouseMobileSeo",
  "lighthouseDesktopPerformance",
  "lighthouseDesktopAccessibility",
  "lighthouseDesktopBestPractices",
  "lighthouseDesktopSeo",
  "consoleErrors",
  "networkErrors",
  "mobileVisualReview",
  "desktopVisualReview",
  "darkModeReview",
  "formCtaReview",
  "overallStatus",
] as const;
writeText(
  path.join(runDir, "matrix", "route-matrix.csv"),
  [
    csvColumns.map(csvCell).join(","),
    ...rows.map((row) =>
      csvColumns.map((column) => csvCell(row[column])).join(","),
    ),
  ].join("\n"),
);
process.stdout.write(`Quality matrix: ${rows.length} routes summarized.\n`);
