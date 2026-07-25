import { createHash, randomUUID } from "node:crypto";

export const newId = (): string => randomUUID();

export const nowIso = (): string => new Date().toISOString();

export const hashContent = (content: string): string =>
  createHash("sha256").update(content.normalize("NFC")).digest("hex");

export const normalizeTerm = (term: string): string =>
  term.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("en");

export const inferVocabularyKind = (term: string): "word" | "phrase" =>
  /\s/.test(term.trim()) ? "phrase" : "word";

export const roundBandScore = (scores: readonly number[]): number => {
  if (scores.length === 0) return 0;
  const average =
    scores.reduce((total, score) => total + score, 0) / scores.length;
  return Math.min(9, Math.max(0, Math.round(average * 2) / 2));
};
