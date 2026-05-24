# Cookbook — Recipe Management Application

[![CI/CD Pipeline](https://github.com/Balladebaderne/cookbook/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/Balladebaderne/cookbook/actions/workflows/ci-cd.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Last commit](https://img.shields.io/github/last-commit/Balladebaderne/cookbook)](https://github.com/Balladebaderne/cookbook/commits)
![Deploy](https://img.shields.io/badge/deploy-Azure%20three--VM%20blue%2Fgreen-0078D4)

A full-stack recipe app — browse, view, and manage recipes. Runs on PostgreSQL
and deploys to Azure with a three-VM blue/green pipeline.

## Table of Contents

- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Running Locally](#running-locally)
- [Testing & Linting](#testing--linting)
- [Authentication](#authentication)
- [Deploying to Azure](#deploying-to-azure)
- [CI/CD Pipeline](#cicd-pipeline)
- [Monitoring](#monitoring)
- [Contributing](#contributing)
- [License](#license)

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Node.js — `node:http` standard library (no framework) |
| Database | PostgreSQL 16 |
| Frontend | React (Vite), served by Nginx |
| API contract | OpenAPI 3.0 (Swagger UI) |
| Containers | Docker + Docker Compose; images in GHCR |
| CI/CD | GitHub Actions |
| Cloud | Azure VMs (Ubuntu 22.04) |
| Monitoring | Prometheus + Grafana (+ cAdvisor, node_exporter) |

**Why:** the backend uses Node's built-in `node:http` — no Express — to keep the
dependency surface small and the HTTP layer explicit. PostgreSQL is the single
database across dev, test, and prod. Production runs a three-VM blue/green
topology for zero-downtime deploys.

## Architecture

Production runs across three Azure VMs in a private VNet; only nginx is public.

```text
                 Internet  ──►  http://<NGINX_IP>
                    │
          ┌─────────▼──────────┐
          │  nginx VM (public) │  ports 80/443 — reverse proxy
          │  / → frontend      │  /api → backend · /apidocs → Swagger
          │  /grafana → Grafana│
          └─────────┬──────────┘
                    │  private VNet 10.0.1.0/24 (no public IPs)
          ┌─────────┴───────────┐
          ▼                     ▼
  ┌──────────────────┐   ┌──────────────┐
  │  backend VM      │   │ database VM  │
  │  blue  :3001 ───────►│ PostgreSQL   │
  │  green :3002 ───────►│   :5432      │
  └──────────────────┘   └──────────────┘
```

**Blue/green:** a deploy starts the inactive color, health-checks it, then nginx
flips `BACKEND_HOST` to it — zero downtime, instant rollback. Monitoring runs as
a separate stack, reached via nginx at `/grafana`. Full detail in
[`infrastructure/README.md`](./infrastructure/README.md) and
[`deploy/README-blue-green.md`](./deploy/README-blue-green.md).

## Project Structure

```text
cookbook/
├── backend/                       # Node HTTP API (node:http) + Dockerfile
│   ├── src/                       # index.js, db/, http/, routes/, services/, middleware/
│   └── test/                      # cross-cutting tests (blue-green deploy script)
├── frontend/                      # React (Vite) + nginx Dockerfile
├── infrastructure/                # Azure provisioning (create_three_vms.sh, teardown)
├── deploy/blue-green/             # prod compose + deploy/rollback scripts
├── monitoring/                    # Prometheus/Grafana config + compose
├── docs/                          # authentication.md, sla.md, definition-of-done.md
├── scripts/security-check.sh      # pre-push security gate
├── docker-compose.yml             # local dev (Postgres + backend + frontend)
├── openapi.yaml                   # API contract (source of truth)
└── .github/workflows/ci-cd.yml
```

## Running Locally

```bash
docker compose --profile dev up -d --build   # start (Postgres + backend + frontend)
docker compose --profile dev down            # stop
```

- Frontend: <http://localhost>
- API: <http://localhost/api> · Swagger: <http://localhost/apidocs> (via nginx)
- Running the backend directly instead (`cd backend && npm run dev`) serves it on `:3000`.

## Testing & Linting

Backend tests run against a real PostgreSQL; start the stack first, then:

```bash
cd backend && npm test               # 26 tests
cd backend && npm run test:coverage  # ~84% line coverage (70% enforced)
cd frontend && npm test              # no database needed
```

ESLint runs per package (`npm run lint`) and on every Docker build and in CI.

## Authentication

Browsing is open; creating/editing/deleting recipes needs a JWT
(`Authorization: Bearer <jwt>`). Full flow in
[`docs/authentication.md`](./docs/authentication.md).

## Deploying to Azure

One script provisions the three VMs, installs Docker, and writes the deploy
secrets to GitHub; a push to `master` then deploys.

### Prerequisites

**Azure CLI** (`az`), **GitHub CLI** (`gh`), and an SSH key in `~/.ssh/`.

```bash
# macOS
brew install azure-cli gh
# Windows (run from Git Bash / WSL, not PowerShell)
winget install --id Microsoft.AzureCLI -e && winget install --id GitHub.cli -e
# Linux (Debian/Ubuntu)
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash && sudo apt install gh
# SSH key, if needed
ssh-keygen -t ed25519 -C "you@example.com"
```

### Provision & deploy

```bash
git clone https://github.com/Balladebaderne/cookbook.git && cd cookbook
bash infrastructure/create_three_vms.sh   # provisions VMs; sets DEPLOY_MODE=three-vms
git push origin master                    # or merge a dev → master PR — this deploys
bash infrastructure/azure-teardown.sh     # when done: deletes resources + clears the lock
```

The script logs you into Azure/GitHub if needed and prints the nginx public IP.
Only one live deployment at a time (a `DEPLOY_OWNER` lock prevents clashes). See
[`infrastructure/README.md`](./infrastructure/README.md) for the topology, the
lock, and the `FORCE=1` override.

## CI/CD Pipeline

[`ci-cd.yml`](./.github/workflows/ci-cd.yml) runs on push to `master`/`dev`:

1. **dependency-audit** — `npm audit`, lint, and tests (against a Postgres service) for both packages.
2. **build-and-push** — builds backend + frontend images → `ghcr.io/balladebaderne/cookbook-*`.
3. **deploy** — `master` only: deploys the inactive backend color, health-checks it, then switches nginx.

## Monitoring

Prometheus + Grafana run as a separate stack on the shared `cookbook-network`.
Start the app first, then:

```bash
docker compose --profile dev up -d                       # creates cookbook-network
docker compose -f monitoring/docker-compose.yml up -d    # monitoring on top
```

| | Grafana | Prometheus |
|--|---------|------------|
| Local | <http://localhost/grafana> (or `:3001`) | <http://localhost:9090> |
| Prod | `http://<NGINX_IP>/grafana` | internal only |

Grafana credentials come from `GF_ADMIN_USER` / `GF_ADMIN_PASSWORD` (default
`admin`/`admin` — **change in prod**, self-sign-up is off). The provisioned
**"Cookbook — Application Overview"** dashboard tracks request rate, p95 latency,
5xx error rate, and container up/down (from the backend's `/metrics`). cAdvisor
(containers) and node_exporter (host) add the infrastructure view. Data is
retained 15 days in Docker volumes.

## Contributing

See [`AGENTS.md`](./AGENTS.md) for the Git flow, the security gate, and
do-not-touch paths. Git hooks are managed by **Husky** — run `npm install` at
the repo root once to enable them (pre-commit lints; pre-push runs frontend
tests + `scripts/security-check.sh`). Work tracked on the
[Kanban board](https://github.com/orgs/Balladebaderne/projects/2);
progress is recorded in [`definition-of-done.md`](./docs/definition-of-done.md).

## License

[MIT](./LICENSE) © BalladeBaderne
