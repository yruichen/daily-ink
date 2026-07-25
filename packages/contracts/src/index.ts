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
  sourceType: z.enum(["journal", "rewrite", "manual"]),
  sourceId: z.string().nullable().default(null),
  tags: z.array(z.string().trim().min(1).max(32)).max(12).default([]),
});
export type VocabularyInput = z.infer<typeof vocabularyInputSchema>;

export const vocabularyItemSchema = z.object({
  id: z.string().uuid(),
  term: z.string(),
  normalizedTerm: z.string(),
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
