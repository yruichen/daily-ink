import type {
  ProviderProfile,
  ProviderProfileInput,
} from "@ielts-diary/contracts";
import { newId, nowIso } from "@ielts-diary/domain";
import type { DbConnection } from "./connection";

type ProviderRow = Record<string, unknown>;

const mapProvider = (row: ProviderRow): ProviderProfile => ({
  id: String(row.id),
  name: String(row.name),
  protocol: String(row.protocol) as ProviderProfile["protocol"],
  baseUrl: String(row.base_url),
  model: String(row.model),
  supportsStructuredOutput: Boolean(row.supports_structured_output),
  timeoutMs: Number(row.timeout_ms),
  isDefault: Boolean(row.is_default),
  hasApiKey: Boolean(row.encrypted_api_key),
  createdAt: String(row.created_at),
  updatedAt: String(row.updated_at),
});

export class ProviderRepository {
  constructor(private readonly connection: DbConnection) {}

  list(): ProviderProfile[] {
    const rows = this.connection
      .prepare(
        "SELECT * FROM provider_profiles ORDER BY is_default DESC, created_at ASC",
      )
      .all() as ProviderRow[];
    return rows.map(mapProvider);
  }

  get(
    id: string,
  ): (ProviderProfile & { encryptedApiKey: string | null }) | null {
    const row = this.connection
      .prepare("SELECT * FROM provider_profiles WHERE id = ?")
      .get(id) as ProviderRow | undefined;
    return row
      ? {
          ...mapProvider(row),
          encryptedApiKey: row.encrypted_api_key
            ? String(row.encrypted_api_key)
            : null,
        }
      : null;
  }

  getDefault(): (ProviderProfile & { encryptedApiKey: string | null }) | null {
    const row = this.connection
      .prepare(
        "SELECT * FROM provider_profiles ORDER BY is_default DESC, created_at ASC LIMIT 1",
      )
      .get() as ProviderRow | undefined;
    return row
      ? {
          ...mapProvider(row),
          encryptedApiKey: row.encrypted_api_key
            ? String(row.encrypted_api_key)
            : null,
        }
      : null;
  }

  save(
    input: ProviderProfileInput,
    encryptedApiKey: string | null,
    id?: string,
  ): ProviderProfile {
    const now = nowIso();
    const profileId = id ?? newId();
    const existing = id ? this.get(id) : null;
    const keyToStore = encryptedApiKey ?? existing?.encryptedApiKey ?? null;
    const write = this.connection.transaction(() => {
      if (input.isDefault) {
        this.connection
          .prepare("UPDATE provider_profiles SET is_default = 0")
          .run();
      }
      this.connection
        .prepare(
          `INSERT INTO provider_profiles
           (id, name, protocol, base_url, model, encrypted_api_key, supports_structured_output,
            timeout_ms, is_default, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             name=excluded.name, protocol=excluded.protocol, base_url=excluded.base_url,
             model=excluded.model, encrypted_api_key=excluded.encrypted_api_key,
             supports_structured_output=excluded.supports_structured_output,
             timeout_ms=excluded.timeout_ms, is_default=excluded.is_default,
             updated_at=excluded.updated_at`,
        )
        .run(
          profileId,
          input.name,
          input.protocol,
          input.baseUrl.replace(/\/+$/, ""),
          input.model,
          keyToStore,
          input.supportsStructuredOutput ? 1 : 0,
          input.timeoutMs,
          input.isDefault ? 1 : 0,
          existing?.createdAt ?? now,
          now,
        );
    });
    write();
    return this.get(profileId)!;
  }

  delete(id: string): boolean {
    return (
      this.connection
        .prepare("DELETE FROM provider_profiles WHERE id = ?")
        .run(id).changes > 0
    );
  }
}
