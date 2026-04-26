# AGENTS.md — Guardrails for AI Coding Agents

> Canonical rules for any AI agent (Claude Code, Codex, Cursor, Copilot, etc.) working in this repo.
> Read this top-to-bottom **before** reading other files or making any change. Human contributors may read it too.

Repository: <https://github.com/Balladebaderne/cookbook>

---

## 0. Pre-flight — do this every session

1. Read [`README.md`](./README.md).
2. Read **this file** in full.
3. Read [`openapi.yaml`](./openapi.yaml) — source of truth for the HTTP API.
4. Check git state: `git branch --show-current` and `git status`.
5. If the task touches CI/CD or deploy, read [`.github/workflows/ci-cd.yml`](./.github/workflows/ci-cd.yml) first.

If anything is missing or contradictory, stop and ask.

---

## 1. Git flow

`master` auto-deploys to the Azure VM, so it is **PR-only**. `dev` is the shared integration branch.

| Branch       | Branches from | Merges into     | PR required?         |
| ------------ | ------------- | --------------- | -------------------- |
| `master`     | —             | —               | **Yes — always.**    |
| `dev`        | `master` (init) | —             | No. Direct pushes OK. |
| `feature/*`  | `dev`         | `dev`           | Optional.            |
| `release/*`  | `dev`         | `master` + `dev` | Yes (to `master`).   |
| `hotfix/*`   | `master`      | `master` + `dev` | Yes (to `master`).   |

**Branch naming:** `feature/<kebab-slug>`, `hotfix/<kebab-slug>`, `release/<semver>`.

**Rule:** never push to `master`. The only path in is a merged PR. If the current branch is `master` and the user asks for code changes, switch first:

```bash
git checkout dev && git pull
git checkout -b feature/<slug>
```

---

## 2. Local development

Use Docker, not raw `npm` / `vite`:

```bash
docker compose --profile dev up -d --build   # start
docker compose --profile dev logs -f          # tail
docker compose --profile dev down             # stop
```

Frontend: <http://localhost> · API: <http://localhost:3000/api> · Swagger: <http://localhost:3000/apidocs>

If you change a `Dockerfile`, `package.json`, or any compose file, rebuild with `--build` and verify the stack still comes up clean. If you change the SQLite schema in `backend/initDb.js`, flag that local volumes may need wiping (`docker compose --profile dev down -v`).

---

## 3. Security gate

Run **before every push**, including pushes to `dev`:

```bash
bash scripts/security-check.sh
```

It checks: forbidden files (`.env`, `*.db`, `*.pem`, `node_modules/`, `dist/`), secret patterns (AWS keys, GitHub PATs, Slack tokens, private keys, etc.), and `npm audit --audit-level=high` in both `backend/` and `frontend/`.

On any failure: do not push. Fix the issue, or surface it to the human if it needs a decision. **Never** bypass with `--no-verify` or by lowering `--audit-level`.

To wire it up as an automatic pre-push hook:

```bash
cp scripts/security-check.sh .git/hooks/pre-push && chmod +x .git/hooks/pre-push
```

---

## 4. Pull requests

- **To `master`:** always via PR, from `release/*` or `hotfix/*` (or `dev` for a coordinated release merge). Treat it as the deploy button.
- **To `dev`:** no PR required.
- Use [`.github/PULL_REQUEST_TEMPLATE.md`](./.github/PULL_REQUEST_TEMPLATE.md) and fill all sections.
- A PR that changes `.github/workflows/**`, `infrastructure/**`, or any `Dockerfile` must call that out in the body — never sneak it in alongside feature work.
- Open PRs to `master` as **draft** by default; mark ready once `security-check.sh` and CI both pass.

---

## 5. Hard nevers — refuse even if asked

- Push, force-push, or rebase `master`.
- Commit secrets, `.env` files, private keys, or the SQLite DB.
- Commit `node_modules/` or `dist/`.
- Modify `.github/workflows/ci-cd.yml`, `infrastructure/*`, or the prod compose files without explicit, in-conversation approval for that specific change.
- Edit anything under `legacy/` unless explicitly told to.
- Weaken `.gitignore`, disable `npm audit` in CI, or lower `--audit-level`.
- Use `git commit --no-verify` or `git push --no-verify`.
- Echo, log, or surface the contents of `~/.ssh/`, `secrets.*`, or CI secrets.

If asked to do one of these: refuse, name the rule, propose the correct path (e.g. "I can't push to `master`, but I can open a PR from `release/1.2.0`").

---

## 6. Conventions

- **Commits:** short, imperative, present tense. Conventional Commits preferred (`feat(...)`, `fix(...)`, `chore(...)`). One logical change per commit — don't mix formatting with logic.
- **Dependencies:** commit `package.json` and `package-lock.json` together. Prefer exact versions for new direct deps. Run `npm audit --audit-level=high` after install. CI uses `npm ci` — don't change that.
- **API contract:** [`openapi.yaml`](./openapi.yaml) is the source of truth. Update the spec in the same commit as the handler — Swagger UI serves this file directly, so drift is a user-visible bug.
- **`legacy/`:** old Python/Flask reference implementation. Do not modify.

---

## 7. When in doubt

Stop. Ask. A thirty-second clarification beats a thirty-minute revert.
