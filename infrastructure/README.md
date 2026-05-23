# Infrastructure

Scripts that provision (and tear down) the Azure VMs used to run the
cookbook app. Every group member should be able to run through a full
cycle independently:

```
create_three_vms.sh  → push to master  → app live  → azure-teardown.sh
```

## Prerequisites

Install on your local machine — login is handled by the create script
itself (it calls `az login` / `gh auth login` for you on first run):

- **Azure CLI** (`az`)
- **GitHub CLI** (`gh`)
- **SSH key pair** in `~/.ssh/` — `id_rsa`, `id_ed25519`, or `id_ecdsa`
  (auto-detected in that order; override with `SSH_KEY_PATH` /
  `SSH_PUB_KEY_PATH` env vars). If you don't have one yet:
  `ssh-keygen -t ed25519 -C "you@example.com"`
- Access to the `Balladebaderne/cookbook` GitHub repo
- A **Personal Access Token** with `read:packages` scope available as
  `CR_PAT` (only needed if you pull images on the VM manually; the
  pipeline uses the ephemeral `GITHUB_TOKEN`)

See the [root README](../README.md#1-install-prerequisites-one-time-per-machine)
for OS-specific install commands (`brew` / `winget` / `apt`).

### Operating systems

- **macOS / Linux:** kør scriptet direkte med `bash infrastructure/...`.
- **Windows:** kør via **WSL** (anbefalet) eller **Git Bash** — ikke
  PowerShell eller `cmd`. Scripts bruger bash-arrays, heredocs og
  `set -euo pipefail`, som ikke findes i PowerShell. WSL/Git Bash
  bundler bash 5.x og kan finde `az` / `gh` på PATH når de er
  installeret normalt på Windows.

  Repoet har en `.gitattributes` der tvinger LF på `*.sh`, så CRLF-
  konvertering (Git's default `core.autocrlf=true` på Windows) ikke
  bryder scripts med fejl som `'\r': command not found`.

## One active deployment at a time

The repo's deploy secrets (`SSH_HOST_NGINX`, `BACKEND_PRIVATE_IP`,
`DATABASE_PRIVATE_IP`, `SSH_PRIVATE_KEY`) and the `DEPLOY_MODE` variable are
**shared team state**.
Only one teammate can have a live deployment at any moment — the last person
to run `create_three_vms.sh` owns the deploy target until they (or someone
else) tear down.

To make this visible and prevent accidents, the create script records the
current owner in a repo variable `DEPLOY_OWNER` (= the GitHub username of
whoever ran the script). If a classmate tries to run it while someone else
owns the deployment, the script refuses with:

```
[error] Another teammate already has an active deployment on this repo.
  Current owner  : alice
  Deploy mode    : three-vms
  ...
```

To release ownership, the current owner runs `bash infrastructure/azure-teardown.sh`
— that deletes their Azure resources *and* clears `DEPLOY_OWNER` /
`DEPLOY_MODE` / the deploy secrets from the repo, so the next teammate can
run the create script without conflict.

If the lock is genuinely stale (VMs already gone but state wasn't cleaned up),
override with `FORCE=1 bash infrastructure/create_three_vms.sh`.

## Deployment topology

The cookbook runs on a single canonical topology: **three VMs with a
blue/green backend and PostgreSQL**. The pipeline in
[`.github/workflows/ci-cd.yml`](../.github/workflows/ci-cd.yml) deploys it when
the `DEPLOY_MODE` repo variable is `three-vms` (set for you by the create
script).

| Mode        | Script                | VMs                                                   | Compose files |
| ----------- | --------------------- | ----------------------------------------------------- | ------------- |
| `three-vms` | `create_three_vms.sh` | 3 (public nginx + private backend + private database) | [`deploy/blue-green/`](../deploy/blue-green/) |

## Provisioning

```bash
bash infrastructure/create_three_vms.sh
```

What it does:

1. Creates resource group `rg-balladebaderne` in `francecentral`.
2. Creates a VNet `10.0.0.0/16` with subnet `10.0.1.0/24`.
3. Creates three `Standard_B1s` VMs:
   - `cookbook-nginx` (public IP)
   - `cookbook-backend` (**no public IP**)
   - `cookbook-database` (**no public IP**)
4. Opens **80 / 443** on nginx.
5. Restricts backend port **3000** to the nginx VM's private IP only.
6. Restricts PostgreSQL port **5432** to the backend VM's private IP only.
7. Installs Docker + Compose on all three hosts. Backend and database are
   provisioned over SSH via nginx as a jump host.
8. Sets repo secrets `SSH_HOST_NGINX`, `BACKEND_PRIVATE_IP`,
   `DATABASE_PRIVATE_IP`, `SSH_USER`, `SSH_PRIVATE_KEY`.
9. Sets repo variable `DEPLOY_MODE=three-vms`.

Then push to `master` (or run the workflow manually) and the app goes live at
`http://<NGINX_IP>`. The backend and database have no public IP — the pipeline
reaches them through nginx as an SSH jump host. See
[`deploy/README-blue-green.md`](../deploy/README-blue-green.md) for the
blue/green deploy and rollback flow.

## Teardown

```bash
bash infrastructure/azure-teardown.sh
```

Lists every resource in `rg-balladebaderne` and asks you to type the
resource group name to confirm. On confirmation it issues
`az group delete --yes --no-wait` — the whole RG and everything in it
is removed. It also clears `DEPLOY_OWNER` / `DEPLOY_MODE` / the deploy
secrets so the next teammate can provision cleanly.
