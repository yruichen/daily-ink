import type { ProviderProfile } from "@ielts-diary/contracts";
import type { RenderedPrompt } from "@ielts-diary/prompt-engine";

export type ProviderRuntimeProfile = ProviderProfile & { apiKey: string };

export type LlmGeneration = {
  text: string;
  model: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
  };
};

export interface LlmProvider {
  generate(
    profile: ProviderRuntimeProfile,
    prompt: RenderedPrompt,
  ): Promise<LlmGeneration>;
  testConnection(
    profile: ProviderRuntimeProfile,
  ): Promise<{ ok: true; model: string }>;
}

const endpoint = (baseUrl: string, suffix: string): string => {
  const normalized = baseUrl.replace(/\/+$/, "");
  if (normalized.endsWith(suffix)) return normalized;
  return `${normalized}${suffix}`;
};

const requestJson = async (
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Record<string, any>> => {
  const response = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(timeoutMs),
  });
  const body = (await response.json().catch(() => ({}))) as Record<string, any>;
  if (!response.ok) {
    const message =
      body.error?.message ??
      body.error ??
      body.message ??
      `HTTP ${response.status}`;
    throw new Error(`Model request failed: ${String(message)}`);
  }
  return body;
};

export class OpenAiCompatibleProvider implements LlmProvider {
  async generate(
    profile: ProviderRuntimeProfile,
    prompt: RenderedPrompt,
  ): Promise<LlmGeneration> {
    const body: Record<string, unknown> = {
      model: profile.model,
      messages: [
        { role: "system", content: prompt.system },
        {
          role: "user",
          content: profile.supportsStructuredOutput
            ? prompt.user
            : `${prompt.user}\n\n${prompt.unstructuredSuffix}`,
        },
      ],
    };
    if (profile.supportsStructuredOutput) {
      body.response_format = {
        type: "json_schema",
        json_schema: {
          name: prompt.capability.replaceAll("-", "_"),
          strict: true,
          schema: prompt.schema,
        },
      };
    }
    const json = await requestJson(
      endpoint(profile.baseUrl, "/chat/completions"),
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(profile.apiKey
            ? { authorization: `Bearer ${profile.apiKey}` }
            : {}),
        },
        body: JSON.stringify(body),
      },
      profile.timeoutMs,
    );
    const text = json.choices?.[0]?.message?.content;
    if (typeof text !== "string")
      throw new Error("Model returned no text content.");
    return {
      text,
      model: String(json.model ?? profile.model),
      usage: {
        inputTokens: json.usage?.prompt_tokens,
        outputTokens: json.usage?.completion_tokens,
      },
    };
  }

  async testConnection(
    profile: ProviderRuntimeProfile,
  ): Promise<{ ok: true; model: string }> {
    const json = await requestJson(
      endpoint(profile.baseUrl, "/chat/completions"),
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(profile.apiKey
            ? { authorization: `Bearer ${profile.apiKey}` }
            : {}),
        },
        body: JSON.stringify({
          model: profile.model,
          messages: [{ role: "user", content: "Reply with OK." }],
          max_tokens: 8,
        }),
      },
      profile.timeoutMs,
    );
    return { ok: true, model: String(json.model ?? profile.model) };
  }
}

export class AnthropicCompatibleProvider implements LlmProvider {
  async generate(
    profile: ProviderRuntimeProfile,
    prompt: RenderedPrompt,
  ): Promise<LlmGeneration> {
    const body: Record<string, unknown> = {
      model: profile.model,
      max_tokens: 4096,
      system: prompt.system,
      messages: [
        {
          role: "user",
          content: profile.supportsStructuredOutput
            ? prompt.user
            : `${prompt.user}\n\n${prompt.unstructuredSuffix}`,
        },
      ],
    };
    if (profile.supportsStructuredOutput) {
      body.output_config = {
        format: {
          type: "json_schema",
          schema: prompt.schema,
        },
      };
    }
    const json = await requestJson(
      endpoint(profile.baseUrl, "/v1/messages"),
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "anthropic-version": "2023-06-01",
          ...(profile.apiKey ? { "x-api-key": profile.apiKey } : {}),
        },
        body: JSON.stringify(body),
      },
      profile.timeoutMs,
    );
    const text = (
      json.content as Array<{ type: string; text?: string }> | undefined
    )
      ?.filter((part) => part.type === "text")
      .map((part) => part.text ?? "")
      .join("");
    if (!text) throw new Error("Model returned no text content.");
    return {
      text,
      model: String(json.model ?? profile.model),
      usage: {
        inputTokens: json.usage?.input_tokens,
        outputTokens: json.usage?.output_tokens,
      },
    };
  }

  async testConnection(
    profile: ProviderRuntimeProfile,
  ): Promise<{ ok: true; model: string }> {
    const json = await requestJson(
      endpoint(profile.baseUrl, "/v1/messages"),
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "anthropic-version": "2023-06-01",
          ...(profile.apiKey ? { "x-api-key": profile.apiKey } : {}),
        },
        body: JSON.stringify({
          model: profile.model,
          max_tokens: 8,
          messages: [{ role: "user", content: "Reply with OK." }],
        }),
      },
      profile.timeoutMs,
    );
    return { ok: true, model: String(json.model ?? profile.model) };
  }
}

export const providerFor = (
  protocol: ProviderProfile["protocol"],
): LlmProvider =>
  protocol === "anthropic"
    ? new AnthropicCompatibleProvider()
    : new OpenAiCompatibleProvider();

export const parseJsonResponse = (text: string): unknown => {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced?.[1]) return JSON.parse(fenced[1]);
    const firstBrace = trimmed.indexOf("{");
    const lastBrace = trimmed.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
    }
    throw new Error("Model response is not valid JSON.");
  }
};
