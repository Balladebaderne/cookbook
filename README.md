# Cookbook — Recipe Management Application

A full-stack recipe management web application where users can browse,
view, and manage recipes. Deployed on Azure VMs via Docker and GitHub
Actions.

## Tech Stack

**Backend:** Node.js, Express, SQLite3, OpenAPI 3.0 (Swagger)
**Frontend:** React (Vite), served by Nginx
**Infrastructure:** Azure VMs (Ubuntu 22.04), Docker, Docker Compose,
GitHub Actions, GitHub Container Registry

## Project Structure

```text
cookbook/
├── backend/                      # Express API + Dockerfile
├── frontend/                     # React + nginx Dockerfile
├── infrastructure/               # Azure provisioning scripts
│   ├── create_vm.sh              # single-VM setup
│   ├── create_two_vms.sh         # two-VM (nginx + backend) setup
│   ├── azure-teardown.sh         # deletes the resource group
│   └── README.md
├── docker-compose.yml            # local dev
├── docker-compose.single-vm.yml  # prod: single VM
├── docker-compose.nginx.yml      # prod: two-VM, nginx host
├── docker-compose.backend.yml    # prod: two-VM, backend host
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

## Deploying to Azure

All Azure provisioning lives under [`infrastructure/`](./infrastructure/README.md).
Two topologies are supported — pick one:

- **Single VM** — `bash infrastructure/create_vm.sh`
- **Two VMs** (public nginx + backend with **no public IP**, reachable
  only through nginx) — `bash infrastructure/create_two_vms.sh`

The create scripts set the repo variable `DEPLOY_MODE` so the CI/CD
pipeline knows which deploy job to run. Push to `master` (or trigger
`workflow_dispatch`) to deploy. Tear down with:

```bash
bash infrastructure/azure-teardown.sh
```

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
   - `single` → SSHs to `SSH_HOST`, runs `docker-compose.single-vm.yml`
   - `two-vms` → SSHs to nginx directly, and to backend via nginx as
     an SSH jump host (backend has no public IP), each with its own
     compose file

## For contributors

See [`AGENTS.md`](./AGENTS.md) for branching rules, the security gate,
and do-not-touch paths. One-time hook install per clone:

```bash
cp scripts/security-check.sh .git/hooks/pre-push && chmod +x .git/hooks/pre-push
```

## Repository

https://github.com/Balladebaderne/cookbook
