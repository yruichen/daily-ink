import { z } from "zod";

export const localeSchema = z.enum(["zh-CN", "en"]);
export type AppLocale = z.infer<typeof localeSchema>;

export const journalEntrySchema = z.object({
  id: z.string().uuid(),
  entryDate: z.string(),
  title: z.string(),
  contentJson: z.record(z.unknown()),
  contentText: z.string(),
  contentHash: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type JournalEntry = z.infer<typeof journalEntrySchema>;

export const saveJournalSchema = z.object({
  title: z.string().max(160).default(""),
  contentJson: z.record(z.unknown()),
  contentText: z.string().max(50_000),
});
export type SaveJournalInput = z.infer<typeof saveJournalSchema>;

const bandScoreSchema = z.number().min(0).max(9).multipleOf(0.5);
const dimensionSchema = z.object({
  score: bandScoreSchema,
  summary: z.string(),
  evidence: z.array(z.string()).max(5),
  improvements: z.array(z.string()).max(5),
});

export const assessmentResultSchema = z.object({
  overallScore: bandScoreSchema,
  contentDevelopment: dimensionSchema,
  coherenceCohesion: dimensionSchema,
  lexicalResource: dimensionSchema,
  grammaticalRangeAccuracy: dimensionSchema,
  strengths: z.array(z.string()).max(5),
  priorities: z.array(z.string()).max(5),
  corrections: z
    .array(
      z.object({
        original: z.string(),
        corrected: z.string(),
        explanation: z.string(),
      }),
    )
    .max(12),
  disclaimer: z.string(),
});
export type AssessmentResult = z.infer<typeof assessmentResultSchema>;

export const assessmentSchema = z.object({
  id: z.string().uuid(),
  journalId: z.string().uuid(),
  snapshotHash: z.string(),
  result: assessmentResultSchema,
  promptVersion: z.string(),
  modelName: z.string(),
  createdAt: z.string(),
});
export type Assessment = z.infer<typeof assessmentSchema>;

export const rewriteModeSchema = z.enum(["natural", "target-band"]);
export const rewriteResultSchema = z.object({
  rewrittenText: z.string(),
  changes: z
    .array(
      z.object({
        original: z.string(),
        revised: z.string(),
        reason: z.string(),
      }),
    )
    .max(20),
  notes: z.array(z.string()).max(8),
});
export type RewriteResult = z.infer<typeof rewriteResultSchema>;

export const rewriteSchema = z.object({
  id: z.string().uuid(),
  journalId: z.string().uuid(),
  snapshotHash: z.string(),
  mode: rewriteModeSchema,
  targetBand: bandScoreSchema.nullable(),
  result: rewriteResultSchema,
  promptVersion: z.string(),
  modelName: z.string(),
  createdAt: z.string(),
});
export type Rewrite = z.infer<typeof rewriteSchema>;

export const vocabularyKindSchema = z.enum(["word", "phrase"]);
export const vocabularyInputSchema = z.object({
  term: z.string().trim().min(1).max(120),
  kind: vocabularyKindSchema,
  definition: z.string().max(1000).default(""),
  contextSentence: z.string().max(2000).default(""),
  sourceType: z.enum(["journal", "rewrite", "manual", "wordbook"]),
  sourceId: z.string().nullable().default(null),
  tags: z.array(z.string().trim().min(1).max(32)).max(12).default([]),
});
export type VocabularyInput = z.infer<typeof vocabularyInputSchema>;

export const vocabularyItemSchema = z.object({
  id: z.string().uuid(),
  lexiconId: z.string().nullable(),
  term: z.string(),
  normalizedTerm: z.string(),
  phonetic: z.string(),
  kind: vocabularyKindSchema,
  lemma: z.string(),
  partOfSpeech: z.string(),
  definition: z.string(),
  contextSentence: z.string(),
  contextExplanation: z.string(),
  collocations: z.array(z.string()),
  tags: z.array(z.string()),
  sourceCount: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type VocabularyItem = z.infer<typeof vocabularyItemSchema>;

export const wordbookSummarySchema = z.object({
  id: z.string(),
  nameKey: z.string(),
  descriptionKey: z.string(),
  entryCount: z.number().int().nonnegative(),
  addedCount: z.number().int().nonnegative(),
});
export type WordbookSummary = z.infer<typeof wordbookSummarySchema>;

export const lexiconEntrySchema = z.object({
  id: z.string(),
  term: z.string(),
  normalizedTerm: z.string(),
  phonetic: z.string(),
  definitionEn: z.string(),
  translationZh: z.string(),
  partOfSpeech: z.string(),
  lemma: z.string(),
  bncRank: z.number().int().positive().nullable(),
  frequencyRank: z.number().int().positive().nullable(),
  level: z.number().int().min(1).max(10).nullable(),
  isAdded: z.boolean(),
});
export type LexiconEntry = z.infer<typeof lexiconEntrySchema>;

export const lexiconEntryPageSchema = z.object({
  items: z.array(lexiconEntrySchema),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative(),
});
export type LexiconEntryPage = z.infer<typeof lexiconEntryPageSchema>;

export const reviewRatingSchema = z.enum(["again", "hard", "good", "easy"]);
export type ReviewRating = z.infer<typeof reviewRatingSchema>;

export const reviewCardSchema = z.object({
  id: z.string().uuid(),
  vocabularyId: z.string().uuid(),
  cardType: z.enum(["recognition", "production"]),
  term: z.string(),
  definition: z.string(),
  contextSentence: z.string(),
  prompt: z.string(),
  dueAt: z.string(),
  state: z.string(),
});
export type ReviewCard = z.infer<typeof reviewCardSchema>;

export const learningPreferencesSchema = z.object({
  newWordsPerSession: z.number().int().min(1).max(100).default(20),
});
export type LearningPreferences = z.infer<typeof learningPreferencesSchema>;

const datedCountSchema = z.object({
  date: z.string(),
  count: z.number().int().nonnegative(),
});

export const learningReportSchema = z.object({
  generatedAt: z.string(),
  summary: z.object({
    totalVocabulary: z.number().int().nonnegative(),
    studiedVocabulary: z.number().int().nonnegative(),
    masteredVocabulary: z.number().int().nonnegative(),
    dueNow: z.number().int().nonnegative(),
    reviewsToday: z.number().int().nonnegative(),
    reviewsLast7Days: z.number().int().nonnegative(),
    retentionRate30Days: z.number().min(0).max(100),
    currentStreak: z.number().int().nonnegative(),
    longestStreak: z.number().int().nonnegative(),
  }),
  ratingCounts: z.object({
    again: z.number().int().nonnegative(),
    hard: z.number().int().nonnegative(),
    good: z.number().int().nonnegative(),
    easy: z.number().int().nonnegative(),
  }),
  activity: z.array(
    datedCountSchema.extend({
      remembered: z.number().int().nonnegative(),
    }),
  ),
  forecast: z.array(datedCountSchema),
  forgettingCurve: z.array(
    z.object({
      day: z.number().int().nonnegative(),
      retention: z.number().min(0).max(100),
    }),
  ),
  curveSampleSize: z.number().int().nonnegative(),
});
export type LearningReport = z.infer<typeof learningReportSchema>;

export const providerProtocolSchema = z.enum(["openai", "anthropic"]);
export const providerProfileInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
  protocol: providerProtocolSchema,
  baseUrl: z.string().url(),
  model: z.string().trim().min(1).max(160),
  apiKey: z.string().optional(),
  supportsStructuredOutput: z.boolean().default(true),
  timeoutMs: z.number().int().min(5_000).max(600_000).default(120_000),
  isDefault: z.boolean().default(false),
});
export type ProviderProfileInput = z.infer<typeof providerProfileInputSchema>;

export const providerProfileSchema = providerProfileInputSchema
  .omit({ apiKey: true })
  .extend({
    id: z.string().uuid(),
    hasApiKey: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string(),
  });
export type ProviderProfile = z.infer<typeof providerProfileSchema>;

export const jobSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(["assessment", "rewrite", "vocabulary-enrichment"]),
  status: z.enum(["queued", "running", "completed", "failed", "cancelled"]),
  resultType: z.string().nullable(),
  resultId: z.string().nullable(),
  error: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Job = z.infer<typeof jobSchema>;
