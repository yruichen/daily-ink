import type { FastifyInstance } from "fastify";
import { localeSchema, rewriteModeSchema } from "@ielts-diary/contracts";
import { z } from "zod";
import type { AppContext } from "../../context";
import type { JobProcessor } from "../llm/job-processor";

const assessmentRequestSchema = z.object({
  journalId: z.string().uuid(),
  locale: localeSchema,
  providerProfileId: z.string().uuid().optional(),
});

const rewriteRequestSchema = assessmentRequestSchema.extend({
  mode: rewriteModeSchema,
  targetBand: z.number().min(0).max(9).multipleOf(0.5).nullable().default(null),
});

export const registerAssessmentRoutes = async (
  app: FastifyInstance,
  context: AppContext,
  processor: JobProcessor,
): Promise<void> => {
  app.get<{ Params: { journalId: string } }>(
    "/api/v1/journals/:journalId/assessments",
    async (request) => ({
      assessments: context.assessments.list(request.params.journalId),
    }),
  );

  app.post("/api/v1/assessments", async (request, reply) => {
    const parsed = assessmentRequestSchema.safeParse(request.body);
    if (!parsed.success)
      return reply.code(400).send({ error: "Invalid assessment request." });
    if (!context.journal.getById(parsed.data.journalId)) {
      return reply.code(404).send({ error: "Journal entry not found." });
    }
    const job = context.jobs.create("assessment", parsed.data);
    processor.wake();
    return reply.code(202).send({ job });
  });

  app.get<{ Params: { journalId: string } }>(
    "/api/v1/journals/:journalId/rewrites",
    async (request) => ({
      rewrites: context.rewrites.list(request.params.journalId),
    }),
  );

  app.post("/api/v1/rewrites", async (request, reply) => {
    const parsed = rewriteRequestSchema.safeParse(request.body);
    if (!parsed.success)
      return reply.code(400).send({ error: "Invalid rewrite request." });
    if (!context.journal.getById(parsed.data.journalId)) {
      return reply.code(404).send({ error: "Journal entry not found." });
    }
    const job = context.jobs.create("rewrite", parsed.data);
    processor.wake();
    return reply.code(202).send({ job });
  });
};
