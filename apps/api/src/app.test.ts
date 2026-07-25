import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "./app";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

describe("API application", () => {
  it("persists a journal and creates two review cards for a new expression", async () => {
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "ielts-diary-api-"));
    temporaryDirectories.push(dataDir);
    const app = await buildApp({
      host: "127.0.0.1",
      port: 0,
      dataDir,
      promptDir: path.resolve("prompts"),
      webDistDir: path.resolve("missing-web-dist"),
      logLevel: "silent",
    });

    const saveResponse = await app.inject({
      method: "PUT",
      url: "/api/v1/journals/2026-07-25",
      payload: {
        title: "A deliberate day",
        contentJson: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "I took part in a workshop." }],
            },
          ],
        },
        contentText: "I took part in a workshop.",
      },
    });
    expect(saveResponse.statusCode).toBe(200);
    expect(saveResponse.json().entry.contentHash).toHaveLength(64);

    const vocabularyResponse = await app.inject({
      method: "POST",
      url: "/api/v1/vocabulary",
      payload: {
        term: "take part in",
        kind: "phrase",
        definition: "participate",
        contextSentence: "I took part in a workshop.",
        sourceType: "journal",
        sourceId: saveResponse.json().entry.id,
        tags: ["work"],
      },
    });
    expect(vocabularyResponse.statusCode).toBe(201);

    const reviewsResponse = await app.inject({
      method: "GET",
      url: "/api/v1/reviews/due",
    });
    expect(reviewsResponse.statusCode).toBe(200);
    expect(reviewsResponse.json().cards).toHaveLength(2);

    await app.close();
  });
});
