import type { FastifyInstance } from "fastify";
import { providerProfileInputSchema } from "@ielts-diary/contracts";
import type { AppContext } from "../../context";
import { providerFor } from "@ielts-diary/llm-core";

export const registerSettingsRoutes = async (
  app: FastifyInstance,
  context: AppContext,
): Promise<void> => {
  app.get("/api/v1/providers", async () => ({
    profiles: context.providers.list(),
  }));

  app.post("/api/v1/providers", async (request, reply) => {
    const parsed = providerProfileInputSchema.safeParse(request.body);
    if (!parsed.success)
      return reply.code(400).send({ error: "Invalid provider profile." });
    const encryptedKey = parsed.data.apiKey
      ? context.vault.encrypt(parsed.data.apiKey)
      : null;
    return reply.code(201).send({
      profile: context.providers.save(parsed.data, encryptedKey),
    });
  });

  app.put<{ Params: { id: string } }>(
    "/api/v1/providers/:id",
    async (request, reply) => {
      if (!context.providers.get(request.params.id)) {
        return reply.code(404).send({ error: "Provider profile not found." });
      }
      const parsed = providerProfileInputSchema.safeParse(request.body);
      if (!parsed.success)
        return reply.code(400).send({ error: "Invalid provider profile." });
      const encryptedKey = parsed.data.apiKey
        ? context.vault.encrypt(parsed.data.apiKey)
        : null;
      return {
        profile: context.providers.save(
          parsed.data,
          encryptedKey,
          request.params.id,
        ),
      };
    },
  );

  app.delete<{ Params: { id: string } }>(
    "/api/v1/providers/:id",
    async (request, reply) => {
      return context.providers.delete(request.params.id)
        ? reply.code(204).send()
        : reply.code(404).send({ error: "Provider profile not found." });
    },
  );

  app.post<{ Params: { id: string } }>(
    "/api/v1/providers/:id/test",
    async (request, reply) => {
      const stored = context.providers.get(request.params.id);
      if (!stored)
        return reply.code(404).send({ error: "Provider profile not found." });
      const { encryptedApiKey, ...profile } = stored;
      try {
        const result = await providerFor(profile.protocol).testConnection({
          ...profile,
          apiKey: context.vault.decrypt(encryptedApiKey),
        });
        return result;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Connection failed.";
        return reply.code(422).send({ error: message });
      }
    },
  );
};
