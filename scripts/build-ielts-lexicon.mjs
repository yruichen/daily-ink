import { execFileSync } from "node:child_process";
import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { gzipSync } from "node:zlib";

const readArguments = () => {
  const values = { ecdict: [] };
  for (let index = 2; index < process.argv.length; index += 1) {
    const argument = process.argv[index];
    const value = process.argv[index + 1];
    if (argument === "--ecdict" && value) {
      values.ecdict.push(value);
      index += 1;
    } else if (argument === "--awl-pdf" && value) {
      values.awlPdf = value;
      index += 1;
    } else if (argument === "--output" && value) {
      values.output = value;
      index += 1;
    } else if (argument === "--manifest" && value) {
      values.manifest = value;
      index += 1;
    } else {
      throw new Error(`Unknown or incomplete argument: ${argument}`);
    }
  }
  if (!values.ecdict.length || !values.awlPdf || !values.output) {
    throw new Error(
      "Usage: node scripts/build-ielts-lexicon.mjs --ecdict <csv> [--ecdict <part>] --awl-pdf <pdf> --output <json> [--manifest <json>]",
    );
  }
  return values;
};

const normalizeTerm = (term) => term.trim().replace(/\s+/g, " ").toLowerCase();

const readAwlHeadwords = (pdfPath) => {
  const text = execFileSync("pdftotext", ["-layout", pdfPath, "-"], {
    encoding: "utf8",
    maxBuffer: 2 * 1024 * 1024,
  }).toLowerCase();
  const headwords = new Map();
  for (const match of text.matchAll(/\b([a-z]+(?:-[a-z]+)?)\s+(10|[1-9])\b/g)) {
    const word = match[1];
    if (word !== "sublist") headwords.set(word, Number(match[2]));
  }
  if (headwords.size !== 570) {
    throw new Error(`Expected 570 AWL headwords, found ${headwords.size}.`);
  }
  return headwords;
};

const parseCsv = (text, visit) => {
  let row = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index <= text.length; index += 1) {
    const character = index === text.length ? "\n" : text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"' && field.length === 0) {
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field.replace(/\r$/, ""));
      visit(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }
  if (quoted) throw new Error("Unterminated quoted CSV field.");
};

const numberOrNull = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const idForTerm = (term) =>
  `lex_${createHash("sha256").update(term).digest("hex").slice(0, 24)}`;

const compareFrequency = (left, right) =>
  (left.frequencyRank ?? Number.MAX_SAFE_INTEGER) -
    (right.frequencyRank ?? Number.MAX_SAFE_INTEGER) ||
  (left.bncRank ?? Number.MAX_SAFE_INTEGER) -
    (right.bncRank ?? Number.MAX_SAFE_INTEGER) ||
  left.term.localeCompare(right.term, "en");

const arguments_ = readArguments();
const awlHeadwords = readAwlHeadwords(arguments_.awlPdf);
const csvText = Buffer.concat(
  arguments_.ecdict.map((file) => readFileSync(file)),
).toString("utf8");
const selected = new Map();
const frequencyCandidates = [];
let headers;

parseCsv(csvText, (values) => {
  if (!headers) {
    headers = values;
    return;
  }
  if (!values.some(Boolean)) return;
  const row = Object.fromEntries(
    headers.map((header, index) => [header, values[index] ?? ""]),
  );
  const normalizedTerm = normalizeTerm(row.word);
  const awlLevel = awlHeadwords.get(normalizedTerm) ?? null;
  const isIelts = row.tag.split(/\s+/).includes("ielts");
  const frequencyRank = numberOrNull(row.frq);
  const isFrequencyCandidate =
    frequencyRank !== null &&
    frequencyRank <= 20_000 &&
    /^[a-z][a-z'-]*$/.test(normalizedTerm);
  if (!isIelts && awlLevel === null && !isFrequencyCandidate) return;
  if (!isIelts && awlLevel === null && !row.translation.trim()) return;
  if (!normalizedTerm || !row.translation.trim()) {
    throw new Error(`Selected term is missing required data: ${row.word}`);
  }
  const lemmaMatch = row.exchange.match(/(?:^|\/)0:([^/]+)/);
  const entry = {
    id: idForTerm(normalizedTerm),
    term: row.word.trim(),
    normalizedTerm,
    phonetic: row.phonetic.trim(),
    definitionEn: row.definition.trim(),
    translationZh: row.translation.trim(),
    partOfSpeech: row.pos.trim(),
    lemma: lemmaMatch?.[1]?.trim() || normalizedTerm,
    exchange: row.exchange.trim(),
    bncRank: numberOrNull(row.bnc),
    frequencyRank,
    isIelts,
    awlLevel,
  };
  if (isIelts || awlLevel !== null) selected.set(normalizedTerm, entry);
  if (isFrequencyCandidate) frequencyCandidates.push(entry);
});

const missingAwl = [...awlHeadwords.keys()].filter(
  (word) => !selected.has(word),
);
if (missingAwl.length) {
  throw new Error(
    `AWL headwords missing from ECDICT: ${missingAwl.join(", ")}`,
  );
}

frequencyCandidates.sort(compareFrequency);
for (const entry of frequencyCandidates) {
  if (selected.size >= 10_000) break;
  if (!selected.has(entry.normalizedTerm)) {
    selected.set(entry.normalizedTerm, entry);
  }
}
if (selected.size !== 10_000) {
  throw new Error(`Expected 10,000 extended entries, found ${selected.size}.`);
}

const entries = [...selected.values()].sort(compareFrequency);
const wordbooks = [
  {
    id: "ielts-core",
    nameKey: "wordbooks.ieltsCoreName",
    descriptionKey: "wordbooks.ieltsCoreDescription",
    source: "ECDICT IELTS tag",
    entries: entries
      .filter((entry) => entry.isIelts)
      .sort(compareFrequency)
      .map((entry, sortOrder) => ({
        lexiconId: entry.id,
        level: null,
        sortOrder,
      })),
  },
  {
    id: "academic-word-list",
    nameKey: "wordbooks.awlName",
    descriptionKey: "wordbooks.awlDescription",
    source: "Academic Word List headwords",
    entries: entries
      .filter((entry) => entry.awlLevel !== null)
      .sort(
        (left, right) =>
          left.awlLevel - right.awlLevel || compareFrequency(left, right),
      )
      .map((entry, sortOrder) => ({
        lexiconId: entry.id,
        level: entry.awlLevel,
        sortOrder,
      })),
  },
  {
    id: "ielts-extended",
    nameKey: "wordbooks.ieltsExtendedName",
    descriptionKey: "wordbooks.ieltsExtendedDescription",
    source: "ECDICT IELTS tag plus contemporary frequency ranking",
    entries: entries.sort(compareFrequency).map((entry, sortOrder) => ({
      lexiconId: entry.id,
      level: null,
      sortOrder,
    })),
  },
];

const data = {
  version: "2026.08.03-1",
  entries: entries.map((entry) =>
    Object.fromEntries(
      Object.entries(entry).filter(
        ([key]) => key !== "isIelts" && key !== "awlLevel",
      ),
    ),
  ),
  wordbooks,
};
const json = Buffer.from(`${JSON.stringify(data)}\n`);
const compressed = gzipSync(json, { level: 9 });
mkdirSync(path.dirname(arguments_.output), { recursive: true });
writeFileSync(arguments_.output, compressed);

const manifest = {
  version: data.version,
  generatedAt: new Date().toISOString(),
  dataFile: path.basename(arguments_.output),
  sha256: createHash("sha256").update(compressed).digest("hex"),
  uncompressedSha256: createHash("sha256").update(json).digest("hex"),
  compressedBytes: compressed.byteLength,
  uncompressedBytes: json.byteLength,
  entryCount: entries.length,
  wordbooks: Object.fromEntries(
    wordbooks.map((wordbook) => [wordbook.id, wordbook.entries.length]),
  ),
  sources: [
    {
      name: "ECDICT",
      url: "https://github.com/skywind3000/ECDICT",
      license: "MIT",
    },
    {
      name: "Academic Word List headwords",
      url: "https://www.wgtn.ac.nz/lals/resources/academicwordlist/awl-headwords",
      attribution: "Averil Coxhead, Victoria University of Wellington",
    },
  ],
};
if (arguments_.manifest) {
  mkdirSync(path.dirname(arguments_.manifest), { recursive: true });
  writeFileSync(arguments_.manifest, `${JSON.stringify(manifest, null, 2)}\n`);
}
process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
