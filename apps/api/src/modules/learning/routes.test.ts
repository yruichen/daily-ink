import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "../../app";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

describe("learning routes", () => {
  it("persists the study amount and builds a report from review history", async () => {
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "learning-routes-"));
    temporaryDirectories.push(dataDir);
    const app = await buildApp({
      host: "127.0.0.1",
      port: 0,
      dataDir,
      promptDir: path.resolve("prompts"),
      webDistDir: path.resolve("missing-web-dist"),
      logLevel: "silent",
    });

    const defaultPreferences = await app.inject({
      method: "GET",
      url: "/api/v1/learning/preferences",
    });
    expect(defaultPreferences.json()).toEqual({
      preferences: { newWordsPerSession: 20 },
    });

    const savePreferences = await app.inject({
      method: "PUT",
      url: "/api/v1/learning/preferences",
      payload: { newWordsPerSession: 37 },
    });
    expect(savePreferences.statusCode).toBe(200);
    expect(savePreferences.json().preferences.newWordsPerSession).toBe(37);

    const invalidPreferences = await app.inject({
      method: "PUT",
      url: "/api/v1/learning/preferences",
      payload: { newWordsPerSession: 101 },
    });
    expect(invalidPreferences.statusCode).toBe(400);

    await app.inject({
      method: "POST",
      url: "/api/v1/vocabulary",
      payload: {
        term: "sustainable",
        kind: "word",
        definition: "able to continue over time",
        contextSentence: "We need sustainable growth.",
        sourceType: "manual",
        sourceId: null,
        tags: ["ielts"],
      },
    });
    const due = await app.inject({
      method: "GET",
      url: "/api/v1/reviews/due",
    });
    await app.inject({
      method: "POST",
      url: `/api/v1/reviews/${due.json().cards[0].id}/rate`,
      payload: { rating: "good" },
    });

    const reportResponse = await app.inject({
      method: "GET",
      url: "/api/v1/learning/report?timezoneOffsetMinutes=-480",
    });
    expect(reportResponse.statusCode).toBe(200);
    expect(reportResponse.json().report).toMatchObject({
      summary: {
        totalVocabulary: 1,
        studiedVocabulary: 1,
        reviewsToday: 1,
        retentionRate30Days: 100,
        currentStreak: 1,
      },
      ratingCounts: { again: 0, hard: 0, good: 1, easy: 0 },
      curveSampleSize: 1,
    });
    expect(reportResponse.json().report.activity).toHaveLength(30);
    expect(reportResponse.json().report.forecast).toHaveLength(14);
    expect(reportResponse.json().report.forgettingCurve).toHaveLength(9);

    await app.close();
  });
});
