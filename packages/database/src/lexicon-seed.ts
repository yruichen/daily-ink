import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";
import type { DbConnection } from "./connection";

type SeedEntry = {
  id: string;
  term: string;
  normalizedTerm: string;
  phonetic: string;
  definitionEn: string;
  translationZh: string;
  partOfSpeech: string;
  lemma: string;
  exchange: string;
  bncRank: number | null;
  frequencyRank: number | null;
};

type SeedWordbook = {
  id: string;
  nameKey: string;
  descriptionKey: string;
  source: string;
  entries: Array<{
    lexiconId: string;
    level: number | null;
    sortOrder: number;
  }>;
};

type SeedData = {
  version: string;
  entries: SeedEntry[];
  wordbooks: SeedWordbook[];
};

let cachedData: SeedData | undefined;

const loadSeedData = (): SeedData => {
  if (cachedData) return cachedData;
  const candidates = [
    fileURLToPath(new URL("../data/ielts-lexicon.json.gz", import.meta.url)),
    fileURLToPath(new URL("./ielts-lexicon.json.gz", import.meta.url)),
  ];
  const dataPath = candidates.find((candidate) => fs.existsSync(candidate));
  if (!dataPath) {
    throw new Error(
      `Built-in lexicon data is missing. Checked: ${candidates.join(", ")}`,
    );
  }
  cachedData = JSON.parse(
    gunzipSync(fs.readFileSync(dataPath)).toString("utf8"),
  ) as SeedData;
  return cachedData;
};

export const seedLexicon = (connection: DbConnection): void => {
  const data = loadSeedData();
  const settingKey = "builtin_lexicon_version";
  const existing = connection
    .prepare("SELECT value_json FROM app_settings WHERE key = ?")
    .get(settingKey) as { value_json: string } | undefined;
  if (existing && JSON.parse(existing.value_json) === data.version) return;

  const upsertEntry = connection.prepare(
    `INSERT INTO lexicon_entries
     (id, term, normalized_term, phonetic, definition_en, translation_zh,
      part_of_speech, lemma, exchange, bnc_rank, frequency_rank)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       term = excluded.term,
       normalized_term = excluded.normalized_term,
       phonetic = excluded.phonetic,
       definition_en = excluded.definition_en,
       translation_zh = excluded.translation_zh,
       part_of_speech = excluded.part_of_speech,
       lemma = excluded.lemma,
       exchange = excluded.exchange,
       bnc_rank = excluded.bnc_rank,
       frequency_rank = excluded.frequency_rank`,
  );
  const upsertWordbook = connection.prepare(
    `INSERT INTO wordbooks (id, name_key, description_key, source, builtin)
     VALUES (?, ?, ?, ?, 1)
     ON CONFLICT(id) DO UPDATE SET
       name_key = excluded.name_key,
       description_key = excluded.description_key,
       source = excluded.source,
       builtin = 1`,
  );
  const insertMembership = connection.prepare(
    `INSERT INTO wordbook_entries
     (wordbook_id, lexicon_id, level, sort_order) VALUES (?, ?, ?, ?)`,
  );
  const save = connection.transaction(() => {
    for (const entry of data.entries) {
      upsertEntry.run(
        entry.id,
        entry.term,
        entry.normalizedTerm,
        entry.phonetic,
        entry.definitionEn,
        entry.translationZh,
        entry.partOfSpeech,
        entry.lemma,
        entry.exchange,
        entry.bncRank,
        entry.frequencyRank,
      );
    }
    for (const wordbook of data.wordbooks) {
      upsertWordbook.run(
        wordbook.id,
        wordbook.nameKey,
        wordbook.descriptionKey,
        wordbook.source,
      );
      connection
        .prepare("DELETE FROM wordbook_entries WHERE wordbook_id = ?")
        .run(wordbook.id);
      for (const entry of wordbook.entries) {
        insertMembership.run(
          wordbook.id,
          entry.lexiconId,
          entry.level,
          entry.sortOrder,
        );
      }
    }
    connection
      .prepare(
        `INSERT INTO app_settings (key, value_json, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET
           value_json = excluded.value_json,
           updated_at = excluded.updated_at`,
      )
      .run(settingKey, JSON.stringify(data.version), new Date().toISOString());
  });
  save();
};
