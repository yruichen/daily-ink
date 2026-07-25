# Architecture

Daily Ink is a modular monolith. It keeps local installation and transactions
simple while preserving boundaries that can become services later.

## Dependency direction

```text
HTTP/UI -> application modules -> domain interfaces
                                  ^
infrastructure implementations --|
```

The domain package does not import React, Fastify, SQLite, Drizzle, or model
SDKs. HTTP handlers validate input, invoke a module use case, and map the
result. Repositories own persistence mapping. Provider adapters own wire
protocol differences.

Modules communicate through their public entry points. New generic `utils`,
`helpers`, or `common` directories are not allowed; shared code must have a
specific owner and purpose.

## Runtime

The Fastify composition root creates the SQLite connection, repositories,
secret vault, prompt registry, and job processor. The production server serves
the Vite build from the same origin. It binds only to `127.0.0.1`.

LLM tasks are persisted before execution. Interrupted running tasks return to
the queue on startup. AI results are immutable snapshots; editing a journal
does not rewrite its result history.

## Enterprise evolution

The first infrastructure substitutions are:

1. SQLite repositories to PostgreSQL repositories.
2. The local job runner to Redis/BullMQ or a message broker.
3. The local secret vault to KMS or Vault.
4. Single-user access to OIDC, RBAC, audit logs, and tenant-scoped queries.
5. Local logs to OpenTelemetry traces, metrics, and centralized logs.

The LLM gateway and job worker are the first candidates to extract. Other
modules remain together until deployment or team ownership requires a split.
