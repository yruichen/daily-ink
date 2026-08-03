import type { ReviewRating } from "@ielts-diary/contracts";
import type { DbConnection } from "./connection";

export type ReviewAnalyticsOptions = {
  nowIso: string;
  todayStartIso: string;
  sevenDaysStartIso: string;
  thirtyDaysStartIso: string;
  activityStartIso: string;
  forecastEndIso: string;
  timezoneOffsetMinutes: number;
};

export type ReviewAnalyticsSnapshot = {
  totalVocabulary: number;
  studiedVocabulary: number;
  dueNow: number;
  reviewsToday: number;
  reviewsLast7Days: number;
  ratingCounts: Record<ReviewRating, number>;
  activity: Array<{ date: string; count: number; remembered: number }>;
  forecastDueDates: string[];
  reviewDates: string[];
  cardStates: Array<{ vocabularyId: string; stateJson: string }>;
};

type CountRow = { count: number };

export class ReviewAnalyticsRepository {
  constructor(private readonly connection: DbConnection) {}

  snapshot(options: ReviewAnalyticsOptions): ReviewAnalyticsSnapshot {
    const timezoneModifier = `${-options.timezoneOffsetMinutes} minutes`;
    const count = (sql: string, ...parameters: unknown[]) =>
      (this.connection.prepare(sql).get(...parameters) as CountRow | undefined)
        ?.count ?? 0;

    const ratingCounts: Record<ReviewRating, number> = {
      again: 0,
      hard: 0,
      good: 0,
      easy: 0,
    };
    const ratingRows = this.connection
      .prepare(
        `SELECT rating, COUNT(*) AS count
         FROM review_logs
         WHERE reviewed_at >= ?
         GROUP BY rating`,
      )
      .all(options.thirtyDaysStartIso) as Array<{
      rating: ReviewRating;
      count: number;
    }>;
    for (const row of ratingRows) {
      if (row.rating in ratingCounts) ratingCounts[row.rating] = row.count;
    }

    const activity = this.connection
      .prepare(
        `SELECT date(reviewed_at, ?) AS date,
                COUNT(*) AS count,
                SUM(CASE WHEN rating IN ('good', 'easy') THEN 1 ELSE 0 END) AS remembered
         FROM review_logs
         WHERE reviewed_at >= ?
         GROUP BY date(reviewed_at, ?)
         ORDER BY date ASC`,
      )
      .all(
        timezoneModifier,
        options.activityStartIso,
        timezoneModifier,
      ) as ReviewAnalyticsSnapshot["activity"];

    const reviewDates = this.connection
      .prepare(
        `SELECT DISTINCT date(reviewed_at, ?) AS date
         FROM review_logs
         ORDER BY date ASC`,
      )
      .all(timezoneModifier) as Array<{ date: string }>;

    const forecastDueDates = this.connection
      .prepare(
        `SELECT due_at
         FROM review_cards
         WHERE suspended = 0 AND due_at <= ?
         ORDER BY due_at ASC`,
      )
      .all(options.forecastEndIso) as Array<{ due_at: string }>;

    const cardStates = this.connection
      .prepare(
        `SELECT vocabulary_id, fsrs_state_json
         FROM review_cards
         WHERE suspended = 0`,
      )
      .all() as Array<{ vocabulary_id: string; fsrs_state_json: string }>;

    return {
      totalVocabulary: count("SELECT COUNT(*) AS count FROM vocabulary_items"),
      studiedVocabulary: count(
        `SELECT COUNT(DISTINCT c.vocabulary_id) AS count
         FROM review_logs l
         JOIN review_cards c ON c.id = l.card_id`,
      ),
      dueNow: count(
        `SELECT COUNT(*) AS count
         FROM review_cards
         WHERE suspended = 0 AND due_at <= ?`,
        options.nowIso,
      ),
      reviewsToday: count(
        "SELECT COUNT(*) AS count FROM review_logs WHERE reviewed_at >= ?",
        options.todayStartIso,
      ),
      reviewsLast7Days: count(
        "SELECT COUNT(*) AS count FROM review_logs WHERE reviewed_at >= ?",
        options.sevenDaysStartIso,
      ),
      ratingCounts,
      activity,
      forecastDueDates: forecastDueDates.map((row) => row.due_at),
      reviewDates: reviewDates.map((row) => row.date),
      cardStates: cardStates.map((row) => ({
        vocabularyId: row.vocabulary_id,
        stateJson: row.fsrs_state_json,
      })),
    };
  }
}
