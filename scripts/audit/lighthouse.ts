import { execFileSync } from "node:child_process";
import {
  existsSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import lighthouse, {
  desktopConfig,
  type Flags as LighthouseFlags,
  type Result as LighthouseResult,
} from "lighthouse";
import { Launcher, launch } from "chrome-launcher";
import { PUBLIC_ROUTES } from "../../src/data/routes";
import {
  ensureDir,
  localAuditUrl,
  markdownCell,
  median,
  resolveRunDir,
  routeSlug,
  writeJson,
  writeText,
} from "./common";
import { withStaticAuditServer } from "./static-server";

type Profile = "mobile" | "desktop";
type CategoryName =
  | "performance"
  | "accessibility"
  | "best-practices"
  | "seo";

interface LighthouseRunSummary {
  route: string;
  profile: Profile;
  run: number;
  reportJson: string;
  reportHtml: string;
  scores: Record<CategoryName, number>;
  metrics: {
    lcpMs: number | null;
    cls: number | null;
    tbtMs: number | null;
    speedIndexMs: number | null;
    totalByteWeight: number | null;
    requestCount: number | null;
  };
  fetchTime: string;
  userAgent: string;
  settings: {
    formFactor: string;
    throttlingMethod: string;
    throttling: unknown;
    screenEmulation: unknown;
  };
  runtimeError?: string;
}

interface NumericSummary {
  values: number[];
  lowest: number;
  median: number;
  highest: number;
}

interface BrowserEvidence {
  product: string;
  version: string;
  label: string;
  userAgent: string;
  versionSource:
    | "chrome-executable-and-authoritative-lhr"
    | "authoritative-lhr-user-agent-fallback";
  directExecutableVersion: string | null;
}

interface RecordedProfileMetadata {
  formFactor: string;
  throttlingMethod: string;
  throttling: Record<string, unknown>;
  screenEmulation: Record<string, unknown>;
  emulatedUserAgent: string;
  networkUserAgent: string;
  benchmarkIndex: NumericSummary | null;
}

interface LighthouseSummaryReport {
  generatedAt: string;
  normalizedAt: string;
  profile: Profile;
  lighthouseVersion: string;
  chromePath: string;
  chromeVersion: string;
  browserEvidence: BrowserEvidence;
  toolingVersionDistinction: {
    lighthouseBrowser: string;
    aioseoPlaywrightBrowser: string | null;
    aioseoEvidenceFile: string | null;
    note: string;
  };
  timestampSemantics: {
    collectionStartedAt: string;
    firstLhrFetchAt: string;
    lastLhrFetchAt: string;
    summaryNormalizedAt: string;
    note: string;
  };
  profileMetadata: RecordedProfileMetadata;
  summaryMode: "fresh-browser-run" | "normalized-existing-lhrs";
  summarySource: string;
  environment: Record<string, unknown>;
  runsPerRoute: number;
  errorReportingEnabled: boolean;
  blockedProductionServicePatterns: readonly string[];
  coldLoadMethod: string;
  routeFilter: string | null;
  routes: ReturnType<typeof summarizeRoute>[];
  errors: Array<{ route: string; run: number; message: string }>;
  belowTarget: Array<{
    route: string;
    profile: Profile;
    category: CategoryName;
    values: number[];
  }>;
  status: "pass" | "failure";
}

const CATEGORY_NAMES: readonly CategoryName[] = [
  "performance",
  "accessibility",
  "best-practices",
  "seo",
];
const RUNS_PER_ROUTE = 3;
const BLOCKED_PRODUCTION_SERVICE_PATTERNS = [
  "https://chariotai.com/*",
  "https://ntfy.sh/*",
  "https://*.supabase.co/*",
] as const;
const PRODUCTION_SERVICE_RESOLVER_RULES = [
  "MAP chariotai.com 0.0.0.0",
  "MAP ntfy.sh 0.0.0.0",
  "MAP *.supabase.co 0.0.0.0",
  "EXCLUDE 127.0.0.1",
].join(", ");

function parseProfile(): Profile {
  const candidate = process.argv[2] ?? "";
  if (candidate === "mobile" || candidate === "desktop") return candidate;
  throw new Error(
    'Choose a Lighthouse profile: "mobile" or "desktop".',
  );
}

function score(value: number | null | undefined): number {
  return Math.round((value ?? 0) * 100);
}

function numericAudit(
  lhr: LighthouseResult,
  auditId: string,
): number | null {
  const value = lhr.audits[auditId]?.numericValue;
  return typeof value === "number" ? value : null;
}

function auditItemCount(
  lhr: LighthouseResult,
  auditId: string,
): number | null {
  const details = lhr.audits[auditId]?.details as
    | { items?: unknown[] }
    | undefined;
  return Array.isArray(details?.items) ? details.items.length : null;
}

function categoryScores(
  lhr: LighthouseResult,
): Record<CategoryName, number> {
  return {
    performance: score(lhr.categories.performance?.score),
    accessibility: score(lhr.categories.accessibility?.score),
    "best-practices": score(lhr.categories["best-practices"]?.score),
    seo: score(lhr.categories.seo?.score),
  };
}

function chromeVersion(chromePath: string): string | null {
  try {
    const version = execFileSync(chromePath, ["--version"], {
      encoding: "utf8",
      timeout: 10_000,
    }).trim();
    return version || null;
  } catch {
    return null;
  }
}

function recordedEnvironment(lhr: LighthouseResult): {
  hostUserAgent?: string;
  networkUserAgent?: string;
  benchmarkIndex?: number;
} {
  return lhr.environment as {
    hostUserAgent?: string;
    networkUserAgent?: string;
    benchmarkIndex?: number;
  };
}

function hostUserAgent(lhr: LighthouseResult): string {
  const value = recordedEnvironment(lhr).hostUserAgent ?? lhr.userAgent;
  if (!value) {
    throw new Error(
      "The authoritative Lighthouse result has no host user agent.",
    );
  }
  return value;
}

function browserFromUserAgent(userAgent: string): {
  product: string;
  version: string;
} {
  const match = userAgent.match(/\b(HeadlessChrome|Chrome)\/([0-9.]+)/);
  if (!match?.[1] || !match[2]) {
    throw new Error(
      `Unable to derive the authoritative Chrome version from ${userAgent}.`,
    );
  }
  return {
    product: match[1],
    version: match[2],
  };
}

function uniqueRecordedValue<T>(values: T[], label: string): T {
  if (values.length === 0) {
    throw new Error(`${label} has no recorded values.`);
  }
  const distinct = new Map(
    values.map((value) => [JSON.stringify(value), value]),
  );
  if (distinct.size !== 1) {
    throw new Error(
      `${label} differs across authoritative Lighthouse results.`,
    );
  }
  return values[0]!;
}

function numericSummary(values: number[]): NumericSummary | null {
  if (values.length === 0) return null;
  return {
    values,
    lowest: Math.min(...values),
    median: median(values),
    highest: Math.max(...values),
  };
}

async function runOne(
  url: string,
  routePath: string,
  profile: Profile,
  runNumber: number,
  runDir: string,
  chromePath: string,
): Promise<LighthouseRunSummary> {
  const outputDirectory = ensureDir(
    path.join(
      runDir,
      "lighthouse",
      profile,
      routeSlug(routePath),
    ),
  );
  const reportJson = path.join(
    outputDirectory,
    `run-${runNumber}.report.json`,
  );
  const reportHtml = path.join(
    outputDirectory,
    `run-${runNumber}.report.html`,
  );
  const chrome = await launch({
    chromePath,
    chromeFlags: [
      "--headless=new",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--no-first-run",
      "--no-default-browser-check",
      "--no-enable-error-reporting",
      `--host-resolver-rules=${PRODUCTION_SERVICE_RESOLVER_RULES}`,
    ],
    handleSIGINT: false,
    logLevel: "silent",
  });

  try {
    const flags: LighthouseFlags & { enableErrorReporting: boolean } = {
      port: chrome.port,
      logLevel: "error",
      output: ["html", "json"],
      onlyCategories: [...CATEGORY_NAMES],
      blockedUrlPatterns: [...BLOCKED_PRODUCTION_SERVICE_PATTERNS],
      disableStorageReset: false,
      maxWaitForLoad: 60_000,
      enableErrorReporting: false,
    };
    const result = await lighthouse(
      url,
      flags,
      profile === "desktop" ? desktopConfig : undefined,
    );
    if (!result) {
      throw new Error("Lighthouse returned no result.");
    }

    const reports = Array.isArray(result.report)
      ? result.report
      : [result.report];
    const html = reports.find((report) => report.trimStart().startsWith("<!"));
    const json = reports.find((report) => report.trimStart().startsWith("{"));
    writeFileSync(
      reportHtml,
      html ?? "<p>Lighthouse HTML report was not returned.</p>",
      "utf8",
    );
    writeFileSync(
      reportJson,
      json ?? `${JSON.stringify(result.lhr, null, 2)}\n`,
      "utf8",
    );

    return {
      route: routePath,
      profile,
      run: runNumber,
      reportJson: path.relative(runDir, reportJson).replaceAll("\\", "/"),
      reportHtml: path.relative(runDir, reportHtml).replaceAll("\\", "/"),
      scores: categoryScores(result.lhr),
      metrics: {
        lcpMs: numericAudit(result.lhr, "largest-contentful-paint"),
        cls: numericAudit(result.lhr, "cumulative-layout-shift"),
        tbtMs: numericAudit(result.lhr, "total-blocking-time"),
        speedIndexMs: numericAudit(result.lhr, "speed-index"),
        totalByteWeight: numericAudit(result.lhr, "total-byte-weight"),
        requestCount: auditItemCount(result.lhr, "network-requests"),
      },
      fetchTime: result.lhr.fetchTime,
      userAgent: hostUserAgent(result.lhr),
      settings: {
        formFactor: result.lhr.configSettings.formFactor,
        throttlingMethod: result.lhr.configSettings.throttlingMethod,
        throttling: result.lhr.configSettings.throttling,
        screenEmulation: result.lhr.configSettings.screenEmulation,
      },
      runtimeError: result.lhr.runtimeError?.message,
    };
  } finally {
    try {
      await chrome.kill();
    } catch (error) {
      process.stderr.write(
        `Lighthouse cleanup warning for ${routePath} run ${runNumber}: ${
          error instanceof Error ? error.message : String(error)
        }\n`,
      );
    }
  }
}

function summarizeRoute(
  routePath: string,
  profile: Profile,
  runs: LighthouseRunSummary[],
) {
  const summarizeCategory = (category: CategoryName) => {
    const values = runs.map((run) => run.scores[category]);
    return {
      values,
      lowest: Math.min(...values),
      median: median(values),
      highest: Math.max(...values),
    };
  };
  const categories: Record<
    CategoryName,
    ReturnType<typeof summarizeCategory>
  > = {
    performance: summarizeCategory("performance"),
    accessibility: summarizeCategory("accessibility"),
    "best-practices": summarizeCategory("best-practices"),
    seo: summarizeCategory("seo"),
  };
  const metrics = Object.fromEntries(
    [
      "lcpMs",
      "cls",
      "tbtMs",
      "speedIndexMs",
      "totalByteWeight",
      "requestCount",
    ].map((metric) => {
      const values = runs
        .map((run) => run.metrics[metric as keyof typeof run.metrics])
        .filter((value): value is number => typeof value === "number");
      return [
        metric,
        values.length
          ? {
              values,
              lowest: Math.min(...values),
              median: median(values),
              highest: Math.max(...values),
            }
          : null,
      ];
    }),
  );
  return { route: routePath, profile, runs, categories, metrics };
}

function rawReportFile(
  runDir: string,
  profile: Profile,
  routePath: string,
  runNumber: number,
): string {
  return path.join(
    runDir,
    "lighthouse",
    profile,
    routeSlug(routePath),
    `run-${runNumber}.report.json`,
  );
}

function readRawReport(
  runDir: string,
  profile: Profile,
  routePath: string,
  runNumber: number,
): LighthouseResult {
  const filePath = rawReportFile(
    runDir,
    profile,
    routePath,
    runNumber,
  );
  if (!existsSync(filePath)) {
    throw new Error(`Missing authoritative Lighthouse result: ${filePath}`);
  }
  const lhr = JSON.parse(
    readFileSync(filePath, "utf8"),
  ) as LighthouseResult;
  const auditedUrl = lhr.finalDisplayedUrl ?? lhr.finalUrl;
  if (!auditedUrl) {
    throw new Error(`${filePath} has no final audited URL.`);
  }
  const pathname = new URL(auditedUrl).pathname.replace(/\/+$/, "") || "/";
  if (pathname !== routePath) {
    throw new Error(
      `${filePath} represents ${pathname}, expected ${routePath}.`,
    );
  }
  return lhr;
}

function runSummaryFromRawReport(
  runDir: string,
  profile: Profile,
  routePath: string,
  runNumber: number,
): LighthouseRunSummary {
  const reportJsonFile = rawReportFile(
    runDir,
    profile,
    routePath,
    runNumber,
  );
  const reportHtmlFile = reportJsonFile.replace(/\.json$/, ".html");
  if (!existsSync(reportHtmlFile)) {
    throw new Error(
      `Missing authoritative Lighthouse HTML report: ${reportHtmlFile}`,
    );
  }
  const lhr = readRawReport(
    runDir,
    profile,
    routePath,
    runNumber,
  );
  const runtimeError = lhr.runtimeError?.message;
  return {
    route: routePath,
    profile,
    run: runNumber,
    reportJson: path
      .relative(runDir, reportJsonFile)
      .replaceAll("\\", "/"),
    reportHtml: path
      .relative(runDir, reportHtmlFile)
      .replaceAll("\\", "/"),
    scores: categoryScores(lhr),
    metrics: {
      lcpMs: numericAudit(lhr, "largest-contentful-paint"),
      cls: numericAudit(lhr, "cumulative-layout-shift"),
      tbtMs: numericAudit(lhr, "total-blocking-time"),
      speedIndexMs: numericAudit(lhr, "speed-index"),
      totalByteWeight: numericAudit(lhr, "total-byte-weight"),
      requestCount: auditItemCount(lhr, "network-requests"),
    },
    fetchTime: lhr.fetchTime,
    userAgent: hostUserAgent(lhr),
    settings: {
      formFactor: lhr.configSettings.formFactor,
      throttlingMethod: lhr.configSettings.throttlingMethod,
      throttling: lhr.configSettings.throttling,
      screenEmulation: lhr.configSettings.screenEmulation,
    },
    ...(runtimeError ? { runtimeError } : {}),
  };
}

function summariesFromRawReports(
  runDir: string,
  profile: Profile,
): ReturnType<typeof summarizeRoute>[] {
  return PUBLIC_ROUTES.map((route) =>
    summarizeRoute(
      route.path,
      profile,
      Array.from({ length: RUNS_PER_ROUTE }, (_, index) =>
        runSummaryFromRawReport(
          runDir,
          profile,
          route.path,
          index + 1,
        ),
      ),
    ),
  );
}

function rawReportsForSummaries(
  runDir: string,
  profile: Profile,
  routes: ReturnType<typeof summarizeRoute>[],
): LighthouseResult[] {
  return routes.flatMap((route) =>
    route.runs.map((run) =>
      readRawReport(runDir, profile, route.route, run.run),
    ),
  );
}

function profileMetadataFromRawReports(
  lhrs: LighthouseResult[],
): RecordedProfileMetadata {
  const environments = lhrs.map(recordedEnvironment);
  const configSettings = lhrs.map((lhr) => lhr.configSettings);
  const benchmarkValues = environments.flatMap((environment) =>
    typeof environment.benchmarkIndex === "number"
      ? [environment.benchmarkIndex]
      : [],
  );
  return {
    formFactor: uniqueRecordedValue(
      configSettings.map((settings) => settings.formFactor),
      "Lighthouse form factor",
    ),
    throttlingMethod: uniqueRecordedValue(
      configSettings.map((settings) => settings.throttlingMethod),
      "Lighthouse throttling method",
    ),
    throttling: uniqueRecordedValue(
      configSettings.map((settings) => settings.throttling),
      "Lighthouse throttling values",
    ) as Record<string, unknown>,
    screenEmulation: uniqueRecordedValue(
      configSettings.map((settings) => settings.screenEmulation),
      "Lighthouse screen emulation",
    ) as Record<string, unknown>,
    emulatedUserAgent: uniqueRecordedValue(
      configSettings.map((settings) =>
        typeof settings.emulatedUserAgent === "string"
          ? settings.emulatedUserAgent
          : String(settings.emulatedUserAgent ?? "unavailable"),
      ),
      "Lighthouse configured emulated user agent",
    ),
    networkUserAgent: uniqueRecordedValue(
      environments.map(
        (environment) => environment.networkUserAgent ?? "unavailable",
      ),
      "Lighthouse network user agent",
    ),
    benchmarkIndex: numericSummary(benchmarkValues),
  };
}

function browserEvidenceFromRawReports(
  lhrs: LighthouseResult[],
  directExecutableVersion: string | null,
): BrowserEvidence {
  const userAgent = uniqueRecordedValue(
    lhrs.map(hostUserAgent),
    "Lighthouse host user agent",
  );
  const browser = browserFromUserAgent(userAgent);
  const directVersionMatches =
    directExecutableVersion?.includes(browser.version) ?? false;
  return {
    ...browser,
    label: `${browser.product} ${browser.version}`,
    userAgent,
    versionSource: directVersionMatches
      ? "chrome-executable-and-authoritative-lhr"
      : "authoritative-lhr-user-agent-fallback",
    directExecutableVersion,
  };
}

function aioseoBrowserEvidence(runDir: string): {
  label: string | null;
  file: string | null;
} {
  for (const relativeFile of [
    "aioseo-final/route-results.json",
    "aioseo/route-results.json",
  ]) {
    const filePath = path.join(runDir, relativeFile);
    if (!existsSync(filePath)) continue;
    const parsed = JSON.parse(readFileSync(filePath, "utf8")) as {
      browser?: unknown;
    };
    if (typeof parsed.browser === "string" && parsed.browser.trim()) {
      return {
        label: parsed.browser.trim(),
        file: relativeFile,
      };
    }
  }
  return { label: null, file: null };
}

function belowTargetFromSummaries(
  profile: Profile,
  summaries: ReturnType<typeof summarizeRoute>[],
): LighthouseSummaryReport["belowTarget"] {
  return summaries.flatMap((summary) =>
    CATEGORY_NAMES.flatMap((category) =>
      summary.categories[category].values.some((value) => value < 100)
        ? [
            {
              route: summary.route,
              profile,
              category,
              values: summary.categories[category].values,
            },
          ]
        : [],
    ),
  );
}

function buildSummaryReport(options: {
  runDir: string;
  generatedAt: string;
  normalizedAt: string;
  profile: Profile;
  lighthouseVersion: string;
  chromePath: string;
  directExecutableVersion: string | null;
  environment: Record<string, unknown>;
  routeFilter: string | null;
  routes: ReturnType<typeof summarizeRoute>[];
  errors: LighthouseSummaryReport["errors"];
  mode: LighthouseSummaryReport["summaryMode"];
}): LighthouseSummaryReport {
  const lhrs = rawReportsForSummaries(
    options.runDir,
    options.profile,
    options.routes,
  );
  const recordedLighthouseVersion = uniqueRecordedValue(
    lhrs.map((lhr) => lhr.lighthouseVersion),
    "Lighthouse version",
  );
  if (recordedLighthouseVersion !== options.lighthouseVersion) {
    throw new Error(
      `Lighthouse package ${options.lighthouseVersion} does not match recorded LHR ${recordedLighthouseVersion}.`,
    );
  }
  const browserEvidence = browserEvidenceFromRawReports(
    lhrs,
    options.directExecutableVersion,
  );
  const profileMetadata = profileMetadataFromRawReports(lhrs);
  const fetchTimes = lhrs
    .map((lhr) => lhr.fetchTime)
    .sort((left, right) => left.localeCompare(right));
  const aioseo = aioseoBrowserEvidence(options.runDir);
  const belowTarget = belowTargetFromSummaries(
    options.profile,
    options.routes,
  );
  const environment = {
    ...options.environment,
    chrome: browserEvidence.label,
    lighthouse: options.lighthouseVersion,
    browserEvidence,
  };
  return {
    generatedAt: options.generatedAt,
    normalizedAt: options.normalizedAt,
    profile: options.profile,
    lighthouseVersion: options.lighthouseVersion,
    chromePath: options.chromePath,
    chromeVersion: browserEvidence.label,
    browserEvidence,
    toolingVersionDistinction: {
      lighthouseBrowser: browserEvidence.label,
      aioseoPlaywrightBrowser: aioseo.label,
      aioseoEvidenceFile: aioseo.file,
      note: aioseo.label
        ? `${browserEvidence.label} produced the Lighthouse LHRs. ${aioseo.label} was used only for the separate AIOSEO/Playwright inspection; its version must not be attributed to Lighthouse.`
        : `${browserEvidence.label} produced the Lighthouse LHRs. Any Playwright-based inspection is a separate browser run and must not be attributed to Lighthouse.`,
    },
    timestampSemantics: {
      collectionStartedAt: options.generatedAt,
      firstLhrFetchAt: fetchTimes[0]!,
      lastLhrFetchAt: fetchTimes.at(-1)!,
      summaryNormalizedAt: options.normalizedAt,
      note:
        "generatedAt remains the original audit collection-start timestamp. Per-run fetchTime values remain unchanged; normalizedAt records summary-only regeneration.",
    },
    profileMetadata,
    summaryMode: options.mode,
    summarySource:
      options.mode === "normalized-existing-lhrs"
        ? `Rebuilt from ${lhrs.length} existing authoritative raw Lighthouse reports; no browser rerun.`
        : `Built from ${lhrs.length} newly collected authoritative raw Lighthouse reports.`,
    environment,
    runsPerRoute: RUNS_PER_ROUTE,
    errorReportingEnabled: false,
    blockedProductionServicePatterns: BLOCKED_PRODUCTION_SERVICE_PATTERNS,
    coldLoadMethod:
      "Sequential run with a fresh temporary Chrome profile and Lighthouse storage reset.",
    routeFilter: options.routeFilter,
    routes: options.routes,
    errors: options.errors,
    belowTarget,
    status:
      options.errors.length > 0 || belowTarget.length > 0
        ? "failure"
        : "pass",
  };
}

function toMarkdown(report: LighthouseSummaryReport): string {
  const { profile, routes } = report;
  const profileMetadata = report.profileMetadata;
  const lines = [
    `# Lighthouse ${profile} audit`,
    "",
    `- Collection started: ${report.generatedAt}`,
    `- Summary normalized: ${report.normalizedAt}`,
    `- Raw LHR fetch window: ${report.timestampSemantics.firstLhrFetchAt} through ${report.timestampSemantics.lastLhrFetchAt}`,
    `- Summary mode: ${report.summaryMode}`,
    `- Source: ${report.summarySource}`,
    `- Lighthouse: ${report.lighthouseVersion}`,
    `- Lighthouse browser: ${report.browserEvidence.label}`,
    `- Lighthouse browser version source: ${report.browserEvidence.versionSource}`,
    `- Lighthouse host user agent: \`${report.browserEvidence.userAgent}\``,
    `- Separate AIOSEO/Playwright browser: ${report.toolingVersionDistinction.aioseoPlaywrightBrowser ?? "not recorded"}`,
    `- Browser-version distinction: ${report.toolingVersionDistinction.note}`,
    `- Runs per route: ${RUNS_PER_ROUTE}`,
    `- Profile: ${profile === "desktop" ? "desktop preset" : "Lighthouse default mobile simulation"}`,
    `- Form factor: ${profileMetadata.formFactor}`,
    `- Screen emulation: \`${JSON.stringify(profileMetadata.screenEmulation)}\``,
    `- Throttling: ${profileMetadata.throttlingMethod} \`${JSON.stringify(profileMetadata.throttling)}\``,
    `- Configured emulated user agent: \`${profileMetadata.emulatedUserAgent}\``,
    `- Recorded network user agent: \`${profileMetadata.networkUserAgent}\``,
    "- Every run launches a fresh temporary Chrome profile and runs sequentially.",
    "",
    "| Route | Performance low/median/high | Accessibility | Best Practices | SEO | LCP median | CLS median | TBT median |",
    "|---|---|---|---|---|---:|---:|---:|",
  ];
  for (const route of routes) {
    const categories = route.categories;
    const metrics = route.metrics;
    const formatScores = (category: CategoryName) => {
      const values = categories[category];
      return `${values.lowest}/${values.median}/${values.highest}`;
    };
    lines.push(
      `| ${markdownCell(route.route)} | ${formatScores(
        "performance",
      )} | ${formatScores("accessibility")} | ${formatScores(
        "best-practices",
      )} | ${formatScores("seo")} | ${
        metrics.lcpMs ? Math.round(metrics.lcpMs.median) : "n/a"
      } ms | ${
        metrics.cls ? metrics.cls.median.toFixed(3) : "n/a"
      } | ${
        metrics.tbtMs ? Math.round(metrics.tbtMs.median) : "n/a"
      } ms |`,
    );
  }
  return lines.join("\n");
}

function commandVersion(command: string, args: string[]): string {
  try {
    return execFileSync(command, args, {
      cwd: process.cwd(),
      encoding: "utf8",
      timeout: 10_000,
    }).trim();
  } catch {
    return "unavailable";
  }
}

function writeSummary(
  runDir: string,
  report: LighthouseSummaryReport,
): void {
  writeJson(
    path.join(
      runDir,
      "lighthouse",
      `${report.profile}-summary.json`,
    ),
    report,
  );
  writeText(
    path.join(
      runDir,
      "lighthouse",
      `${report.profile}-summary.md`,
    ),
    toMarkdown(report),
  );
}

function normalizeExistingSummary(
  runDir: string,
  profile: Profile,
): LighthouseSummaryReport {
  const summaryFile = path.join(
    runDir,
    "lighthouse",
    `${profile}-summary.json`,
  );
  if (!existsSync(summaryFile)) {
    throw new Error(`Missing existing Lighthouse summary: ${summaryFile}`);
  }
  const existing = JSON.parse(readFileSync(summaryFile, "utf8")) as {
    generatedAt?: unknown;
    profile?: unknown;
    lighthouseVersion?: unknown;
    chromePath?: unknown;
    environment?: unknown;
    routeFilter?: unknown;
    routes?: unknown;
    errors?: unknown;
    belowTarget?: unknown;
  };
  if (
    typeof existing.generatedAt !== "string" ||
    existing.profile !== profile ||
    typeof existing.lighthouseVersion !== "string" ||
    typeof existing.chromePath !== "string" ||
    !existing.environment ||
    typeof existing.environment !== "object" ||
    Array.isArray(existing.environment) ||
    !Array.isArray(existing.routes) ||
    !Array.isArray(existing.errors) ||
    !Array.isArray(existing.belowTarget)
  ) {
    throw new Error(
      `${summaryFile} does not contain a complete prior summary.`,
    );
  }
  const routes = summariesFromRawReports(runDir, profile);
  const belowTarget = belowTargetFromSummaries(profile, routes);
  if (!isDeepStrictEqual(existing.routes, routes)) {
    throw new Error(
      `${profile} raw-report reconstruction changed score or run data; refusing to overwrite the summary.`,
    );
  }
  if (!isDeepStrictEqual(existing.belowTarget, belowTarget)) {
    throw new Error(
      `${profile} raw-report reconstruction changed the below-target list; refusing to overwrite the summary.`,
    );
  }
  const report = buildSummaryReport({
    runDir,
    generatedAt: existing.generatedAt,
    normalizedAt: new Date().toISOString(),
    profile,
    lighthouseVersion: existing.lighthouseVersion,
    chromePath: existing.chromePath,
    directExecutableVersion: null,
    environment: existing.environment as Record<string, unknown>,
    routeFilter:
      typeof existing.routeFilter === "string"
        ? existing.routeFilter
        : null,
    routes,
    errors: existing.errors as LighthouseSummaryReport["errors"],
    mode: "normalized-existing-lhrs",
  });
  writeSummary(runDir, report);
  return report;
}

async function collectFreshSummary(
  runDir: string,
  profile: Profile,
  lighthouseVersion: string,
): Promise<LighthouseSummaryReport> {
  const generatedAt = new Date().toISOString();
  const routeFilter = process.env.LIGHTHOUSE_ROUTE?.trim();
  const lighthouseRoutes = routeFilter
    ? PUBLIC_ROUTES.filter((route) => route.path === routeFilter)
    : PUBLIC_ROUTES;
  if (routeFilter && lighthouseRoutes.length === 0) {
    throw new Error(`Unknown LIGHTHOUSE_ROUTE: ${routeFilter}`);
  }
  const chromePath =
    process.env.CHROME_PATH?.trim() ?? Launcher.getFirstInstallation();
  if (!chromePath) {
    throw new Error(
      "A system Google Chrome installation is required; no bundled browser is used.",
    );
  }
  const directExecutableVersion = chromeVersion(chromePath);
  const environment = {
    gitBranch: commandVersion("git", ["branch", "--show-current"]),
    gitSha: commandVersion("git", ["rev-parse", "HEAD"]),
    operatingSystem: {
      platform: os.platform(),
      release: os.release(),
      architecture: os.arch(),
    },
    node: process.version,
    bun: commandVersion("bun", ["--version"]),
    chrome: directExecutableVersion,
    lighthouse: lighthouseVersion,
  };

  return withStaticAuditServer(async (baseUrl) => {
    const summaries: ReturnType<typeof summarizeRoute>[] = [];
    const errors: LighthouseSummaryReport["errors"] = [];

    for (const route of lighthouseRoutes) {
      const runs: LighthouseRunSummary[] = [];
      for (
        let runNumber = 1;
        runNumber <= RUNS_PER_ROUTE;
        runNumber += 1
      ) {
        process.stdout.write(
          `Lighthouse ${profile}: ${route.path} run ${runNumber}/${RUNS_PER_ROUTE}\n`,
        );
        try {
          runs.push(
            await runOne(
              localAuditUrl(baseUrl, route.path),
              route.path,
              profile,
              runNumber,
              runDir,
              chromePath,
            ),
          );
        } catch (error) {
          errors.push({
            route: route.path,
            run: runNumber,
            message:
              error instanceof Error ? error.message : String(error),
          });
        }
      }
      if (runs.length > 0) {
        summaries.push(summarizeRoute(route.path, profile, runs));
      }
    }

    return buildSummaryReport({
      runDir,
      generatedAt,
      normalizedAt: new Date().toISOString(),
      profile,
      lighthouseVersion,
      chromePath,
      directExecutableVersion,
      environment,
      routeFilter: routeFilter ?? null,
      routes: summaries,
      errors,
      mode: "fresh-browser-run",
    });
  });
}

async function main(): Promise<number> {
  const profile = parseProfile();
  const runDir = resolveRunDir();
  const normalizeExisting = process.argv.includes("--from-existing");
  const packageJson = (
    await import("lighthouse/package.json", { with: { type: "json" } })
  ).default as { version: string };
  if (normalizeExisting) {
    if (process.env.LIGHTHOUSE_ROUTE?.trim()) {
      throw new Error(
        "LIGHTHOUSE_ROUTE cannot be used with --from-existing; all 33 saved profile reports are required.",
      );
    }
    const report = normalizeExistingSummary(runDir, profile);
    process.stdout.write(
      `Lighthouse ${profile} summary normalized from ${report.routes.length * RUNS_PER_ROUTE} existing raw reports using ${report.browserEvidence.label}; no browser rerun.\n`,
    );
    return report.status === "pass" ? 0 : 1;
  }
  const report = await collectFreshSummary(
    runDir,
    profile,
    packageJson.version,
  );
  writeSummary(runDir, report);
  return report.status === "pass" ? 0 : 1;
}

process.exitCode = await main();
