import type { FastifyBaseLogger } from "fastify";
import type {
  AssessmentRepository,
  JobRepository,
  JournalRepository,
  LearningSettingsRepository,
  LexiconRepository,
  ProviderRepository,
  ReviewRepository,
  ReviewAnalyticsRepository,
  RewriteRepository,
  VocabularyRepository,
  DbConnection,
} from "@ielts-diary/database";
import type { PromptRegistry } from "@ielts-diary/prompt-engine";
import type { AppConfig } from "./config";
import type { SecretVault } from "./infrastructure/secret-vault";

export type AppContext = {
  config: AppConfig;
  connection: DbConnection;
  journal: JournalRepository;
  assessments: AssessmentRepository;
  rewrites: RewriteRepository;
  providers: ProviderRepository;
  vocabulary: VocabularyRepository;
  lexicon: LexiconRepository;
  reviews: ReviewRepository;
  reviewAnalytics: ReviewAnalyticsRepository;
  learningSettings: LearningSettingsRepository;
  jobs: JobRepository;
  prompts: PromptRegistry;
  vault: SecretVault;
  logger: FastifyBaseLogger;
};
