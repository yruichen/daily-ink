import {
  learningPreferencesSchema,
  type LearningPreferences,
} from "@ielts-diary/contracts";
import { nowIso } from "@ielts-diary/domain";
import type { DbConnection } from "./connection";

const LEARNING_PREFERENCES_KEY = "learning.preferences";
const DEFAULT_PREFERENCES: LearningPreferences = { newWordsPerSession: 20 };

export class LearningSettingsRepository {
  constructor(private readonly connection: DbConnection) {}

  get(): LearningPreferences {
    const row = this.connection
      .prepare("SELECT value_json FROM app_settings WHERE key = ?")
      .get(LEARNING_PREFERENCES_KEY) as { value_json: string } | undefined;
    if (!row) return DEFAULT_PREFERENCES;
    try {
      const parsed = learningPreferencesSchema.safeParse(
        JSON.parse(row.value_json),
      );
      return parsed.success ? parsed.data : DEFAULT_PREFERENCES;
    } catch {
      return DEFAULT_PREFERENCES;
    }
  }

  save(preferences: LearningPreferences): LearningPreferences {
    const validated = learningPreferencesSchema.parse(preferences);
    this.connection
      .prepare(
        `INSERT INTO app_settings (key, value_json, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET
           value_json = excluded.value_json,
           updated_at = excluded.updated_at`,
      )
      .run(LEARNING_PREFERENCES_KEY, JSON.stringify(validated), nowIso());
    return validated;
  }
}
