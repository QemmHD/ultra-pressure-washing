import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  ADMIN_ROUTE,
  NOT_FOUND_ROUTE,
  PUBLIC_ROUTES,
  type SiteRoute,
} from "../../src/data/routes";

export const PROJECT_ROOT = fileURLToPath(new URL("../../", import.meta.url));
export const BUILD_ROOT = path.join(PROJECT_ROOT, "build", "client");
export const AUDIT_ROOT = path.join(
  PROJECT_ROOT,
  "codex-audit",
  "public-foundation",
);
export const DEFAULT_AUDIT_HOST = "127.0.0.1";
export const DEFAULT_AUDIT_PORT = 4173;
export const UNKNOWN_PATH = "/this-page-does-not-exist";

export interface AuditedRoute extends SiteRoute {
  expectedStatus: number;
}

export const AUDITED_ROUTES: readonly AuditedRoute[] = [
  ...PUBLIC_ROUTES.map((route) => ({ ...route, expectedStatus: 200 })),
  { ...ADMIN_ROUTE, expectedStatus: 200 },
  {
    ...NOT_FOUND_ROUTE,
    path: UNKNOWN_PATH,
    expectedStatus: 404,
  },
];

export function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

export function resolveRunDir(): string {
  const configured = process.env.AUDIT_RUN_DIR?.trim();
  const runDir = configured
    ? path.resolve(PROJECT_ROOT, configured)
    : path.join(AUDIT_ROOT, timestamp());
  mkdirSync(runDir, { recursive: true });
  return runDir;
}

export function ensureDir(directory: string): string {
  mkdirSync(directory, { recursive: true });
  return directory;
}

export function writeJson(filePath: string, value: unknown): void {
  ensureDir(path.dirname(filePath));
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function writeText(filePath: string, value: string): void {
  ensureDir(path.dirname(filePath));
  writeFileSync(filePath, value.endsWith("\n") ? value : `${value}\n`, "utf8");
}

export function readJson<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

export function routeSlug(routePath: string): string {
  if (routePath === "/") return "home";
  return routePath.replace(/^\/+|\/+$/g, "").replace(/[^a-z0-9-]+/gi, "-");
}

export function expectedCanonical(routePath: string): string {
  const canonicalPath = routePath === UNKNOWN_PATH ? "/404" : routePath;
  return `https://ultrapressurewashing.net${
    canonicalPath === "/" ? "" : canonicalPath
  }`;
}

export function routeHtmlFile(routePath: string): string {
  const normalized = routePath === UNKNOWN_PATH ? "/404" : routePath;
  if (normalized === "/") return path.join(BUILD_ROOT, "index.html");
  if (normalized === "/404") return path.join(BUILD_ROOT, "404.html");
  return path.join(
    BUILD_ROOT,
    normalized.replace(/^\//, ""),
    "index.html",
  );
}

export function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function markdownCell(value: unknown): string {
  return String(value ?? "")
    .replace(/\|/g, "\\|")
    .replace(/\r?\n/g, " ");
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1]! + sorted[middle]!) / 2
    : sorted[middle]!;
}

export function localAuditUrl(baseUrl: string, routePath: string): string {
  return new URL(routePath, `${baseUrl}/`).toString();
}
