import { describe, expect, it } from "vitest";
import { inferVocabularyKind, normalizeTerm, roundBandScore } from "./index";

describe("domain rules", () => {
  it("rounds an average to the nearest half band", () => {
    expect(roundBandScore([6, 6.5, 7, 6.5])).toBe(6.5);
    expect(roundBandScore([6, 6, 6, 7])).toBe(6.5);
  });

  it("normalizes vocabulary without collapsing phrases into words", () => {
    expect(normalizeTerm("  Take   part in ")).toBe("take part in");
    expect(inferVocabularyKind("take part in")).toBe("phrase");
  });
});
