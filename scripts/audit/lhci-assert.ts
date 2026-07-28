import {
  copyFileSync,
  existsSync,
  readFileSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { PUBLIC_ROUTES } from "../../src/data/routes";
import {
  PROJECT_ROOT,
  ensureDir,
  markdownCell,
  median,
  resolveRunDir,
  writeJson,
  writeText,
} from "./common";

type Profile = "mobile" | "desktop";

interface LighthouseResult {
  lighthouseVersion: string;
  requestedUrl?: string;
  finalUrl?: string;
  finalDisplayedUrl?: string;
  fetchTime?: string;
  userAgent?: string;
  environment?: {
    hostUserAgent?: string;
    networkUserAgent?: string;
    benchmarkIndex?: number;
  };
  configSettings?: {
    formFactor?: string;
    throttlingMethod?: string;
    throttling?: Record<string, unknown>;
    screenEmulation?: Record<string, unknown>;
    emulatedUserAgent?: string;
    locale?: string;
    channel?: string;
  };
  categories: Record<string, unknown>;
}

interface LighthouseInput {
  profile: Profile;
  route: string;
  run: number;
  source: string;
  result: LighthouseResult;
}

interface RawAssertion {
  name: string;
  expected: number;
  actual: number;
  values: number[];
  operator: string;
  passed: boolean;
  auditProperty?: string;
  auditId: string;
  level: string;
  url: string;
}

interface NormalizedAssertion extends RawAssertion {
  profile: Profile;
  route: string;
  assertion: string;
}

interface ProfileReport {
  generatedAt: string;
  profile: Profile;
  status: "pass" | "failure";
  exitCode: number;
  signal: NodeJS.Signals | null;
  command: string[];
  lhciVersion: string;
  lhrCount: number;
  routeCount: number;
  runsPerRoute: number;
  metadata: ReturnType<typeof profileMetadata>;
  inputs: Array<{
    route: string;
    run: number;
    source: string;
    fetchTime: string | null;
    benchmarkIndex: number | null;
  }>;
  assertionSummary: {
    total: number;
    passed: number;
    failed: number;
  };
  assertions: NormalizedAssertion[];
  cliOutput: string;
}

const PROFILES: readonly Profile[] = ["mobile", "desktop"];
const RUNS_PER_ROUTE = 3;
const ROUTE_ORDER = new Map(
  PUBLIC_ROUTES.map((route, index) => [route.path, index]),
);
const ASSERTION_ORDER = [
  "categories.performance",
  "categories.accessibility",
  "categories.best-practices",
  "categories.seo",
  "largest-contentful-paint",
  "cumulative-layout-shift",
  "total-blocking-time",
];

function listFiles(directory: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...listFiles(filePath));
    else if (entry.isFile()) files.push(filePath);
  }
  return files;
}

function normalizeRoute(value: string): string {
  const pathname = new URL(value).pathname;
  if (pathname === "/") return pathname;
  return pathname.replace(/\/+$/, "");
}

function resultUrl(result: LighthouseResult): string {
  const value =
    result.finalDisplayedUrl ?? result.finalUrl ?? result.requestedUrl;
  if (!value) throw new Error("A Lighthouse result is missing its audited URL.");
  return value;
}

function loadInputs(
  lighthouseDirectory: string,
  profile: Profile,
): LighthouseInput[] {
  const profileDirectory = path.join(lighthouseDirectory, profile);
  const inputs = listFiles(profileDirectory)
    .filter((filePath) => /run-\d+\.report\.json$/.test(filePath))
    .map((filePath) => {
      const runMatch = path.basename(filePath).match(/^run-(\d+)\.report\.json$/);
      if (!runMatch) throw new Error(`Unable to identify run: ${filePath}`);
      const parsed = JSON.parse(
        readFileSync(filePath, "utf8"),
      ) as LighthouseResult;
      if (
        typeof parsed.lighthouseVersion !== "string" ||
        !parsed.categories ||
        typeof parsed.categories !== "object"
      ) {
        throw new Error(`Not a complete Lighthouse result: ${filePath}`);
      }
      const route = normalizeRoute(resultUrl(parsed));
      if (!ROUTE_ORDER.has(route)) {
        throw new Error(`Unexpected ${profile} Lighthouse route: ${route}`);
      }
      return {
        profile,
        route,
        run: Number(runMatch[1]),
        source: path
          .relative(lighthouseDirectory, filePath)
          .replaceAll("\\", "/"),
        result: parsed,
      };
    })
    .sort(
      (left, right) =>
        (ROUTE_ORDER.get(left.route) ?? Number.MAX_SAFE_INTEGER) -
          (ROUTE_ORDER.get(right.route) ?? Number.MAX_SAFE_INTEGER) ||
        left.run - right.run,
    );

  const expectedCount = PUBLIC_ROUTES.length * RUNS_PER_ROUTE;
  if (inputs.length !== expectedCount) {
    throw new Error(
      `Expected ${expectedCount} ${profile} LHRs, found ${inputs.length}.`,
    );
  }
  for (const route of PUBLIC_ROUTES) {
    const runs = inputs
      .filter((input) => input.route === route.path)
      .map((input) => input.run);
    if (JSON.stringify(runs) !== JSON.stringify([1, 2, 3])) {
      throw new Error(
        `Expected ${route.path} ${profile} runs 1, 2, and 3; found ${runs.join(", ")}.`,
      );
    }
  }
  return inputs;
}

function singleRecordedValue<T>(
  values: T[],
  label: string,
): T {
  const distinct = new Map(
    values.map((value) => [JSON.stringify(value), value]),
  );
  if (distinct.size !== 1) {
    throw new Error(
      `${label} differs across recorded LHRs: ${[...distinct.keys()].join(", ")}`,
    );
  }
  return [...distinct.values()][0]!;
}

function browserDetails(userAgent: string) {
  const match = userAgent.match(/\b(HeadlessChrome|Chrome)\/([0-9.]+)/);
  return {
    product: match?.[1] ?? "Unknown Chromium product",
    version: match?.[2] ?? "Unknown version",
    userAgent,
  };
}

function profileMetadata(inputs: LighthouseInput[]) {
  const results = inputs.map((input) => input.result);
  const lighthouseVersion = singleRecordedValue(
    results.map((result) => result.lighthouseVersion),
    "Lighthouse version",
  );
  const hostUserAgent = singleRecordedValue(
    results.map((result) => result.environment?.hostUserAgent ?? "Unknown"),
    "host user agent",
  );
  const auditedUserAgent = singleRecordedValue(
    results.map((result) => result.userAgent ?? "Unknown"),
    "audited user agent",
  );
  const networkUserAgent = singleRecordedValue(
    results.map(
      (result) => result.environment?.networkUserAgent ?? "Unknown",
    ),
    "network user agent",
  );
  const emulatedUserAgent = singleRecordedValue(
    results.map(
      (result) => result.configSettings?.emulatedUserAgent ?? "Unknown",
    ),
    "emulated user agent",
  );
  const formFactor = singleRecordedValue(
    results.map((result) => result.configSettings?.formFactor ?? "Unknown"),
    "form factor",
  );
  const throttlingMethod = singleRecordedValue(
    results.map(
      (result) => result.configSettings?.throttlingMethod ?? "Unknown",
    ),
    "throttling method",
  );
  const throttling = singleRecordedValue(
    results.map((result) => result.configSettings?.throttling ?? {}),
    "throttling configuration",
  );
  const screenEmulation = singleRecordedValue(
    results.map((result) => result.configSettings?.screenEmulation ?? {}),
    "screen emulation",
  );
  const locale = singleRecordedValue(
    results.map((result) => result.configSettings?.locale ?? "Unknown"),
    "locale",
  );
  const channel = singleRecordedValue(
    results.map((result) => result.configSettings?.channel ?? "Unknown"),
    "channel",
  );
  const benchmarkValues = results.flatMap((result) =>
    typeof result.environment?.benchmarkIndex === "number"
      ? [result.environment.benchmarkIndex]
      : [],
  );

  return {
    source: "Recorded directly from the existing Lighthouse result JSON files.",
    lighthouseVersion,
    browser: browserDetails(hostUserAgent),
    auditedUserAgent,
    networkUserAgent,
    emulatedUserAgent,
    formFactor,
    throttlingMethod,
    throttling,
    screenEmulation,
    locale,
    channel,
    benchmarkIndex: {
      values: benchmarkValues,
      lowest: benchmarkValues.length ? Math.min(...benchmarkValues) : null,
      median: benchmarkValues.length ? median(benchmarkValues) : null,
      highest: benchmarkValues.length ? Math.max(...benchmarkValues) : null,
    },
  };
}

function stripAnsi(value: string): string {
  let result = "";
  let index = 0;
  while (index < value.length) {
    if (value.charCodeAt(index) === 27 && value[index + 1] === "[") {
      index += 2;
      while (index < value.length) {
        const codePoint = value.charCodeAt(index);
        index += 1;
        if (codePoint >= 64 && codePoint <= 126) break;
      }
      continue;
    }
    result += value[index];
    index += 1;
  }
  return result;
}

function cleanCliOutput(value: string): string {
  const repaired = stripAnsi(value)
    .replace(/\u00c3\u2014/g, "[FAIL]")
    .replace(/\u00e2\u0153\u2026/g, "[PASS]")
    .replace(/\r\n/g, "\n")
    .trim();
  return [...repaired]
    .filter((character) => {
      const codePoint = character.codePointAt(0) ?? 0;
      return (
        codePoint === 9 ||
        codePoint === 10 ||
        codePoint === 13 ||
        (codePoint >= 32 && codePoint <= 126)
      );
    })
    .join("");
}

function routeFromAssertionUrl(url: string): string {
  const route = normalizeRoute(url);
  if (!ROUTE_ORDER.has(route)) {
    throw new Error(`LHCI returned an assertion for an unknown route: ${route}`);
  }
  return route;
}

function normalizeAssertions(
  profile: Profile,
  assertions: RawAssertion[],
): NormalizedAssertion[] {
  return assertions
    .map((assertion) => {
      const route = routeFromAssertionUrl(assertion.url);
      const assertionName = assertion.auditProperty
        ? `${assertion.auditId}.${assertion.auditProperty}`
        : assertion.auditId;
      return {
        ...assertion,
        profile,
        route,
        assertion: assertionName,
      };
    })
    .sort(
      (left, right) =>
        (ROUTE_ORDER.get(left.route) ?? Number.MAX_SAFE_INTEGER) -
          (ROUTE_ORDER.get(right.route) ?? Number.MAX_SAFE_INTEGER) ||
        ASSERTION_ORDER.indexOf(left.assertion) -
          ASSERTION_ORDER.indexOf(right.assertion),
    );
}

function displayNumber(value: number): string {
  if (!Number.isFinite(value)) return String(value);
  return Number.isInteger(value)
    ? String(value)
    : String(Number(value.toFixed(4)));
}

function displayExpected(assertion: NormalizedAssertion): string {
  return `${assertion.operator} ${displayNumber(assertion.expected)}`;
}

function metadataLines(report: ProfileReport): string[] {
  const { metadata } = report;
  return [
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status} (LHCI exit ${report.exitCode})`,
    `LHCI: ${report.lhciVersion}`,
    `Lighthouse: ${metadata.lighthouseVersion}`,
    `Browser: ${metadata.browser.product} ${metadata.browser.version}`,
    `Browser user agent: ${metadata.browser.userAgent}`,
    `Network user agent: ${metadata.networkUserAgent}`,
    `Configured emulated user agent: ${metadata.emulatedUserAgent}`,
    `Form factor: ${metadata.formFactor}`,
    `Screen emulation: ${JSON.stringify(metadata.screenEmulation)}`,
    `Throttling method: ${metadata.throttlingMethod}`,
    `Throttling values: ${JSON.stringify(metadata.throttling)}`,
    `Locale/channel: ${metadata.locale} / ${metadata.channel}`,
    `Inputs: ${report.lhrCount} LHRs (${report.routeCount} routes x ${report.runsPerRoute} cold runs)`,
    `Assertions: ${report.assertionSummary.total} total; ${report.assertionSummary.passed} passed; ${report.assertionSummary.failed} failed`,
  ];
}

function profileMarkdown(report: ProfileReport): string {
  const lines = [
    `# LHCI ${report.profile} assertions`,
    "",
    ...metadataLines(report).map((line) => `- ${line}`),
    "",
    "The LHCI exit code is preserved. A nonzero result means one or more required thresholds were not met; it is not converted into a pass.",
    "",
    "| Route | Profile | Assertion | Expected | Actual | Three run values | Status |",
    "|---|---|---|---:|---:|---|---|",
    ...report.assertions.map(
      (assertion) =>
        `| ${markdownCell(assertion.route)} | ${assertion.profile} | ${markdownCell(assertion.assertion)} | ${markdownCell(displayExpected(assertion))} | ${displayNumber(assertion.actual)} | ${markdownCell(assertion.values.map(displayNumber).join(", "))} | ${assertion.passed ? "PASS" : "FAIL"} |`,
    ),
    "",
  ];
  return lines.join("\n");
}

function profileText(report: ProfileReport): string {
  const lines = [
    `LHCI ${report.profile} assertions`,
    ...metadataLines(report),
    "",
    "Assertion results:",
    ...report.assertions.map(
      (assertion) =>
        `${assertion.passed ? "PASS" : "FAIL"} | ${assertion.route} | ${assertion.profile} | ${assertion.assertion} | expected ${displayExpected(assertion)} | actual ${displayNumber(assertion.actual)} | runs ${assertion.values.map(displayNumber).join(", ")}`,
    ),
    "",
    "Clean LHCI CLI output:",
    report.cliOutput,
    "",
  ];
  return lines.join("\n");
}

function safeRemoveGeneratedDirectory(root: string, target: string): void {
  const relative = path.relative(root, target);
  if (
    relative === "" ||
    relative.startsWith("..") ||
    path.isAbsolute(relative)
  ) {
    throw new Error(`Refusing to remove an unsafe generated path: ${target}`);
  }
  rmSync(target, { recursive: true, force: true });
}

function runProfileAssertions(
  runDir: string,
  profile: Profile,
  inputs: LighthouseInput[],
  cliPath: string,
  lhciVersion: string,
  generatedAt: string,
): ProfileReport {
  const lhciRoot = ensureDir(path.join(runDir, "lhci"));
  const outputDirectory = path.join(lhciRoot, profile);
  safeRemoveGeneratedDirectory(lhciRoot, outputDirectory);
  const inputDirectory = ensureDir(
    path.join(outputDirectory, "workspace", ".lighthouseci"),
  );

  for (const [index, input] of inputs.entries()) {
    copyFileSync(
      path.join(runDir, "lighthouse", input.source),
      path.join(
        inputDirectory,
        `lhr-${String(index + 1).padStart(3, "0")}.json`,
      ),
    );
  }

  const configPath = path.join(PROJECT_ROOT, "lighthouserc.cjs");
  const command = [
    process.execPath,
    cliPath,
    "assert",
    `--config=${configPath}`,
  ];
  const result = spawnSync(command[0], command.slice(1), {
    cwd: path.join(outputDirectory, "workspace"),
    encoding: "utf8",
    env: {
      ...process.env,
      FORCE_COLOR: "0",
      NO_COLOR: "1",
      TERM: "dumb",
    },
  });
  const cliOutput = cleanCliOutput(
    `${result.stdout ?? ""}${result.stderr ?? ""}`,
  );
  const exitCode = result.status ?? 1;
  const assertionResultsPath = path.join(
    inputDirectory,
    "assertion-results.json",
  );
  if (!existsSync(assertionResultsPath)) {
    throw new Error(
      `LHCI did not write assertion-results.json for ${profile}. Exit ${exitCode}. Output: ${cliOutput}`,
    );
  }
  const rawAssertions = JSON.parse(
    readFileSync(assertionResultsPath, "utf8"),
  ) as RawAssertion[];
  const assertions = normalizeAssertions(profile, rawAssertions);
  const failed = assertions.filter((assertion) => !assertion.passed).length;
  const report: ProfileReport = {
    generatedAt,
    profile,
    status: exitCode === 0 && failed === 0 ? "pass" : "failure",
    exitCode,
    signal: result.signal,
    command,
    lhciVersion,
    lhrCount: inputs.length,
    routeCount: PUBLIC_ROUTES.length,
    runsPerRoute: RUNS_PER_ROUTE,
    metadata: profileMetadata(inputs),
    inputs: inputs.map((input) => ({
      route: input.route,
      run: input.run,
      source: input.source,
      fetchTime: input.result.fetchTime ?? null,
      benchmarkIndex: input.result.environment?.benchmarkIndex ?? null,
    })),
    assertionSummary: {
      total: assertions.length,
      passed: assertions.length - failed,
      failed,
    },
    assertions,
    cliOutput,
  };

  writeJson(path.join(outputDirectory, "assertion-results.json"), rawAssertions);
  writeJson(path.join(outputDirectory, "assertions.json"), report);
  writeText(path.join(outputDirectory, "assertions.md"), profileMarkdown(report));
  writeText(path.join(outputDirectory, "assertions.txt"), profileText(report));
  return report;
}

function combinedMarkdown(
  generatedAt: string,
  reports: ProfileReport[],
  exitCode: number,
): string {
  const lines = [
    "# Lighthouse CI assertion evidence",
    "",
    `- Generated: ${generatedAt}`,
    `- Combined status: ${exitCode === 0 ? "pass" : "failure"} (exit ${exitCode})`,
    `- Existing LHRs evaluated: ${reports.reduce((total, report) => total + report.lhrCount, 0)}`,
    "- Mobile and desktop are asserted separately so each result retains its device attribution.",
    "- All human-readable output is UTF-8 text with terminal colors and broken glyphs removed.",
    "- A nonzero assertion exit remains nonzero and blocks a false quality-gate pass.",
    "",
    "| Profile | LHRs | Routes | Assertions | Passed | Failed | Exit | Result file |",
    "|---|---:|---:|---:|---:|---:|---:|---|",
    ...reports.map(
      (report) =>
        `| ${report.profile} | ${report.lhrCount} | ${report.routeCount} | ${report.assertionSummary.total} | ${report.assertionSummary.passed} | ${report.assertionSummary.failed} | ${report.exitCode} | ${report.profile}/assertions.md |`,
    ),
    "",
    "## Recorded environment",
    "",
    ...reports.flatMap((report) => [
      `### ${report.profile}`,
      "",
      ...metadataLines(report).map((line) => `- ${line}`),
      "",
    ]),
    "## Failed assertions",
    "",
    "| Route | Profile | Assertion | Expected | Actual | Three run values |",
    "|---|---|---|---:|---:|---|",
    ...reports.flatMap((report) =>
      report.assertions
        .filter((assertion) => !assertion.passed)
        .map(
          (assertion) =>
            `| ${markdownCell(assertion.route)} | ${assertion.profile} | ${markdownCell(assertion.assertion)} | ${markdownCell(displayExpected(assertion))} | ${displayNumber(assertion.actual)} | ${markdownCell(assertion.values.map(displayNumber).join(", "))} |`,
        ),
    ),
    "",
  ];
  return lines.join("\n");
}

function combinedText(
  generatedAt: string,
  reports: ProfileReport[],
  exitCode: number,
): string {
  return [
    "Lighthouse CI assertion evidence",
    `Generated: ${generatedAt}`,
    `Combined status: ${exitCode === 0 ? "pass" : "failure"} (exit ${exitCode})`,
    "Mobile and desktop were evaluated separately.",
    ...reports.flatMap((report) => [
      "",
      ...metadataLines(report),
      ...report.assertions
        .filter((assertion) => !assertion.passed)
        .map(
          (assertion) =>
            `FAIL | ${assertion.route} | ${assertion.profile} | ${assertion.assertion} | expected ${displayExpected(assertion)} | actual ${displayNumber(assertion.actual)} | runs ${assertion.values.map(displayNumber).join(", ")}`,
        ),
    ]),
    "",
    "The nonzero exit code is intentionally preserved because required thresholds were not met.",
    "",
  ].join("\n");
}

const runDir = resolveRunDir();
const generatedAt = new Date().toISOString();
const lighthouseDirectory = path.join(runDir, "lighthouse");
const lhciRoot = ensureDir(path.join(runDir, "lhci"));
const cliPath = path.join(
  PROJECT_ROOT,
  "node_modules",
  "@lhci",
  "cli",
  "src",
  "cli.js",
);
const lhciPackage = JSON.parse(
  readFileSync(
    path.join(PROJECT_ROOT, "node_modules", "@lhci", "cli", "package.json"),
    "utf8",
  ),
) as { version: string };

for (const legacyDirectory of ["workspace", "input"]) {
  safeRemoveGeneratedDirectory(lhciRoot, path.join(lhciRoot, legacyDirectory));
}

const reports = PROFILES.map((profile) =>
  runProfileAssertions(
    runDir,
    profile,
    loadInputs(lighthouseDirectory, profile),
    cliPath,
    lhciPackage.version,
    generatedAt,
  ),
);
const combinedExitCode = reports.some((report) => report.exitCode !== 0) ? 1 : 0;
const combinedReport = {
  generatedAt,
  status: combinedExitCode === 0 ? "pass" : "failure",
  exitCode: combinedExitCode,
  lhrCount: reports.reduce((total, report) => total + report.lhrCount, 0),
  routeCount: PUBLIC_ROUTES.length,
  runsPerRoutePerProfile: RUNS_PER_ROUTE,
  lhciVersion: lhciPackage.version,
  attribution:
    "Mobile and desktop LHRs were asserted in separate LHCI workspaces.",
  profiles: Object.fromEntries(
    reports.map((report) => [report.profile, report]),
  ),
};

writeJson(path.join(lhciRoot, "assertions.json"), combinedReport);
writeText(
  path.join(lhciRoot, "assertions.md"),
  combinedMarkdown(generatedAt, reports, combinedExitCode),
);
writeText(
  path.join(lhciRoot, "assertions.txt"),
  combinedText(generatedAt, reports, combinedExitCode),
);

process.stdout.write(
  `LHCI assertions regenerated from ${combinedReport.lhrCount} existing LHRs. Mobile exit ${reports[0]!.exitCode}; desktop exit ${reports[1]!.exitCode}; combined exit ${combinedExitCode}.\n`,
);
process.exitCode = combinedExitCode;
