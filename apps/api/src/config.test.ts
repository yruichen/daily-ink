import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadConfig } from "./config";

const originalCwd = process.cwd();
const originalPaths = {
  DATA_DIR: process.env.DATA_DIR,
  PROMPT_DIR: process.env.PROMPT_DIR,
  WEB_DIST_DIR: process.env.WEB_DIST_DIR,
};

const setEnv = (name: keyof typeof originalPaths, value?: string): void => {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
};

afterEach(() => {
  process.chdir(originalCwd);
  for (const [name, value] of Object.entries(originalPaths)) {
    setEnv(name as keyof typeof originalPaths, value);
  }
});

describe("API configuration", () => {
  it("resolves application assets independently of the working directory", () => {
    setEnv("DATA_DIR");
    setEnv("PROMPT_DIR");
    setEnv("WEB_DIST_DIR");
    process.chdir(path.resolve(originalCwd, "apps/api"));

    const config = loadConfig();

    expect(config.dataDir).toBe(path.resolve(originalCwd, "data"));
    expect(config.promptDir).toBe(path.resolve(originalCwd, "prompts"));
    expect(config.webDistDir).toBe(path.resolve(originalCwd, "apps/web/dist"));
  });

  it("keeps explicit path overrides relative to the caller", () => {
    process.chdir(path.resolve(originalCwd, "apps/api"));
    setEnv("DATA_DIR", "custom-data");
    setEnv("PROMPT_DIR", "custom-prompts");
    setEnv("WEB_DIST_DIR", "custom-web");

    const config = loadConfig();

    expect(config.dataDir).toBe(path.resolve("custom-data"));
    expect(config.promptDir).toBe(path.resolve("custom-prompts"));
    expect(config.webDistDir).toBe(path.resolve("custom-web"));
  });
});
