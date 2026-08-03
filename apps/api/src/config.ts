import path from "node:path";
import { fileURLToPath } from "node:url";

export type AppConfig = {
  host: string;
  port: number;
  dataDir: string;
  promptDir: string;
  webDistDir: string;
  logLevel: string;
};

export const loadConfig = (): AppConfig => {
  // Resolve bundled assets from the repository/application root instead of the
  // caller's working directory. npm workspaces run package scripts from the
  // workspace directory, while the Docker image starts the same bundle from
  // /app; import.meta.url is stable in both layouts.
  const root = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../..",
  );
  return {
    host: process.env.HOST ?? "127.0.0.1",
    port: Number(process.env.PORT ?? 4317),
    dataDir: path.resolve(process.env.DATA_DIR ?? path.join(root, "data")),
    promptDir: path.resolve(
      process.env.PROMPT_DIR ?? path.join(root, "prompts"),
    ),
    webDistDir: path.resolve(
      process.env.WEB_DIST_DIR ?? path.join(root, "apps", "web", "dist"),
    ),
    logLevel: process.env.LOG_LEVEL ?? "info",
  };
};
