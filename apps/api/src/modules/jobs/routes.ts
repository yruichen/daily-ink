import type { FastifyInstance } from "fastify";
import type { AppContext } from "../../context";

export const registerJobRoutes = async (
  app: FastifyInstance,
  context: AppContext,
): Promise<void> => {
  app.get<{ Params: { id: string } }>(
    "/api/v1/jobs/:id",
    async (request, reply) => {
      const job = context.jobs.get(request.params.id);
      return job ? { job } : reply.code(404).send({ error: "Job not found." });
    },
  );

  app.delete<{ Params: { id: string } }>(
    "/api/v1/jobs/:id",
    async (request, reply) => {
      const cancelled = context.jobs.cancel(request.params.id);
      return cancelled
        ? reply.code(204).send()
        : reply.code(409).send({ error: "Job cannot be cancelled." });
    },
  );

  app.get<{ Params: { id: string } }>(
    "/api/v1/jobs/:id/events",
    async (request, reply) => {
      reply.raw.setHeader("content-type", "text/event-stream");
      reply.raw.setHeader("cache-control", "no-cache");
      reply.raw.setHeader("connection", "keep-alive");
      const send = (): boolean => {
        const job = context.jobs.get(request.params.id);
        reply.raw.write(`data: ${JSON.stringify(job)}\n\n`);
        return (
          !job || ["completed", "failed", "cancelled"].includes(job.status)
        );
      };
      if (send()) return reply.raw.end();
      const timer = setInterval(() => {
        if (send()) {
          clearInterval(timer);
          reply.raw.end();
        }
      }, 750);
      request.raw.on("close", () => clearInterval(timer));
      return reply.hijack();
    },
  );
};
