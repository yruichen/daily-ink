import type {
  Assessment,
  AssessmentResult,
  Rewrite,
  RewriteResult,
} from "@ielts-diary/contracts";
import { newId, nowIso } from "@ielts-diary/domain";
import type { DbConnection } from "./connection";

type AiMetadata = {
  promptId: string;
  promptVersion: string;
  promptHash: string;
  providerProfileId: string;
  modelName: string;
  modelSnapshot: Record<string, unknown>;
};

export class AssessmentRepository {
  constructor(private readonly connection: DbConnection) {}

  create(input: {
    journalId: string;
    snapshotText: string;
    snapshotHash: string;
    result: AssessmentResult;
    metadata: AiMetadata;
  }): Assessment {
    const id = newId();
    const createdAt = nowIso();
    this.connection
      .prepare(
        `INSERT INTO assessments
         (id, journal_id, snapshot_text, snapshot_hash, result_json, prompt_id, prompt_version,
          prompt_hash, provider_profile_id, model_name, model_snapshot_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        input.journalId,
        input.snapshotText,
        input.snapshotHash,
        JSON.stringify(input.result),
        input.metadata.promptId,
        input.metadata.promptVersion,
        input.metadata.promptHash,
        input.metadata.providerProfileId,
        input.metadata.modelName,
        JSON.stringify(input.metadata.modelSnapshot),
        createdAt,
      );
    return {
      id,
      journalId: input.journalId,
      snapshotHash: input.snapshotHash,
      result: input.result,
      promptVersion: input.metadata.promptVersion,
      modelName: input.metadata.modelName,
      createdAt,
    };
  }

  list(journalId: string): Assessment[] {
    const rows = this.connection
      .prepare(
        "SELECT * FROM assessments WHERE journal_id = ? ORDER BY created_at DESC",
      )
      .all(journalId) as Array<Record<string, unknown>>;
    return rows.map((row) => ({
      id: String(row.id),
      journalId: String(row.journal_id),
      snapshotHash: String(row.snapshot_hash),
      result: JSON.parse(String(row.result_json)) as AssessmentResult,
      promptVersion: String(row.prompt_version),
      modelName: String(row.model_name),
      createdAt: String(row.created_at),
    }));
  }
}

export class RewriteRepository {
  constructor(private readonly connection: DbConnection) {}

  create(input: {
    journalId: string;
    snapshotText: string;
    snapshotHash: string;
    mode: "natural" | "target-band";
    targetBand: number | null;
    result: RewriteResult;
    metadata: AiMetadata;
  }): Rewrite {
    const id = newId();
    const createdAt = nowIso();
    this.connection
      .prepare(
        `INSERT INTO rewrites
         (id, journal_id, snapshot_text, snapshot_hash, mode, target_band_x2, result_json,
          prompt_id, prompt_version, prompt_hash, provider_profile_id, model_name,
          model_snapshot_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        input.journalId,
        input.snapshotText,
        input.snapshotHash,
        input.mode,
        input.targetBand === null ? null : input.targetBand * 2,
        JSON.stringify(input.result),
        input.metadata.promptId,
        input.metadata.promptVersion,
        input.metadata.promptHash,
        input.metadata.providerProfileId,
        input.metadata.modelName,
        JSON.stringify(input.metadata.modelSnapshot),
        createdAt,
      );
    return {
      id,
      journalId: input.journalId,
      snapshotHash: input.snapshotHash,
      mode: input.mode,
      targetBand: input.targetBand,
      result: input.result,
      promptVersion: input.metadata.promptVersion,
      modelName: input.metadata.modelName,
      createdAt,
    };
  }

  list(journalId: string): Rewrite[] {
    const rows = this.connection
      .prepare(
        "SELECT * FROM rewrites WHERE journal_id = ? ORDER BY created_at DESC",
      )
      .all(journalId) as Array<Record<string, unknown>>;
    return rows.map((row) => ({
      id: String(row.id),
      journalId: String(row.journal_id),
      snapshotHash: String(row.snapshot_hash),
      mode: String(row.mode) as Rewrite["mode"],
      targetBand:
        row.target_band_x2 === null ? null : Number(row.target_band_x2) / 2,
      result: JSON.parse(String(row.result_json)) as RewriteResult,
      promptVersion: String(row.prompt_version),
      modelName: String(row.model_name),
      createdAt: String(row.created_at),
    }));
  }
}
