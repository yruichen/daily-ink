import path from "node:path";

export type AppConfig = {
  host: string;
  port: number;
  dataDir: string;
  promptDir: string;
  webDistDir: string;
  logLevel: string;
};

export const loadConfig = (): AppConfig => {
  const root = process.cwd();
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
