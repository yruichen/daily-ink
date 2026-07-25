import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const localPath = (relativePath: string): string =>
  fileURLToPath(new URL(relativePath, import.meta.url));

export default defineConfig({
  server: {
    host: "127.0.0.1",
  },
  test: {
    environment: "node",
    include: ["packages/**/*.test.ts", "apps/api/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@ielts-diary/contracts": localPath("./packages/contracts/src/index.ts"),
      "@ielts-diary/database": localPath("./packages/database/src/index.ts"),
      "@ielts-diary/domain": localPath("./packages/domain/src/index.ts"),
      "@ielts-diary/llm-core": localPath("./packages/llm-core/src/index.ts"),
      "@ielts-diary/prompt-engine": localPath(
        "./packages/prompt-engine/src/index.ts",
      ),
      "@ielts-diary/review-engine": localPath(
        "./packages/review-engine/src/index.ts",
      ),
    },
  },
});
