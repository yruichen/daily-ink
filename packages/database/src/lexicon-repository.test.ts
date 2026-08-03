import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createConnection } from "./connection";
import { LexiconRepository } from "./lexicon-repository";
import { migrate } from "./migrate";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

describe("built-in lexicon migration", () => {
  it("upgrades an existing vocabulary table without changing user entries", () => {
    const dataDir = fs.mkdtempSync(
      path.join(os.tmpdir(), "ielts-diary-database-"),
    );
    temporaryDirectories.push(dataDir);
    const connection = createConnection(dataDir);
    connection.exec(`
      CREATE TABLE vocabulary_items (
        id TEXT PRIMARY KEY,
        term TEXT NOT NULL,
        normalized_term TEXT NOT NULL,
        language TEXT NOT NULL DEFAULT 'en',
        kind TEXT NOT NULL,
        lemma TEXT NOT NULL DEFAULT '',
        part_of_speech TEXT NOT NULL DEFAULT '',
        definition TEXT NOT NULL DEFAULT '',
        context_explanation TEXT NOT NULL DEFAULT '',
        collocations_json TEXT NOT NULL DEFAULT '[]',
        tags_json TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(normalized_term, language, kind)
      );
      INSERT INTO vocabulary_items
      (id, term, normalized_term, language, kind, definition, created_at, updated_at)
      VALUES ('existing', 'analyse', 'analyse', 'en', 'word', '分析', 'now', 'now');
    `);

    migrate(connection);

    const row = connection
      .prepare(
        "SELECT term, definition, lexicon_id, phonetic FROM vocabulary_items WHERE id = 'existing'",
      )
      .get() as Record<string, unknown>;
    expect(row).toEqual({
      term: "analyse",
      definition: "分析",
      lexicon_id: null,
      phonetic: "",
    });
    const wordbooks = new LexiconRepository(connection).listWordbooks();
    expect(wordbooks.map(({ id, entryCount }) => ({ id, entryCount }))).toEqual(
      [
        { id: "ielts-core", entryCount: 5040 },
        { id: "ielts-extended", entryCount: 10000 },
        { id: "academic-word-list", entryCount: 570 },
      ],
    );
    expect(
      wordbooks.find(({ id }) => id === "academic-word-list")?.addedCount,
    ).toBe(1);
    connection.close();
  });
});
