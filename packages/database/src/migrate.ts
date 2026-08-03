import type { DbConnection } from "./connection";
import { seedLexicon } from "./lexicon-seed";

const migration = `
CREATE TABLE IF NOT EXISTS journal_entries (
  id TEXT PRIMARY KEY,
  entry_date TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  content_json TEXT NOT NULL,
  content_text TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS assessments (
  id TEXT PRIMARY KEY,
  journal_id TEXT NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  snapshot_text TEXT NOT NULL,
  snapshot_hash TEXT NOT NULL,
  result_json TEXT NOT NULL,
  prompt_id TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  prompt_hash TEXT NOT NULL,
  provider_profile_id TEXT NOT NULL,
  model_name TEXT NOT NULL,
  model_snapshot_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS assessments_journal_idx ON assessments(journal_id, created_at DESC);
CREATE TABLE IF NOT EXISTS rewrites (
  id TEXT PRIMARY KEY,
  journal_id TEXT NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  snapshot_text TEXT NOT NULL,
  snapshot_hash TEXT NOT NULL,
  mode TEXT NOT NULL,
  target_band_x2 INTEGER,
  result_json TEXT NOT NULL,
  prompt_id TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  prompt_hash TEXT NOT NULL,
  provider_profile_id TEXT NOT NULL,
  model_name TEXT NOT NULL,
  model_snapshot_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS rewrites_journal_idx ON rewrites(journal_id, created_at DESC);
CREATE TABLE IF NOT EXISTS provider_profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  protocol TEXT NOT NULL,
  base_url TEXT NOT NULL,
  model TEXT NOT NULL,
  encrypted_api_key TEXT,
  supports_structured_output INTEGER NOT NULL DEFAULT 1,
  timeout_ms INTEGER NOT NULL DEFAULT 120000,
  is_default INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS vocabulary_items (
  id TEXT PRIMARY KEY,
  lexicon_id TEXT,
  term TEXT NOT NULL,
  normalized_term TEXT NOT NULL,
  phonetic TEXT NOT NULL DEFAULT '',
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
CREATE TABLE IF NOT EXISTS lexicon_entries (
  id TEXT PRIMARY KEY,
  term TEXT NOT NULL,
  normalized_term TEXT NOT NULL UNIQUE,
  phonetic TEXT NOT NULL DEFAULT '',
  definition_en TEXT NOT NULL DEFAULT '',
  translation_zh TEXT NOT NULL DEFAULT '',
  part_of_speech TEXT NOT NULL DEFAULT '',
  lemma TEXT NOT NULL DEFAULT '',
  exchange TEXT NOT NULL DEFAULT '',
  bnc_rank INTEGER,
  frequency_rank INTEGER
);
CREATE INDEX IF NOT EXISTS lexicon_entries_search_idx ON lexicon_entries(normalized_term);
CREATE TABLE IF NOT EXISTS wordbooks (
  id TEXT PRIMARY KEY,
  name_key TEXT NOT NULL,
  description_key TEXT NOT NULL,
  source TEXT NOT NULL,
  builtin INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS wordbook_entries (
  wordbook_id TEXT NOT NULL REFERENCES wordbooks(id) ON DELETE CASCADE,
  lexicon_id TEXT NOT NULL REFERENCES lexicon_entries(id) ON DELETE CASCADE,
  level INTEGER,
  sort_order INTEGER NOT NULL,
  PRIMARY KEY (wordbook_id, lexicon_id)
);
CREATE INDEX IF NOT EXISTS wordbook_entries_order_idx ON wordbook_entries(wordbook_id, sort_order);
CREATE TABLE IF NOT EXISTS vocabulary_sources (
  id TEXT PRIMARY KEY,
  vocabulary_id TEXT NOT NULL REFERENCES vocabulary_items(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,
  source_id TEXT,
  context_sentence TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS vocabulary_sources_item_idx ON vocabulary_sources(vocabulary_id);
CREATE TABLE IF NOT EXISTS review_cards (
  id TEXT PRIMARY KEY,
  vocabulary_id TEXT NOT NULL REFERENCES vocabulary_items(id) ON DELETE CASCADE,
  card_type TEXT NOT NULL,
  fsrs_state_json TEXT NOT NULL,
  due_at TEXT NOT NULL,
  suspended INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(vocabulary_id, card_type)
);
CREATE INDEX IF NOT EXISTS review_cards_due_idx ON review_cards(due_at, suspended);
CREATE TABLE IF NOT EXISTS review_logs (
  id TEXT PRIMARY KEY,
  card_id TEXT NOT NULL REFERENCES review_cards(id) ON DELETE CASCADE,
  rating TEXT NOT NULL,
  reviewed_at TEXT NOT NULL,
  previous_state_json TEXT NOT NULL,
  next_state_json TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS review_logs_reviewed_idx ON review_logs(reviewed_at);
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  result_type TEXT,
  result_id TEXT,
  error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS jobs_status_idx ON jobs(status, created_at);
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`;

export const migrate = (connection: DbConnection): void => {
  connection.exec(migration);
  const vocabularyColumns = connection
    .prepare("PRAGMA table_info(vocabulary_items)")
    .all() as Array<{ name: string }>;
  const columnNames = new Set(vocabularyColumns.map((column) => column.name));
  if (!columnNames.has("lexicon_id")) {
    connection.exec("ALTER TABLE vocabulary_items ADD COLUMN lexicon_id TEXT");
  }
  if (!columnNames.has("phonetic")) {
    connection.exec(
      "ALTER TABLE vocabulary_items ADD COLUMN phonetic TEXT NOT NULL DEFAULT ''",
    );
  }
  connection.exec(
    "CREATE INDEX IF NOT EXISTS vocabulary_items_lexicon_idx ON vocabulary_items(lexicon_id)",
  );
  seedLexicon(connection);
};
