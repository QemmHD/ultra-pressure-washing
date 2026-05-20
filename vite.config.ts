import { defineConfig } from "vite"
import { fileURLToPath, URL } from "node:url"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

export default defineConfig({
  clearScreen: false,
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
    // Force a single copy of React across the dep graph. framer-motion lists
    // react/react-dom as optional peers, which in some installs (e.g. Bun on
    // Linux) lets Vite pre-bundle it against a second React copy — producing
    // "Invalid hook call / you might have more than one copy of React".
    dedupe: ["react", "react-dom"],
  },
  plugins: [
    react(),
    tailwindcss(),
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
