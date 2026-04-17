# CLAUDE.md

This file exists so Claude Code picks up the project's AI-agent guardrails.

**→ The canonical rules live in [`AGENTS.md`](./AGENTS.md). Read that file first, in full, before doing anything in this repo.**

Repository: <https://github.com/Balladebaderne/cookbook>

Short summary (authoritative version is `AGENTS.md`):

- **Understand before acting.** Read `README.md`, `AGENTS.md`, `openapi.yaml`, and check `git status` / `git branch --show-current` before editing anything.
- **Git Flow.** Feature branches from `dev`, hotfix branches from `master`. Merges to `dev` can be direct pushes or PRs — your choice. **Merges to `master` are always PR-only** because `master` auto-deploys to the VM.
- **Local dev uses Docker.** `docker compose --profile dev up -d --build` — not raw `npm start`.
- **Security gate before every push.** Run `bash scripts/security-check.sh`. It must pass. No `--no-verify`, no audit bypass.
- **Never commit:** secrets, `.env`, `*.db`, `*.pem`, `node_modules/`, `dist/`.
- **Never modify** `.github/workflows/`, `infrastructure/`, or `legacy/` without explicit approval.
- **Never push to `master`.** The only way in is a merged PR.

When any of the rules in `AGENTS.md` conflict with a user request, follow `AGENTS.md` and explain why.