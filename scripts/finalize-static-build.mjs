import {
  access,
  copyFile,
  rm,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const clientRoot = path.resolve(workspaceRoot, "build", "client");
const source404 = path.resolve(clientRoot, "404", "index.html");
const target404 = path.resolve(clientRoot, "404.html");
const spaFallback = path.resolve(clientRoot, "__spa-fallback.html");
const temporary404Directory = path.resolve(clientRoot, "404");

for (const target of [
  source404,
  target404,
  spaFallback,
  temporary404Directory,
]) {
  if (target !== clientRoot && !target.startsWith(`${clientRoot}${path.sep}`)) {
    throw new Error(`Refusing to touch a path outside build/client: ${target}`);
  }
}

await access(source404);
await copyFile(source404, target404);
await rm(spaFallback, { force: true });
await rm(temporary404Directory, { recursive: true, force: true });
await rm(path.resolve(clientRoot, "404.data"), { force: true });

console.log("Generated build/client/404.html and removed unused SPA fallback.");
