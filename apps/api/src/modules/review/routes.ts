import type { FastifyInstance } from "fastify";
import { reviewRatingSchema } from "@ielts-diary/contracts";
import { scheduleReview } from "@ielts-diary/review-engine";
import { z } from "zod";
import type { AppContext } from "../../context";

export const registerReviewRoutes = async (
  app: FastifyInstance,
  context: AppContext,
): Promise<void> => {
  app.get("/api/v1/reviews/due", async () => ({
    cards: context.reviews.due(),
    count: context.reviews.countDue(),
  }));

  app.post<{ Params: { id: string } }>(
    "/api/v1/reviews/:id/rate",
    async (request, reply) => {
      const parsed = z
        .object({ rating: reviewRatingSchema })
        .safeParse(request.body);
      if (!parsed.success)
        return reply.code(400).send({ error: "Invalid review rating." });
      const found = context.reviews.getCard(request.params.id);
      if (!found)
        return reply.code(404).send({ error: "Review card not found." });
      const next = scheduleReview(found.stateJson, parsed.data.rating);
      context.reviews.saveReview(
        request.params.id,
        parsed.data.rating,
        found.stateJson,
        next.stateJson,
        next.dueAt,
      );
      return { dueAt: next.dueAt };
    },
  );
};
