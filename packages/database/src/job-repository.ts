import type { Job } from "@ielts-diary/contracts";
import { newId, nowIso } from "@ielts-diary/domain";
import type { DbConnection } from "./connection";

type JobRow = Record<string, unknown>;

const mapJob = (row: JobRow): Job => ({
  id: String(row.id),
  type: String(row.type) as Job["type"],
  status: String(row.status) as Job["status"],
  resultType: row.result_type ? String(row.result_type) : null,
  resultId: row.result_id ? String(row.result_id) : null,
  error: row.error ? String(row.error) : null,
  createdAt: String(row.created_at),
  updatedAt: String(row.updated_at),
});

export class JobRepository {
  constructor(private readonly connection: DbConnection) {}

  create(type: Job["type"], payload: Record<string, unknown>): Job {
    const id = newId();
    const now = nowIso();
    this.connection
      .prepare(
        `INSERT INTO jobs
         (id, type, status, payload_json, result_type, result_id, error, created_at, updated_at)
         VALUES (?, ?, 'queued', ?, NULL, NULL, NULL, ?, ?)`,
      )
      .run(id, type, JSON.stringify(payload), now, now);
    return this.get(id)!;
  }

  get(id: string): Job | null {
    const row = this.connection
      .prepare("SELECT * FROM jobs WHERE id = ?")
      .get(id) as JobRow | undefined;
    return row ? mapJob(row) : null;
  }

  getPayload(id: string): Record<string, unknown> | null {
    const row = this.connection
      .prepare("SELECT payload_json FROM jobs WHERE id = ?")
      .get(id) as { payload_json: string } | undefined;
    return row
      ? (JSON.parse(row.payload_json) as Record<string, unknown>)
      : null;
  }

  nextQueued(): Job | null {
    const row = this.connection
      .prepare(
        "SELECT * FROM jobs WHERE status = 'queued' ORDER BY created_at ASC LIMIT 1",
      )
      .get() as JobRow | undefined;
    return row ? mapJob(row) : null;
  }

  markRunning(id: string): void {
    this.connection
      .prepare(
        "UPDATE jobs SET status = 'running', updated_at = ? WHERE id = ? AND status = 'queued'",
      )
      .run(nowIso(), id);
  }

  complete(id: string, resultType: string, resultId: string): void {
    this.connection
      .prepare(
        "UPDATE jobs SET status = 'completed', result_type = ?, result_id = ?, error = NULL, updated_at = ? WHERE id = ?",
      )
      .run(resultType, resultId, nowIso(), id);
  }

  fail(id: string, error: string): void {
    this.connection
      .prepare(
        "UPDATE jobs SET status = 'failed', error = ?, updated_at = ? WHERE id = ?",
      )
      .run(error.slice(0, 2000), nowIso(), id);
  }

  cancel(id: string): boolean {
    return (
      this.connection
        .prepare(
          "UPDATE jobs SET status = 'cancelled', updated_at = ? WHERE id = ? AND status IN ('queued', 'running')",
        )
        .run(nowIso(), id).changes > 0
    );
  }

  recoverInterrupted(): void {
    this.connection
      .prepare(
        "UPDATE jobs SET status = 'queued', updated_at = ? WHERE status = 'running'",
      )
      .run(nowIso());
  }
}
