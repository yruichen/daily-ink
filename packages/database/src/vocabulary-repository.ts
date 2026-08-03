import type {
  AppLocale,
  LexiconEntry,
  VocabularyInput,
  VocabularyItem,
} from "@ielts-diary/contracts";
import { newId, normalizeTerm, nowIso } from "@ielts-diary/domain";
import type { DbConnection } from "./connection";

type VocabularyRow = Record<string, unknown>;

export class VocabularyRepository {
  constructor(private readonly connection: DbConnection) {}

  private map(row: VocabularyRow): VocabularyItem {
    const source = this.connection
      .prepare(
        "SELECT context_sentence, COUNT(*) OVER() AS source_count FROM vocabulary_sources WHERE vocabulary_id = ? ORDER BY created_at DESC LIMIT 1",
      )
      .get(String(row.id)) as
      { context_sentence: string; source_count: number } | undefined;
    return {
      id: String(row.id),
      lexiconId: row.lexicon_id ? String(row.lexicon_id) : null,
      term: String(row.term),
      normalizedTerm: String(row.normalized_term),
      phonetic: String(row.phonetic),
      kind: String(row.kind) as VocabularyItem["kind"],
      lemma: String(row.lemma),
      partOfSpeech: String(row.part_of_speech),
      definition: String(row.definition),
      contextSentence: source?.context_sentence ?? "",
      contextExplanation: String(row.context_explanation),
      collocations: JSON.parse(String(row.collocations_json)) as string[],
      tags: JSON.parse(String(row.tags_json)) as string[],
      sourceCount: source?.source_count ?? 0,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };
  }

  list(query = ""): VocabularyItem[] {
    const pattern = `%${query.trim()}%`;
    const rows = this.connection
      .prepare(
        `SELECT * FROM vocabulary_items
         WHERE ? = '%%' OR term LIKE ? OR definition LIKE ?
         ORDER BY updated_at DESC`,
      )
      .all(pattern, pattern, pattern) as VocabularyRow[];
    return rows.map((row) => this.map(row));
  }

  get(id: string): VocabularyItem | null {
    const row = this.connection
      .prepare("SELECT * FROM vocabulary_items WHERE id = ?")
      .get(id) as VocabularyRow | undefined;
    return row ? this.map(row) : null;
  }

  add(input: VocabularyInput): { item: VocabularyItem; created: boolean } {
    const normalized = normalizeTerm(input.term);
    const existing = this.connection
      .prepare(
        "SELECT * FROM vocabulary_items WHERE normalized_term = ? AND language = 'en' AND kind = ?",
      )
      .get(normalized, input.kind) as VocabularyRow | undefined;
    const vocabularyId = existing ? String(existing.id) : newId();
    const now = nowIso();

    const save = this.connection.transaction(() => {
      if (!existing) {
        this.connection
          .prepare(
            `INSERT INTO vocabulary_items
             (id, lexicon_id, term, normalized_term, phonetic, language, kind, lemma, part_of_speech, definition,
              context_explanation, collocations_json, tags_json, created_at, updated_at)
             VALUES (?, NULL, ?, ?, '', 'en', ?, '', '', ?, '', '[]', ?, ?, ?)`,
          )
          .run(
            vocabularyId,
            input.term.trim(),
            normalized,
            input.kind,
            input.definition,
            JSON.stringify(input.tags),
            now,
            now,
          );
      } else {
        const mergedTags = Array.from(
          new Set([
            ...(JSON.parse(String(existing.tags_json)) as string[]),
            ...input.tags,
          ]),
        );
        this.connection
          .prepare(
            `UPDATE vocabulary_items
             SET definition = CASE WHEN definition = '' THEN ? ELSE definition END,
                 tags_json = ?, updated_at = ?
             WHERE id = ?`,
          )
          .run(input.definition, JSON.stringify(mergedTags), now, vocabularyId);
      }

      const duplicateSource = this.connection
        .prepare(
          `SELECT id FROM vocabulary_sources
           WHERE vocabulary_id = ? AND source_type = ? AND COALESCE(source_id, '') = COALESCE(?, '')
             AND context_sentence = ?`,
        )
        .get(
          vocabularyId,
          input.sourceType,
          input.sourceId,
          input.contextSentence,
        );
      if (!duplicateSource) {
        this.connection
          .prepare(
            `INSERT INTO vocabulary_sources
             (id, vocabulary_id, source_type, source_id, context_sentence, created_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
          )
          .run(
            newId(),
            vocabularyId,
            input.sourceType,
            input.sourceId,
            input.contextSentence,
            now,
          );
      }
    });
    save();
    return { item: this.get(vocabularyId)!, created: !existing };
  }

  addFromLexicon(
    entry: LexiconEntry,
    wordbookId: string,
    locale: AppLocale,
  ): { item: VocabularyItem; created: boolean } {
    const existing = this.connection
      .prepare(
        "SELECT * FROM vocabulary_items WHERE normalized_term = ? AND language = 'en' AND kind = 'word'",
      )
      .get(entry.normalizedTerm) as VocabularyRow | undefined;
    const vocabularyId = existing ? String(existing.id) : newId();
    const definition =
      locale === "zh-CN"
        ? entry.translationZh || entry.definitionEn
        : entry.definitionEn || entry.translationZh;
    const now = nowIso();
    const save = this.connection.transaction(() => {
      if (!existing) {
        this.connection
          .prepare(
            `INSERT INTO vocabulary_items
             (id, lexicon_id, term, normalized_term, phonetic, language, kind, lemma,
              part_of_speech, definition, context_explanation, collocations_json,
              tags_json, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, 'en', 'word', ?, ?, ?, '', '[]', '[]', ?, ?)`,
          )
          .run(
            vocabularyId,
            entry.id,
            entry.term,
            entry.normalizedTerm,
            entry.phonetic,
            entry.lemma,
            entry.partOfSpeech,
            definition,
            now,
            now,
          );
      } else {
        this.connection
          .prepare(
            `UPDATE vocabulary_items SET
               lexicon_id = COALESCE(lexicon_id, ?),
               phonetic = CASE WHEN phonetic = '' THEN ? ELSE phonetic END,
               lemma = CASE WHEN lemma = '' THEN ? ELSE lemma END,
               part_of_speech = CASE WHEN part_of_speech = '' THEN ? ELSE part_of_speech END,
               definition = CASE WHEN definition = '' THEN ? ELSE definition END,
               updated_at = ?
             WHERE id = ?`,
          )
          .run(
            entry.id,
            entry.phonetic,
            entry.lemma,
            entry.partOfSpeech,
            definition,
            now,
            vocabularyId,
          );
      }
      const duplicateSource = this.connection
        .prepare(
          `SELECT id FROM vocabulary_sources
           WHERE vocabulary_id = ? AND source_type = 'wordbook' AND source_id = ?`,
        )
        .get(vocabularyId, wordbookId);
      if (!duplicateSource) {
        this.connection
          .prepare(
            `INSERT INTO vocabulary_sources
             (id, vocabulary_id, source_type, source_id, context_sentence, created_at)
             VALUES (?, ?, 'wordbook', ?, '', ?)`,
          )
          .run(newId(), vocabularyId, wordbookId, now);
      }
    });
    save();
    return { item: this.get(vocabularyId)!, created: !existing };
  }

  updateEnrichment(
    id: string,
    enrichment: {
      lemma: string;
      partOfSpeech: string;
      definition: string;
      contextExplanation: string;
      collocations: string[];
    },
  ): VocabularyItem {
    this.connection
      .prepare(
        `UPDATE vocabulary_items SET lemma = ?, part_of_speech = ?, definition = ?,
         context_explanation = ?, collocations_json = ?, updated_at = ? WHERE id = ?`,
      )
      .run(
        enrichment.lemma,
        enrichment.partOfSpeech,
        enrichment.definition,
        enrichment.contextExplanation,
        JSON.stringify(enrichment.collocations),
        nowIso(),
        id,
      );
    return this.get(id)!;
  }

  delete(id: string): boolean {
    return (
      this.connection
        .prepare("DELETE FROM vocabulary_items WHERE id = ?")
        .run(id).changes > 0
    );
  }
}
