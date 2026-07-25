import type { FastifyInstance } from "fastify";
import { saveJournalSchema } from "@ielts-diary/contracts";
import type { AppContext } from "../../context";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export const registerJournalRoutes = async (
  app: FastifyInstance,
  context: AppContext,
): Promise<void> => {
  app.get("/api/v1/journals", async () => ({
    entries: context.journal.list(),
  }));

  app.get<{ Params: { date: string } }>(
    "/api/v1/journals/:date",
    async (request, reply) => {
      if (!datePattern.test(request.params.date)) {
        return reply.code(400).send({ error: "Invalid date." });
      }
      return { entry: context.journal.getByDate(request.params.date) };
    },
  );

  app.put<{ Params: { date: string } }>(
    "/api/v1/journals/:date",
    async (request, reply) => {
      if (!datePattern.test(request.params.date)) {
        return reply.code(400).send({ error: "Invalid date." });
      }
      const parsed = saveJournalSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: "Invalid journal entry.",
          details: parsed.error.flatten(),
        });
      }
      return {
        entry: context.journal.upsert(request.params.date, parsed.data),
      };
    },
  );
};
