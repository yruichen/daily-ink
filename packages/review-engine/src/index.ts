import type { ReviewRating } from "@ielts-diary/contracts";
import {
  createEmptyCard,
  default_w,
  forgetting_curve,
  fsrs,
  Rating,
  type Card,
  type Grade,
} from "ts-fsrs";

const scheduler = fsrs({ request_retention: 0.9, enable_fuzz: true });

const replacer = (_key: string, value: unknown): unknown =>
  value instanceof Date ? { $date: value.toISOString() } : value;

const reviveCard = (value: unknown): Card => {
  const card = value as Record<string, unknown>;
  return {
    ...card,
    due: new Date(String(card.due)),
    ...(card.last_review
      ? { last_review: new Date(String(card.last_review)) }
      : {}),
  } as Card;
};

export const createInitialReviewState = (now = new Date()): string =>
  JSON.stringify(createEmptyCard(now), replacer);

export const scheduleReview = (
  stateJson: string,
  rating: ReviewRating,
  now = new Date(),
): { stateJson: string; dueAt: string } => {
  const parsed = JSON.parse(stateJson) as Record<string, unknown>;
  const card = reviveCard(parsed);
  const ratingMap: Record<ReviewRating, Grade> = {
    again: Rating.Again,
    hard: Rating.Hard,
    good: Rating.Good,
    easy: Rating.Easy,
  };
  const result = scheduler.next(card, now, ratingMap[rating]);
  return {
    stateJson: JSON.stringify(result.card, replacer),
    dueAt: result.card.due.toISOString(),
  };
};

export type ReviewMemoryState = {
  stability: number;
  repetitions: number;
  lastReview: string;
};

export const readReviewMemoryState = (
  stateJson: string,
): ReviewMemoryState | null => {
  try {
    const state = JSON.parse(stateJson) as Record<string, unknown>;
    const stability = Number(state.stability);
    const repetitions = Number(state.reps);
    const lastReview = String(state.last_review ?? "");
    if (
      !Number.isFinite(stability) ||
      stability <= 0 ||
      !Number.isFinite(repetitions) ||
      repetitions <= 0 ||
      !lastReview ||
      Number.isNaN(Date.parse(lastReview))
    ) {
      return null;
    }
    return { stability, repetitions, lastReview };
  } catch {
    return null;
  }
};

export const forecastReviewRetention = (
  stateJson: string,
  at: Date,
): number | null => {
  const state = readReviewMemoryState(stateJson);
  if (!state) return null;
  const elapsedDays = Math.max(
    0,
    (at.getTime() - Date.parse(state.lastReview)) / 86_400_000,
  );
  return forgetting_curve(default_w, elapsedDays, state.stability);
};
