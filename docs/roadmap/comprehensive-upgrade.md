# Daily Ink Comprehensive Upgrade Plan

## Objective

Move Daily Ink from a strong early-stage local application to a dependable
learning product with measurable writing outcomes, trustworthy AI feedback,
safe data evolution, and a repeatable release process.

## Current baseline (2026-07-25)

- The modular-monolith boundaries are clear and the TypeScript quality gate is
  healthy.
- Type checking, linting, unit/integration tests, and production builds pass.
- The prompt registry, immutable AI-result snapshots, encrypted provider keys,
  SQLite foreign keys, and local-only default binding are sound foundations.
- Production dependencies currently report no known vulnerabilities through
  the official npm audit endpoint.
- Automated coverage is thin: there are six tests and no web-component or
  browser-flow tests.
- Visual UX and responsive behavior still need a screenshot-based browser
  audit; the browser surface was unavailable during this review.

## Phase 0 — Release baseline

Status: started.

- [x] Make application asset paths independent of the process working
      directory so the documented `npm start` command works.
- [x] Add regression coverage for default and overridden runtime paths.
- [x] Re-run type checking, linting, tests, build, production startup, and the
      health endpoint.
- [ ] Add a production smoke test to CI so a successful build must also start
      and answer `/api/v1/health`.
- [ ] Add dependency-audit and container-build checks to CI.

Exit criteria: a clean checkout can install, build, start, answer a health
check, and shut down through documented commands.

## Phase 1 — Trust, data safety, and testability

### Writing safety

- Replace the boolean autosave flag with a revision-aware save queue. A slower
  request must never mark a newer draft as saved or discard edits during date
  navigation.
- Show explicit `saving`, `saved`, `offline/error`, and `retrying` states.
- Add a navigation guard and a final flush for pending drafts.

### Data evolution and recovery

- Replace the single idempotent schema script with numbered, transactional
  migrations and a schema-version table.
- Ship full backup/export and restore/import for the SQLite database plus the
  encryption key, with compatibility validation before restore.
- Add integrity checks and a recovery guide for missing or mismatched keys.

### Quality coverage

- Add repository tests for journals, jobs, vocabulary deduplication, cascading
  deletion, and FSRS review logging.
- Add API contract tests for validation, provider lifecycle, job failure and
  cancellation, stale-result behavior, and error redaction.
- Add web tests for autosave races, date switching, provider forms, vocabulary
  capture, and review progression.
- Add one desktop and one mobile end-to-end happy path.

### Accessibility and resilience

- Add a top-level error boundary and actionable query/mutation error states.
- Give the modal focus entry, focus trapping, Escape handling, and focus
  restoration.
- Localize remaining hard-coded interface labels and verify keyboard-only use,
  contrast, 200% zoom, reduced motion, and screen-reader announcements.
- Add security headers, an explicit content-security policy, and documented
  request-size/rate limits suitable for both local and exposed deployments.

Exit criteria: common failures are recoverable, draft loss is covered by an
automated regression test, migrations are reversible through backup, and the
core flow passes keyboard and mobile checks.

## Phase 2 — Complete the learning loop

- Add IELTS Writing Task 1 and Task 2 modes with task-specific prompts,
  rubrics, timers, word-count targets, and attempt metadata. Keep free writing
  as a separate mode and avoid presenting it as an official band score.
- Turn feedback into actions: accept a correction, compare revisions, retry a
  paragraph, save an expression, and mark a priority as practised.
- Add progress views based on writing consistency, rubric dimensions, repeated
  error categories, vocabulary reuse, and review retention. Avoid a single
  vanity score.
- Expand history from the latest seven entries to search, calendar navigation,
  filters, and entry-level result history.
- Add vocabulary editing, source inspection, tag filters, bulk actions,
  suspension, and leech handling.
- Improve review sessions with remaining-card progress, keyboard shortcuts,
  answer comparison, undo, and session summaries.

Exit criteria: a learner can practise, understand feedback, revise, retain new
language, and see whether recurring weaknesses are improving.

## Phase 3 — AI quality and observability

- Create a versioned calibration set for assessment, rewrite, and vocabulary
  enrichment, including adversarial and malformed-output cases.
- Add schema-repair retries, bounded exponential backoff, cancellation through
  `AbortSignal`, and provider-specific error classification.
- Record latency, token usage, estimated cost, retries, and failure category
  without logging journal content or credentials.
- Replace short-interval web polling with the existing job event stream, with a
  polling fallback.
- Add job deduplication for identical content/provider/prompt requests and
  surface real cancellation in the interface.
- Require evaluation thresholds before changing a prompt version or default
  model preset.

Exit criteria: AI changes are measurable, failures are diagnosable, and model
behavior can improve without silently regressing learner outcomes.

## Phase 4 — Packaging and optional sync

- Choose a distribution target after validating demand: PWA for the lightest
  path, or Tauri for a desktop-native local data and backup experience.
- Add signed releases, changelogs, database compatibility notes, and automated
  artifacts for supported platforms.
- Design optional encrypted sync only after local backup/restore is reliable.
  Multi-user auth, tenancy, and server-side authorization belong to the sync
  product, not the local-only default.
- Add opt-in, privacy-preserving operational diagnostics only if users need
  support beyond local logs.

Exit criteria: installation and upgrades are predictable, data remains
recoverable, and any sync capability preserves the local-first promise.

## Recommended execution order

1. Finish Phase 0 and the autosave/data-safety slice of Phase 1.
2. Establish tests and accessibility checks before expanding screens.
3. Build Task 1/Task 2 and the feedback-to-revision loop.
4. Introduce AI evaluation and observability before changing default prompts or
   providers at scale.
5. Package the proven product; add sync only when there is a validated need.

## Success measures

- Zero confirmed draft-loss incidents.
- At least 80% coverage on domain, repository, and API application logic, with
  behavior-focused tests rather than line-count-only targets.
- Core write → feedback → revise → capture → review journey passes automated
  desktop and mobile flows.
- 95% of AI jobs complete or return an actionable classified error within the
  configured timeout.
- Every release has a restorable backup path and a tested schema upgrade path.
- Accessibility verification covers keyboard use, visible focus, screen-reader
  names/state, responsive reflow, and reduced motion for the core journey.
