import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { BUILD_ROOT, PROJECT_ROOT } from "./common";

interface Finding {
  check: string;
  file: string;
  evidence: string;
}

const failures: Finding[] = [];

function addFailure(check: string, file: string, evidence: string): void {
  failures.push({ check, file, evidence });
}

function listFiles(directory: string): string[] {
  if (!existsSync(directory)) return [];
  const files: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...listFiles(filePath));
    if (entry.isFile()) files.push(filePath);
  }
  return files;
}

function relative(filePath: string): string {
  return path.relative(PROJECT_ROOT, filePath).replaceAll("\\", "/");
}

function scan(
  files: readonly string[],
  patterns: ReadonlyArray<{ label: string; pattern: RegExp }>,
): void {
  for (const filePath of files) {
    const source = readFileSync(filePath, "utf8");
    for (const { label, pattern } of patterns) {
      pattern.lastIndex = 0;
      if (!pattern.test(source)) continue;
      addFailure(
        label,
        relative(filePath),
        "A forbidden value or legacy write path is present; matched content is redacted.",
      );
    }
  }
}

function trackedTextFiles(): string[] {
  const output = execFileSync("git", ["ls-files", "-z"], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
  });
  return output
    .split("\0")
    .filter(Boolean)
    .map((filePath) => path.join(PROJECT_ROOT, filePath))
    .filter((filePath) => {
      if (!existsSync(filePath) || statSync(filePath).size > 2_000_000) {
        return false;
      }
      const buffer = readFileSync(filePath);
      return !buffer.includes(0);
    });
}

function scanServiceRoleJwts(files: readonly string[]): void {
  const jwtPattern =
    /\beyJ[A-Za-z0-9_-]{4,}\.eyJ[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{4,}\b/g;
  for (const filePath of files) {
    const source = readFileSync(filePath, "utf8");
    for (const match of source.matchAll(jwtPattern)) {
      try {
        const payload = JSON.parse(
          Buffer.from(match[0].split(".")[1]!, "base64url").toString("utf8"),
        ) as Record<string, unknown>;
        if (payload.role !== "service_role") continue;
        addFailure(
          "Tracked Supabase service-role JWT",
          relative(filePath),
          "A service-role JWT is present; the matched credential is redacted.",
        );
      } catch {
        // Ignore unrelated strings that only resemble a JWT.
      }
    }
  }
}

const legacyApiPath = path.join(PROJECT_ROOT, "src", "lib", "api.ts");
if (existsSync(legacyApiPath)) {
  addFailure(
    "Legacy browser API",
    relative(legacyApiPath),
    "The direct browser-write API module still exists.",
  );
}

const requiredPaths = [
  "netlify/functions/submit-quote.ts",
  "netlify/functions/admin-session.ts",
  "netlify/functions/admin-quotes.ts",
  "netlify/functions/admin-reviews.ts",
  "netlify/functions/_shared/backend-destinations.ts",
  "netlify/functions/_shared/backend-runtime-context.ts",
  "src/lib/backend-runtime.ts",
  "src/lib/quote-client.ts",
  "src/lib/supabase-project.ts",
  "src/lib/supabase-client.ts",
  "supabase/config.toml",
  "tests/backend/backend-destinations.test.ts",
  "tests/backend/backend-runtime.test.ts",
  "tests/backend/migration-pglite.test.ts",
  "tests/backend/migration-security.test.ts",
];
for (const requiredPath of requiredPaths) {
  const absolutePath = path.join(PROJECT_ROOT, requiredPath);
  if (!existsSync(absolutePath)) {
    addFailure("Required backend file", requiredPath, "The file is missing.");
  }
}

const migrationsDirectory = path.join(PROJECT_ROOT, "supabase", "migrations");
const migrationFiles = listFiles(migrationsDirectory).filter((filePath) =>
  filePath.endsWith(".sql"),
);
if (migrationFiles.length === 0) {
  addFailure(
    "Versioned migration",
    "supabase/migrations",
    "No generated SQL migration exists.",
  );
} else {
  const migrationSource = migrationFiles
    .map((filePath) => readFileSync(filePath, "utf8"))
    .join("\n");
  for (const [label, pattern] of [
    ["RLS enablement", /enable\s+row\s+level\s+security/i],
    ["Explicit grants or revocations", /\b(?:grant|revoke)\b/i],
    ["Admin authorization", /admin_users/i],
    ["Secure quote storage", /quote_requests/i],
    ["Atomic quote intake RPC", /create_quote_request/i],
    ["Durable quote rate limiting", /rate_limited/i],
    ["Moderated review storage", /customer_reviews/i],
  ] as const) {
    if (!pattern.test(migrationSource)) {
      addFailure(
        label,
        "supabase/migrations",
        `Migration set is missing ${label.toLowerCase()}.`,
      );
    }
  }
}

const sourceFiles = [
  ...listFiles(path.join(PROJECT_ROOT, "src")),
  ...listFiles(path.join(PROJECT_ROOT, "netlify")),
].filter((filePath) => /\.(?:ts|tsx|js|jsx|mts|mjs)$/i.test(filePath));

scan(sourceFiles, [
  {
    label: "Browser admin password",
    pattern: /\bVITE_ADMIN_PASSWORD\b/i,
  },
  { label: "Browser ntfy topic", pattern: /VITE_NTFY_TOPIC/i },
  {
    label: "Legacy service-role environment fallback",
    pattern: /get(?:Admin)?Env\(\s*["']SUPABASE_SERVICE_ROLE_KEY["']\s*\)/i,
  },
  {
    label: "Configurable server Supabase destination",
    pattern:
      /(?:get(?:Admin)?Env|read)\(\s*["']SUPABASE_URL["']\s*\)/i,
  },
  {
    label: "Configurable server ntfy destination",
    pattern: /read\(\s*["']NTFY_BASE_URL["']\s*\)/i,
  },
  { label: "Hardcoded Chariot token", pattern: /\bchf_[A-Za-z0-9_-]{12,}\b/ },
  { label: "Fabricated admin token", pattern: /\bultra_admin_|admin_token\b/i },
]);

const trackedFiles = trackedTextFiles();
const implementationFiles = [
  ...trackedFiles,
  ...sourceFiles,
  ...listFiles(path.join(PROJECT_ROOT, "supabase")),
  ...listFiles(path.join(PROJECT_ROOT, "tests", "backend")),
  path.join(PROJECT_ROOT, ".env.example"),
  path.join(PROJECT_ROOT, "package.json"),
  path.join(PROJECT_ROOT, "bun.lock"),
  path.join(PROJECT_ROOT, "netlify.toml"),
  path.join(PROJECT_ROOT, "README_BACKEND.md"),
  path.join(PROJECT_ROOT, "scripts", "audit", "backend-security.ts"),
]
  .filter((filePath, index, files) => files.indexOf(filePath) === index)
  .filter((filePath) => {
    if (!existsSync(filePath) || statSync(filePath).size > 2_000_000) {
      return false;
    }
    return !readFileSync(filePath).includes(0);
  });
scan(implementationFiles, [
  {
    label: "Workspace Supabase secret key",
    pattern: /\bsb_secret_[A-Za-z0-9_-]{12,}\b/,
  },
  {
    label: "Workspace Chariot credential",
    pattern: /\bchf_[A-Za-z0-9_-]{12,}\b/,
  },
  {
    label: "Populated workspace server secret",
    pattern:
      /^[ \t]*(?:SUPABASE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY|QUOTE_IP_HASH_SECRET|CHARIOT_FORM_TOKEN|NTFY_ACCESS_TOKEN|TURNSTILE_SECRET_KEY)[ \t]*=[ \t]*["']?[^"'#\s][^#\r\n]*$/im,
  },
]);
scanServiceRoleJwts(implementationFiles);

const browserSourceFiles = listFiles(path.join(PROJECT_ROOT, "src")).filter(
  (filePath) => /\.(?:ts|tsx|js|jsx)$/i.test(filePath),
);
scan(browserSourceFiles, [
  {
    label: "Direct Chariot browser write",
    pattern: /https:\/\/[^"' ]*chariot[^"' ]*\/api/i,
  },
  {
    label: "Direct ntfy browser write",
    pattern: /https:\/\/[^"' ]*ntfy[^"' ]*(?:\/|["'])/i,
  },
  {
    label: "Direct Supabase REST browser write",
    pattern: /\.supabase\.co\/rest\/v1/i,
  },
  {
    label: "Server secret name in browser source",
    pattern: /\b(?:SUPABASE_SECRET_KEY|QUOTE_IP_HASH_SECRET|CHARIOT_FORM_TOKEN|NTFY_ACCESS_TOKEN)\b/,
  },
  {
    label: "Configurable browser Supabase destination",
    pattern: /\bVITE_SUPABASE_URL\b/,
  },
]);

const envExamplePath = path.join(PROJECT_ROOT, ".env.example");
if (!existsSync(envExamplePath)) {
  addFailure("Environment example", ".env.example", "The file is missing.");
} else {
  const envExample = readFileSync(envExamplePath, "utf8");
  const seenEnvironmentNames = new Set<string>();
  for (const match of envExample.matchAll(/^([A-Z][A-Z0-9_]*)=/gm)) {
    const name = match[1]!;
    if (seenEnvironmentNames.has(name)) {
      addFailure(
        "Duplicate environment example key",
        ".env.example",
        `${name} is declared more than once.`,
      );
    }
    seenEnvironmentNames.add(name);
  }
  for (const secretName of [
    "SUPABASE_SECRET_KEY",
    "QUOTE_IP_HASH_SECRET",
    "CHARIOT_FORM_TOKEN",
    "NTFY_TOPIC",
    "NTFY_ACCESS_TOKEN",
    "TURNSTILE_SECRET_KEY",
  ]) {
    const valuePattern = new RegExp(
      `^${secretName}=([^\\r\\n]*)$`,
      "m",
    );
    const value = envExample.match(valuePattern)?.[1]?.trim() ?? "";
    if (value) {
      addFailure(
        "Populated example secret",
        ".env.example",
        `${secretName} must remain empty.`,
      );
    }
  }
  if (!/^SUPABASE_PROJECT_REF=$/m.test(envExample)) {
    addFailure(
      "Pinned Supabase project reference",
      ".env.example",
      "SUPABASE_PROJECT_REF must be declared without a value.",
    );
  }
  if (!/^VITE_SUPABASE_PROJECT_REF=$/m.test(envExample)) {
    addFailure(
      "Pinned browser Supabase project reference",
      ".env.example",
      "VITE_SUPABASE_PROJECT_REF must be declared without a value.",
    );
  }
  for (const declaration of [
    "VITE_STAGING_BACKEND_ENABLED=false",
    "VITE_STAGING_PREVIEW_ORIGIN=",
    "VITE_ADMIN_PASSWORD_RECOVERY_ENABLED=false",
    "STAGING_BACKEND_ENABLED=false",
  ]) {
    if (!envExample.includes(declaration)) {
      addFailure(
        "Staging environment example",
        ".env.example",
        `${declaration} must be declared with its fail-closed example value.`,
      );
    }
  }
  if (
    /^(?:SUPABASE_URL|NTFY_BASE_URL|VITE_SUPABASE_URL)=/m.test(envExample)
  ) {
    addFailure(
      "Configurable server destination",
      ".env.example",
      "Server-side Supabase and ntfy destination URLs must remain source-pinned.",
    );
  }
}

const netlifyConfigPath = path.join(PROJECT_ROOT, "netlify.toml");
if (existsSync(netlifyConfigPath)) {
  const netlifyConfig = readFileSync(netlifyConfigPath, "utf8");
  if (
    /\[context\.production\.environment\][\s\S]*?VITE_QUOTE_MODE\s*=\s*["']live["']/i.test(
      netlifyConfig,
    ) ||
    /\[context\.production\.environment\][\s\S]*?VITE_ADMIN_AUTH_ENABLED\s*=\s*["']true["']/i.test(
      netlifyConfig,
    )
  ) {
    addFailure(
      "Source-controlled production activation",
      "netlify.toml",
      "Production browser capabilities must remain disabled until the separately approved atomic cutover.",
    );
  }
  if (
    /(?:VITE_)?STAGING_BACKEND_ENABLED\s*=\s*["']true["']/i.test(
      netlifyConfig,
    )
  ) {
    addFailure(
      "Source-controlled staging activation",
      "netlify.toml",
      "The temporary integrated staging capability must be enabled only through deploy-preview-scoped Netlify environment values.",
    );
  }
}

if (!existsSync(BUILD_ROOT)) {
  addFailure(
    "Built client scan",
    "build/client",
    "Build output is missing. Run the production build before this audit.",
  );
} else {
  const builtClientFiles = listFiles(BUILD_ROOT).filter((filePath) =>
    /\.(?:css|html|js|json|map|xml|txt)$/i.test(filePath),
  );
  const sourceMaps = builtClientFiles.filter((filePath) =>
    filePath.endsWith(".map"),
  );
  for (const sourceMap of sourceMaps) {
    addFailure(
      "Public source map",
      relative(sourceMap),
      "Production client source maps must not be published.",
    );
  }
  scan(builtClientFiles, [
    { label: "Client Chariot credential", pattern: /\bchf_[A-Za-z0-9_-]{12,}\b/ },
    {
      label: "Client Supabase secret key",
      pattern: /\bsb_secret_[A-Za-z0-9_-]{12,}\b/,
    },
    {
      label: "Client admin password variable",
      pattern: /\bVITE_ADMIN_PASSWORD\b/i,
    },
    { label: "Client legacy admin token", pattern: /\bultra_admin_|admin_token\b/i },
    {
      label: "Client legacy ntfy topic",
      pattern: /ultrapw-sevierville-leads/i,
    },
    {
      label: "Client server-secret variable",
      pattern: /\b(?:SUPABASE_SECRET_KEY|QUOTE_IP_HASH_SECRET|CHARIOT_FORM_TOKEN|NTFY_ACCESS_TOKEN)\b/,
    },
  ]);
  scanServiceRoleJwts(builtClientFiles);
}

const protectedNames = new Set([
  "design-review",
  "phone-preview",
  "preview",
  "phone-preview-sites.tar.gz",
  "phone-preview-sites-update.tar.gz",
]);
if (existsSync(BUILD_ROOT)) {
  for (const filePath of listFiles(BUILD_ROOT)) {
    const relativeBuildPath = path.relative(BUILD_ROOT, filePath);
    const firstSegment = relativeBuildPath.split(path.sep)[0] ?? "";
    if (protectedNames.has(firstSegment)) {
      addFailure(
        "Protected owner content in build",
        relative(filePath),
        "Protected owner content must not enter deployment output.",
      );
    }
    if (statSync(filePath).size === 0 && filePath.endsWith(".js")) {
      addFailure(
        "Empty client script",
        relative(filePath),
        "An emitted JavaScript asset is empty.",
      );
    }
  }
}

if (failures.length > 0) {
  for (const finding of failures) {
    process.stderr.write(
      `FAIL ${finding.check} — ${finding.file}: ${finding.evidence}\n`,
    );
  }
  process.stderr.write(
    `Backend security audit failed with ${failures.length} finding(s).\n`,
  );
  process.exitCode = 1;
} else {
  process.stdout.write(
    `Backend security audit passed: ${implementationFiles.length} implementation files, ${migrationFiles.length} migration file(s), and the production client bundle were checked.\n`,
  );
}
