import type { JournalEntry, SaveJournalInput } from "@ielts-diary/contracts";
import { hashContent, newId, nowIso } from "@ielts-diary/domain";
import type { DbConnection } from "./connection";

type JournalRow = {
  id: string;
  entry_date: string;
  title: string;
  content_json: string;
  content_text: string;
  content_hash: string;
  created_at: string;
  updated_at: string;
};

const mapJournal = (row: JournalRow): JournalEntry => ({
  id: row.id,
  entryDate: row.entry_date,
  title: row.title,
  contentJson: JSON.parse(row.content_json) as Record<string, unknown>,
  contentText: row.content_text,
  contentHash: row.content_hash,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export class JournalRepository {
  constructor(private readonly connection: DbConnection) {}

  getByDate(entryDate: string): JournalEntry | null {
    const row = this.connection
      .prepare("SELECT * FROM journal_entries WHERE entry_date = ?")
      .get(entryDate) as JournalRow | undefined;
    return row ? mapJournal(row) : null;
  }

  getById(id: string): JournalEntry | null {
    const row = this.connection
      .prepare("SELECT * FROM journal_entries WHERE id = ?")
      .get(id) as JournalRow | undefined;
    return row ? mapJournal(row) : null;
  }

  list(limit = 90): JournalEntry[] {
    const rows = this.connection
      .prepare("SELECT * FROM journal_entries ORDER BY entry_date DESC LIMIT ?")
      .all(limit) as JournalRow[];
    return rows.map(mapJournal);
  }

  upsert(entryDate: string, input: SaveJournalInput): JournalEntry {
    const existing = this.getByDate(entryDate);
    const now = nowIso();
    const contentHash = hashContent(input.contentText);
    if (existing) {
      this.connection
        .prepare(
          `UPDATE journal_entries
           SET title = ?, content_json = ?, content_text = ?, content_hash = ?, updated_at = ?
           WHERE id = ?`,
        )
        .run(
          input.title,
          JSON.stringify(input.contentJson),
          input.contentText,
          contentHash,
          now,
          existing.id,
        );
      return this.getById(existing.id)!;
    }

    const id = newId();
    this.connection
      .prepare(
        `INSERT INTO journal_entries
         (id, entry_date, title, content_json, content_text, content_hash, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        entryDate,
        input.title,
        JSON.stringify(input.contentJson),
        input.contentText,
        contentHash,
        now,
        now,
      );
    return this.getById(id)!;
  }
}
