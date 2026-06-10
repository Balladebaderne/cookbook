# CI/CD Pipeline Demonstration

This file is a demonstration marker used to exercise the full delivery pipeline
on a `dev → master` pull request:

- `ci-cd.yml` — test → build → deploy (master auto-deploys to the prod VM)
- `sonarqube.yml` — static analysis + PR decoration
- `greetings.yml` — PR opened comment

It is intentionally docs-only and has no runtime effect.

## Demo log

- 2026-06-08 — Trigger full pipeline through to production (dev → master).
- 2026-06-10 — Exam demonstration: open a fresh `dev → master` PR to show the
  CI/CD pipeline (test → build → deploy) and PR decoration live in GitHub Actions.
