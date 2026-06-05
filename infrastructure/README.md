# Infrastructure

Scripts that provision (and tear down) the Azure VMs that run the cookbook app.

There are two ways to interact with the deployment, depending on who you are:

- **Group members** develop and deploy from the shared `Balladebaderne/cookbook`
  repo. They have admin, so the script can set Actions secrets/variables and run
  the CI/CD pipeline directly.
- **Outsiders** (e.g. our censor) have only read access, so they **fork** the
  repo and deploy from their own fork onto their own Azure subscription — fully
  isolated, no admin on our repo required.

The create script figures out which case you're in automatically: it resolves
the target repo from your checked-out clone and refuses early (with fork
instructions) if you don't have admin on it.

---

## Option A — See the running app

The group keeps a live deployment behind a **static** nginx public IP that
survives teardown + re-provision, so this link stays stable across rebuilds:

| What        | URL                              |
| ----------- | -------------------------------- |
| Frontend    | `http://<NGINX_IP>/`             |
| Recipes API | `http://<NGINX_IP>/api/recipes/` |
| Swagger UI  | `http://<NGINX_IP>/apidocs`      |
| Grafana     | `http://<NGINX_IP>/grafana/`     |

> Replace `<NGINX_IP>` with the current static IP (pinned in the report). The
> backend and database have **no** public IP — everything is reached through
> nginx as a reverse proxy / SSH jump host.

---

## Option B — Deploy your own instance (fork flow)

For anyone **without admin** on `Balladebaderne/cookbook`. You deploy onto your
own Azure subscription from your own fork — nothing touches our repo.

```bash
# 1. Fork + clone
gh repo fork Balladebaderne/cookbook --clone
cd cookbook

# 2. Enable Actions on the fork — REQUIRED on fresh forks:
#    GitHub → your fork → the "Actions" tab → "I understand my workflows,
#    enable them". Without this the deploy workflow cannot run.

# 3. Log in to your own Azure subscription
az login

# 4. Provision + deploy. The script auto-detects your fork as the target.
bash infrastructure/create_three_vms.sh
```

What happens: the script detects your fork via `gh repo view`, confirms you have
admin on it (you do — it's yours), sets the deploy secrets/variables on the
fork, provisions 3 VMs in your Azure subscription, and triggers your fork's
pipeline to deploy the app onto them.

---

## Prerequisites

- **Azure CLI** (`az`) with a logged-in session (`az login`). Bring your **own
  Azure subscription** with quota for **3× `Standard_B1s` VMs + 1 Standard
  public IP** in the chosen region (default `francecentral`).
- **GitHub CLI** (`gh`) with a login that carries the **`workflow`** scope
  (`gh auth login -s workflow`; the script adds it via `gh auth refresh -s
  workflow` if it's missing) — required so `gh workflow run` can trigger the
  deploy.
- **SSH key pair** in `~/.ssh/` — `id_rsa`, `id_ed25519`, or `id_ecdsa`
  (auto-detected in that order; override with `SSH_KEY_PATH` /
  `SSH_PUB_KEY_PATH`). If you don't have one: `ssh-keygen -t ed25519`.
- **Admin on the target repo.** Group members have it on the shared repo;
  outsiders get it automatically on their own fork (Option B).

Install the CLIs from their official docs:
[Azure CLI](https://learn.microsoft.com/cli/azure/install-azure-cli) ·
[GitHub CLI](https://github.com/cli/cli#installation).

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

---

## Deployment topology

The cookbook runs on a single canonical topology: **three VMs with a blue/green
backend and PostgreSQL**, only nginx is public. The pipeline in
[`.github/workflows/ci-cd.yml`](../.github/workflows/ci-cd.yml) deploys it when
the `DEPLOY_MODE` repo variable is `three-vms` (set for you by the create
script).

| Mode        | Script                | VMs                                                   | Compose files |
| ----------- | --------------------- | ----------------------------------------------------- | ------------- |
| `three-vms` | `create_three_vms.sh` | 3 (public nginx + private backend + private database) | [`deploy/blue-green/`](../deploy/blue-green/) |

There is **no single-owner deploy lock** — forks keep their state isolated and
group members coordinate on the shared repo, so concurrent deploys don't clash.

---

## Provisioning

```bash
bash infrastructure/create_three_vms.sh
```

What it does:

1. Resolves the **target repo** (explicit `GITHUB_REPO` override → auto-detect
   from the clone → fallback `Balladebaderne/cookbook`) and **requires admin**
   on it, otherwise stops with fork instructions.
2. Creates resource group `rg-balladebaderne` in `francecentral`.
3. Creates a VNet `10.0.0.0/16` with subnet `10.0.1.0/24`.
4. Ensures a **static** Standard public IP (`cookbook-nginx-ip`) — created if
   absent, **reused** if it already exists.
5. Creates three `Standard_B1s` VMs:
   - `cookbook-nginx` (attached to the static public IP)
   - `cookbook-backend` (**no public IP**)
   - `cookbook-database` (**no public IP**)
6. Opens **80 / 443** on nginx.
7. Restricts backend port **3000** to the nginx VM's private IP only.
8. Restricts PostgreSQL port **5432** to the backend VM's private IP only.
9. Installs Docker + Compose on all three hosts (backend and database are
   reached over SSH via nginx as a jump host).
10. Sets repo secrets (`SSH_HOST_NGINX`, `BACKEND_PRIVATE_IP`,
    `DATABASE_PRIVATE_IP`, `SSH_USER`, `SSH_PRIVATE_KEY`) and the repo variable
    `DEPLOY_MODE=three-vms`.
11. Triggers the CI/CD pipeline and follows it to completion, so the app is
    deployed onto the VMs it just provisioned.

The app then goes live at `http://<NGINX_IP>` (the static IP from step 4). To
provision only and deploy later, run with `DEPLOY_AFTER_PROVISION=0`. See
[`deploy/README-blue-green.md`](../deploy/README-blue-green.md) for the
blue/green deploy and rollback flow.

---

## Teardown

```bash
bash infrastructure/azure-teardown.sh
```

Lists every resource in `rg-balladebaderne` and asks you to type the resource
group name to confirm. On confirmation it deletes the VMs, NICs, NSGs, VNet and
managed disks **individually** — but **deliberately keeps the static public IP**
(`cookbook-nginx-ip`) so the report/demo link survives a teardown +
re-provision. It also clears `DEPLOY_MODE` and the deploy secrets so the next
deploy starts clean.
