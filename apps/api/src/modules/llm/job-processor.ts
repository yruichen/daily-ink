import {
  assessmentResultSchema,
  rewriteResultSchema,
} from "@ielts-diary/contracts";
import {
  parseJsonResponse,
  providerFor,
  type ProviderRuntimeProfile,
} from "@ielts-diary/llm-core";
import { z } from "zod";
import type { AppContext } from "../../context";

const enrichmentSchema = z.object({
  lemma: z.string(),
  partOfSpeech: z.string(),
  definition: z.string(),
  contextExplanation: z.string(),
  collocations: z.array(z.string()).max(8),
});

export class JobProcessor {
  private running = false;
  private timer: NodeJS.Timeout | null = null;

  constructor(private readonly context: AppContext) {}

  start(): void {
    this.context.jobs.recoverInterrupted();
    this.schedule(10);
  }

  stop(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  wake(): void {
    this.schedule(0);
  }

  private schedule(delay: number): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.processNext(), delay);
  }

  private async processNext(): Promise<void> {
    if (this.running) return;
    const job = this.context.jobs.nextQueued();
    if (!job) {
      this.schedule(500);
      return;
    }
    this.running = true;
    this.context.jobs.markRunning(job.id);
    try {
      const payload = this.context.jobs.getPayload(job.id);
      if (!payload) throw new Error("Job payload is missing.");
      if (job.type === "assessment")
        await this.processAssessment(job.id, payload);
      if (job.type === "rewrite") await this.processRewrite(job.id, payload);
      if (job.type === "vocabulary-enrichment") {
        await this.processVocabularyEnrichment(job.id, payload);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown model error";
      this.context.logger.warn(
        { jobId: job.id, error: message },
        "LLM job failed",
      );
      this.context.jobs.fail(job.id, message);
    } finally {
      this.running = false;
      this.schedule(10);
    }
  }

  private runtimeProfile(profileId?: string): ProviderRuntimeProfile {
    const stored = profileId
      ? this.context.providers.get(profileId)
      : this.context.providers.getDefault();
    if (!stored) throw new Error("No model provider is configured.");
    const { encryptedApiKey, ...profile } = stored;
    return {
      ...profile,
      apiKey: this.context.vault.decrypt(encryptedApiKey),
    };
  }

  private async processAssessment(
    jobId: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const journal = this.context.journal.getById(String(payload.journalId));
    if (!journal) throw new Error("Journal entry not found.");
    if (journal.contentText.trim().length < 10) {
      throw new Error(
        "Write at least 10 characters before requesting an assessment.",
      );
    }
    const profile = this.runtimeProfile(
      payload.providerProfileId ? String(payload.providerProfileId) : undefined,
    );
    const prompt = this.context.prompts.render("assessment", {
      response_language:
        payload.locale === "zh-CN" ? "Simplified Chinese" : "English",
      diary_text: journal.contentText,
    });
    const generation = await providerFor(profile.protocol).generate(
      profile,
      prompt,
    );
    const result = assessmentResultSchema.parse(
      parseJsonResponse(generation.text),
    );
    const assessment = this.context.assessments.create({
      journalId: journal.id,
      snapshotText: journal.contentText,
      snapshotHash: journal.contentHash,
      result,
      metadata: {
        promptId: prompt.id,
        promptVersion: prompt.version,
        promptHash: prompt.hash,
        providerProfileId: profile.id,
        modelName: generation.model,
        modelSnapshot: {
          protocol: profile.protocol,
          baseUrl: profile.baseUrl,
          model: profile.model,
        },
      },
    });
    this.context.jobs.complete(jobId, "assessment", assessment.id);
  }

  private async processRewrite(
    jobId: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const journal = this.context.journal.getById(String(payload.journalId));
    if (!journal) throw new Error("Journal entry not found.");
    if (journal.contentText.trim().length < 10) {
      throw new Error(
        "Write at least 10 characters before requesting a rewrite.",
      );
    }
    const mode = payload.mode === "target-band" ? "target-band" : "natural";
    const targetBand =
      mode === "target-band" && typeof payload.targetBand === "number"
        ? payload.targetBand
        : null;
    const profile = this.runtimeProfile(
      payload.providerProfileId ? String(payload.providerProfileId) : undefined,
    );
    const rewriteGoal =
      mode === "target-band"
        ? `Improve the writing toward IELTS Band ${targetBand ?? 7}, without making it unnatural.`
        : "Make the writing natural, clear, accurate, and idiomatic.";
    const prompt = this.context.prompts.render("rewrite", {
      response_language:
        payload.locale === "zh-CN" ? "Simplified Chinese" : "English",
      rewrite_goal: rewriteGoal,
      diary_text: journal.contentText,
    });
    const generation = await providerFor(profile.protocol).generate(
      profile,
      prompt,
    );
    const result = rewriteResultSchema.parse(
      parseJsonResponse(generation.text),
    );
    const rewrite = this.context.rewrites.create({
      journalId: journal.id,
      snapshotText: journal.contentText,
      snapshotHash: journal.contentHash,
      mode,
      targetBand,
      result,
      metadata: {
        promptId: prompt.id,
        promptVersion: prompt.version,
        promptHash: prompt.hash,
        providerProfileId: profile.id,
        modelName: generation.model,
        modelSnapshot: {
          protocol: profile.protocol,
          baseUrl: profile.baseUrl,
          model: profile.model,
        },
      },
    });
    this.context.jobs.complete(jobId, "rewrite", rewrite.id);
  }

  private async processVocabularyEnrichment(
    jobId: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const item = this.context.vocabulary.get(String(payload.vocabularyId));
    if (!item) throw new Error("Vocabulary item not found.");
    const profile = this.runtimeProfile(
      payload.providerProfileId ? String(payload.providerProfileId) : undefined,
    );
    const prompt = this.context.prompts.render("vocabulary-enrichment", {
      response_language:
        payload.locale === "zh-CN" ? "Simplified Chinese" : "English",
      term: item.term,
      context_sentence: item.contextSentence,
    });
    const generation = await providerFor(profile.protocol).generate(
      profile,
      prompt,
    );
    const result = enrichmentSchema.parse(parseJsonResponse(generation.text));
    this.context.vocabulary.updateEnrichment(item.id, result);
    this.context.jobs.complete(jobId, "vocabulary", item.id);
  }
}
