import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { PromptRegistry } from "./index";

const directories: string[] = [];

afterEach(() => {
  for (const directory of directories)
    fs.rmSync(directory, { recursive: true, force: true });
});

describe("PromptRegistry", () => {
  it("renders declared variables and produces a stable hash", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "prompt-registry-"));
    directories.push(root);
    const directory = path.join(root, "assessment", "1.0.0");
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(
      path.join(directory, "manifest.yaml"),
      "id: test\nversion: 1.0.0\ncapability: assessment\nvariables: [text]\nchangeNote: initial\n",
    );
    fs.writeFileSync(path.join(directory, "system.md"), "Evaluate.");
    fs.writeFileSync(path.join(directory, "user.md"), "{{text}}");
    fs.writeFileSync(
      path.join(directory, "unstructured.md"),
      "Schema:\n{{output_schema}}",
    );
    fs.writeFileSync(path.join(directory, "schema.json"), "{}");

    const prompt = new PromptRegistry(root).render("assessment", {
      text: "Hello",
    });
    expect(prompt.user).toBe("Hello");
    expect(prompt.unstructuredSuffix).toContain("{}");
    expect(prompt.hash).toHaveLength(64);
  });
});
