#!/usr/bin/env bash
set -euo pipefail

# Provisions the three-VM cookbook deployment in Azure and wires up
# the GitHub repo secrets/variables used by the deploy workflow.
#
# Run interactively the first time:   bash infrastructure/create_three_vms.sh
# Safe to re-run: resource creation is idempotent; existing resources are reused.

RESOURCE_GROUP="${RESOURCE_GROUP:-rg-balladebaderne}"
LOCATION="${LOCATION:-francecentral}"
VNET_NAME="${VNET_NAME:-cookbook-vnet}"
SUBNET_NAME="${SUBNET_NAME:-cookbook-subnet}"
VNET_CIDR="10.0.0.0/16"
SUBNET_CIDR="10.0.1.0/24"

NGINX_VM="${NGINX_VM:-cookbook-nginx}"
BACKEND_VM="${BACKEND_VM:-cookbook-backend}"
DATABASE_VM="${DATABASE_VM:-cookbook-database}"
VM_SIZE="${VM_SIZE:-Standard_B1s}"
VM_IMAGE="Canonical:0001-com-ubuntu-server-jammy:22_04-lts:latest"
ADMIN_USER="${ADMIN_USER:-azureuser}"
PUBLIC_IP_NAME="${PUBLIC_IP_NAME:-cookbook-nginx-ip}"

# Which repo to deploy against. Auto-detected from the checked-out clone after
# gh auth is confirmed (below); export GITHUB_REPO to override.
GITHUB_REPO="${GITHUB_REPO:-}"

BACKEND_PORT=3000
DATABASE_PORT=5432

# Trigger the CI/CD deploy automatically once provisioning is done.
# Set DEPLOY_AFTER_PROVISION=0 to provision only and deploy manually later.
DEPLOY_AFTER_PROVISION="${DEPLOY_AFTER_PROVISION:-1}"
DEPLOY_WORKFLOW="${DEPLOY_WORKFLOW:-ci-cd.yml}"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-master}"

POSTGRES_DB_PROVIDED=0
POSTGRES_USER_PROVIDED=0
POSTGRES_PORT_PROVIDED=0
POSTGRES_PASSWORD_PROVIDED=0
[[ -n "${POSTGRES_DB+x}" ]] && POSTGRES_DB_PROVIDED=1
[[ -n "${POSTGRES_USER+x}" ]] && POSTGRES_USER_PROVIDED=1
[[ -n "${POSTGRES_PORT+x}" ]] && POSTGRES_PORT_PROVIDED=1
[[ -n "${POSTGRES_PASSWORD:-}" ]] && POSTGRES_PASSWORD_PROVIDED=1

POSTGRES_DB_VALUE="${POSTGRES_DB:-cookbook}"
POSTGRES_USER_VALUE="${POSTGRES_USER:-cookbook}"
POSTGRES_PORT_VALUE="${POSTGRES_PORT:-5432}"
POSTGRES_PASSWORD_VALUE="${POSTGRES_PASSWORD:-}"

log() { printf '\n\033[1;34m[setup]\033[0m %s\n' "$*"; }
die() { printf '\n\033[1;31m[error]\033[0m %s\n' "$*" >&2; exit 1; }

command -v az >/dev/null || die "Azure CLI (az) not installed."
command -v gh >/dev/null || die "GitHub CLI (gh) not installed."
command -v ssh >/dev/null || die "ssh not installed."

[[ "$POSTGRES_PORT_VALUE" =~ ^[0-9]+$ ]] || die "POSTGRES_PORT must be numeric."

if [[ -z "${SSH_KEY_PATH:-}" ]]; then
  for candidate in id_rsa id_ed25519 id_ecdsa; do
    if [[ -f "$HOME/.ssh/$candidate" && -f "$HOME/.ssh/$candidate.pub" ]]; then
      SSH_KEY_PATH="$HOME/.ssh/$candidate"
      SSH_PUB_KEY_PATH="$HOME/.ssh/$candidate.pub"
      log "Using SSH key pair: $SSH_KEY_PATH"
      break
    fi
  done
fi
SSH_KEY_PATH="${SSH_KEY_PATH:-}"
SSH_PUB_KEY_PATH="${SSH_PUB_KEY_PATH:-${SSH_KEY_PATH}.pub}"

[[ -n "$SSH_KEY_PATH" && -f "$SSH_KEY_PATH" ]] || die "No SSH private key found. Tried ~/.ssh/{id_rsa,id_ed25519,id_ecdsa}. Generate one (ssh-keygen -t ed25519) or set SSH_KEY_PATH."
[[ -f "$SSH_PUB_KEY_PATH" ]] || die "SSH public key not found at $SSH_PUB_KEY_PATH"

log "Verifying Azure login..."
if ! az account show >/dev/null 2>&1; then
  log "Not logged in to Azure — opening browser to sign in..."
  az login || die "Azure login failed."
fi
ACCOUNT_NAME=$(az account show --query name -o tsv)
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
SIGNED_IN_USER=$(az account show --query user.name -o tsv)

log "Verifying GitHub login..."
if ! gh auth status >/dev/null 2>&1; then
  log "Not logged in to GitHub — starting interactive login flow..."
  gh auth login -s workflow || die "GitHub login failed."
fi
GH_USER=$(gh api user --jq .login)

# Triggering the deploy uses 'gh workflow run', which needs the 'workflow' OAuth
# scope. Add it if the current login is missing it.
if ! gh auth status 2>&1 | grep -q "workflow"; then
  log "Adding the 'workflow' scope to your gh login..."
  gh auth refresh -s workflow || die "Could not add the 'workflow' scope. Run: gh auth refresh -s workflow"
fi

# Resolve the deploy target repo: an explicit GITHUB_REPO override wins, else
# auto-detect from the checked-out clone, falling back to the canonical repo.
if [[ -z "$GITHUB_REPO" ]]; then
  GITHUB_REPO="$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || true)"
  GITHUB_REPO="${GITHUB_REPO:-Balladebaderne/cookbook}"
fi
log "Deploy target repo: $GITHUB_REPO"

# Setting Actions secrets/variables and dispatching the deploy workflow all
# require admin on the target repo. An outsider (e.g. our censor) without admin
# must fork first and deploy from their own fork instead.
if [[ "$(gh api "repos/$GITHUB_REPO" --jq '.permissions.admin' 2>/dev/null || echo false)" != "true" ]]; then
  die "You don't have admin on $GITHUB_REPO, so this script can't set deploy secrets or run the workflow there.
       Fork it and deploy from your own fork instead:
         gh repo fork Balladebaderne/cookbook --clone
         cd cookbook
         bash infrastructure/create_three_vms.sh"
fi

set_secret() {
  printf '%s' "$2" | gh secret set "$1" -R "$GITHUB_REPO"
}

secret_exists() {
  local name="$1"
  gh secret list -R "$GITHUB_REPO" --json name -q '.[] | .name' | grep -qx "$name"
}

generate_secret() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 24
    return
  fi

  if command -v uuidgen >/dev/null 2>&1; then
    printf '%s%s\n' "$(uuidgen | tr -d '-')" "$(uuidgen | tr -d '-')" | cut -c 1-48
    return
  fi

  die "Could not generate POSTGRES_PASSWORD. Install openssl or set POSTGRES_PASSWORD before running."
}

ensure_secret() {
  local name="$1"
  local value="$2"
  local force="${3:-0}"

  if [[ "$force" != "1" ]] && secret_exists "$name"; then
    log "Secret $name already exists; leaving it unchanged."
    return
  fi

  [[ -n "$value" ]] || die "No value available for GitHub secret $name."
  set_secret "$name" "$value"
}

sync_deploy_secrets() {
  log "Setting GitHub deploy secrets on $GITHUB_REPO..."

  # These identify the current Azure VMs, so they are intentionally refreshed
  # every run. That makes reruns repair stale/missing SSH host and IP secrets.
  set_secret SSH_USER             "$ADMIN_USER"
  set_secret SSH_HOST_NGINX       "$NGINX_IP"
  set_secret BACKEND_PRIVATE_IP   "$BACKEND_PRIVATE_IP"
  set_secret DATABASE_PRIVATE_IP  "$DATABASE_PRIVATE_IP"
  gh secret set SSH_PRIVATE_KEY -R "$GITHUB_REPO" < "$SSH_KEY_PATH"

  # Postgres data is stateful. Preserve existing credentials unless the caller
  # explicitly passed POSTGRES_* env vars for this run.
  ensure_secret POSTGRES_DB   "$POSTGRES_DB_VALUE"   "$POSTGRES_DB_PROVIDED"
  ensure_secret POSTGRES_USER "$POSTGRES_USER_VALUE" "$POSTGRES_USER_PROVIDED"
  ensure_secret POSTGRES_PORT "$POSTGRES_PORT_VALUE" "$POSTGRES_PORT_PROVIDED"

  if [[ "$POSTGRES_PASSWORD_PROVIDED" != "1" ]] && ! secret_exists POSTGRES_PASSWORD; then
    POSTGRES_PASSWORD_VALUE="$(generate_secret)"
  fi
  ensure_secret POSTGRES_PASSWORD "$POSTGRES_PASSWORD_VALUE" "$POSTGRES_PASSWORD_PROVIDED"

  gh secret delete SSH_HOST_BACKEND  -R "$GITHUB_REPO" >/dev/null 2>&1 || true
  gh secret delete SSH_HOST_DATABASE -R "$GITHUB_REPO" >/dev/null 2>&1 || true
}

# No deploy-owner lock: each person either deploys from their own fork (fully
# isolated state) or coordinates manually on the shared repo. DEPLOY_MODE is
# still set after provisioning so the pipeline knows the topology.

cat <<CONFIRM

About to provision a three-VM deployment:

  Azure subscription : $ACCOUNT_NAME
  Subscription ID    : $SUBSCRIPTION_ID
  Signed-in user     : $SIGNED_IN_USER
  Resource group     : $RESOURCE_GROUP   (location: $LOCATION)
  VNet / subnet      : $VNET_NAME ($VNET_CIDR) / $SUBNET_NAME ($SUBNET_CIDR)
  VMs                : $NGINX_VM (public) + $BACKEND_VM (private) + $DATABASE_VM (private)
  VM size            : $VM_SIZE, Ubuntu 22.04
  Static public IP   : $PUBLIC_IP_NAME (Standard, reused across teardowns)

  GitHub repo        : $GITHUB_REPO
  GitHub user        : $GH_USER
  Secrets to sync    : SSH_HOST_NGINX, BACKEND_PRIVATE_IP, DATABASE_PRIVATE_IP, SSH_USER, SSH_PRIVATE_KEY
                       POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_PORT
  Variable to be set : DEPLOY_MODE=three-vms
  Postgres defaults  : db=$POSTGRES_DB_VALUE, user=$POSTGRES_USER_VALUE, port=$POSTGRES_PORT_VALUE
                       password is generated only if POSTGRES_PASSWORD is missing
  Auto-deploy        : $([[ "$DEPLOY_AFTER_PROVISION" == "1" ]] && echo "yes — dispatches $DEPLOY_WORKFLOW on $DEPLOY_BRANCH after provisioning" || echo "no — deploy manually later")

This will consume Azure credits and overwrite the repo's deploy secrets.
CONFIRM

read -rp "Continue? (y/N): " confirm
[[ "$confirm" =~ ^[Yy]$ ]] || die "Aborted by user."

log "Creating resource group '$RESOURCE_GROUP' in $LOCATION..."
az group create --name "$RESOURCE_GROUP" --location "$LOCATION" --output none

log "Creating VNet '$VNET_NAME' ($VNET_CIDR) and subnet '$SUBNET_NAME' ($SUBNET_CIDR)..."
az network vnet create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$VNET_NAME" \
  --address-prefixes "$VNET_CIDR" \
  --subnet-name "$SUBNET_NAME" \
  --subnet-prefixes "$SUBNET_CIDR" \
  --output none

# Creates the named static public IP if absent; reused if it already exists so
# it survives teardown + re-provision, keeping the report/demo link stable.
create_public_ip() {
  local name="$1"
  log "Ensuring static public IP '$name'..."
  if az network public-ip show -g "$RESOURCE_GROUP" -n "$name" >/dev/null 2>&1; then
    log "Public IP '$name' already exists, reusing."
    return
  fi
  az network public-ip create \
    --resource-group "$RESOURCE_GROUP" \
    --name "$name" \
    --sku Standard \
    --allocation-method Static \
    --output none
}

create_vm() {
  local name="$1"
  # Public IP behaviour for arg 2:
  #   "no-public-ip"     → private VM, no public IP
  #   "with-public-ip"   → Azure auto-creates a Standard public IP (default)
  #   "<public-ip-name>" → attach this pre-created (static) public IP
  local public_ip_mode="${2:-with-public-ip}"
  log "Creating VM '$name'..."
  if az vm show -g "$RESOURCE_GROUP" -n "$name" >/dev/null 2>&1; then
    log "VM '$name' already exists, skipping create."
    return
  fi

  local pip_args=(--public-ip-sku Standard)
  if [[ "$public_ip_mode" == "no-public-ip" ]]; then
    pip_args=(--public-ip-address "")
  elif [[ "$public_ip_mode" != "with-public-ip" ]]; then
    pip_args=(--public-ip-address "$public_ip_mode")
  fi

  az vm create \
    --resource-group "$RESOURCE_GROUP" \
    --name "$name" \
    --image "$VM_IMAGE" \
    --size "$VM_SIZE" \
    --admin-username "$ADMIN_USER" \
    --ssh-key-values "$SSH_PUB_KEY_PATH" \
    --vnet-name "$VNET_NAME" \
    --subnet "$SUBNET_NAME" \
    "${pip_args[@]}" \
    --output none
}

vm_nsg_name() {
  local vm_name="$1"
  local nsg_id

  nsg_id=$(az vm show -g "$RESOURCE_GROUP" -n "$vm_name" \
    --query "networkProfile.networkInterfaces[0].id" -o tsv \
    | xargs -I{} az network nic show --ids {} --query "networkSecurityGroup.id" -o tsv)

  if [[ -z "$nsg_id" ]]; then
    nsg_id=$(az network nsg show -g "$RESOURCE_GROUP" -n "${vm_name}NSG" --query id -o tsv 2>/dev/null || true)
  fi

  [[ -n "$nsg_id" ]] || die "Could not locate NSG for $vm_name"
  basename "$nsg_id"
}

allow_tcp_from_source() {
  local vm_name="$1"
  local rule_name="$2"
  local priority="$3"
  local source_ip="$4"
  local destination_port="$5"
  local nsg_name

  nsg_name=$(vm_nsg_name "$vm_name")

  az network nsg rule create \
    --resource-group "$RESOURCE_GROUP" \
    --nsg-name "$nsg_name" \
    --name "$rule_name" \
    --priority "$priority" \
    --source-address-prefixes "$source_ip" \
    --destination-port-ranges "$destination_port" \
    --access Allow --protocol Tcp --direction Inbound \
    --output none 2>/dev/null || \
  az network nsg rule update \
    --resource-group "$RESOURCE_GROUP" \
    --nsg-name "$nsg_name" \
    --name "$rule_name" \
    --source-address-prefixes "$source_ip" \
    --destination-port-ranges "$destination_port" \
    --output none
}

create_public_ip "$PUBLIC_IP_NAME"
create_vm "$NGINX_VM" "$PUBLIC_IP_NAME"
create_vm "$BACKEND_VM" "no-public-ip"
create_vm "$DATABASE_VM" "no-public-ip"

log "Opening ports 80 and 443 on '$NGINX_VM'..."
az vm open-port --resource-group "$RESOURCE_GROUP" --name "$NGINX_VM" --port 80  --priority 1001 --output none || true
az vm open-port --resource-group "$RESOURCE_GROUP" --name "$NGINX_VM" --port 443 --priority 1002 --output none || true

NGINX_PRIVATE_IP=$(az vm show -d -g "$RESOURCE_GROUP" -n "$NGINX_VM" --query privateIps -o tsv)
BACKEND_PRIVATE_IP=$(az vm show -d -g "$RESOURCE_GROUP" -n "$BACKEND_VM" --query privateIps -o tsv)
DATABASE_PRIVATE_IP=$(az vm show -d -g "$RESOURCE_GROUP" -n "$DATABASE_VM" --query privateIps -o tsv)

[[ -n "$NGINX_PRIVATE_IP" ]] || die "Could not resolve nginx private IP"
[[ -n "$BACKEND_PRIVATE_IP" ]] || die "Could not resolve backend private IP"
[[ -n "$DATABASE_PRIVATE_IP" ]] || die "Could not resolve database private IP"

log "Allowing backend port $BACKEND_PORT from nginx ($NGINX_PRIVATE_IP) only on '$BACKEND_VM'..."
az network nsg rule delete \
  --resource-group "$RESOURCE_GROUP" \
  --nsg-name "$(vm_nsg_name "$BACKEND_VM")" \
  --name "allow-backend-from-vnet" \
  --output none 2>/dev/null || true
allow_tcp_from_source "$BACKEND_VM" "allow-backend-from-nginx" 1100 "$NGINX_PRIVATE_IP" "$BACKEND_PORT"

log "Allowing database port $DATABASE_PORT from backend ($BACKEND_PRIVATE_IP) only on '$DATABASE_VM'..."
az network nsg rule delete \
  --resource-group "$RESOURCE_GROUP" \
  --nsg-name "$(vm_nsg_name "$DATABASE_VM")" \
  --name "allow-postgres-from-vnet" \
  --output none 2>/dev/null || true
allow_tcp_from_source "$DATABASE_VM" "allow-postgres-from-backend" 1100 "$BACKEND_PRIVATE_IP" "$DATABASE_PORT"

NGINX_IP=$(az network public-ip show -g "$RESOURCE_GROUP" -n "$PUBLIC_IP_NAME" --query ipAddress -o tsv)
[[ -n "$NGINX_IP" ]] || die "Could not resolve the static public IP '$PUBLIC_IP_NAME'."

log "  nginx    public IP:  $NGINX_IP"
log "  backend  private IP: $BACKEND_PRIVATE_IP"
log "  database private IP: $DATABASE_PRIVATE_IP"

sync_deploy_secrets

SSH_OPTS=(-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=30 -i "$SSH_KEY_PATH")

wait_for_ssh() {
  local host="$1"
  local jump_host="${2:-}"
  local extra=()
  [[ -n "$jump_host" ]] && extra=(-o "ProxyJump=$ADMIN_USER@$jump_host")
  log "Waiting for SSH on $host${jump_host:+ (via $jump_host)}..."
  for _ in $(seq 1 60); do
    if ssh "${SSH_OPTS[@]}" ${extra[@]+"${extra[@]}"} "$ADMIN_USER@$host" 'true' 2>/dev/null; then
      return 0
    fi
    sleep 5
  done
  die "SSH never came up on $host"
}

provision() {
  local host="$1" label="$2" jump_host="${3:-}"
  local extra=()
  [[ -n "$jump_host" ]] && extra=(-o "ProxyJump=$ADMIN_USER@$jump_host")
  wait_for_ssh "$host" "$jump_host"
  log "Provisioning $label ($host)${jump_host:+ via $jump_host}: base packages + Docker..."
  ssh "${SSH_OPTS[@]}" ${extra[@]+"${extra[@]}"} "$ADMIN_USER@$host" 'bash -s' <<'REMOTE'
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
sudo -E apt-get update -y
sudo -E apt-get upgrade -y
sudo -E apt-get install -y curl wget git unzip ca-certificates gnupg lsb-release

if ! command -v docker >/dev/null 2>&1; then
  sudo install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  sudo chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
  sudo -E apt-get update -y
  sudo -E apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  sudo usermod -aG docker "$USER"
fi
sudo systemctl enable --now docker
mkdir -p "$HOME/app"
REMOTE
}

provision "$NGINX_IP"            "nginx VM"
provision "$BACKEND_PRIVATE_IP"  "backend VM"  "$NGINX_IP"
provision "$DATABASE_PRIVATE_IP" "database VM" "$NGINX_IP"

log "Setting deploy-mode variable to 'three-vms' on $GITHUB_REPO..."
gh variable set DEPLOY_MODE --body "three-vms" -R "$GITHUB_REPO"

# ── Auto-deploy: trigger and follow the CI/CD pipeline ───────────────────────
# The three-vms deploy jobs are gated on (ref==master OR workflow_dispatch),
# so dispatching on the deploy branch deploys the app onto the VMs just
# provisioned above. Skip with DEPLOY_AFTER_PROVISION=0.
trigger_deploy() {
  log "Triggering CI/CD deploy: $DEPLOY_WORKFLOW on '$DEPLOY_BRANCH'..."
  if ! gh workflow run "$DEPLOY_WORKFLOW" -R "$GITHUB_REPO" --ref "$DEPLOY_BRANCH"; then
    log "Could not dispatch the workflow automatically."
    log "Deploy manually with: gh workflow run $DEPLOY_WORKFLOW -R $GITHUB_REPO --ref $DEPLOY_BRANCH"
    return 1
  fi

  # 'gh workflow run' returns no run id, so poll for the run it just started.
  local run_id=""
  for _ in $(seq 1 12); do
    run_id=$(gh run list -R "$GITHUB_REPO" \
      --workflow "$DEPLOY_WORKFLOW" --branch "$DEPLOY_BRANCH" --event workflow_dispatch \
      --limit 1 --json databaseId -q '.[0].databaseId' 2>/dev/null || true)
    [[ -n "$run_id" ]] && break
    sleep 5
  done

  if [[ -z "$run_id" ]]; then
    log "Deploy dispatched, but could not locate the run id to watch."
    log "Follow it in the Actions tab or: gh run list -R $GITHUB_REPO"
    return 0
  fi

  log "Watching run $run_id"
  log "  https://github.com/$GITHUB_REPO/actions/runs/$run_id"

  # 'gh run watch --exit-status' streams job progress (database -> backend ->
  # nginx -> monitoring) and exits non-zero if the run fails.
  if gh run watch "$run_id" -R "$GITHUB_REPO" --exit-status; then
    log "Deploy succeeded."
    return 0
  else
    log "Deploy failed. Inspect logs: gh run view $run_id -R $GITHUB_REPO --log-failed"
    return 1
  fi
}

DEPLOY_RESULT="skipped"
if [[ "$DEPLOY_AFTER_PROVISION" == "1" ]]; then
  if trigger_deploy; then
    DEPLOY_RESULT="succeeded"
  else
    DEPLOY_RESULT="failed (see logs above)"
  fi
fi

log "Done."
cat <<SUMMARY

Three-VM deployment provisioned:
  Resource group:      $RESOURCE_GROUP
  nginx VM:            $NGINX_IP            (ports 80/443 open)
  backend VM:          $BACKEND_PRIVATE_IP  (port $BACKEND_PORT from nginx only)
  database VM:         $DATABASE_PRIVATE_IP (port $DATABASE_PORT from backend only)

GitHub secrets set on $GITHUB_REPO:
  SSH_USER, SSH_HOST_NGINX, BACKEND_PRIVATE_IP, DATABASE_PRIVATE_IP, SSH_PRIVATE_KEY
  POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_PORT

Repo variable set:
  DEPLOY_MODE=three-vms

Auto-deploy: $DEPLOY_RESULT

Once the deploy is green, verify on the nginx public IP:
  http://$NGINX_IP/              frontend (active blue/green color)
  http://$NGINX_IP/api/recipes/  backend API through nginx
  http://$NGINX_IP/apidocs       Swagger UI
  http://$NGINX_IP/grafana/      Grafana dashboards

Postgres seeds itself on first boot (seed-on-empty), so /api/recipes/ returns
the 20 seeded recipes once the backend is healthy.

SUMMARY
