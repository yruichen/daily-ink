import type { FastifyInstance } from "fastify";
import { learningPreferencesSchema } from "@ielts-diary/contracts";
import { z } from "zod";
import type { AppContext } from "../../context";
import { buildLearningReport } from "./report-service";

const reportQuerySchema = z.object({
  timezoneOffsetMinutes: z.coerce.number().int().min(-840).max(840).default(0),
});

export const registerLearningRoutes = async (
  app: FastifyInstance,
  context: AppContext,
): Promise<void> => {
  app.get("/api/v1/learning/preferences", async () => ({
    preferences: context.learningSettings.get(),
  }));

  app.put("/api/v1/learning/preferences", async (request, reply) => {
    const parsed = learningPreferencesSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid learning preferences." });
    }
    return { preferences: context.learningSettings.save(parsed.data) };
  });

  app.get("/api/v1/learning/report", async (request, reply) => {
    const parsed = reportQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid report timezone." });
    }
    return {
      report: buildLearningReport(
        context.reviewAnalytics,
        parsed.data.timezoneOffsetMinutes,
      ),
    };
  });
};
