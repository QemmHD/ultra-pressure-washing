# template-react-vite

Starter template for Chariot customer sites. Every new project is cloned from this repo into an E2B sandbox, then edited by Chariot's agent.

Stack: React 19 + Vite 8 + TypeScript + React Router + Tailwind v4 + Framer Motion.

## What not to touch

- `vite.config.ts` — loads the Tailwind plugin, enables `forwardConsole` (browser errors → dev log), and serves `/@chariot-reload` for the revert flow.
- `package.json` / `bun.lock` — pre-installed in the E2B template image; the agent is blocked from editing them at runtime.

## Running locally

```
bun install
bun run dev
```
