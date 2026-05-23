# Cookbook — Recipe Management Application

A full-stack recipe management web application where users can browse,
view, and manage recipes. Deployed on Azure VMs via Docker and GitHub
Actions.

## Tech Stack

**Backend:** Node.js (`node:http`), PostgreSQL, OpenAPI 3.0 (Swagger)
**Frontend:** React (Vite), served by Nginx
**Infrastructure:** Azure VMs (Ubuntu 22.04), Docker, Docker Compose,
GitHub Actions, GitHub Container Registry

## Project Structure

```text
cookbook/
├── backend/                       # Node HTTP API (node:http) + Dockerfile
│   ├── src/                       # application source
│   │   ├── index.js               # server bootstrap + routing
│   │   ├── db/                    # connection, schema, seed, queries
│   │   ├── http/                  # router, responses, swagger
│   │   ├── routes/                # route definitions
│   │   ├── services/              # recipes + users domain logic
│   │   └── middleware/            # auth + error handling
│   └── test/                      # cross-cutting tests (blue-green deploy script)
├── frontend/                      # React (Vite) + nginx Dockerfile
├── infrastructure/                # Azure provisioning scripts (three-VM)
│   ├── create_three_vms.sh        # nginx + backend + database VM setup
│   ├── azure-teardown.sh          # deletes the resource group
│   └── README.md
├── deploy/                        # three-VM blue/green prod compose + scripts
│   ├── blue-green/                # backend/nginx/postgres compose + deploy/rollback
│   └── README-blue-green.md
├── monitoring/                    # Prometheus config + Grafana provisioning
├── docs/                          # authentication.md, etc.
├── scripts/                       # security-check.sh
├── docker-compose.yml             # local dev (Postgres + backend + frontend)
├── docker-compose.monitoring.yml  # Prometheus + Grafana stack
├── openapi.yaml                   # API contract (source of truth)
└── .github/workflows/ci-cd.yml
```

## Running Locally

```bash
docker compose --profile dev up -d --build   # start
docker compose --profile dev down            # stop
```

- Frontend: http://localhost
- Backend API: http://localhost:3000/api
- Swagger: http://localhost:3000/apidocs

## Authentication

The app supports user registration, login, JWT-backed sessions, and protected
recipe write routes. Users can browse recipes without logging in, but creating,
editing, and deleting recipes requires:

```text
Authorization: Bearer <jwt>
```

The implementation is documented in [`docs/authentication.md`](./docs/authentication.md),
including endpoint examples, frontend token storage, backend middleware flow,
and local curl tests.

## Linting

ESLint is configured for both backend and frontend.

**Backend** (runs in Docker or directly with Node):
```bash
docker compose --profile dev exec backend-dev npm run lint
docker compose --profile dev exec backend-dev npm run lint:fix
```

**Frontend** (lint runs automatically during Docker build):
```bash
# Lint is enforced on every build — a failing lint will fail the build:
docker compose --profile dev up -d --build

# To auto-fix issues using a temporary node container:
docker run --rm -v "${PWD}/frontend:/app" -w /app node:18-alpine sh -c "npm install && npm run lint:fix"
```

Lint also runs in CI/CD for every push to `dev` and `master`, and on all PRs to `master`.

## Testing

Backend tests run against a real PostgreSQL (the only supported database). Start
the stack first so Postgres is reachable on `127.0.0.1:5432`, then run the suite
from the host:

```bash
docker compose --profile dev up -d   # starts Postgres (+ the app)
cd backend && npm test
```

CI runs the same suite against a `postgres:16` service container. Override the
connection with `POSTGRES_HOST` / `POSTGRES_PORT` / `POSTGRES_DB` /
`POSTGRES_USER` / `POSTGRES_PASSWORD` if your setup differs. The frontend tests
(`cd frontend && npm test`) need no database.

## Deploying to Azure

End-to-end: install two CLIs, clone the repo, run one script, push to
`master`. The script handles everything else — including opening a
browser for `az login` / `gh auth login` if you're not already signed in.

### 1. Install prerequisites (one-time per machine)

You need three things on PATH: **Azure CLI** (`az`), **GitHub CLI**
(`gh`), and an **SSH key pair** in `~/.ssh/`.

#### macOS

```bash
brew install azure-cli gh
```

#### Windows

Open **Git Bash** (bundles bash + ssh, ships with [Git for Windows](https://git-scm.com/download/win)).
Then in Git Bash:

```bash
winget install --id Microsoft.AzureCLI -e
winget install --id GitHub.cli -e
```

> Run the deploy script from **Git Bash** (or WSL) — not from
> PowerShell or `cmd`. The script is bash and uses arrays, heredocs,
> and `set -euo pipefail`.

#### Linux (Debian / Ubuntu)

```bash
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
sudo apt install gh
```

#### SSH key (all OSes)

If `ls ~/.ssh/id_*` shows nothing, generate one:

```bash
ssh-keygen -t ed25519 -C "your.email@example.com"
```

Press Enter through the prompts (default path, empty passphrase is fine
for class).

### 2. Clone the repo

```bash
git clone https://github.com/Balladebaderne/cookbook.git
cd cookbook
```

### 3. Run the setup script

```bash
bash infrastructure/create_three_vms.sh   # public nginx + private backend + private database
```

The script will:

1. Open a browser for `az login` if you're not signed in to Azure.
2. Walk you through `gh auth login` if you're not signed in to GitHub.
3. Show a confirmation prompt with what it's about to provision (resource group, VMs, ports, GitHub secrets it will set). Type `y` to continue.
4. Provision the VMs, install Docker on them, and write the deploy
   secrets back to the GitHub repo.

When it finishes it prints the public IP of the nginx VM. The backend is
deployed with a blue/green flow against PostgreSQL on the database VM; see
[`deploy/README-blue-green.md`](./deploy/README-blue-green.md).

### 4. Trigger the deploy

```bash
git push origin master   # or open & merge a dev → master PR
```

The pipeline ([`ci-cd.yml`](./.github/workflows/ci-cd.yml)) builds
the Docker images, pushes them to GHCR, and deploys to your VMs. App
goes live at `http://<NGINX_IP>` once the workflow finishes (~3 min).

> `master` deploys automatically through CI/CD. Follow the branch rules in
> [`AGENTS.md`](./AGENTS.md): merge to `master` only through a PR.

### 5. Tear down when you're done

```bash
bash infrastructure/azure-teardown.sh
```

Stops the Azure billing and clears the deploy lock so the next teammate
can run a create script.

### Only one live deployment at a time

The repo's deploy secrets and `DEPLOY_MODE` variable are shared team
state — running `create_*.sh` overwrites them. The scripts enforce
this by recording a `DEPLOY_OWNER` variable on the repo and refusing
to run when someone else owns the current deployment. Teardown clears
the lock. See [`infrastructure/README.md`](./infrastructure/README.md#one-active-deployment-at-a-time)
for the full flow and the `FORCE=1` override.

## Pipeline Overview

[`ci-cd.yml`](./.github/workflows/ci-cd.yml) runs on push to
`master`/`dev` and on `workflow_dispatch`:

1. **dependency-audit** — `npm audit` on backend + frontend.
2. **build-and-push** — builds backend + frontend images, pushes to
   `ghcr.io/balladebaderne/cookbook-{backend,frontend}`.
3. **deploy** — only on `master` or manual dispatch, when `DEPLOY_MODE` is
   `three-vms`: deploys the inactive backend color on the backend VM,
   health-checks it, then recreates nginx with the new `BACKEND_HOST`
   from `deploy/blue-green/active-color.env`.

For three-VM operations, rollback, and database migration constraints, see
[`deploy/README-blue-green.md`](./deploy/README-blue-green.md).

## Monitoring (Prometheus + Grafana)

> **Prerequisite:** The monitoring stack requires the main app stack to be
> running first, because Prometheus and Grafana share `cookbook-network` with
> the backend container.

### Starting the monitoring stack

```bash
# 1. Start the main app (creates cookbook-network)
docker compose --profile dev up -d

# 2. Start the monitoring stack on top
docker compose -f docker-compose.monitoring.yml up -d
```

### URLs

| Environment | Grafana | Prometheus |
|-------------|---------|------------|
| **Local** (via nginx) | http://localhost/grafana | http://localhost:9090 |
| **Local** (direct) | http://localhost:3001 | http://localhost:9090 |
| **Prod VM** | `http://<VM_IP>/grafana` | Internal only (not exposed) |

### Login credentials

Grafana reads `GF_ADMIN_USER` and `GF_ADMIN_PASSWORD` from your `.env` file
(or Docker secrets in prod). If neither is set, it falls back to the defaults:

| Variable | Default |
|----------|---------|
| `GF_ADMIN_USER` | `admin` |
| `GF_ADMIN_PASSWORD` | `admin` |

> ⚠️ **Change the password on first login in prod.** Set `GF_ADMIN_USER` and
> `GF_ADMIN_PASSWORD` in your `.env` or as a GitHub Secret — never commit them.
> Self-registration is disabled (`GF_USERS_ALLOW_SIGN_UP=false`).

### Metrics we track

The **"Cookbook — Application Overview"** dashboard is provisioned automatically
and shows four panels:

| Panel | PromQL expression | Unit |
|-------|------------------|------|
| **Request Rate** | `sum by (method, route) (rate(http_request_duration_seconds_count[1m]))` | req/s |
| **P95 Latency** | `histogram_quantile(0.95, sum by (le, route) (rate(http_request_duration_seconds_bucket[5m])))` | seconds |
| **5xx Error Rate** | `sum by (route) (rate(http_request_duration_seconds_count{status_code=~"5.."}[1m]))` | req/s |
| **Container Up/Down** | `up` | UP / DOWN |

Prometheus scrapes `backend:3000/metrics` every **15 seconds** and retains data
for **15 days** (`--storage.tsdb.retention.time=15d`).

### Why these metrics

| Metric | Rationale |
|--------|-----------|
| **Request Rate** | Shows the current traffic load broken down by route and HTTP method. Unexpected spikes can indicate client-side bugs or an attack. |
| **P95 Latency** | Catches slow endpoints that the average often hides. A p95 > 500 ms is typically a signal of a performance problem affecting end users. |
| **5xx Error Rate** | Server errors need to be caught quickly. A spike here can mean a bad deploy, a full disk, or a database timeout. |
| **Container Up/Down** | Confirms that Prometheus can actually reach the backend container. Shows `DOWN` immediately if a container crashes or was never started. |

### Stopping the monitoring stack

```bash
docker compose -f docker-compose.monitoring.yml down
```

Data is persisted in Docker volumes (`prometheus_data`, `grafana_data`) and
survives a restart.

---

## For contributors

See [`AGENTS.md`](./AGENTS.md) for branching rules, the security gate,
and do-not-touch paths. One-time hook install per clone:

```bash
cp scripts/security-check.sh .git/hooks/pre-push && chmod +x .git/hooks/pre-push
```

## Repository

https://github.com/Balladebaderne/cookbook
