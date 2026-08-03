import type {
  LexiconEntry,
  LexiconEntryPage,
  WordbookSummary,
} from "@ielts-diary/contracts";
import type { DbConnection } from "./connection";

type DatabaseRow = Record<string, unknown>;

const mapEntry = (row: DatabaseRow): LexiconEntry => ({
  id: String(row.id),
  term: String(row.term),
  normalizedTerm: String(row.normalized_term),
  phonetic: String(row.phonetic),
  definitionEn: String(row.definition_en),
  translationZh: String(row.translation_zh),
  partOfSpeech: String(row.part_of_speech),
  lemma: String(row.lemma),
  bncRank: row.bnc_rank === null ? null : Number(row.bnc_rank),
  frequencyRank:
    row.frequency_rank === null ? null : Number(row.frequency_rank),
  level: row.level === null ? null : Number(row.level),
  isAdded: Boolean(row.is_added),
});

export class LexiconRepository {
  constructor(private readonly connection: DbConnection) {}

  listWordbooks(): WordbookSummary[] {
    const rows = this.connection
      .prepare(
        `SELECT w.id, w.name_key, w.description_key,
          COUNT(we.lexicon_id) AS entry_count,
          SUM(CASE WHEN EXISTS (
            SELECT 1 FROM vocabulary_items v
            JOIN lexicon_entries linked ON linked.id = we.lexicon_id
            WHERE v.lexicon_id = we.lexicon_id
               OR (v.normalized_term = linked.normalized_term AND v.language = 'en')
          ) THEN 1 ELSE 0 END) AS added_count
         FROM wordbooks w
         LEFT JOIN wordbook_entries we ON we.wordbook_id = w.id
         WHERE w.builtin = 1
         GROUP BY w.id
         ORDER BY CASE w.id
           WHEN 'ielts-core' THEN 1
           WHEN 'ielts-extended' THEN 2
           WHEN 'academic-word-list' THEN 3
           ELSE 4 END`,
      )
      .all() as DatabaseRow[];
    return rows.map((row) => ({
      id: String(row.id),
      nameKey: String(row.name_key),
      descriptionKey: String(row.description_key),
      entryCount: Number(row.entry_count),
      addedCount: Number(row.added_count),
    }));
  }

  hasWordbook(id: string): boolean {
    return Boolean(
      this.connection.prepare("SELECT 1 FROM wordbooks WHERE id = ?").get(id),
    );
  }

  listEntries(
    wordbookId: string,
    query: string,
    page: number,
    pageSize: number,
  ): LexiconEntryPage {
    const pattern = `%${query.trim()}%`;
    const where = `we.wordbook_id = ? AND
      (? = '%%' OR e.term LIKE ? OR e.translation_zh LIKE ? OR e.definition_en LIKE ?)`;
    const total = this.connection
      .prepare(
        `SELECT COUNT(*) AS count
         FROM wordbook_entries we
         JOIN lexicon_entries e ON e.id = we.lexicon_id
         WHERE ${where}`,
      )
      .get(wordbookId, pattern, pattern, pattern, pattern) as { count: number };
    const rows = this.connection
      .prepare(
        `SELECT e.*, we.level,
          EXISTS (
            SELECT 1 FROM vocabulary_items v
            WHERE v.lexicon_id = e.id
               OR (v.normalized_term = e.normalized_term AND v.language = 'en')
          ) AS is_added
         FROM wordbook_entries we
         JOIN lexicon_entries e ON e.id = we.lexicon_id
         WHERE ${where}
         ORDER BY we.sort_order ASC
         LIMIT ? OFFSET ?`,
      )
      .all(
        wordbookId,
        pattern,
        pattern,
        pattern,
        pattern,
        pageSize,
        (page - 1) * pageSize,
      ) as DatabaseRow[];
    return {
      items: rows.map(mapEntry),
      page,
      pageSize,
      total: total.count,
    };
  }

  getEntry(wordbookId: string, entryId: string): LexiconEntry | null {
    const row = this.connection
      .prepare(
        `SELECT e.*, we.level, 0 AS is_added
         FROM wordbook_entries we
         JOIN lexicon_entries e ON e.id = we.lexicon_id
         WHERE we.wordbook_id = ? AND e.id = ?`,
      )
      .get(wordbookId, entryId) as DatabaseRow | undefined;
    return row ? mapEntry(row) : null;
  }

  listEntriesByIds(wordbookId: string, entryIds: string[]): LexiconEntry[] {
    if (!entryIds.length) return [];
    const placeholders = entryIds.map(() => "?").join(", ");
    const rows = this.connection
      .prepare(
        `SELECT e.*, we.level, 0 AS is_added
         FROM wordbook_entries we
         JOIN lexicon_entries e ON e.id = we.lexicon_id
         WHERE we.wordbook_id = ? AND e.id IN (${placeholders})
         ORDER BY we.sort_order ASC`,
      )
      .all(wordbookId, ...entryIds) as DatabaseRow[];
    return rows.map(mapEntry);
  }

  listNextUnadded(wordbookId: string, limit: number): LexiconEntry[] {
    const rows = this.connection
      .prepare(
        `SELECT e.*, we.level, 0 AS is_added
         FROM wordbook_entries we
         JOIN lexicon_entries e ON e.id = we.lexicon_id
         WHERE we.wordbook_id = ? AND NOT EXISTS (
           SELECT 1 FROM vocabulary_items v
           WHERE v.lexicon_id = e.id
              OR (v.normalized_term = e.normalized_term AND v.language = 'en')
         )
         ORDER BY we.sort_order ASC
         LIMIT ?`,
      )
      .all(wordbookId, limit) as DatabaseRow[];
    return rows.map(mapEntry);
  }
}
