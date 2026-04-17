# GitHub Copilot Instructions

The authoritative guardrails for AI contributions to this repository live in
**[`AGENTS.md`](../AGENTS.md)** at the repo root. Read that file before suggesting changes.

Repository: <https://github.com/Balladebaderne/cookbook>

Copilot-specific quick rules (full rules in `AGENTS.md`):

- **Never** suggest direct commits or pushes to `master`. It is PR-only because merging to `master` auto-deploys to the Azure VM.
- Pushes to `dev` are allowed — but prefer a feature branch for anything non-trivial.
- Feature branches branch from `dev` and merge back into `dev`.
- Hotfix branches branch from `master`, open a PR back to `master`, and are back-merged into `dev`.
- Release branches branch from `dev`, open a PR to `master`, and are back-merged into `dev`.
- Local development runs through Docker Compose with the `dev` profile, not raw `node` / `vite`.
- Before any push, `bash scripts/security-check.sh` must pass (npm audit + secret scan + forbidden-file check).
- Do not suggest committing `.env`, `*.db`, `*.pem`, `node_modules/`, or `dist/`.
- Do not suggest edits to `.github/workflows/`, `infrastructure/`, or `legacy/` without an explicit request for that area.
- `openapi.yaml` is the API contract — keep it in sync with backend handler changes in the same commit.