import type { Config } from "@react-router/dev/config";
import { PRERENDER_PATHS } from "./src/data/routes";

export default {
  appDirectory: "src",
  buildDirectory: "build",
  ssr: false,
  prerender: [...PRERENDER_PATHS],
} satisfies Config;
