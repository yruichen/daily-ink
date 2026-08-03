import type { FastifyInstance } from "fastify";
import { localeSchema } from "@ielts-diary/contracts";
import { createInitialReviewState } from "@ielts-diary/review-engine";
import { z } from "zod";
import type { AppContext } from "../../context";

const paramsSchema = z.object({
  wordbookId: z.string().min(1).max(80),
});

export const registerWordbookRoutes = async (
  app: FastifyInstance,
  context: AppContext,
): Promise<void> => {
  app.get("/api/v1/wordbooks", async () => ({
    wordbooks: context.lexicon.listWordbooks(),
  }));

  app.get<{
    Params: { wordbookId: string };
    Querystring: Record<string, unknown>;
  }>("/api/v1/wordbooks/:wordbookId/entries", async (request, reply) => {
    const params = paramsSchema.safeParse(request.params);
    const query = z
      .object({
        q: z.string().max(120).default(""),
        page: z.coerce.number().int().positive().default(1),
        pageSize: z.coerce.number().int().min(1).max(100).default(50),
      })
      .safeParse(request.query);
    if (!params.success || !query.success) {
      return reply.code(400).send({ error: "Invalid wordbook query." });
    }
    if (!context.lexicon.hasWordbook(params.data.wordbookId)) {
      return reply.code(404).send({ error: "Wordbook not found." });
    }
    return context.lexicon.listEntries(
      params.data.wordbookId,
      query.data.q,
      query.data.page,
      query.data.pageSize,
    );
  });

  app.post<{
    Params: { wordbookId: string; entryId: string };
  }>(
    "/api/v1/wordbooks/:wordbookId/entries/:entryId/add",
    async (request, reply) => {
      const params = paramsSchema
        .extend({ entryId: z.string().min(1).max(80) })
        .safeParse(request.params);
      const body = z.object({ locale: localeSchema }).safeParse(request.body);
      if (!params.success || !body.success) {
        return reply.code(400).send({ error: "Invalid wordbook entry." });
      }
      const entry = context.lexicon.getEntry(
        params.data.wordbookId,
        params.data.entryId,
      );
      if (!entry) {
        return reply.code(404).send({ error: "Wordbook entry not found." });
      }
      const result = context.vocabulary.addFromLexicon(
        entry,
        params.data.wordbookId,
        body.data.locale,
      );
      if (result.created) {
        const state = createInitialReviewState();
        context.reviews.ensureCards(
          result.item.id,
          state,
          new Date().toISOString(),
        );
      }
      return reply.code(result.created ? 201 : 200).send(result);
    },
  );

  app.post<{ Params: { wordbookId: string } }>(
    "/api/v1/wordbooks/:wordbookId/entries/add",
    async (request, reply) => {
      const params = paramsSchema.safeParse(request.params);
      const body = z
        .object({
          locale: localeSchema,
          entryIds: z
            .array(z.string().min(1).max(80))
            .min(1)
            .max(100)
            .optional(),
          limit: z.number().int().min(1).max(100).optional(),
        })
        .refine(
          (value) => Boolean(value.entryIds) !== Boolean(value.limit),
          "Provide either entryIds or limit.",
        )
        .safeParse(request.body);
      if (!params.success || !body.success) {
        return reply.code(400).send({ error: "Invalid batch request." });
      }
      if (!context.lexicon.hasWordbook(params.data.wordbookId)) {
        return reply.code(404).send({ error: "Wordbook not found." });
      }
      const requestedIds = [...new Set(body.data.entryIds ?? [])];
      const entries = body.data.limit
        ? context.lexicon.listNextUnadded(
            params.data.wordbookId,
            body.data.limit,
          )
        : context.lexicon.listEntriesByIds(
            params.data.wordbookId,
            requestedIds,
          );
      if (requestedIds.length && entries.length !== requestedIds.length) {
        return reply.code(400).send({ error: "Unknown wordbook entry." });
      }
      let createdCount = 0;
      for (const entry of entries) {
        const result = context.vocabulary.addFromLexicon(
          entry,
          params.data.wordbookId,
          body.data.locale,
        );
        if (result.created) {
          createdCount += 1;
          context.reviews.ensureCards(
            result.item.id,
            createInitialReviewState(),
            new Date().toISOString(),
          );
        }
      }
      return {
        requestedCount: entries.length,
        createdCount,
        existingCount: entries.length - createdCount,
      };
    },
  );
};
