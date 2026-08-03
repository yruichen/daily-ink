import type { LearningReport } from "@ielts-diary/contracts";
import type { ReviewAnalyticsRepository } from "@ielts-diary/database";
import {
  forecastReviewRetention,
  readReviewMemoryState,
} from "@ielts-diary/review-engine";

const DAY_MS = 86_400_000;
const ACTIVITY_DAYS = 30;
const FORECAST_DAYS = 14;
const CURVE_DAYS = [0, 1, 2, 3, 5, 7, 14, 21, 30] as const;

const localDayStart = (
  now: Date,
  timezoneOffsetMinutes: number,
  dayOffset = 0,
): Date => {
  const shifted = new Date(
    now.getTime() - timezoneOffsetMinutes * 60_000 + dayOffset * DAY_MS,
  );
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() + timezoneOffsetMinutes * 60_000);
};

const localDateKey = (value: Date | string, timezoneOffsetMinutes: number) =>
  new Date(new Date(value).getTime() - timezoneOffsetMinutes * 60_000)
    .toISOString()
    .slice(0, 10);

const shiftDateKey = (date: string, days: number) => {
  const shifted = new Date(`${date}T00:00:00.000Z`);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted.toISOString().slice(0, 10);
};

const calculateStreaks = (reviewDates: string[], today: string) => {
  const dates = new Set(reviewDates);
  let cursor = dates.has(today) ? today : shiftDateKey(today, -1);
  let currentStreak = 0;
  while (dates.has(cursor)) {
    currentStreak += 1;
    cursor = shiftDateKey(cursor, -1);
  }

  let longestStreak = 0;
  let running = 0;
  let previous = "";
  for (const date of [...dates].sort()) {
    running = previous && date === shiftDateKey(previous, 1) ? running + 1 : 1;
    longestStreak = Math.max(longestStreak, running);
    previous = date;
  }
  return { currentStreak, longestStreak };
};

export const buildLearningReport = (
  repository: ReviewAnalyticsRepository,
  timezoneOffsetMinutes: number,
  now = new Date(),
): LearningReport => {
  const todayStart = localDayStart(now, timezoneOffsetMinutes);
  const snapshot = repository.snapshot({
    nowIso: now.toISOString(),
    todayStartIso: todayStart.toISOString(),
    sevenDaysStartIso: localDayStart(
      now,
      timezoneOffsetMinutes,
      -6,
    ).toISOString(),
    thirtyDaysStartIso: localDayStart(
      now,
      timezoneOffsetMinutes,
      -29,
    ).toISOString(),
    activityStartIso: localDayStart(
      now,
      timezoneOffsetMinutes,
      -(ACTIVITY_DAYS - 1),
    ).toISOString(),
    forecastEndIso: new Date(
      localDayStart(now, timezoneOffsetMinutes, FORECAST_DAYS).getTime() - 1,
    ).toISOString(),
    timezoneOffsetMinutes,
  });

  const today = localDateKey(now, timezoneOffsetMinutes);
  const activityByDate = new Map(
    snapshot.activity.map((point) => [point.date, point]),
  );
  const activity = Array.from({ length: ACTIVITY_DAYS }, (_, index) => {
    const date = shiftDateKey(today, index - (ACTIVITY_DAYS - 1));
    const point = activityByDate.get(date);
    return {
      date,
      count: point?.count ?? 0,
      remembered: point?.remembered ?? 0,
    };
  });

  const forecastCounts = new Map<string, number>();
  for (const dueAt of snapshot.forecastDueDates) {
    const dueDate = localDateKey(dueAt, timezoneOffsetMinutes);
    const bucket = dueDate < today ? today : dueDate;
    forecastCounts.set(bucket, (forecastCounts.get(bucket) ?? 0) + 1);
  }
  const forecast = Array.from({ length: FORECAST_DAYS }, (_, index) => {
    const date = shiftDateKey(today, index);
    return { date, count: forecastCounts.get(date) ?? 0 };
  });

  const memoryCards = snapshot.cardStates.flatMap((card) => {
    const memory = readReviewMemoryState(card.stateJson);
    return memory ? [{ ...card, memory }] : [];
  });
  const forgettingCurve = CURVE_DAYS.map((day) => {
    const at = new Date(now.getTime() + day * DAY_MS);
    const values = memoryCards.flatMap((card) => {
      const retention = forecastReviewRetention(card.stateJson, at);
      return retention === null ? [] : [retention];
    });
    return {
      day,
      retention: values.length
        ? Math.round(
            (values.reduce((sum, value) => sum + value, 0) / values.length) *
              1000,
          ) / 10
        : 0,
    };
  });

  const masteredVocabulary = new Set(
    memoryCards
      .filter(({ memory }) => memory.stability >= 21)
      .map(({ vocabularyId }) => vocabularyId),
  ).size;
  const remembered = snapshot.ratingCounts.good + snapshot.ratingCounts.easy;
  const ratingsTotal = Object.values(snapshot.ratingCounts).reduce(
    (sum, value) => sum + value,
    0,
  );
  const streaks = calculateStreaks(snapshot.reviewDates, today);

  return {
    generatedAt: now.toISOString(),
    summary: {
      totalVocabulary: snapshot.totalVocabulary,
      studiedVocabulary: snapshot.studiedVocabulary,
      masteredVocabulary,
      dueNow: snapshot.dueNow,
      reviewsToday: snapshot.reviewsToday,
      reviewsLast7Days: snapshot.reviewsLast7Days,
      retentionRate30Days: ratingsTotal
        ? Math.round((remembered / ratingsTotal) * 1000) / 10
        : 0,
      ...streaks,
    },
    ratingCounts: snapshot.ratingCounts,
    activity,
    forecast,
    forgettingCurve: memoryCards.length ? forgettingCurve : [],
    curveSampleSize: memoryCards.length,
  };
};
