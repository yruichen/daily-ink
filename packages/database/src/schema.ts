import {
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const journalEntries = sqliteTable(
  "journal_entries",
  {
    id: text("id").primaryKey(),
    entryDate: text("entry_date").notNull(),
    title: text("title").notNull(),
    contentJson: text("content_json").notNull(),
    contentText: text("content_text").notNull(),
    contentHash: text("content_hash").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [uniqueIndex("journal_entry_date_idx").on(table.entryDate)],
);

export const assessments = sqliteTable("assessments", {
  id: text("id").primaryKey(),
  journalId: text("journal_id").notNull(),
  snapshotText: text("snapshot_text").notNull(),
  snapshotHash: text("snapshot_hash").notNull(),
  resultJson: text("result_json").notNull(),
  promptId: text("prompt_id").notNull(),
  promptVersion: text("prompt_version").notNull(),
  promptHash: text("prompt_hash").notNull(),
  providerProfileId: text("provider_profile_id").notNull(),
  modelName: text("model_name").notNull(),
  modelSnapshotJson: text("model_snapshot_json").notNull(),
  createdAt: text("created_at").notNull(),
});

export const rewrites = sqliteTable("rewrites", {
  id: text("id").primaryKey(),
  journalId: text("journal_id").notNull(),
  snapshotText: text("snapshot_text").notNull(),
  snapshotHash: text("snapshot_hash").notNull(),
  mode: text("mode").notNull(),
  targetBand: integer("target_band_x2"),
  resultJson: text("result_json").notNull(),
  promptId: text("prompt_id").notNull(),
  promptVersion: text("prompt_version").notNull(),
  promptHash: text("prompt_hash").notNull(),
  providerProfileId: text("provider_profile_id").notNull(),
  modelName: text("model_name").notNull(),
  modelSnapshotJson: text("model_snapshot_json").notNull(),
  createdAt: text("created_at").notNull(),
});

export const providerProfiles = sqliteTable("provider_profiles", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  protocol: text("protocol").notNull(),
  baseUrl: text("base_url").notNull(),
  model: text("model").notNull(),
  encryptedApiKey: text("encrypted_api_key"),
  supportsStructuredOutput: integer("supports_structured_output", {
    mode: "boolean",
  }).notNull(),
  timeoutMs: integer("timeout_ms").notNull(),
  isDefault: integer("is_default", { mode: "boolean" }).notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const vocabularyItems = sqliteTable("vocabulary_items", {
  id: text("id").primaryKey(),
  term: text("term").notNull(),
  normalizedTerm: text("normalized_term").notNull(),
  language: text("language").notNull(),
  kind: text("kind").notNull(),
  lemma: text("lemma").notNull(),
  partOfSpeech: text("part_of_speech").notNull(),
  definition: text("definition").notNull(),
  contextExplanation: text("context_explanation").notNull(),
  collocationsJson: text("collocations_json").notNull(),
  tagsJson: text("tags_json").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const vocabularySources = sqliteTable("vocabulary_sources", {
  id: text("id").primaryKey(),
  vocabularyId: text("vocabulary_id").notNull(),
  sourceType: text("source_type").notNull(),
  sourceId: text("source_id"),
  contextSentence: text("context_sentence").notNull(),
  createdAt: text("created_at").notNull(),
});

export const reviewCards = sqliteTable("review_cards", {
  id: text("id").primaryKey(),
  vocabularyId: text("vocabulary_id").notNull(),
  cardType: text("card_type").notNull(),
  fsrsStateJson: text("fsrs_state_json").notNull(),
  dueAt: text("due_at").notNull(),
  suspended: integer("suspended", { mode: "boolean" }).notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const reviewLogs = sqliteTable("review_logs", {
  id: text("id").primaryKey(),
  cardId: text("card_id").notNull(),
  rating: text("rating").notNull(),
  reviewedAt: text("reviewed_at").notNull(),
  previousStateJson: text("previous_state_json").notNull(),
  nextStateJson: text("next_state_json").notNull(),
});

export const jobs = sqliteTable("jobs", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  status: text("status").notNull(),
  payloadJson: text("payload_json").notNull(),
  resultType: text("result_type"),
  resultId: text("result_id"),
  error: text("error"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
