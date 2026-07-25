# Contributing to Daily Ink

Thanks for helping improve Daily Ink. Focused bug fixes, documentation
improvements, tests, and well-scoped features are welcome.

## Before You Start

- Search existing issues before opening a new one.
- Use an issue form for bugs and feature requests.
- Discuss significant product behavior, schema, or architecture changes before
  implementation.
- Never include journal data, API keys, local databases, or provider responses
  containing personal content in an issue or pull request.

## Local Development

Requirements:

- Node.js 22.22 or newer
- npm 11 or newer

Set up the repository:

```bash
npm install
cp .env.example .env
npm run dev
```

The web application is available at <http://127.0.0.1:4318> and the API at
<http://127.0.0.1:4317>.

## Project Boundaries

- Keep business rules in framework-independent packages.
- Keep React, Fastify, SQLite, and provider-specific concerns behind their
  existing module boundaries.
- Put prompt content under `prompts/<capability>/<semver>/`. Prompt text must
  not be embedded in application source.
- Add a new prompt version instead of changing the behavior of a version that
  has already been released.
- Update shared contracts before implementing incompatible client and server
  behavior.

## Quality Checks

Run the full local gate before submitting a pull request:

```bash
npm run format:check
npm run typecheck
npm run lint
npm test
npm run build
```

Add focused tests for bug fixes and behavior changes. Keep unrelated refactors
out of the same pull request.

## Pull Requests

- Use a clear title that describes the user-visible or engineering outcome.
- Explain the problem, the chosen approach, and how the change was verified.
- Include screenshots for visible UI changes.
- Call out schema, prompt, privacy, or migration implications.
- Confirm that no secrets or personal journal content are present.

By participating, you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).
