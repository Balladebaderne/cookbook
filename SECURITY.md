# Security Policy

## Scope of this project

Cookbook is a 4th-semester IT-Architecture exam project. The `master` branch auto-deploys to a small Azure VM used for grading and demos — it is not a production service and handles no real user data.

## Reporting a vulnerability

If you find a security issue, please open a private [security advisory](https://github.com/Balladebaderne/cookbook/security/advisories/new) on GitHub rather than a public issue.

We aim to acknowledge reports within 7 days. As a coursework project, we cannot guarantee fixes, but credible reports will be triaged and noted in the repository.

## In scope

- `backend/` (Node/Express + SQLite)
- `frontend/` (React/Vite)
- `.github/workflows/` (CI/CD)
- `infrastructure/` and the Docker Compose deploy files
- `openapi.yaml`

## Out of scope

- The `legacy/` Python/Flask reference implementation — kept for course continuity, not maintained.
- Third-party dependencies — please report upstream. If a `npm audit` finding has no patched version, open an issue here so we can document the risk.
- The underlying Azure VM and its OS-level configuration.

## What we already do

- `npm audit --audit-level=high` runs on every push (CI) and is part of the local pre-push gate ([`scripts/security-check.sh`](./scripts/security-check.sh)).
- Secret-pattern scanning and forbidden-file checks run in the same pre-push gate.
- `master` is PR-only; no direct pushes. See [`AGENTS.md`](./AGENTS.md) for the full guardrails.
