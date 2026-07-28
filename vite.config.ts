import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";

export default defineConfig({
  clearScreen: false,
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
    // Keep the framework and application on a single React runtime.
    dedupe: ["react", "react-dom"],
  },
  plugins: [tailwindcss(), reactRouter()],
  server: {
    // Keep development access local by default. Temporary device testing uses
    // the separately approved production-build server, not the Vite dev server.
    cors: false,
    allowedHosts: ["localhost", "127.0.0.1"],
    forwardConsole: true,
    watch: { usePolling: true, interval: 500 },
  },
});
