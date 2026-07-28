import { spawnSync } from "node:child_process";
import path from "node:path";
import {
  PROJECT_ROOT,
  resolveRunDir,
  writeJson,
  writeText,
} from "./common";

interface StepResult {
  name: string;
  command: string;
  exitCode: number;
  durationMs: number;
  logFile: string;
}

const runDir = resolveRunDir();
const environment = {
  ...process.env,
  AUDIT_RUN_DIR: runDir,
};
const steps: ReadonlyArray<{
  name: string;
  script: string;
  requiresBuild?: boolean;
}> = [
  { name: "lint preflight", script: "lint" },
  { name: "backend unit and integration tests", script: "test:backend" },
  { name: "production build", script: "build" },
  {
    name: "backend security and client-bundle scan",
    script: "audit:backend",
    requiresBuild: true,
  },
  { name: "built-output SEO", script: "audit:seo", requiresBuild: true },
  { name: "full-site crawl", script: "audit:crawl", requiresBuild: true },
  { name: "Playwright visual and accessibility", script: "audit:visual", requiresBuild: true },
  { name: "Lighthouse mobile", script: "audit:lighthouse:mobile", requiresBuild: true },
  { name: "Lighthouse desktop", script: "audit:lighthouse:desktop", requiresBuild: true },
  { name: "Lighthouse CI assertions", script: "audit:lhci", requiresBuild: true },
  { name: "performance baseline and budgets", script: "audit:performance", requiresBuild: true },
  { name: "route quality matrix", script: "audit:matrix", requiresBuild: true },
];

const results: StepResult[] = [];
let buildPassed = true;
for (const step of steps) {
  if (step.requiresBuild && !buildPassed) {
    results.push({
      name: step.name,
      command: `bun run ${step.script}`,
      exitCode: 1,
      durationMs: 0,
      logFile: "(skipped because the production build failed)",
    });
    continue;
  }

  const started = Date.now();
  const command = [process.execPath, "run", step.script];
  const result = spawnSync(command[0], command.slice(1), {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    env: environment,
  });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  const logFile = path.join(
    runDir,
    "orchestrator",
    `${step.script.replace(/[^a-z0-9]+/gi, "-")}.log`,
  );
  writeText(logFile, output || "(no output)");
  const exitCode = result.status ?? 1;
  if (step.script === "build") buildPassed = exitCode === 0;
  results.push({
    name: step.name,
    command: `bun run ${step.script}`,
    exitCode,
    durationMs: Date.now() - started,
    logFile: path.relative(runDir, logFile).replaceAll("\\", "/"),
  });
  process.stdout.write(
    `${step.name}: ${exitCode === 0 ? "pass" : "failure"}\n`,
  );
}

const failed = results.filter((result) => result.exitCode !== 0);
const generatedAt = new Date().toISOString();
writeJson(path.join(runDir, "orchestrator", "summary.json"), {
  generatedAt,
  runDir,
  status: failed.length === 0 ? "pass" : "failure",
  results,
});
writeText(
  path.join(runDir, "orchestrator", "summary.md"),
  [
    "# Public site and backend-security audit orchestrator",
    "",
    `- Generated: ${generatedAt}`,
    `- Status: ${failed.length === 0 ? "pass" : "failure"}`,
    `- Output: ${runDir}`,
    "",
    "| Step | Command | Exit | Duration | Log |",
    "|---|---|---:|---:|---|",
    ...results.map(
      (result) =>
        `| ${result.name} | \`${result.command}\` | ${result.exitCode} | ${result.durationMs} ms | ${result.logFile} |`,
    ),
  ].join("\n"),
);
process.exitCode = failed.length === 0 ? 0 : 1;
