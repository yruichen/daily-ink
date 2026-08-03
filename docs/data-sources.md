# Vocabulary data sources

Daily Ink ships a generated, offline vocabulary subset. The generated file is
versioned in the repository so application startup never downloads third-party
data. It is intended for personal and open-source educational use and must not
be described as an official IELTS word list.

## ECDICT

- Project: [skywind3000/ECDICT](https://github.com/skywind3000/ECDICT)
- License declared by the project: MIT
- Used fields: word, phonetic, English definition, Chinese translation, part of
  speech, word forms, BNC rank, contemporary frequency rank, and exam tags.
- IELTS Core contains entries whose `tag` field contains the exact token
  `ielts`. IELTS Extended combines those entries with contemporary
  high-frequency entries until the normalized set reaches 10,000 entries.

ECDICT documents that its data was assembled from multiple historical sources.
Commercial distributors should perform their own provenance and licensing
review before redistributing the generated dataset.

## Academic Word List

- Publisher: Victoria University of Wellington
- Author: Averil Coxhead
- Source: [Academic Word List headwords](https://www.wgtn.ac.nz/lals/resources/academicwordlist/awl-headwords)
- Used data: the 570 headwords and their sublist numbers.

## Rebuilding

Download a fixed revision of `ecdict.csv` and the official AWL headwords PDF,
then run:

```bash
npm run data:lexicon -- \
  --ecdict /path/to/ecdict.csv \
  --awl-pdf /path/to/Headwords-of-the-Academic-Word-List.pdf \
  --output packages/database/data/ielts-lexicon.json.gz \
  --manifest packages/database/data/ielts-lexicon.manifest.json
```

The builder validates exactly 570 AWL headwords, rejects missing required
translations, de-duplicates normalized terms, compresses the result, and emits
compressed and uncompressed SHA-256 checksums. The production build copies this
asset beside the API bundle instead of compiling vocabulary records into
JavaScript.
