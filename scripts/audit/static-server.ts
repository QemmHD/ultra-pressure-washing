import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer, type Server } from "node:http";
import path from "node:path";
import { createGzip } from "node:zlib";
import {
  BUILD_ROOT,
  DEFAULT_AUDIT_HOST,
  DEFAULT_AUDIT_PORT,
  PROJECT_ROOT,
} from "./common";

const CONTENT_TYPES: Readonly<Record<string, string>> = {
  ".avif": "image/avif",
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".webp": "image/webp",
  ".xml": "application/xml; charset=utf-8",
};

const COMPRESSIBLE_EXTENSIONS = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".map",
  ".svg",
  ".txt",
  ".webmanifest",
  ".xml",
]);

export interface StaticAuditServer {
  baseUrl: string;
  close: () => Promise<void>;
  server: Server;
}

export interface StaticAuditServerOptions {
  host?: string;
  port?: number;
  root?: string;
}

function safeCandidate(root: string, requestPath: string): string | undefined {
  let decoded: string;
  try {
    decoded = decodeURIComponent(requestPath);
  } catch {
    return undefined;
  }

  if (decoded.includes("\0")) return undefined;
  const relative = decoded.replace(/^\/+/, "").replace(/\\/g, "/");
  const candidate = path.resolve(root, relative);
  const check = path.relative(root, candidate);
  if (check.startsWith("..") || path.isAbsolute(check)) return undefined;
  return candidate;
}

function resolveFile(
  root: string,
  requestPath: string,
): { filePath: string; status: number } | undefined {
  const candidate = safeCandidate(root, requestPath);
  if (!candidate) return undefined;

  const possibleFiles: string[] = [];
  if (requestPath === "/") {
    possibleFiles.push(path.join(root, "index.html"));
  } else {
    possibleFiles.push(candidate);
    possibleFiles.push(path.join(candidate, "index.html"));
  }

  for (const filePath of possibleFiles) {
    if (existsSync(filePath) && statSync(filePath).isFile()) {
      const isNotFoundDocument =
        requestPath === "/404" || requestPath === "/404.html";
      return { filePath, status: isNotFoundDocument ? 404 : 200 };
    }
  }

  const notFound = path.join(root, "404.html");
  if (existsSync(notFound)) return { filePath: notFound, status: 404 };
  return undefined;
}

export async function startStaticAuditServer(
  options: StaticAuditServerOptions = {},
): Promise<StaticAuditServer> {
  const host = options.host ?? DEFAULT_AUDIT_HOST;
  const port = options.port ?? DEFAULT_AUDIT_PORT;
  const root = path.resolve(options.root ?? BUILD_ROOT);

  if (!existsSync(root) || !statSync(root).isDirectory()) {
    throw new Error(
      `Static build directory does not exist: ${path.relative(PROJECT_ROOT, root)}`,
    );
  }

  const server = createServer((request, response) => {
    const method = request.method ?? "GET";
    if (method !== "GET" && method !== "HEAD") {
      response.writeHead(405, {
        Allow: "GET, HEAD",
        "Content-Type": "text/plain; charset=utf-8",
      });
      response.end("Method Not Allowed");
      return;
    }

    const requestUrl = new URL(request.url ?? "/", `http://${host}`);
    const result = resolveFile(root, requestUrl.pathname);
    if (!result) {
      response.writeHead(404, {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      });
      response.end("Not Found");
      return;
    }

    const extension = path.extname(result.filePath).toLowerCase();
    const acceptsGzip =
      method === "GET" &&
      COMPRESSIBLE_EXTENSIONS.has(extension) &&
      /\bgzip\b/i.test(request.headers["accept-encoding"] ?? "");
    const isFingerprintAsset =
      requestUrl.pathname.startsWith("/assets/") &&
      /-[A-Za-z0-9_-]{8,}\.[A-Za-z0-9]+$/.test(requestUrl.pathname);
    const headers: Record<string, string> = {
      "Cache-Control": isFingerprintAsset
        ? "public, max-age=31536000, immutable"
        : extension === ".html"
          ? "no-cache"
          : "public, max-age=3600",
      "Content-Type":
        CONTENT_TYPES[extension] ?? "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
    };
    if (acceptsGzip) {
      headers["Content-Encoding"] = "gzip";
      headers.Vary = "Accept-Encoding";
    }
    response.writeHead(result.status, headers);
    if (method === "HEAD") {
      response.end();
      return;
    }
    const stream = createReadStream(result.filePath);
    if (acceptsGzip) {
      stream.pipe(createGzip({ level: 6 })).pipe(response);
      return;
    }
    stream.pipe(response);
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      server.off("error", reject);
      resolve();
    });
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    server.close();
    throw new Error("Unable to resolve the static audit server address.");
  }

  return {
    baseUrl: `http://${host}:${address.port}`,
    server,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}

export async function withStaticAuditServer<T>(
  callback: (baseUrl: string) => Promise<T>,
): Promise<T> {
  const configuredUrl = process.env.AUDIT_BASE_URL?.trim();
  if (configuredUrl) return callback(configuredUrl.replace(/\/+$/, ""));

  const requestedPort = Number.parseInt(
    process.env.AUDIT_PORT ?? String(DEFAULT_AUDIT_PORT),
    10,
  );
  const auditServer = await startStaticAuditServer({
    port: Number.isFinite(requestedPort) ? requestedPort : DEFAULT_AUDIT_PORT,
  });
  try {
    return await callback(auditServer.baseUrl);
  } finally {
    await auditServer.close();
  }
}

function parseCliOption(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((argument) => argument.startsWith(prefix))?.slice(
    prefix.length,
  );
}

if (import.meta.main) {
  const port = Number.parseInt(
    parseCliOption("port") ?? String(DEFAULT_AUDIT_PORT),
    10,
  );
  const root = parseCliOption("root")
    ? path.resolve(PROJECT_ROOT, parseCliOption("root")!)
    : BUILD_ROOT;
  const running = await startStaticAuditServer({ port, root });
  process.stdout.write(
    `Static audit server: ${running.baseUrl} (${path.relative(PROJECT_ROOT, root)})\n`,
  );

  const shutdown = async () => {
    await running.close();
    process.exit(0);
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}
