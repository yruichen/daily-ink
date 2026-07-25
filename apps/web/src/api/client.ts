import type {
  Assessment,
  Job,
  JournalEntry,
  ProviderProfile,
  ProviderProfileInput,
  ReviewCard,
  ReviewRating,
  Rewrite,
  SaveJournalInput,
  VocabularyInput,
  VocabularyItem,
} from "@ielts-diary/contracts";

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(path, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...init?.headers,
    },
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(body.error ?? `Request failed (${response.status})`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
};

export const api = {
  health: () =>
    request<{
      status: string;
      providerConfigured: boolean;
      dueReviews: number;
    }>("/api/v1/health"),
  journal: (date: string) =>
    request<{ entry: JournalEntry | null }>(`/api/v1/journals/${date}`),
  journals: () => request<{ entries: JournalEntry[] }>("/api/v1/journals"),
  saveJournal: (date: string, input: SaveJournalInput) =>
    request<{ entry: JournalEntry }>(`/api/v1/journals/${date}`, {
      method: "PUT",
      body: JSON.stringify(input),
    }),
  assessments: (journalId: string) =>
    request<{ assessments: Assessment[] }>(
      `/api/v1/journals/${journalId}/assessments`,
    ),
  startAssessment: (input: {
    journalId: string;
    locale: "en" | "zh-CN";
    providerProfileId?: string;
  }) =>
    request<{ job: Job }>("/api/v1/assessments", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  rewrites: (journalId: string) =>
    request<{ rewrites: Rewrite[] }>(`/api/v1/journals/${journalId}/rewrites`),
  startRewrite: (input: {
    journalId: string;
    locale: "en" | "zh-CN";
    mode: "natural" | "target-band";
    targetBand: number | null;
  }) =>
    request<{ job: Job }>("/api/v1/rewrites", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  job: (id: string) => request<{ job: Job }>(`/api/v1/jobs/${id}`),
  vocabulary: (query = "") =>
    request<{ items: VocabularyItem[] }>(
      `/api/v1/vocabulary?q=${encodeURIComponent(query)}`,
    ),
  addVocabulary: (input: VocabularyInput) =>
    request<{ item: VocabularyItem; created: boolean }>("/api/v1/vocabulary", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  deleteVocabulary: (id: string) =>
    request<void>(`/api/v1/vocabulary/${id}`, { method: "DELETE" }),
  enrichVocabulary: (id: string, locale: "en" | "zh-CN") =>
    request<{ job: Job }>(`/api/v1/vocabulary/${id}/enrich`, {
      method: "POST",
      body: JSON.stringify({ locale }),
    }),
  dueReviews: () =>
    request<{ cards: ReviewCard[]; count: number }>("/api/v1/reviews/due"),
  rateReview: (id: string, rating: ReviewRating) =>
    request<{ dueAt: string }>(`/api/v1/reviews/${id}/rate`, {
      method: "POST",
      body: JSON.stringify({ rating }),
    }),
  providers: () =>
    request<{ profiles: ProviderProfile[] }>("/api/v1/providers"),
  saveProvider: (input: ProviderProfileInput, id?: string) =>
    request<{ profile: ProviderProfile }>(
      id ? `/api/v1/providers/${id}` : "/api/v1/providers",
      {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(input),
      },
    ),
  deleteProvider: (id: string) =>
    request<void>(`/api/v1/providers/${id}`, { method: "DELETE" }),
  testProvider: (id: string) =>
    request<{ ok: true; model: string }>(`/api/v1/providers/${id}/test`, {
      method: "POST",
      body: "{}",
    }),
};
