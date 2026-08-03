import type { ReviewCard, ReviewRating } from "@ielts-diary/contracts";
import { newId, nowIso } from "@ielts-diary/domain";
import type { DbConnection } from "./connection";

type CardRow = Record<string, unknown>;

export class ReviewRepository {
  constructor(private readonly connection: DbConnection) {}

  ensureCards(vocabularyId: string, initialState: string, dueAt: string): void {
    const now = nowIso();
    for (const cardType of ["recognition", "production"] as const) {
      this.connection
        .prepare(
          `INSERT OR IGNORE INTO review_cards
           (id, vocabulary_id, card_type, fsrs_state_json, due_at, suspended, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          newId(),
          vocabularyId,
          cardType,
          initialState,
          dueAt,
          cardType === "production" ? 1 : 0,
          now,
          now,
        );
    }
  }

  due(now = nowIso(), limit = 100): ReviewCard[] {
    const rows = this.connection
      .prepare(
        `SELECT c.*, v.term, v.definition,
          COALESCE((SELECT context_sentence FROM vocabulary_sources s
                    WHERE s.vocabulary_id = v.id ORDER BY s.created_at DESC LIMIT 1), '') AS context_sentence
         FROM review_cards c
         JOIN vocabulary_items v ON v.id = c.vocabulary_id
         WHERE c.suspended = 0 AND c.due_at <= ?
         ORDER BY c.due_at ASC
         LIMIT ?`,
      )
      .all(now, limit) as CardRow[];
    return rows.map((row) => {
      const term = String(row.term);
      const context = String(row.context_sentence);
      return {
        id: String(row.id),
        vocabularyId: String(row.vocabulary_id),
        cardType: String(row.card_type) as ReviewCard["cardType"],
        term,
        definition: String(row.definition),
        contextSentence: context,
        prompt:
          row.card_type === "recognition"
            ? term
            : context
                .replace(
                  new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"),
                  "_____",
                )
                .trim() || `Use "${term}" in a sentence.`,
        dueAt: String(row.due_at),
        state: String(row.fsrs_state_json),
      };
    });
  }

  getCard(id: string): { card: ReviewCard; stateJson: string } | null {
    const found = this.due("9999-12-31T23:59:59.999Z", 10_000).find(
      (card) => card.id === id,
    );
    return found ? { card: found, stateJson: found.state } : null;
  }

  saveReview(
    cardId: string,
    rating: ReviewRating,
    previousState: string,
    nextState: string,
    dueAt: string,
  ): void {
    const reviewedAt = nowIso();
    const save = this.connection.transaction(() => {
      this.connection
        .prepare(
          "UPDATE review_cards SET fsrs_state_json = ?, due_at = ?, updated_at = ? WHERE id = ?",
        )
        .run(nextState, dueAt, reviewedAt, cardId);
      this.connection
        .prepare(
          `INSERT INTO review_logs
           (id, card_id, rating, reviewed_at, previous_state_json, next_state_json)
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .run(newId(), cardId, rating, reviewedAt, previousState, nextState);
      if (rating === "good" || rating === "easy") {
        this.connection
          .prepare(
            `UPDATE review_cards
             SET suspended = 0,
                 due_at = CASE WHEN due_at > ? THEN ? ELSE due_at END,
                 updated_at = ?
             WHERE card_type = 'production'
               AND vocabulary_id = (
                 SELECT vocabulary_id FROM review_cards WHERE id = ? AND card_type = 'recognition'
               )`,
          )
          .run(reviewedAt, reviewedAt, reviewedAt, cardId);
      }
    });
    save();
  }

  countDue(now = nowIso()): number {
    const row = this.connection
      .prepare(
        "SELECT COUNT(*) AS count FROM review_cards WHERE suspended = 0 AND due_at <= ?",
      )
      .get(now) as { count: number };
    return row.count;
  }
}
