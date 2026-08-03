import { copyFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { build } from "esbuild";

const apiDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(apiDirectory, "../..");

const workspaceEntry = (workspace) =>
  path.join(rootDirectory, "packages", workspace, "src", "index.ts");

await rm(path.join(apiDirectory, "dist"), { recursive: true, force: true });

await build({
  absWorkingDir: apiDirectory,
  entryPoints: ["src/main.ts"],
  outfile: "dist/main.js",
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  sourcemap: true,
  packages: "external",
  alias: {
    "@ielts-diary/contracts": workspaceEntry("contracts"),
    "@ielts-diary/database": workspaceEntry("database"),
    "@ielts-diary/domain": workspaceEntry("domain"),
    "@ielts-diary/llm-core": workspaceEntry("llm-core"),
    "@ielts-diary/prompt-engine": workspaceEntry("prompt-engine"),
    "@ielts-diary/review-engine": workspaceEntry("review-engine"),
  },
});

await copyFile(
  path.join(
    rootDirectory,
    "packages",
    "database",
    "data",
    "ielts-lexicon.json.gz",
  ),
  path.join(apiDirectory, "dist", "ielts-lexicon.json.gz"),
);
