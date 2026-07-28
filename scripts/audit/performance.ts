import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import path from "node:path";
import * as cheerio from "cheerio";
import { PUBLIC_ROUTES } from "../../src/data/routes";
import {
  BUILD_ROOT,
  PROJECT_ROOT,
  markdownCell,
  median,
  resolveRunDir,
  routeHtmlFile,
  writeJson,
  writeText,
} from "./common";

type Profile = "mobile" | "desktop";
type CategoryName =
  | "performance"
  | "accessibility"
  | "best-practices"
  | "seo";

const PROFILES: readonly Profile[] = ["mobile", "desktop"];
const CATEGORY_NAMES: readonly CategoryName[] = [
  "performance",
  "accessibility",
  "best-practices",
  "seo",
];
const RUNS_PER_ROUTE = 3;
const PERFORMANCE_SCHEMA_VERSION = "2.0.0";

interface StaticCandidateInventory {
  path: string;
  initialHtmlBytes: number;
  referencedJavaScriptBytes: number;
  routeSpecificJavaScriptBytes: number;
  cssBytes: number;
  inlineCssBytes: number;
  linkedCssBytes: number;
  responsiveImageCandidateBytes: number;
  candidateInventoryBytes: number;
  referencedCandidateCount: number;
  resources: {
    javascript: string[];
    css: string[];
    images: string[];
  };
}

interface NumericSummary {
  values: number[];
  lowest: number;
  median: number;
  highest: number;
}

interface LighthouseRunReference {
  route: string;
  profile: Profile;
  run: number;
  reportJson: string;
  reportHtml: string;
}

interface LighthouseSummaryDocument {
  profile: Profile;
  lighthouseVersion: string;
  chromePath?: string;
  routes: Array<{
    route: string;
    profile: Profile;
    runs: LighthouseRunReference[];
  }>;
  errors?: unknown[];
}

interface RawNetworkRequest {
  url?: unknown;
  resourceType?: unknown;
  transferSize?: unknown;
  resourceSize?: unknown;
}

interface RawLighthouseResult {
  lighthouseVersion?: unknown;
  fetchTime?: unknown;
  userAgent?: unknown;
  finalDisplayedUrl?: unknown;
  finalUrl?: unknown;
  environment?: {
    networkUserAgent?: unknown;
    hostUserAgent?: unknown;
  };
  configSettings?: {
    formFactor?: unknown;
    throttlingMethod?: unknown;
    throttling?: unknown;
    screenEmulation?: unknown;
    emulatedUserAgent?: unknown;
  };
  categories?: Record<string, { score?: unknown } | undefined>;
  audits?: Record<
    string,
    | {
        numericValue?: unknown;
        details?: { items?: unknown };
      }
    | undefined
  >;
}

interface MeasuredRun {
  route: string;
  profile: Profile;
  run: number;
  source: {
    json: string;
    html: string;
  };
  fetchTime: string;
  lighthouseVersion: string;
  browser: {
    version: string;
    hostUserAgent: string;
    networkUserAgent: string;
  };
  settings: {
    formFactor: string;
    throttlingMethod: string;
    throttling: Record<string, unknown>;
    screenEmulation: Record<string, unknown>;
    emulatedUserAgent: string;
  };
  scores: Record<CategoryName, number>;
  metrics: {
    lcpMs: number;
    cls: number;
    tbtMs: number;
    speedIndexMs: number;
    lighthouseTotalByteWeight: number;
  };
  networkTransfer: {
    transferredBytes: number;
    resourceBytes: number;
    requestCount: number;
    firstPartyBytes: number;
    thirdPartyBytes: number;
    firstPartyRequestCount: number;
    thirdPartyRequestCount: number;
    byResourceType: Record<string, number>;
  };
}

interface MeasuredRouteProfile {
  route: string;
  profile: Profile;
  runs: MeasuredRun[];
  scores: Record<CategoryName, NumericSummary>;
  metrics: {
    lcpMs: NumericSummary;
    cls: NumericSummary;
    tbtMs: NumericSummary;
    speedIndexMs: NumericSummary;
    lighthouseTotalByteWeight: NumericSummary;
  };
  networkTransfer: {
    transferredBytes: NumericSummary;
    resourceBytes: NumericSummary;
    requestCount: NumericSummary;
    firstPartyBytes: NumericSummary;
    thirdPartyBytes: NumericSummary;
    firstPartyRequestCount: NumericSummary;
    thirdPartyRequestCount: NumericSummary;
    byResourceType: Record<string, NumericSummary>;
  };
}

interface LighthouseEnvironment {
  lighthouseVersion: string;
  browserVersion: string;
  browserHostUserAgent: string;
  browserExecutablePath: string | null;
  fetchTimeRange: {
    earliest: string;
    latest: string;
  };
  profiles: Record<
    Profile,
    {
      formFactor: string;
      throttlingMethod: string;
      throttling: Record<string, unknown>;
      screenEmulation: Record<string, unknown>;
      emulatedUserAgent: string;
      networkUserAgent: string;
    }
  >;
}

interface StaticCandidateBudget {
  path: string;
  maximumHtmlBytes: number;
  maximumReferencedJavaScriptBytes: number;
  maximumRouteSpecificJavaScriptBytes: number;
  maximumCssBytes: number;
  maximumResponsiveImageCandidateBytes: number;
  maximumCandidateInventoryBytes: number;
  maximumReferencedCandidateCount: number;
}

interface MeasuredTransferBudget {
  path: string;
  profile: Profile;
  maximumTransferredBytes: number;
  maximumRequestCount: number;
  maximumScriptTransferBytes: number;
  maximumImageTransferBytes: number;
  maximumStylesheetTransferBytes: number;
}

interface LegacySpaBaseline {
  available: boolean;
  directory: string;
  note: string;
  fileCount?: number;
  indexHtmlBytes?: number;
  javascriptBytes?: number;
  cssBytes?: number;
  imageBytes?: number;
  totalArtifactBytes?: number;
}

interface PerformancePayload {
  schemaVersion: string;
  generatedAt: string;
  evidence: {
    expectedLhrCount: number;
    actualLhrCount: number;
    runsPerRouteAndProfile: number;
    routeCount: number;
    profiles: readonly Profile[];
    source:
      "Existing authoritative Lighthouse JSON reports; no browser rerun.";
  };
  before: LegacySpaBaseline;
  after: {
    label: string;
    staticCandidateInventory: {
      method: string;
      warning: string;
      routes: StaticCandidateInventory[];
    };
    measuredBrowserRuns: {
      method: string;
      environment: LighthouseEnvironment;
      routeProfiles: MeasuredRouteProfile[];
    };
  };
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

function inspectLegacyDist(): LegacySpaBaseline {
  const legacyDirectory = path.join(PROJECT_ROOT, "dist");
  if (!existsSync(legacyDirectory)) {
    return {
      available: false,
      directory: "dist",
      note:
        "The preserved legacy SPA artifact was not present. A route-specific before baseline cannot be reconstructed without rebuilding the old commit.",
    };
  }
  const files = listFiles(legacyDirectory);
  const sum = (pattern: RegExp) =>
    files
      .filter((filePath) => pattern.test(filePath))
      .reduce((total, filePath) => total + statSync(filePath).size, 0);
  const indexHtml = path.join(legacyDirectory, "index.html");
  return {
    available: true,
    directory: "dist",
    note:
      "Preserved pre-migration Vite SPA artifact. It had one generic index document, so route-specific legacy HTML measurements are unavailable; aggregate artifact evidence is reported instead.",
    fileCount: files.length,
    indexHtmlBytes: existsSync(indexHtml) ? statSync(indexHtml).size : 0,
    javascriptBytes: sum(/\.js$/i),
    cssBytes: sum(/\.css$/i),
    imageBytes: sum(/\.(?:avif|gif|jpe?g|png|svg|webp)$/i),
    totalArtifactBytes: files.reduce(
      (total, filePath) => total + statSync(filePath).size,
      0,
    ),
  };
}

function resourcePath(url: string): string | undefined {
  if (!url || /^(?:data:|https?:|\/\/)/i.test(url)) return undefined;
  const pathname = new URL(url, "https://ultrapressurewashing.net").pathname;
  const candidate = path.join(BUILD_ROOT, pathname.replace(/^\//, ""));
  if (!path.resolve(candidate).startsWith(path.resolve(BUILD_ROOT))) {
    return undefined;
  }
  return existsSync(candidate) && statSync(candidate).isFile()
    ? candidate
    : undefined;
}

function resourceBytes(urls: Iterable<string>): number {
  let bytes = 0;
  for (const url of new Set(urls)) {
    const filePath = resourcePath(url);
    if (filePath) bytes += statSync(filePath).size;
  }
  return bytes;
}

function srcsetUrls(srcset: string): string[] {
  return srcset
    .split(",")
    .map((candidate) => candidate.trim().split(/\s+/)[0] ?? "")
    .filter(Boolean);
}

function inspectRoute(routePath: string): StaticCandidateInventory {
  const htmlFile = routeHtmlFile(routePath);
  const html = readFileSync(htmlFile, "utf8");
  const $ = cheerio.load(html);
  const javascript = new Set<string>();
  const css = new Set<string>();
  const images = new Set<string>();

  $("script[src]").each((_, element) => {
    const source = $(element).attr("src");
    if (source) javascript.add(source);
  });
  $('link[rel="modulepreload"]').each((_, element) => {
    const href = $(element).attr("href");
    if (href?.endsWith(".js")) javascript.add(href);
  });
  $('link[rel="stylesheet"]').each((_, element) => {
    const href = $(element).attr("href");
    if (href) css.add(href);
  });
  $("img[src]").each((_, element) => {
    const source = $(element).attr("src");
    if (source) images.add(source);
  });
  $("img[srcset], source[srcset]").each((_, element) => {
    for (const source of srcsetUrls($(element).attr("srcset") ?? "")) {
      images.add(source);
    }
  });

  const initialHtmlBytes = statSync(htmlFile).size;
  const referencedJavaScriptBytes = resourceBytes(javascript);
  const linkedCssBytes = resourceBytes(css);
  let inlineCssBytes = 0;
  $("style[data-site-styles]").each((_, element) => {
    inlineCssBytes += Buffer.byteLength($(element).html() ?? "", "utf8");
  });
  const cssBytes = linkedCssBytes + inlineCssBytes;
  const responsiveImageCandidateBytes = resourceBytes(images);

  return {
    path: routePath,
    initialHtmlBytes,
    referencedJavaScriptBytes,
    routeSpecificJavaScriptBytes: 0,
    cssBytes,
    inlineCssBytes,
    linkedCssBytes,
    responsiveImageCandidateBytes,
    candidateInventoryBytes:
      initialHtmlBytes +
      referencedJavaScriptBytes +
      linkedCssBytes +
      responsiveImageCandidateBytes,
    referencedCandidateCount:
      1 + javascript.size + css.size + images.size,
    resources: {
      javascript: [...javascript].sort(),
      css: [...css].sort(),
      images: [...images].sort(),
    },
  };
}

function applyRouteSpecificJavaScript(
  routes: StaticCandidateInventory[],
): void {
  const usage = new Map<string, number>();
  for (const route of routes) {
    for (const resource of route.resources.javascript) {
      usage.set(resource, (usage.get(resource) ?? 0) + 1);
    }
  }
  for (const route of routes) {
    route.routeSpecificJavaScriptBytes = resourceBytes(
      route.resources.javascript.filter(
        (resource) => usage.get(resource) === 1,
      ),
    );
  }
}

function asObject(
  value: unknown,
  label: string,
): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be a JSON object.`);
  }
  return value as Record<string, unknown>;
}

function asString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${label} must be a non-empty string.`);
  }
  return value;
}

function asFiniteNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number.`);
  }
  return value;
}

function asProfile(value: unknown, label: string): Profile {
  if (value !== "mobile" && value !== "desktop") {
    throw new Error(`${label} must be mobile or desktop.`);
  }
  return value;
}

function numericAudit(
  lhr: RawLighthouseResult,
  auditId: string,
): number {
  return asFiniteNumber(
    lhr.audits?.[auditId]?.numericValue,
    `Lighthouse audit ${auditId}`,
  );
}

function categoryScore(
  lhr: RawLighthouseResult,
  category: CategoryName,
): number {
  return Math.round(
    asFiniteNumber(
      lhr.categories?.[category]?.score,
      `Lighthouse category ${category}`,
    ) * 100,
  );
}

function browserVersion(userAgent: string): string {
  const match = userAgent.match(/(?:HeadlessChrome|Chrome)\/([0-9.]+)/i);
  if (!match?.[1]) {
    throw new Error(
      `Unable to determine the exact browser version from: ${userAgent}`,
    );
  }
  return match[1];
}

function normalizeResourceType(value: unknown): string {
  if (typeof value !== "string" || value.trim() === "") return "other";
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");
}

function numericSummary(values: number[], label: string): NumericSummary {
  if (values.length !== RUNS_PER_ROUTE) {
    throw new Error(
      `${label} requires ${RUNS_PER_ROUTE} values; received ${values.length}.`,
    );
  }
  if (values.some((value) => !Number.isFinite(value))) {
    throw new Error(`${label} includes a non-finite value.`);
  }
  return {
    values,
    lowest: Math.min(...values),
    median: median(values),
    highest: Math.max(...values),
  };
}

function resolvedEvidenceFile(
  runDir: string,
  relativeFile: string,
): string {
  const resolved = path.resolve(runDir, relativeFile);
  const evidenceRoot = `${path.resolve(runDir)}${path.sep}`;
  if (!resolved.startsWith(evidenceRoot) || !existsSync(resolved)) {
    throw new Error(
      `Lighthouse evidence file is missing or outside the run directory: ${relativeFile}`,
    );
  }
  return resolved;
}

function readSummaryDocument(
  runDir: string,
  profile: Profile,
): LighthouseSummaryDocument {
  const filePath = path.join(
    runDir,
    "lighthouse",
    `${profile}-summary.json`,
  );
  if (!existsSync(filePath)) {
    throw new Error(`Missing Lighthouse summary: ${filePath}`);
  }
  const parsed = JSON.parse(
    readFileSync(filePath, "utf8"),
  ) as LighthouseSummaryDocument;
  if (parsed.profile !== profile || !Array.isArray(parsed.routes)) {
    throw new Error(`Invalid ${profile} Lighthouse summary structure.`);
  }
  if ((parsed.errors?.length ?? 0) > 0) {
    throw new Error(
      `${profile} Lighthouse summary contains run errors; measured evidence is incomplete.`,
    );
  }
  return parsed;
}

function readMeasuredRun(
  runDir: string,
  reference: LighthouseRunReference,
): MeasuredRun {
  const jsonFile = resolvedEvidenceFile(runDir, reference.reportJson);
  resolvedEvidenceFile(runDir, reference.reportHtml);
  const lhr = JSON.parse(
    readFileSync(jsonFile, "utf8"),
  ) as RawLighthouseResult;
  const lighthouseVersion = asString(
    lhr.lighthouseVersion,
    `${reference.reportJson} lighthouseVersion`,
  );
  const hostUserAgent = asString(
    lhr.environment?.hostUserAgent ?? lhr.userAgent,
    `${reference.reportJson} host user agent`,
  );
  const networkUserAgent = asString(
    lhr.environment?.networkUserAgent,
    `${reference.reportJson} network user agent`,
  );
  const settings = asObject(
    lhr.configSettings ?? {},
    `${reference.reportJson} configSettings`,
  );
  const throttling = asObject(
    settings.throttling,
    `${reference.reportJson} throttling`,
  );
  const screenEmulation = asObject(
    settings.screenEmulation,
    `${reference.reportJson} screenEmulation`,
  );
  const networkItems = lhr.audits?.["network-requests"]?.details?.items;
  if (!Array.isArray(networkItems)) {
    throw new Error(
      `${reference.reportJson} is missing network-request items.`,
    );
  }

  const displayedUrl = asString(
    lhr.finalDisplayedUrl ?? lhr.finalUrl,
    `${reference.reportJson} final URL`,
  );
  const auditedHost = new URL(displayedUrl).host;
  let transferredBytes = 0;
  let resourceBytes = 0;
  let firstPartyBytes = 0;
  let thirdPartyBytes = 0;
  let firstPartyRequestCount = 0;
  let thirdPartyRequestCount = 0;
  const byResourceType = new Map<string, number>();

  for (const [index, candidate] of networkItems.entries()) {
    const item = asObject(
      candidate,
      `${reference.reportJson} network request ${index + 1}`,
    ) as RawNetworkRequest;
    const transferSize =
      typeof item.transferSize === "number" &&
      Number.isFinite(item.transferSize)
        ? item.transferSize
        : 0;
    const resourceSize =
      typeof item.resourceSize === "number" &&
      Number.isFinite(item.resourceSize)
        ? item.resourceSize
        : 0;
    const resourceType = normalizeResourceType(item.resourceType);
    transferredBytes += transferSize;
    resourceBytes += resourceSize;
    byResourceType.set(
      resourceType,
      (byResourceType.get(resourceType) ?? 0) + transferSize,
    );

    const requestUrl =
      typeof item.url === "string" ? item.url : displayedUrl;
    let isFirstParty = true;
    try {
      isFirstParty = new URL(requestUrl).host === auditedHost;
    } catch {
      // Invalid/non-network URLs are conservatively treated as first party.
    }
    if (isFirstParty) {
      firstPartyBytes += transferSize;
      firstPartyRequestCount += 1;
    } else {
      thirdPartyBytes += transferSize;
      thirdPartyRequestCount += 1;
    }
  }

  return {
    route: reference.route,
    profile: reference.profile,
    run: reference.run,
    source: {
      json: reference.reportJson.replaceAll("\\", "/"),
      html: reference.reportHtml.replaceAll("\\", "/"),
    },
    fetchTime: asString(
      lhr.fetchTime,
      `${reference.reportJson} fetchTime`,
    ),
    lighthouseVersion,
    browser: {
      version: browserVersion(hostUserAgent),
      hostUserAgent,
      networkUserAgent,
    },
    settings: {
      formFactor: asString(
        settings.formFactor,
        `${reference.reportJson} formFactor`,
      ),
      throttlingMethod: asString(
        settings.throttlingMethod,
        `${reference.reportJson} throttlingMethod`,
      ),
      throttling,
      screenEmulation,
      emulatedUserAgent: asString(
        settings.emulatedUserAgent,
        `${reference.reportJson} emulatedUserAgent`,
      ),
    },
    scores: {
      performance: categoryScore(lhr, "performance"),
      accessibility: categoryScore(lhr, "accessibility"),
      "best-practices": categoryScore(lhr, "best-practices"),
      seo: categoryScore(lhr, "seo"),
    },
    metrics: {
      lcpMs: numericAudit(lhr, "largest-contentful-paint"),
      cls: numericAudit(lhr, "cumulative-layout-shift"),
      tbtMs: numericAudit(lhr, "total-blocking-time"),
      speedIndexMs: numericAudit(lhr, "speed-index"),
      lighthouseTotalByteWeight: numericAudit(
        lhr,
        "total-byte-weight",
      ),
    },
    networkTransfer: {
      transferredBytes,
      resourceBytes,
      requestCount: networkItems.length,
      firstPartyBytes,
      thirdPartyBytes,
      firstPartyRequestCount,
      thirdPartyRequestCount,
      byResourceType: Object.fromEntries(
        [...byResourceType.entries()].sort(([left], [right]) =>
          left.localeCompare(right),
        ),
      ),
    },
  };
}

function summarizeMeasuredRuns(
  route: string,
  profile: Profile,
  runs: MeasuredRun[],
): MeasuredRouteProfile {
  const sortedRuns = [...runs].sort((left, right) => left.run - right.run);
  const summarizeScore = (category: CategoryName) =>
    numericSummary(
      sortedRuns.map((run) => run.scores[category]),
      `${route} ${profile} ${category}`,
    );
  const summarizeMetric = (metric: keyof MeasuredRun["metrics"]) =>
    numericSummary(
      sortedRuns.map((run) => run.metrics[metric]),
      `${route} ${profile} ${metric}`,
    );
  const summarizeTransfer = (
    metric: Exclude<
      keyof MeasuredRun["networkTransfer"],
      "byResourceType"
    >,
  ) =>
    numericSummary(
      sortedRuns.map((run) => run.networkTransfer[metric]),
      `${route} ${profile} ${metric}`,
    );
  const resourceTypes = [
    ...new Set(
      sortedRuns.flatMap((run) =>
        Object.keys(run.networkTransfer.byResourceType),
      ),
    ),
  ].sort();

  return {
    route,
    profile,
    runs: sortedRuns,
    scores: {
      performance: summarizeScore("performance"),
      accessibility: summarizeScore("accessibility"),
      "best-practices": summarizeScore("best-practices"),
      seo: summarizeScore("seo"),
    },
    metrics: {
      lcpMs: summarizeMetric("lcpMs"),
      cls: summarizeMetric("cls"),
      tbtMs: summarizeMetric("tbtMs"),
      speedIndexMs: summarizeMetric("speedIndexMs"),
      lighthouseTotalByteWeight: summarizeMetric(
        "lighthouseTotalByteWeight",
      ),
    },
    networkTransfer: {
      transferredBytes: summarizeTransfer("transferredBytes"),
      resourceBytes: summarizeTransfer("resourceBytes"),
      requestCount: summarizeTransfer("requestCount"),
      firstPartyBytes: summarizeTransfer("firstPartyBytes"),
      thirdPartyBytes: summarizeTransfer("thirdPartyBytes"),
      firstPartyRequestCount: summarizeTransfer(
        "firstPartyRequestCount",
      ),
      thirdPartyRequestCount: summarizeTransfer(
        "thirdPartyRequestCount",
      ),
      byResourceType: Object.fromEntries(
        resourceTypes.map((resourceType) => [
          resourceType,
          numericSummary(
            sortedRuns.map(
              (run) =>
                run.networkTransfer.byResourceType[resourceType] ?? 0,
            ),
            `${route} ${profile} ${resourceType} transfer`,
          ),
        ]),
      ),
    },
  };
}

function uniqueValue<T>(
  values: T[],
  label: string,
  serialize: (value: T) => string = (value) => JSON.stringify(value),
): T {
  if (values.length === 0) {
    throw new Error(`${label} has no values.`);
  }
  const unique = new Map(
    values.map((value) => [serialize(value), value]),
  );
  if (unique.size !== 1) {
    throw new Error(`${label} changed between authoritative runs.`);
  }
  return values[0]!;
}

function collectMeasuredEvidence(runDir: string): {
  environment: LighthouseEnvironment;
  routeProfiles: MeasuredRouteProfile[];
  lhrCount: number;
} {
  const routeProfiles: MeasuredRouteProfile[] = [];
  const summaryDocuments = new Map<Profile, LighthouseSummaryDocument>();

  for (const profile of PROFILES) {
    const summary = readSummaryDocument(runDir, profile);
    summaryDocuments.set(profile, summary);
    const routeMap = new Map(
      summary.routes.map((route) => [route.route, route]),
    );
    for (const route of PUBLIC_ROUTES) {
      const summaryRoute = routeMap.get(route.path);
      if (!summaryRoute) {
        throw new Error(
          `${profile} Lighthouse summary omits ${route.path}.`,
        );
      }
      if (
        summaryRoute.profile !== profile ||
        summaryRoute.runs.length !== RUNS_PER_ROUTE
      ) {
        throw new Error(
          `${route.path} ${profile} must contain ${RUNS_PER_ROUTE} runs.`,
        );
      }
      const runs = summaryRoute.runs.map((reference) => {
        if (
          reference.route !== route.path ||
          reference.profile !== profile
        ) {
          throw new Error(
            `${route.path} ${profile} contains a mismatched run reference.`,
          );
        }
        return readMeasuredRun(runDir, reference);
      });
      routeProfiles.push(
        summarizeMeasuredRuns(route.path, profile, runs),
      );
    }
  }

  const allRuns = routeProfiles.flatMap((route) => route.runs);
  const lighthouseVersion = uniqueValue(
    allRuns.map((run) => run.lighthouseVersion),
    "Lighthouse version",
  );
  const detectedBrowserVersion = uniqueValue(
    allRuns.map((run) => run.browser.version),
    "Browser version",
  );
  const browserHostUserAgent = uniqueValue(
    allRuns.map((run) => run.browser.hostUserAgent),
    "Browser host user agent",
  );
  const profileSettings = Object.fromEntries(
    PROFILES.map((profile) => {
      const profileRuns = allRuns.filter(
        (run) => run.profile === profile,
      );
      const representative = uniqueValue(
        profileRuns.map((run) => ({
          formFactor: run.settings.formFactor,
          throttlingMethod: run.settings.throttlingMethod,
          throttling: run.settings.throttling,
          screenEmulation: run.settings.screenEmulation,
          emulatedUserAgent: run.settings.emulatedUserAgent,
          networkUserAgent: run.browser.networkUserAgent,
        })),
        `${profile} Lighthouse settings`,
      );
      return [profile, representative];
    }),
  ) as LighthouseEnvironment["profiles"];
  const fetchTimes = allRuns
    .map((run) => run.fetchTime)
    .sort((left, right) => left.localeCompare(right));
  const browserExecutablePath = uniqueValue(
    PROFILES.map(
      (profile) =>
        summaryDocuments.get(profile)?.chromePath ?? null,
    ),
    "Chrome executable path",
  );

  return {
    environment: {
      lighthouseVersion,
      browserVersion: detectedBrowserVersion,
      browserHostUserAgent,
      browserExecutablePath,
      fetchTimeRange: {
        earliest: fetchTimes[0]!,
        latest: fetchTimes.at(-1)!,
      },
      profiles: profileSettings,
    },
    routeProfiles,
    lhrCount: allRuns.length,
  };
}

function budgetCeiling(value: number, minimum: number): number {
  const withHeadroom = Math.max(minimum, Math.ceil(value * 1.1));
  return Math.ceil(withHeadroom / 1024) * 1024;
}

function createStaticBudget(
  route: StaticCandidateInventory,
): StaticCandidateBudget {
  return {
    path: route.path,
    maximumHtmlBytes: budgetCeiling(
      route.initialHtmlBytes,
      32 * 1024,
    ),
    maximumReferencedJavaScriptBytes: budgetCeiling(
      route.referencedJavaScriptBytes,
      64 * 1024,
    ),
    maximumRouteSpecificJavaScriptBytes: budgetCeiling(
      route.routeSpecificJavaScriptBytes,
      16 * 1024,
    ),
    maximumCssBytes: budgetCeiling(route.cssBytes, 32 * 1024),
    maximumResponsiveImageCandidateBytes: budgetCeiling(
      route.responsiveImageCandidateBytes,
      128 * 1024,
    ),
    maximumCandidateInventoryBytes: budgetCeiling(
      route.candidateInventoryBytes,
      256 * 1024,
    ),
    maximumReferencedCandidateCount: route.referencedCandidateCount + 5,
  };
}

function transferTypeHighest(
  routeProfile: MeasuredRouteProfile,
  resourceType: string,
): number {
  return (
    routeProfile.networkTransfer.byResourceType[resourceType]?.highest ??
    0
  );
}

function createMeasuredBudget(
  routeProfile: MeasuredRouteProfile,
): MeasuredTransferBudget {
  return {
    path: routeProfile.route,
    profile: routeProfile.profile,
    maximumTransferredBytes: budgetCeiling(
      routeProfile.networkTransfer.transferredBytes.highest,
      128 * 1024,
    ),
    maximumRequestCount:
      routeProfile.networkTransfer.requestCount.highest + 3,
    maximumScriptTransferBytes: budgetCeiling(
      transferTypeHighest(routeProfile, "script"),
      32 * 1024,
    ),
    maximumImageTransferBytes: budgetCeiling(
      transferTypeHighest(routeProfile, "image"),
      32 * 1024,
    ),
    maximumStylesheetTransferBytes: budgetCeiling(
      transferTypeHighest(routeProfile, "stylesheet"),
      8 * 1024,
    ),
  };
}

function validateNumericSummary(
  value: unknown,
  label: string,
): void {
  const object = asObject(value, label);
  if (
    !Array.isArray(object.values) ||
    object.values.length !== RUNS_PER_ROUTE
  ) {
    throw new Error(
      `${label}.values must contain ${RUNS_PER_ROUTE} run values.`,
    );
  }
  const values = object.values.map((entry, index) =>
    asFiniteNumber(entry, `${label}.values[${index}]`),
  );
  const expected = numericSummary(values, label);
  for (const key of ["lowest", "median", "highest"] as const) {
    if (asFiniteNumber(object[key], `${label}.${key}`) !== expected[key]) {
      throw new Error(`${label}.${key} does not match its run values.`);
    }
  }
}

function validatePerformancePayload(value: unknown): string[] {
  const checks: string[] = [];
  const root = asObject(value, "performance payload");
  if (root.schemaVersion !== PERFORMANCE_SCHEMA_VERSION) {
    throw new Error("Unexpected performance schema version.");
  }
  checks.push("schema-version");
  const evidence = asObject(root.evidence, "evidence");
  const expectedLhrCount = asFiniteNumber(
    evidence.expectedLhrCount,
    "evidence.expectedLhrCount",
  );
  const actualLhrCount = asFiniteNumber(
    evidence.actualLhrCount,
    "evidence.actualLhrCount",
  );
  if (
    expectedLhrCount !== PUBLIC_ROUTES.length * PROFILES.length * RUNS_PER_ROUTE ||
    actualLhrCount !== expectedLhrCount
  ) {
    throw new Error(
      `Expected ${expectedLhrCount} authoritative LHRs; received ${actualLhrCount}.`,
    );
  }
  checks.push("authoritative-lhr-count");
  const after = asObject(root.after, "after");
  const staticInventory = asObject(
    after.staticCandidateInventory,
    "after.staticCandidateInventory",
  );
  if (
    !Array.isArray(staticInventory.routes) ||
    staticInventory.routes.length !== PUBLIC_ROUTES.length ||
    staticInventory.routes.some(
      (route) => !route || typeof route !== "object" || Array.isArray(route),
    )
  ) {
    throw new Error(
      "Static candidate inventory must contain one JSON object per public route.",
    );
  }
  checks.push("static-candidate-inventory-objects");
  const measured = asObject(
    after.measuredBrowserRuns,
    "after.measuredBrowserRuns",
  );
  const environment = asObject(
    measured.environment,
    "after.measuredBrowserRuns.environment",
  );
  asString(environment.lighthouseVersion, "environment.lighthouseVersion");
  asString(environment.browserVersion, "environment.browserVersion");
  const profileMetadata = asObject(
    environment.profiles,
    "environment.profiles",
  );
  for (const profile of PROFILES) {
    const metadata = asObject(
      profileMetadata[profile],
      `environment.profiles.${profile}`,
    );
    asString(
      metadata.throttlingMethod,
      `environment.profiles.${profile}.throttlingMethod`,
    );
    asObject(
      metadata.throttling,
      `environment.profiles.${profile}.throttling`,
    );
    asObject(
      metadata.screenEmulation,
      `environment.profiles.${profile}.screenEmulation`,
    );
  }
  checks.push("exact-browser-device-throttling-metadata");
  if (
    !Array.isArray(measured.routeProfiles) ||
    measured.routeProfiles.length !== PUBLIC_ROUTES.length * PROFILES.length
  ) {
    throw new Error(
      "Measured route/profile evidence must contain 22 entries.",
    );
  }
  const expectedKeys = new Set(
    PROFILES.flatMap((profile) =>
      PUBLIC_ROUTES.map((route) => `${profile}:${route.path}`),
    ),
  );
  for (const [index, candidate] of measured.routeProfiles.entries()) {
    const routeProfile = asObject(
      candidate,
      `measured.routeProfiles[${index}]`,
    );
    const route = asString(
      routeProfile.route,
      `routeProfiles[${index}].route`,
    );
    const profile = asProfile(
      routeProfile.profile,
      `routeProfiles[${index}].profile`,
    );
    const key = `${profile}:${route}`;
    if (!expectedKeys.delete(key)) {
      throw new Error(`Unexpected or duplicate route/profile: ${key}`);
    }
    const runEntries = routeProfile.runs;
    if (
      !Array.isArray(runEntries) ||
      runEntries.length !== RUNS_PER_ROUTE ||
      runEntries.some(
        (run) => !run || typeof run !== "object" || Array.isArray(run),
      )
    ) {
      throw new Error(
        `${key} runs must be an array of ${RUNS_PER_ROUTE} JSON objects.`,
      );
    }
    for (const [runIndex, runEntry] of runEntries.entries()) {
      const run = asObject(runEntry, `${key}.runs[${runIndex}]`);
      if (
        run.route !== route ||
        run.profile !== profile ||
        asFiniteNumber(run.run, `${key}.runs[${runIndex}].run`) !==
          runIndex + 1
      ) {
        throw new Error(
          `${key}.runs[${runIndex}] has mismatched route, profile, or run number.`,
        );
      }
      const runScores = asObject(
        run.scores,
        `${key}.runs[${runIndex}].scores`,
      );
      for (const category of CATEGORY_NAMES) {
        asFiniteNumber(
          runScores[category],
          `${key}.runs[${runIndex}].scores.${category}`,
        );
      }
      const runMetrics = asObject(
        run.metrics,
        `${key}.runs[${runIndex}].metrics`,
      );
      for (const metric of [
        "lcpMs",
        "cls",
        "tbtMs",
        "speedIndexMs",
        "lighthouseTotalByteWeight",
      ]) {
        asFiniteNumber(
          runMetrics[metric],
          `${key}.runs[${runIndex}].metrics.${metric}`,
        );
      }
      const runNetwork = asObject(
        run.networkTransfer,
        `${key}.runs[${runIndex}].networkTransfer`,
      );
      const runTransferredBytes = asFiniteNumber(
        runNetwork.transferredBytes,
        `${key}.runs[${runIndex}].networkTransfer.transferredBytes`,
      );
      const runByResourceType = asObject(
        runNetwork.byResourceType,
        `${key}.runs[${runIndex}].networkTransfer.byResourceType`,
      );
      const resourceTypeTotal = Object.entries(runByResourceType).reduce(
        (total, [resourceType, bytes]) =>
          total +
          asFiniteNumber(
            bytes,
            `${key}.runs[${runIndex}].networkTransfer.byResourceType.${resourceType}`,
          ),
        0,
      );
      if (resourceTypeTotal !== runTransferredBytes) {
        throw new Error(
          `${key}.runs[${runIndex}] resource-type transfer bytes do not sum to the run total.`,
        );
      }
    }
    const scores = asObject(
      routeProfile.scores,
      `${key}.scores`,
    );
    for (const category of CATEGORY_NAMES) {
      validateNumericSummary(
        scores[category],
        `${key}.scores.${category}`,
      );
    }
    const metrics = asObject(
      routeProfile.metrics,
      `${key}.metrics`,
    );
    for (const metric of [
      "lcpMs",
      "cls",
      "tbtMs",
      "speedIndexMs",
      "lighthouseTotalByteWeight",
    ]) {
      validateNumericSummary(metrics[metric], `${key}.metrics.${metric}`);
    }
    const network = asObject(
      routeProfile.networkTransfer,
      `${key}.networkTransfer`,
    );
    for (const metric of [
      "transferredBytes",
      "resourceBytes",
      "requestCount",
      "firstPartyBytes",
      "thirdPartyBytes",
      "firstPartyRequestCount",
      "thirdPartyRequestCount",
    ]) {
      validateNumericSummary(
        network[metric],
        `${key}.networkTransfer.${metric}`,
      );
    }
    const byResourceType = asObject(
      network.byResourceType,
      `${key}.networkTransfer.byResourceType`,
    );
    for (const [resourceType, summary] of Object.entries(
      byResourceType,
    )) {
      validateNumericSummary(
        summary,
        `${key}.networkTransfer.byResourceType.${resourceType}`,
      );
    }
  }
  if (expectedKeys.size !== 0) {
    throw new Error(
      `Missing route/profile evidence: ${[...expectedKeys].join(", ")}`,
    );
  }
  checks.push("route-profile-run-objects");
  checks.push("run-level-transfer-sums");
  checks.push("numeric-summary-consistency");
  checks.push("transfer-breakdown-by-resource-type");
  return checks;
}

function scoreRange(summary: NumericSummary): string {
  return `${summary.lowest}/${summary.median}/${summary.highest}`;
}

function roundedRange(
  summary: NumericSummary,
  suffix = "",
): string {
  return `${Math.round(summary.lowest)}/${Math.round(
    summary.median,
  )}/${Math.round(summary.highest)}${suffix}`;
}

function clsRange(summary: NumericSummary): string {
  return `${summary.lowest.toFixed(3)}/${summary.median.toFixed(
    3,
  )}/${summary.highest.toFixed(3)}`;
}

function metadataLines(environment: LighthouseEnvironment): string[] {
  const lines = [
    `- Lighthouse: ${environment.lighthouseVersion}`,
    `- Browser: Chrome ${environment.browserVersion}`,
    `- Browser user agent: \`${environment.browserHostUserAgent}\``,
    `- Browser executable: \`${environment.browserExecutablePath ?? "not recorded"}\``,
    `- Authoritative fetch window: ${environment.fetchTimeRange.earliest} through ${environment.fetchTimeRange.latest}`,
  ];
  for (const profile of PROFILES) {
    const settings = environment.profiles[profile];
    const viewport = settings.screenEmulation;
    const throttling = settings.throttling;
    lines.push(
      `- ${profile}: form factor ${settings.formFactor}; ${settings.throttlingMethod} throttling; viewport ${String(
        viewport.width ?? "n/a",
      )}x${String(viewport.height ?? "n/a")} at ${String(
        viewport.deviceScaleFactor ?? "n/a",
      )}x; RTT ${String(throttling.rttMs ?? "n/a")} ms; throughput ${String(
        throttling.throughputKbps ?? "n/a",
      )} Kbps; CPU slowdown ${String(
        throttling.cpuSlowdownMultiplier ?? "n/a",
      )}x.`,
    );
    lines.push(
      `- ${profile} emulated user agent: \`${settings.emulatedUserAgent}\``,
    );
  }
  return lines;
}

function toMarkdown(
  generatedAt: string,
  legacy: LegacySpaBaseline,
  staticRoutes: StaticCandidateInventory[],
  routeProfiles: MeasuredRouteProfile[],
  environment: LighthouseEnvironment,
  staticBudgets: StaticCandidateBudget[],
  measuredBudgets: MeasuredTransferBudget[],
): string {
  const lines = [
    "# Performance evidence and regression budgets",
    "",
    `- Generated: ${generatedAt}`,
    `- Schema: ${PERFORMANCE_SCHEMA_VERSION}`,
    `- Authoritative browser evidence: ${routeProfiles.reduce(
      (total, route) => total + route.runs.length,
      0,
    )} existing Lighthouse JSON reports; no browser rerun.`,
    "",
    "## Before baseline - preserved legacy SPA artifact",
    "",
    `- Available: ${legacy.available ? "yes" : "no"}`,
    `- Directory: \`${legacy.directory}\``,
    `- ${legacy.note}`,
  ];
  if (legacy.available) {
    lines.push(
      `- Files: ${legacy.fileCount}`,
      `- Generic index HTML: ${legacy.indexHtmlBytes} bytes`,
      `- JavaScript: ${legacy.javascriptBytes} bytes`,
      `- CSS: ${legacy.cssBytes} bytes`,
      `- Images: ${legacy.imageBytes} bytes`,
      `- Total artifact: ${legacy.totalArtifactBytes} bytes`,
    );
  }
  lines.push(
    "",
    "## Static candidate inventory - not transferred bytes",
    "",
    "- These values inventory generated HTML and every locally referenced script, stylesheet, fallback image, and responsive image candidate.",
    "- A browser selects only some responsive candidates. Therefore image and total candidate inventory must not be described as page transfer or load weight.",
    "- The measured Lighthouse tables below are authoritative for actual requests and transferred bytes.",
    "",
    "| Route | HTML | Referenced JS | Route-only JS | CSS total (inline/linked) | Responsive image candidates | Candidate inventory | Candidate references |",
    "|---|---:|---:|---:|---:|---:|---:|---:|",
  );
  for (const route of staticRoutes) {
    lines.push(
      `| ${markdownCell(route.path)} | ${route.initialHtmlBytes} | ${route.referencedJavaScriptBytes} | ${route.routeSpecificJavaScriptBytes} | ${route.cssBytes} (${route.inlineCssBytes}/${route.linkedCssBytes}) | ${route.responsiveImageCandidateBytes} | ${route.candidateInventoryBytes} | ${route.referencedCandidateCount} |`,
    );
  }
  lines.push(
    "",
    "## Authoritative Lighthouse environment",
    "",
    ...metadataLines(environment),
    "",
    "## Measured route and profile results",
    "",
    "- Every cell is lowest/median/highest across three cold-load runs.",
    "- `Transferred` is the sum of `transferSize` for Lighthouse `network-requests`; `Lighthouse bytes` is the Lighthouse total-byte-weight audit.",
    "",
    "| Route | Profile | Perf | A11y | Best Practices | SEO | LCP | CLS | TBT | Speed Index | Transferred | Lighthouse bytes | Requests |",
    "|---|---|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|",
  );
  for (const route of routeProfiles) {
    lines.push(
      `| ${markdownCell(route.route)} | ${route.profile} | ${scoreRange(
        route.scores.performance,
      )} | ${scoreRange(route.scores.accessibility)} | ${scoreRange(
        route.scores["best-practices"],
      )} | ${scoreRange(route.scores.seo)} | ${roundedRange(
        route.metrics.lcpMs,
        " ms",
      )} | ${clsRange(route.metrics.cls)} | ${roundedRange(
        route.metrics.tbtMs,
        " ms",
      )} | ${roundedRange(
        route.metrics.speedIndexMs,
        " ms",
      )} | ${roundedRange(
        route.networkTransfer.transferredBytes,
        " B",
      )} | ${roundedRange(
        route.metrics.lighthouseTotalByteWeight,
        " B",
      )} | ${roundedRange(route.networkTransfer.requestCount)} |`,
    );
  }
  lines.push(
    "",
    "## Measured transfer by resource type",
    "",
    "- Every value is transferred bytes as lowest/median/highest across three runs.",
    "",
    "| Route | Profile | Resource type | Transferred bytes low/median/high |",
    "|---|---|---|---:|",
  );
  for (const route of routeProfiles) {
    for (const [resourceType, summary] of Object.entries(
      route.networkTransfer.byResourceType,
    )) {
      lines.push(
        `| ${markdownCell(route.route)} | ${route.profile} | ${resourceType} | ${roundedRange(
          summary,
        )} |`,
      );
    }
  }
  lines.push(
    "",
    "## Score and Core Web Vitals laboratory exceptions",
    "",
  );
  const exceptions = routeProfiles.flatMap((route) => {
    const entries: string[] = [];
    for (const category of CATEGORY_NAMES) {
      if (route.scores[category].lowest < 100) {
        entries.push(
          `- ${route.route} (${route.profile}) ${category}: ${scoreRange(
            route.scores[category],
          )}.`,
        );
      }
    }
    if (route.metrics.lcpMs.highest > 2500) {
      entries.push(
        `- ${route.route} (${route.profile}) LCP: ${roundedRange(
          route.metrics.lcpMs,
          " ms",
        )}; highest run exceeds 2500 ms.`,
      );
    }
    if (route.metrics.cls.highest >= 0.1) {
      entries.push(
        `- ${route.route} (${route.profile}) CLS: ${clsRange(
          route.metrics.cls,
        )}; highest run is not below 0.1.`,
      );
    }
    if (route.metrics.tbtMs.highest >= 200) {
      entries.push(
        `- ${route.route} (${route.profile}) TBT: ${roundedRange(
          route.metrics.tbtMs,
          " ms",
        )}; highest run is not below 200 ms.`,
      );
    }
    return entries;
  });
  lines.push(
    ...(exceptions.length > 0
      ? exceptions
      : ["- None; every measured target passed."]),
    "",
    "## Static candidate-inventory budgets",
    "",
    "- These budgets detect source/build asset growth. They are deliberately separate from browser-transfer budgets.",
    "",
    "| Route | HTML max | Referenced JS max | Route JS max | CSS max | Responsive candidates max | Candidate inventory max | Candidate reference max |",
    "|---|---:|---:|---:|---:|---:|---:|---:|",
  );
  for (const budget of staticBudgets) {
    lines.push(
      `| ${markdownCell(budget.path)} | ${budget.maximumHtmlBytes} | ${budget.maximumReferencedJavaScriptBytes} | ${budget.maximumRouteSpecificJavaScriptBytes} | ${budget.maximumCssBytes} | ${budget.maximumResponsiveImageCandidateBytes} | ${budget.maximumCandidateInventoryBytes} | ${budget.maximumReferencedCandidateCount} |`,
    );
  }
  lines.push(
    "",
    "## Measured browser-transfer budgets",
    "",
    "- Budgets use the highest of three measured runs plus 10% byte headroom (with small floors) and three request-count requests of headroom.",
    "",
    "| Route | Profile | Transfer max | Requests max | Script max | Image max | Stylesheet max |",
    "|---|---|---:|---:|---:|---:|---:|",
  );
  for (const budget of measuredBudgets) {
    lines.push(
      `| ${markdownCell(budget.path)} | ${budget.profile} | ${budget.maximumTransferredBytes} | ${budget.maximumRequestCount} | ${budget.maximumScriptTransferBytes} | ${budget.maximumImageTransferBytes} | ${budget.maximumStylesheetTransferBytes} |`,
    );
  }
  return lines.join("\n");
}

const runDir = resolveRunDir();
const generatedAt = new Date().toISOString();
const legacy = inspectLegacyDist();
const staticRoutes = PUBLIC_ROUTES.map((route) =>
  inspectRoute(route.path),
);
applyRouteSpecificJavaScript(staticRoutes);
const measured = collectMeasuredEvidence(runDir);
const expectedLhrCount =
  PUBLIC_ROUTES.length * PROFILES.length * RUNS_PER_ROUTE;
const payload: PerformancePayload = {
  schemaVersion: PERFORMANCE_SCHEMA_VERSION,
  generatedAt,
  evidence: {
    expectedLhrCount,
    actualLhrCount: measured.lhrCount,
    runsPerRouteAndProfile: RUNS_PER_ROUTE,
    routeCount: PUBLIC_ROUTES.length,
    profiles: PROFILES,
    source:
      "Existing authoritative Lighthouse JSON reports; no browser rerun.",
  },
  before: legacy,
  after: {
    label: "Optimized React Router prerendered build/client output",
    staticCandidateInventory: {
      method:
        "Generated HTML plus every locally referenced candidate asset. This is not browser transfer.",
      warning:
        "Responsive image candidate bytes include alternatives the browser does not download.",
      routes: staticRoutes,
    },
    measuredBrowserRuns: {
      method:
        "Parsed directly from 66 authoritative Lighthouse JSON reports; transferSize is grouped from network-requests by resourceType.",
      environment: measured.environment,
      routeProfiles: measured.routeProfiles,
    },
  },
};

const validationChecks = validatePerformancePayload(payload);
const baselineFile = path.join(
  runDir,
  "performance",
  "baseline.json",
);
writeJson(baselineFile, payload);
const roundTrippedPayload = JSON.parse(
  readFileSync(baselineFile, "utf8"),
) as unknown;
const roundTripChecks = validatePerformancePayload(roundTrippedPayload);
const staticBudgets = staticRoutes.map(createStaticBudget);
const measuredBudgets = measured.routeProfiles.map(createMeasuredBudget);

writeJson(path.join(runDir, "performance", "budgets.json"), {
  schemaVersion: PERFORMANCE_SCHEMA_VERSION,
  generatedAt,
  method: {
    staticCandidateInventory:
      "Highest local candidate inventory plus 10% byte headroom and small minimum floors.",
    measuredBrowserTransfer:
      "Highest of three authoritative browser runs plus 10% byte headroom and small minimum floors; request counts receive three requests of headroom.",
  },
  staticCandidateInventoryBudgets: staticBudgets,
  measuredBrowserTransferBudgets: measuredBudgets,
});
writeJson(
  path.join(runDir, "performance", "schema-validation.json"),
  {
    schemaVersion: PERFORMANCE_SCHEMA_VERSION,
    generatedAt,
    status: "pass",
    checks: [...new Set([...validationChecks, ...roundTripChecks])],
    validatedFile: "performance/baseline.json",
    expectedLhrCount,
    actualLhrCount: measured.lhrCount,
    note:
      "The written JSON was read back and validated; runs, scores, metrics, and resource-type transfer summaries remain nested JSON objects and arrays.",
  },
);
writeText(
  path.join(runDir, "performance", "report.md"),
  toMarkdown(
    generatedAt,
    legacy,
    staticRoutes,
    measured.routeProfiles,
    measured.environment,
    staticBudgets,
    measuredBudgets,
  ),
);
process.stdout.write(
  `Performance evidence: ${staticRoutes.length} public routes, ${measured.routeProfiles.length} route/profile summaries, and ${measured.lhrCount} authoritative LHRs validated.\n`,
);
