# Infrastructure

Scripts that provision (and tear down) the Azure VMs used to run the
cookbook app. Every group member should be able to run through a full
cycle independently:

```
create_vm.sh  → push to master  → app live  → azure-teardown.sh
```

or

```
create_two_vms.sh  → push to master  → app live  → azure-teardown.sh
```

or

```
create_three_vms.sh  → provision 3 VMs  → later deploy phases  → azure-teardown.sh
```

## Prerequisites

Install on your local machine — login is handled by the create scripts
themselves (they call `az login` / `gh auth login` for you on first run):

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

- **macOS / Linux:** kør scripts direkte med `bash infrastructure/...`.
- **Windows:** kør via **WSL** (anbefalet) eller **Git Bash** — ikke
  PowerShell eller `cmd`. Scripts bruger bash-arrays, heredocs og
  `set -euo pipefail`, som ikke findes i PowerShell. WSL/Git Bash
  bundler bash 5.x og kan finde `az` / `gh` på PATH når de er
  installeret normalt på Windows.

  Repoet har en `.gitattributes` der tvinger LF på `*.sh`, så CRLF-
  konvertering (Git's default `core.autocrlf=true` på Windows) ikke
  bryder scripts med fejl som `'\r': command not found`.

## One active deployment at a time

The repo's deploy secrets (`SSH_HOST*`, `BACKEND_PRIVATE_IP`,
`DATABASE_PRIVATE_IP`, `SSH_PRIVATE_KEY`) and the `DEPLOY_MODE` variable are
**shared team state**.
Only one teammate can have a live deployment at any moment — the last person
to run `create_*.sh` owns the deploy target until they (or someone else)
tear down.

To make this visible and prevent accidents, the create scripts record the
current owner in a repo variable `DEPLOY_OWNER` (= the GitHub username of
whoever ran the script). If a classmate tries to run a create script while
someone else owns the deployment, the script refuses with:

```
[error] Another teammate already has an active deployment on this repo.
  Current owner  : alice
  Deploy mode    : two-vms
  ...
```

To release ownership, the current owner runs `bash infrastructure/azure-teardown.sh`
— that deletes their Azure resources *and* clears `DEPLOY_OWNER` /
`DEPLOY_MODE` / the deploy secrets from the repo, so the next teammate can
run a create script without conflict.

If the lock is genuinely stale (VMs already gone but state wasn't cleaned up),
override with `FORCE=1 bash infrastructure/create_vm.sh`.

## Deployment topologies

The pipeline in [`.github/workflows/ci-cd.yml`](../.github/workflows/ci-cd.yml)
reads a repo variable `DEPLOY_MODE` and picks which deploy job to run:

| Mode         | Script                  | VMs                                        | Compose file used |
| ------------ | ----------------------- | ------------------------------------------ | ----------------- |
| `single`     | `create_vm.sh`          | 1 (public)                                 | [`deploy/single-vm.yml`](../deploy/single-vm.yml) |
| `two-vms`    | `create_two_vms.sh`     | 2 (public nginx + private backend)         | [`deploy/nginx.yml`](../deploy/nginx.yml) + [`deploy/backend.yml`](../deploy/backend.yml) |
| `three-vms`  | `create_three_vms.sh`   | 3 (public nginx + private backend + private database) | Not wired yet — infrastructure only in this phase |

The create scripts set `DEPLOY_MODE` for you. You only need to pick one
topology at a time.

## Part 1 — Single VM

```bash
bash infrastructure/create_vm.sh
```

What it does:

1. Creates resource group `rg-balladebaderne` in `francecentral`.
2. Creates one `Standard_B1s` Ubuntu 22.04 VM named `cookbook-vm`.
3. Opens ports **80, 443, 3000**.
4. Installs Docker + Compose on the VM over SSH.
5. Sets repo secrets `SSH_HOST`, `SSH_USER`, `SSH_PRIVATE_KEY`.
6. Sets repo variable `DEPLOY_MODE=single`.

Then push to `master` (or run the workflow manually) and the app will
be live at `http://<VM_IP>`.

## Part 2 — Two VMs

```bash
bash infrastructure/create_two_vms.sh
```

What it does:

1. Creates resource group `rg-balladebaderne` in `francecentral`.
2. Creates a VNet `10.0.0.0/16` with subnet `10.0.1.0/24`.
3. Creates two `Standard_B1s` VMs: `cookbook-nginx` (public IP) and
   `cookbook-backend` (**no public IP** — only a private VNet address).
4. Opens **80 / 443** on nginx. Restricts backend port **3000** to
   the nginx VM's private IP only.
5. Installs Docker + Compose on nginx directly and on the backend
   via nginx as an SSH jump host (`ProxyJump`).
6. Sets repo secrets `SSH_HOST_NGINX`, `BACKEND_PRIVATE_IP`,
   `SSH_USER`, `SSH_PRIVATE_KEY`.
7. Sets repo variable `DEPLOY_MODE=two-vms`.

Push to `master` and the app will be live at `http://<NGINX_IP>`.
The backend is not reachable from the public internet — no public IP,
no internet-facing ports. The deploy pipeline reaches it by using
nginx as an SSH jump host.

## Part 3 — Three VMs

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

Notes:

- This script provisions the Azure topology and wires up the deploy secrets.
- The CI/CD workflow deploys the `three-vms` topology (blue/green) on push to `master`.
- The backend runs on PostgreSQL, hosted on the database VM provisioned here.

## Teardown

```bash
bash infrastructure/azure-teardown.sh
```

Lists every resource in `rg-balladebaderne` and asks you to type the
resource group name to confirm. On confirmation it issues
`az group delete --yes --no-wait` — the whole RG and everything in it
is removed.

After teardown, run the other create script if you want to switch
topology. The create script will overwrite `DEPLOY_MODE` and any
stale secrets.

## Switching modes

No teardown strictly required, but simplest flow:

```bash
bash infrastructure/azure-teardown.sh      # delete current RG
bash infrastructure/create_vm.sh           # or create_two_vms.sh / create_three_vms.sh
```

## Environment overrides

Every tunable in the create scripts is overridable via env var — useful if
your fork lives under a different owner or you want a different
location/size:

```bash
GITHUB_REPO="yourorg/yourfork" \
RESOURCE_GROUP="rg-mydemo" \
LOCATION="westeurope" \
VM_SIZE="Standard_B2s" \
bash infrastructure/create_vm.sh
```

See the top of each script for the full list.
