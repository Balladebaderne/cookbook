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

## Prerequisites

Install and configure on your local machine:

- **Azure CLI** (`az`) — logged in with `az login`
- **GitHub CLI** (`gh`) — logged in with `gh auth login`
- **SSH key pair** in `~/.ssh/` — `id_rsa`, `id_ed25519`, or `id_ecdsa`
  (auto-detected in that order; override with `SSH_KEY_PATH` /
  `SSH_PUB_KEY_PATH` env vars). If you don't have one yet:
  `ssh-keygen -t ed25519 -C "you@example.com"`
- Access to the `Balladebaderne/cookbook` GitHub repo
- A **Personal Access Token** with `read:packages` scope available as
  `CR_PAT` (only needed if you pull images on the VM manually; the
  pipeline uses the ephemeral `GITHUB_TOKEN`)

## One active deployment at a time

The repo's deploy secrets (`SSH_HOST*`, `BACKEND_PRIVATE_IP`,
`SSH_PRIVATE_KEY`) and the `DEPLOY_MODE` variable are **shared team state**.
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

## Two deployment topologies

The pipeline in [`.github/workflows/ci-cd.yml`](../.github/workflows/ci-cd.yml)
reads a repo variable `DEPLOY_MODE` and picks which deploy job to run:

| Mode       | Script                 | VMs                          | Compose file used                                                           |
| ---------- | ---------------------- | ---------------------------- | --------------------------------------------------------------------------- |
| `single`   | `create_vm.sh`         | 1 (public)                   | [`docker-compose.single-vm.yml`](../docker-compose.single-vm.yml)           |
| `two-vms`  | `create_two_vms.sh`    | 2 (public nginx + private backend) | [`docker-compose.nginx.yml`](../docker-compose.nginx.yml) + [`docker-compose.backend.yml`](../docker-compose.backend.yml) |

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
bash infrastructure/create_vm.sh           # or create_two_vms.sh
```

## Environment overrides

Every tunable in both scripts is overridable via env var — useful if
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
