# Cookbook — Recipe Management Application

A full-stack recipe management web application where users can browse,
view, and manage recipes. Deployed on Azure VMs via Docker and GitHub
Actions.

## Tech Stack

**Backend:** Node.js (`node:http`), SQLite3/Postgres, OpenAPI 3.0 (Swagger)
**Frontend:** React (Vite), served by Nginx
**Infrastructure:** Azure VMs (Ubuntu 22.04), Docker, Docker Compose,
GitHub Actions, GitHub Container Registry

## Project Structure

```text
cookbook/
├── backend/                      # Node HTTP API + Dockerfile
├── frontend/                     # React + nginx Dockerfile
├── infrastructure/               # Azure provisioning scripts
│   ├── create_vm.sh              # single-VM setup
│   ├── create_two_vms.sh         # two-VM (nginx + backend) setup
│   ├── create_three_vms.sh       # three-VM (nginx + backend + database) setup
│   ├── azure-teardown.sh         # deletes the resource group
│   └── README.md
├── docker-compose.yml            # local dev
├── deploy/                       # prod compose variants
│   ├── single-vm.yml             # single VM
│   ├── nginx.yml                 # two-VM, nginx host
│   ├── backend.yml               # two-VM, backend host
│   └── blue-green/               # three-VM blue/green deploy files
├── openapi.yaml
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

Pick one topology:

```bash
bash infrastructure/create_two_vms.sh   # public nginx + private backend (recommended)
# — or —
bash infrastructure/create_three_vms.sh # public nginx + private backend + private database
# — or —
bash infrastructure/create_vm.sh        # single public VM
```

The script will:

1. Open a browser for `az login` if you're not signed in to Azure.
2. Walk you through `gh auth login` if you're not signed in to GitHub.
3. Show a confirmation prompt with what it's about to provision (resource group, VMs, ports, GitHub secrets it will set). Type `y` to continue.
4. Provision the VMs, install Docker on them, and write the deploy
   secrets back to the GitHub repo.

When it finishes it prints the public IP of the public entry VM. The
three-VM path deploys the backend with a blue/green flow and Postgres
runtime configuration; see [`deploy/README-blue-green.md`](./deploy/README-blue-green.md).

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
3. **deploy** — only on `master` or manual dispatch. Picks one path
   based on the `DEPLOY_MODE` repo variable:
   - `single` → SSHs to `SSH_HOST`, runs `deploy/single-vm.yml`
   - `two-vms` → SSHs to nginx directly, and to backend via nginx as
     an SSH jump host (backend has no public IP), each with its own
     compose file
   - `three-vms` → deploys the inactive backend color on the backend VM,
     health-checks it, then recreates nginx with the new `BACKEND_HOST`
     from `deploy/blue-green/active-color.env`

For three-VM operations, rollback, and database migration constraints, see
[`deploy/README-blue-green.md`](./deploy/README-blue-green.md).

## Monitoring (Prometheus + Grafana)

> **Forudsætning:** Monitoring-stacken kræver, at hoved-app-stacken kører først,
> fordi Prometheus og Grafana deler `cookbook-network` med backend-containeren.

### Start monitoring-stacken

```bash
# 1. Start hovedappen (opretter cookbook-network)
docker compose --profile dev up -d

# 2. Start monitoring-stacken ovenpå
docker compose -f docker-compose.monitoring.yml up -d
```

### URL'er

| Miljø | Grafana | Prometheus |
|-------|---------|------------|
| **Lokal** (via nginx) | http://localhost/grafana | http://localhost:9090 |
| **Lokal** (direkte) | http://localhost:3001 | http://localhost:9090 |
| **Prod VM** | `http://<VM_IP>/grafana` | Kun internt (ikke eksponeret) |

### Login-credentials

Grafana bruger miljøvariablerne `GF_ADMIN_USER` og `GF_ADMIN_PASSWORD` fra
`.env`-filen (eller Docker-secrets i prod). Hvis de ikke er sat, falder den
tilbage til standardværdierne:

| Variabel | Standard |
|----------|----------|
| `GF_ADMIN_USER` | `admin` |
| `GF_ADMIN_PASSWORD` | `admin` |

> ⚠️ **Skift adgangskoden ved første login i prod.** Sæt `GF_ADMIN_USER` og
> `GF_ADMIN_PASSWORD` i din `.env` eller som GitHub Secret — commit dem aldrig.
> Selvregistrering er slået fra (`GF_USERS_ALLOW_SIGN_UP=false`).

### Metrics vi tracker

Dashboardet **"Cookbook — Application Overview"** provisjoneres automatisk og
viser fire panels:

| Panel | PromQL-udtryk | Enhed |
|-------|--------------|-------|
| **Request Rate** | `sum by (method, route) (rate(http_request_duration_seconds_count[1m]))` | req/s |
| **P95 Latency** | `histogram_quantile(0.95, sum by (le, route) (rate(http_request_duration_seconds_bucket[5m])))` | sekunder |
| **5xx Error Rate** | `sum by (route) (rate(http_request_duration_seconds_count{status_code=~"5.."}[1m]))` | req/s |
| **Container Up/Down** | `up` | UP / DOWN |

Prometheus skraber `backend:3000/metrics` hvert **15. sekund** og gemmer data i
**15 dage** (`--storage.tsdb.retention.time=15d`).

### Hvorfor disse metrics

| Metric | Begrundelse |
|--------|-------------|
| **Request Rate** | Viser den aktuelle trafikbelastning fordelt på rute og HTTP-metode. Uventede spikes kan indikere fejl i klienten eller et angreb. |
| **P95 Latency** | Fanger langsomme endpoints, som gennemsnittet ofte skjuler. Et p95 > 500 ms er typisk et signal om et ydelsesprob­lem, der påvirker slutbrugerne. |
| **5xx Error Rate** | Server­fejl skal opdages hurtigt. En stigning her kan betyde en buggy deploy, en fuld disk eller en database-timeout. |
| **Container Up/Down** | Bekræfter at Prometheus faktisk kan nå backend-containeren. Viser `DOWN` med det samme, hvis en container crasher eller slet ikke er startet. |

### Stop monitoring-stacken

```bash
docker compose -f docker-compose.monitoring.yml down
```

Data persisteres i Docker volumes (`prometheus_data`, `grafana_data`) og
overlever en genstart.

---

## For contributors

See [`AGENTS.md`](./AGENTS.md) for branching rules, the security gate,
and do-not-touch paths. One-time hook install per clone:

```bash
cp scripts/security-check.sh .git/hooks/pre-push && chmod +x .git/hooks/pre-push
```

## Repository

https://github.com/Balladebaderne/cookbook
