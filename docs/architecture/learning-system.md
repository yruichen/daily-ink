# Learning system architecture

The learning system keeps persistence, scheduling, aggregation, and presentation
separate so each part can evolve without duplicating study rules.

## Module boundaries

- `packages/contracts` owns API payload schemas such as learning preferences and
  reports.
- `packages/review-engine` owns FSRS state parsing, scheduling, and retention
  prediction. Other packages must not reimplement the forgetting formula.
- `packages/database` owns durable preferences and SQL aggregation. It does not
  format charts or translated labels.
- `apps/api/src/modules/learning` combines database aggregates with FSRS
  predictions and exposes versioned HTTP endpoints.
- `apps/web/src/features/learning` owns reusable learning controls and charts.
  Route-level composition stays in `apps/web/src/pages`.

## Preferences

`newWordsPerSession` is stored under `learning.preferences` in `app_settings`.
The accepted range is 1–100 and is validated at the contract and API boundaries.
The web client optimistically updates this setting and restores the previous
value if persistence fails.

## Report definitions

- **Studied vocabulary:** distinct vocabulary items with at least one review log.
- **Stable vocabulary:** distinct items with an FSRS card stability of at least
  21 days. This is a learning indicator, not a permanent “mastered” state.
- **Recall rate:** `good + easy` divided by all ratings in the last 30 local
  calendar days.
- **Current streak:** consecutive local calendar days ending today, or yesterday
  when the user has not studied yet today.
- **Forgetting curve:** average predicted retrievability of currently active,
  previously reviewed cards if no additional review occurs.
- **Forecast:** active cards due during the next 14 local calendar days; overdue
  cards are grouped into today.

The client sends its current UTC offset so calendar-day statistics match local
time. If multi-user cloud sync is introduced, store an IANA timezone per user and
replace the offset parameter at the service boundary.

## Extension rules

Add new persisted study settings through the shared contract and repository,
not local storage. Add new report metrics to the analytics repository only when
SQL aggregation is required; derived metrics belong in the report service.
Frontend charts consume the report contract and must not query database-shaped
payloads.
