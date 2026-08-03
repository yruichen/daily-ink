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
  it("starts a new expression with recognition and unlocks production after recall", async () => {
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
    expect(reviewsResponse.json().cards).toMatchObject([
      { cardType: "recognition" },
    ]);

    const rateResponse = await app.inject({
      method: "POST",
      url: `/api/v1/reviews/${reviewsResponse.json().cards[0].id}/rate`,
      payload: { rating: "good" },
    });
    expect(rateResponse.statusCode).toBe(200);
    const productionResponse = await app.inject({
      method: "GET",
      url: "/api/v1/reviews/due",
    });
    expect(productionResponse.json().cards).toMatchObject([
      { cardType: "production" },
    ]);

    await app.close();
  });

  it("lists built-in IELTS wordbooks and adds an entry without duplicating cards", async () => {
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

    const wordbooksResponse = await app.inject({
      method: "GET",
      url: "/api/v1/wordbooks",
    });
    expect(wordbooksResponse.statusCode).toBe(200);
    expect(wordbooksResponse.json().wordbooks).toMatchObject([
      { id: "ielts-core", entryCount: 5040, addedCount: 0 },
      { id: "ielts-extended", entryCount: 10000, addedCount: 0 },
      { id: "academic-word-list", entryCount: 570, addedCount: 0 },
    ]);

    const entriesResponse = await app.inject({
      method: "GET",
      url: "/api/v1/wordbooks/academic-word-list/entries?q=analyse&page=1&pageSize=10",
    });
    expect(entriesResponse.statusCode).toBe(200);
    expect(entriesResponse.json()).toMatchObject({
      page: 1,
      pageSize: 10,
      total: 1,
      items: [{ term: "analyse", level: 1, isAdded: false }],
    });
    const entry = entriesResponse.json().items[0];

    const addResponse = await app.inject({
      method: "POST",
      url: `/api/v1/wordbooks/academic-word-list/entries/${entry.id}/add`,
      payload: { locale: "zh-CN" },
    });
    expect(addResponse.statusCode).toBe(201);
    expect(addResponse.json()).toMatchObject({
      created: true,
      item: { lexiconId: entry.id, term: "analyse" },
    });
    expect(addResponse.json().item.definition).not.toBe("");

    const duplicateResponse = await app.inject({
      method: "POST",
      url: `/api/v1/wordbooks/academic-word-list/entries/${entry.id}/add`,
      payload: { locale: "en" },
    });
    expect(duplicateResponse.statusCode).toBe(200);
    expect(duplicateResponse.json().created).toBe(false);

    const reviewsResponse = await app.inject({
      method: "GET",
      url: "/api/v1/reviews/due",
    });
    expect(reviewsResponse.json().cards).toHaveLength(1);

    const refreshedWordbooks = await app.inject({
      method: "GET",
      url: "/api/v1/wordbooks",
    });
    expect(
      refreshedWordbooks
        .json()
        .wordbooks.find(
          (wordbook: { id: string }) => wordbook.id === "academic-word-list",
        ).addedCount,
    ).toBe(1);

    await app.close();
  });

  it("adds the next group from a wordbook in one request", async () => {
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

    const addResponse = await app.inject({
      method: "POST",
      url: "/api/v1/wordbooks/ielts-core/entries/add",
      payload: { locale: "zh-CN", limit: 20 },
    });
    expect(addResponse.statusCode).toBe(200);
    expect(addResponse.json()).toEqual({
      requestedCount: 20,
      createdCount: 20,
      existingCount: 0,
    });

    const reviewsResponse = await app.inject({
      method: "GET",
      url: "/api/v1/reviews/due",
    });
    expect(reviewsResponse.json().cards).toHaveLength(20);
    expect(
      reviewsResponse
        .json()
        .cards.every(
          (card: { cardType: string }) => card.cardType === "recognition",
        ),
    ).toBe(true);

    await app.close();
  });
});
