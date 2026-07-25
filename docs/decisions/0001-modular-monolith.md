# ADR 0001: Start as a modular monolith

Status: accepted

## Context

The first release is a local single-user product, while the codebase may later
support private enterprise deployments or a multi-tenant service.

## Decision

Use a TypeScript modular monolith with explicit domain, application,
infrastructure, and HTTP boundaries. Keep SQLite, the local job runner, and
model protocols behind replaceable interfaces. Do not introduce distributed
transactions or service-to-service networking in the first release.

## Consequences

Local setup stays small and transactional behavior stays understandable.
Enterprise infrastructure can replace adapters without rewriting writing,
assessment, vocabulary, or review rules. Module boundaries require ongoing
linting and review discipline.
