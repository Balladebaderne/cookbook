# AGENTS.md — Guardrails for AI Coding Agents

> **Canonical rules for any AI agent (Claude Code, Codex, Cursor, Copilot, Jules, etc.) working in this repository.**
> If you are an AI agent, you MUST read this file top-to-bottom **before** reading any other file and before making any change. Human contributors may read it too — it doubles as onboarding.

Repository: <https://github.com/Balladebaderne/cookbook>

---

## 0. Prime directive: understand before you act

Before proposing, writing, or running anything, an agent MUST complete this pre-flight checklist. No exceptions — not even for "tiny" changes.

1. Read `README.md` at the repo root.
2. Read **this file** (`AGENTS.md`) in full.
3. Read `openapi.yaml` — it is the source of truth for the backend API contract.
4. Check the current git state:
   ```bash
   git branch --show-current
   git status
   git log --oneline -10
   ```
5. Read `backend/package.json` and `frontend/package.json` to know what runtime + deps exist.
6. Read the Docker Compose file(s) relevant to the task:
   - Local work → `docker-compose.yml` (profile `dev`)
   - Single-VM prod → `docker-compose.single-vm.yml`
   - Two-VM prod → `docker-compose.nginx.yml` + `docker-compose.backend.yml`
7. If the task touches CI/CD or deploy, read `.github/workflows/ci-cd.yml` first.
8. Summarize back to the human what you understood and what you intend to do **before** touching files. Wait for confirmation on anything non-trivial.

If any of the above files are missing or contradictory, stop and ask. Do not guess.

---

## 1. Project at a glance

**Cookbook** is a full-stack recipe app.

| Layer          | Tech                                                    |
| -------------- | ------------------------------------------------------- |
| Backend        | Node.js 18, Express, SQLite3, OpenAPI 3.0 (swagger-ui)  |
| Frontend       | React 19 (Vite), react-three/fiber, served by nginx     |
| Infra          | Azure VMs (Ubuntu 22.04), Docker, Docker Compose        |
| CI/CD          | GitHub Actions → GHCR → SSH deploy to VM                |

Two deploy topologies live side-by-side:
- **Single VM** — one host runs both containers (`docker-compose.single-vm.yml`)
- **Two VMs** — public nginx host + internal backend host (`docker-compose.nginx.yml` + `docker-compose.backend.yml`)

Which one ships is controlled by the repo variable `DEPLOY_MODE` (`single` or `two-vms`).

The `legacy/` folder contains an old Python/Flask implementation kept for reference. **Do not modify `legacy/`** unless the human explicitly asks.

---

## 2. Git flow — this is non-negotiable

We use Git Flow. The **critical rule** is that **merging into `master` is what triggers production deployment**, so `master` is gated behind a pull request. `dev` is the shared integration branch — pushes there are allowed, but feature work should still go through feature branches whenever practical.

```
master   ──●───────────────●──────●──→  (production — PR-only, auto-deploys)
            \             / \    /
hotfix       \           /   ●──/  (branch from master, PR to master + back-merge to dev)
              \         /
release        \       ●──●        (branch from dev, PR to master + back-merge to dev)
                \     /    \
dev   ──●───●───●───●──────●──→    (integration — CI builds, no deploy)
         \     / \
feature   ●───●   ●──●──●          (branch from dev, merge back into dev)
```

### Branch rules

| Branch        | Branches from   | Merges into           | PR required?                 |
| ------------- | --------------- | --------------------- | ---------------------------- |
| `master`      | —               | —                     | **Yes — always.** No direct pushes, ever. |
| `dev`         | `master` (init) | —                     | Not required. Direct pushes allowed. |
| `feature/*`   | `dev`           | `dev`                 | Optional — team preference. Fast-forward / squash merge is fine. |
| `release/*`   | `dev`           | `master` **and** `dev` | **Yes** — for the master side. |
| `hotfix/*`    | `master`        | `master` **and** `dev` | **Yes** — for the master side. |

### Why `master` is strict and `dev` is not

- A push to `master` triggers the deploy job in `ci-cd.yml`, which SSHes into the Azure VM and restarts containers. Mistakes there are user-visible.
- A push to `dev` only triggers `dependency-audit` and `build-and-push` — the images get tagged but nothing deploys. It's our integration playground.

### Agent rules around git flow

- **Never** `git push` (or propose a push) to `master`. Ever. The only way code reaches `master` is via a merged PR.
- Pushes to `dev` are allowed, but **prefer the feature-branch route** for anything non-trivial: branch from `dev`, do the work, merge back to `dev`.
- For hotfixes: branch from `master`, open a PR back to `master`, and after it merges, cherry-pick or merge the same commits into `dev` so the two branches don't diverge.
- For releases: branch from `dev` as `release/<semver>`, stabilize, open a PR to `master`, then back-merge to `dev`.
- If the current branch is `master` and the user asks for code changes, switch before editing:
  ```bash
  git checkout dev && git pull
  git checkout -b feature/<slug>   # or hotfix/<slug> depending on intent
  ```
- Before creating a branch, ask the human for the name if it wasn't given, and confirm the base (`dev` for feature/release, `master` for hotfix).

### Branch naming

- `feature/<short-kebab-slug>` — e.g. `feature/add-recipe-tags`
- `hotfix/<short-kebab-slug>` — e.g. `hotfix/null-recipe-id`
- `release/<semver>` — e.g. `release/1.2.0`

---

## 3. Local development workflow

We test locally with Docker, **not** raw `npm start`. The `dev` profile of the root compose file is the canonical way.

```bash
# Start (from repo root)
docker compose --profile dev up -d --build

# Tail logs
docker compose --profile dev logs -f

# Stop
docker compose --profile dev down
```

Endpoints:
- Frontend: <http://localhost>
- Backend API: <http://localhost:3000/api>
- Swagger UI: <http://localhost:3000/apidocs>

**Agent rules:**
- Prefer Docker for running the app. Do not start raw `node` or `vite dev` servers unless debugging a specific issue that requires it, and only after telling the human.
- If you change a `Dockerfile`, `package.json`, or `docker-compose*.yml`, you MUST rebuild with `--build` and verify the stack still comes up clean before handing back.
- If you change the SQLite schema in `backend/initDb.js`, mention that local volumes may need to be wiped (`docker compose --profile dev down -v`) and flag this in the PR / commit message.

---

## 4. Security gate — run this before every push

The CI pipeline runs `npm audit --audit-level=high` on both packages. That's the backstop, not the first line of defense. The agent MUST run a local security check **before** every `git push` — including pushes to `dev` — and the check must pass.

A helper script is provided:

```bash
bash scripts/security-check.sh
```

### What it checks (enforced)

1. **Branch check** — hard-fails if the current branch is `master`. Warns on `main`/`dev`/`develop` or on non-git-flow names.
2. **Forbidden files** — blocks if any of these are tracked or staged:
   - `node_modules/`, `dist/`, `build/`
   - `*.db`, `*.sqlite`, `*.sqlite3`, `*.db-journal`
   - `.env`, `.env.*` (but `.env.example` is allowed)
   - `*.pem`, `*.key`, `id_rsa*`
   - `docker-compose.override.yml`
3. **Secret pattern scan** — blocks on:
   - `-----BEGIN (RSA|OPENSSH|EC|DSA|PGP) PRIVATE KEY-----`
   - AWS access keys (`AKIA...`)
   - GitHub PATs (`ghp_...`, `github_pat_...`)
   - Slack tokens (`xox[baprs]-...`)
   - Generic assignments like `password = "..."`, `api_key = "..."` with non-placeholder values
4. **Dependency audit** — `npm audit --audit-level=high` in `backend/` AND `frontend/`. Any `high` or `critical` blocks the push.
5. **Dockerfile sanity** — warns on unpinned base images, `ADD http...`, or `curl | sh` patterns.
6. **.gitignore present** — warns if absent or clearly weakened.

### On any failure

- Do not push.
- Report which check failed, with the exact offending file/line.
- Propose a fix. If the fix needs a human decision (e.g. a `high` vuln with no patched version), surface it and wait for instruction.
- **Never** bypass with `git push --no-verify` or by lowering `--audit-level`.

### Recommended: wire it up as a pre-push hook

```bash
# One-time setup
cp scripts/security-check.sh .git/hooks/pre-push
chmod +x .git/hooks/pre-push
```

---

## 5. Pull requests

- **To `master`:** always via PR, always from a `release/*` or `hotfix/*` branch (or, exceptionally, `dev` itself for a coordinated release merge). This PR is what ships to the VM — treat it as the deploy button.
- **To `dev`:** no PR required. Direct pushes or feature-branch merges both fine. Still run the security check first.
- Use the repo's `PULL_REQUEST_TEMPLATE.md`. Fill in **all** three sections (what / why / how tested).
- A PR that changes CI/CD (`.github/workflows/**`), infra (`infrastructure/**`), or any `Dockerfile` requires an explicit note in the PR body calling that out. The agent should never sneak these in alongside feature work.
- Agents should open PRs to `master` as **draft** by default, and only mark ready once the local security check and the CI `dependency-audit` job both pass cleanly.

---

## 6. Hard nevers (agent refuses even if asked)

- Push, force-push, or rebase `master`.
- Commit secrets, `.env` files, private keys, or the SQLite DB.
- Commit `node_modules/` or `dist/`.
- Modify `.github/workflows/ci-cd.yml`, `infrastructure/*.sh`, or the prod compose files without an explicit, in-conversation approval from the human for that specific change.
- Edit anything under `legacy/` unless explicitly told to.
- Weaken `.gitignore`, disable `npm audit` in CI, or lower `--audit-level`.
- Use `git commit --no-verify` or `git push --no-verify` to bypass hooks.
- Echo, log, or otherwise surface the contents of `~/.ssh/`, `secrets.*`, or CI secrets.
- Add new top-level dependencies without running `npm audit` on the result and reporting the delta.

If the human asks for one of these, the agent should refuse, explain which rule applies, and propose the correct path (e.g. "I can't push to master, but I can open a PR from `release/1.2.0` into `master`").

---

## 7. Commit messages

Short, imperative, present tense. Conventional Commits preferred but not mandatory.

```
feat(backend): add GET /api/recipe/:id/tags
fix(frontend): null-check recipe author on list view
chore(ci): bump setup-node to v4
```

One logical change per commit. Don't mix formatting with logic.

---

## 8. Adding or updating dependencies

1. Work on a feature branch (or `dev` for small bumps).
2. `npm install <pkg>` (or `npm install <pkg>@<exact>` — prefer exact versions for new direct deps).
3. Commit **both** `package.json` and `package-lock.json`.
4. Run `npm audit --audit-level=high` in that package — it must pass.
5. Run `bash scripts/security-check.sh` from repo root.
6. Note the dep (name, version, why) in the commit message or PR description.

In CI we use `npm ci`, not `npm install` — don't change that.

---

## 9. API contract

`openapi.yaml` at the repo root is the **source of truth** for the HTTP API. If you change an endpoint, update the spec in the same commit as the handler. Swagger UI at `/apidocs` serves this file directly, so a drift between code and spec is a user-visible bug.

---

## 10. When in doubt

Stop. Ask. A thirty-second clarification beats a thirty-minute revert.