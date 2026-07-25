import fs from "node:fs";
import path from "node:path";
import { hashContent } from "@ielts-diary/domain";
import { parse as parseYaml } from "yaml";
import { z } from "zod";

const manifestSchema = z.object({
  id: z.string().min(1),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  capability: z.enum(["assessment", "rewrite", "vocabulary-enrichment"]),
  variables: z.array(z.string().min(1)),
  changeNote: z.string(),
});

export type PromptCapability = z.infer<typeof manifestSchema>["capability"];

export type RenderedPrompt = {
  id: string;
  version: string;
  capability: PromptCapability;
  system: string;
  user: string;
  unstructuredSuffix: string;
  schema: Record<string, unknown>;
  hash: string;
};

const renderTemplate = (
  template: string,
  variables: Record<string, string>,
  requiredVariables: string[],
): string => {
  for (const variable of requiredVariables) {
    if (!(variable in variables)) {
      throw new Error(`Missing prompt variable: ${variable}`);
    }
  }
  const rendered = template.replace(
    /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g,
    (_match, key: string) => {
      if (!(key in variables))
        throw new Error(`Unknown prompt variable: ${key}`);
      return variables[key] ?? "";
    },
  );
  const unresolved = rendered.match(/\{\{[^}]+\}\}/);
  if (unresolved)
    throw new Error(`Unresolved prompt variable: ${unresolved[0]}`);
  return rendered;
};

export class PromptRegistry {
  constructor(
    private readonly rootDirectory: string,
    private readonly activeVersions: Record<PromptCapability, string> = {
      assessment: "1.0.0",
      rewrite: "1.0.0",
      "vocabulary-enrichment": "1.0.0",
    },
  ) {}

  render(
    capability: PromptCapability,
    variables: Record<string, string>,
  ): RenderedPrompt {
    const version = this.activeVersions[capability];
    const directory = path.join(this.rootDirectory, capability, version);
    const manifestPath = path.join(directory, "manifest.yaml");
    if (!fs.existsSync(manifestPath)) {
      throw new Error(`Prompt not found: ${capability}@${version}`);
    }
    const manifest = manifestSchema.parse(
      parseYaml(fs.readFileSync(manifestPath, "utf8")),
    );
    if (manifest.capability !== capability || manifest.version !== version) {
      throw new Error(`Prompt manifest mismatch in ${directory}`);
    }
    const systemTemplate = fs.readFileSync(
      path.join(directory, "system.md"),
      "utf8",
    );
    const userTemplate = fs.readFileSync(
      path.join(directory, "user.md"),
      "utf8",
    );
    const unstructuredTemplate = fs.readFileSync(
      path.join(directory, "unstructured.md"),
      "utf8",
    );
    const schema = JSON.parse(
      fs.readFileSync(path.join(directory, "schema.json"), "utf8"),
    ) as Record<string, unknown>;
    const system = renderTemplate(
      systemTemplate,
      variables,
      manifest.variables,
    );
    const user = renderTemplate(userTemplate, variables, manifest.variables);
    return {
      id: manifest.id,
      version,
      capability,
      system,
      user,
      unstructuredSuffix: unstructuredTemplate.replace(
        "{{output_schema}}",
        JSON.stringify(schema, null, 2),
      ),
      schema,
      hash: hashContent(
        JSON.stringify({
          manifest,
          systemTemplate,
          userTemplate,
          unstructuredTemplate,
          schema,
        }),
      ),
    };
  }

  validateAll(): void {
    for (const capability of Object.keys(
      this.activeVersions,
    ) as PromptCapability[]) {
      const version = this.activeVersions[capability];
      const directory = path.join(this.rootDirectory, capability, version);
      const manifest = manifestSchema.parse(
        parseYaml(
          fs.readFileSync(path.join(directory, "manifest.yaml"), "utf8"),
        ),
      );
      const combined =
        fs.readFileSync(path.join(directory, "system.md"), "utf8") +
        fs.readFileSync(path.join(directory, "user.md"), "utf8");
      for (const variable of manifest.variables) {
        if (
          !combined.includes(`{{${variable}}}`) &&
          !combined.includes(`{{ ${variable} }}`)
        ) {
          throw new Error(
            `Declared prompt variable is unused: ${capability}.${variable}`,
          );
        }
      }
      JSON.parse(fs.readFileSync(path.join(directory, "schema.json"), "utf8"));
      const unstructured = fs.readFileSync(
        path.join(directory, "unstructured.md"),
        "utf8",
      );
      if (!unstructured.includes("{{output_schema}}")) {
        throw new Error(
          `Unstructured prompt is missing output_schema: ${capability}`,
        );
      }
    }
  }
}
