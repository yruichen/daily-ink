import fs from "node:fs";
import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import staticPlugin from "@fastify/static";
import {
  AssessmentRepository,
  createConnection,
  JobRepository,
  JournalRepository,
  migrate,
  ProviderRepository,
  ReviewRepository,
  RewriteRepository,
  VocabularyRepository,
} from "@ielts-diary/database";
import { PromptRegistry } from "@ielts-diary/prompt-engine";
import { loadConfig, type AppConfig } from "./config";
import type { AppContext } from "./context";
import { SecretVault } from "./infrastructure/secret-vault";
import { registerAssessmentRoutes } from "./modules/assessment/routes";
import { registerJobRoutes } from "./modules/jobs/routes";
import { registerJournalRoutes } from "./modules/journal/routes";
import { JobProcessor } from "./modules/llm/job-processor";
import { registerReviewRoutes } from "./modules/review/routes";
import { registerSettingsRoutes } from "./modules/settings/routes";
import { registerVocabularyRoutes } from "./modules/vocabulary/routes";

export const buildApp = async (
  config: AppConfig = loadConfig(),
): Promise<FastifyInstance> => {
  const app = Fastify({
    logger: {
      level: config.logLevel,
      redact: [
        "req.headers.authorization",
        "req.headers.x-api-key",
        "body.apiKey",
      ],
    },
  });
  const connection = createConnection(config.dataDir);
  migrate(connection);
  const prompts = new PromptRegistry(config.promptDir);
  prompts.validateAll();
  const context: AppContext = {
    config,
    connection,
    journal: new JournalRepository(connection),
    assessments: new AssessmentRepository(connection),
    rewrites: new RewriteRepository(connection),
    providers: new ProviderRepository(connection),
    vocabulary: new VocabularyRepository(connection),
    reviews: new ReviewRepository(connection),
    jobs: new JobRepository(connection),
    prompts,
    vault: new SecretVault(config.dataDir),
    logger: app.log,
  };
  const processor = new JobProcessor(context);

  await app.register(cors, {
    origin: [/^http:\/\/127\.0\.0\.1:\d+$/, /^http:\/\/localhost:\d+$/],
    methods: ["GET", "POST", "PUT", "DELETE"],
  });

  app.get("/api/v1/health", async () => ({
    status: "ok",
    providerConfigured: context.providers.list().length > 0,
    dueReviews: context.reviews.countDue(),
  }));

  await registerJournalRoutes(app, context);
  await registerAssessmentRoutes(app, context, processor);
  await registerJobRoutes(app, context);
  await registerSettingsRoutes(app, context);
  await registerVocabularyRoutes(app, context, processor);
  await registerReviewRoutes(app, context);

  if (fs.existsSync(config.webDistDir)) {
    await app.register(staticPlugin, {
      root: config.webDistDir,
      wildcard: false,
    });
    app.get("/*", async (_request, reply) => reply.sendFile("index.html"));
  }

  app.setErrorHandler((error, request, reply) => {
    const normalized =
      error instanceof Error ? error : new Error("Unknown request error");
    const statusCode =
      "statusCode" in normalized && typeof normalized.statusCode === "number"
        ? normalized.statusCode
        : 500;
    request.log.error({ error: normalized.message }, "Request failed");
    void reply.code(statusCode).send({
      error: statusCode < 500 ? normalized.message : "Internal server error.",
    });
  });

  app.addHook("onReady", async () => processor.start());
  app.addHook("onClose", async () => {
    processor.stop();
    connection.close();
  });
  return app;
};
