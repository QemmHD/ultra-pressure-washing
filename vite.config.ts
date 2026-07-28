import { defineConfig } from "vite"
import { fileURLToPath, URL } from "node:url"
import tailwindcss from "@tailwindcss/vite"
import { reactRouter } from "@react-router/dev/vite"

export default defineConfig({
  clearScreen: false,
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
    // Keep the framework and application on a single React runtime.
    dedupe: ["react", "react-dom"],
  },
  plugins: [
    tailwindcss(),
    reactRouter(),
    {
      // DO NOT REMOVE — used by Chariot's revert flow to force a full browser reload.
      name: "chariot-reload",
      configureServer(server) {
        server.middlewares.use("/@chariot-reload", (_req, res) => {
          server.ws.send({ type: "full-reload", path: "*" })
          res.end("Reload triggered")
        })
      },
    },
  ],
  server: {
    cors: true,
    allowedHosts: true,
    // Forwards uncaught browser errors + console.error/warn to the dev server stdout,
    // so Chariot's agent can find runtime issues by tailing the dev log.
    forwardConsole: true,
    watch: { usePolling: true, interval: 500 },
  },
})
