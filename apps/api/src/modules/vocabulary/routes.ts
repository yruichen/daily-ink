import type { FastifyInstance } from "fastify";
import { localeSchema, vocabularyInputSchema } from "@ielts-diary/contracts";
import { createInitialReviewState } from "@ielts-diary/review-engine";
import { z } from "zod";
import type { AppContext } from "../../context";
import type { JobProcessor } from "../llm/job-processor";

export const registerVocabularyRoutes = async (
  app: FastifyInstance,
  context: AppContext,
  processor: JobProcessor,
): Promise<void> => {
  app.get<{ Querystring: { q?: string } }>(
    "/api/v1/vocabulary",
    async (request) => ({
      items: context.vocabulary.list(request.query.q ?? ""),
    }),
  );

  app.post("/api/v1/vocabulary", async (request, reply) => {
    const parsed = vocabularyInputSchema.safeParse(request.body);
    if (!parsed.success)
      return reply.code(400).send({ error: "Invalid vocabulary item." });
    const result = context.vocabulary.add(parsed.data);
    if (result.created) {
      const state = createInitialReviewState();
      context.reviews.ensureCards(
        result.item.id,
        state,
        new Date().toISOString(),
      );
    }
    return reply.code(result.created ? 201 : 200).send(result);
  });

  app.delete<{ Params: { id: string } }>(
    "/api/v1/vocabulary/:id",
    async (request, reply) => {
      return context.vocabulary.delete(request.params.id)
        ? reply.code(204).send()
        : reply.code(404).send({ error: "Vocabulary item not found." });
    },
  );

  app.post<{ Params: { id: string } }>(
    "/api/v1/vocabulary/:id/enrich",
    async (request, reply) => {
      const bodySchema = z.object({
        locale: localeSchema,
        providerProfileId: z.string().uuid().optional(),
      });
      const parsed = bodySchema.safeParse(request.body);
      if (!parsed.success)
        return reply.code(400).send({ error: "Invalid enrichment request." });
      if (!context.vocabulary.get(request.params.id)) {
        return reply.code(404).send({ error: "Vocabulary item not found." });
      }
      const job = context.jobs.create("vocabulary-enrichment", {
        vocabularyId: request.params.id,
        ...parsed.data,
      });
      processor.wake();
      return reply.code(202).send({ job });
    },
  );
};
