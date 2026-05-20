#!/usr/bin/env bash
set -euo pipefail

# Provisions the three-VM cookbook deployment in Azure and wires up
# GitHub repo secrets for the future three-host deployment path.
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

GITHUB_REPO="${GITHUB_REPO:-Balladebaderne/cookbook}"

BACKEND_PORT=3000
DATABASE_PORT=5432

log() { printf '\n\033[1;34m[setup]\033[0m %s\n' "$*"; }
die() { printf '\n\033[1;31m[error]\033[0m %s\n' "$*" >&2; exit 1; }

command -v az >/dev/null || die "Azure CLI (az) not installed."
command -v gh >/dev/null || die "GitHub CLI (gh) not installed."
command -v ssh >/dev/null || die "ssh not installed."

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
  gh auth login || die "GitHub login failed."
fi
GH_USER=$(gh api user --jq .login)

CURRENT_OWNER=$(gh variable list -R "$GITHUB_REPO" --json name,value \
  -q '.[] | select(.name=="DEPLOY_OWNER") | .value' 2>/dev/null || true)
CURRENT_MODE=$(gh variable list -R "$GITHUB_REPO" --json name,value \
  -q '.[] | select(.name=="DEPLOY_MODE") | .value' 2>/dev/null || true)

if [[ -n "$CURRENT_OWNER" && "$CURRENT_OWNER" != "$GH_USER" && "${FORCE:-0}" != "1" ]]; then
  cat >&2 <<ERR

[error] Another teammate already has an active deployment on this repo.

  Current owner  : $CURRENT_OWNER
  Deploy mode    : ${CURRENT_MODE:-unknown}
  Repo           : $GITHUB_REPO

Running this script now would overwrite the repo's deploy secrets and
orphan $CURRENT_OWNER's VMs (still running in their Azure subscription,
still burning credits, but no longer receiving deploys).

What to do:
  1. Ask $CURRENT_OWNER to run on their machine:
       bash infrastructure/azure-teardown.sh
     That deletes their Azure resources and clears the lock.
  2. Or, if you know the lock is stale (VMs already gone), override:
       FORCE=1 bash infrastructure/create_three_vms.sh

ERR
  exit 1
fi

if [[ -z "$CURRENT_OWNER" && -n "$CURRENT_MODE" ]]; then
  log "Note: DEPLOY_MODE=$CURRENT_MODE is set but no DEPLOY_OWNER recorded."
  log "      Claiming ownership. If a teammate still has VMs up, ask them to tear down."
fi

cat <<CONFIRM

About to provision a three-VM deployment:

  Azure subscription : $ACCOUNT_NAME
  Subscription ID    : $SUBSCRIPTION_ID
  Signed-in user     : $SIGNED_IN_USER
  Resource group     : $RESOURCE_GROUP   (location: $LOCATION)
  VNet / subnet      : $VNET_NAME ($VNET_CIDR) / $SUBNET_NAME ($SUBNET_CIDR)
  VMs                : $NGINX_VM (public) + $BACKEND_VM (private) + $DATABASE_VM (private)
  VM size            : $VM_SIZE, Ubuntu 22.04

  GitHub repo        : $GITHUB_REPO
  GitHub user        : $GH_USER
  Secrets to be set  : SSH_HOST_NGINX, BACKEND_PRIVATE_IP, DATABASE_PRIVATE_IP, SSH_USER, SSH_PRIVATE_KEY
  Variable to be set : DEPLOY_MODE=three-vms

This will consume Azure credits and overwrite the repo's deploy secrets.
The current CI/CD workflow does not deploy the three-VM mode yet.
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

create_vm() {
  local name="$1"
  local public_ip_mode="${2:-with-public-ip}"
  log "Creating VM '$name'..."
  if az vm show -g "$RESOURCE_GROUP" -n "$name" >/dev/null 2>&1; then
    log "VM '$name' already exists, skipping create."
    return
  fi

  local pip_args=(--public-ip-sku Standard)
  if [[ "$public_ip_mode" == "no-public-ip" ]]; then
    pip_args=(--public-ip-address "")
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

create_vm "$NGINX_VM"
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

NGINX_IP=$(az vm show -d -g "$RESOURCE_GROUP" -n "$NGINX_VM" --query publicIps -o tsv)

log "  nginx    public IP:  $NGINX_IP"
log "  backend  private IP: $BACKEND_PRIVATE_IP"
log "  database private IP: $DATABASE_PRIVATE_IP"

SSH_OPTS=(-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=30 -i "$SSH_KEY_PATH")

wait_for_ssh() {
  local host="$1"
  local jump_host="${2:-}"
  local extra=()
  [[ -n "$jump_host" ]] && extra=(-o "ProxyJump=$ADMIN_USER@$jump_host")
  log "Waiting for SSH on $host${jump_host:+ (via $jump_host)}..."
  for _ in $(seq 1 30); do
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

log "Setting GitHub secrets on $GITHUB_REPO..."
set_secret() {
  printf '%s' "$2" | gh secret set "$1" -R "$GITHUB_REPO"
}

set_secret SSH_USER             "$ADMIN_USER"
set_secret SSH_HOST_NGINX       "$NGINX_IP"
set_secret BACKEND_PRIVATE_IP   "$BACKEND_PRIVATE_IP"
set_secret DATABASE_PRIVATE_IP  "$DATABASE_PRIVATE_IP"
gh secret set SSH_PRIVATE_KEY -R "$GITHUB_REPO" < "$SSH_KEY_PATH"

gh secret delete SSH_HOST_BACKEND  -R "$GITHUB_REPO" >/dev/null 2>&1 || true
gh secret delete SSH_HOST_DATABASE -R "$GITHUB_REPO" >/dev/null 2>&1 || true

log "Setting deploy-mode variable to 'three-vms' on $GITHUB_REPO..."
gh variable set DEPLOY_MODE --body "three-vms" -R "$GITHUB_REPO"

log "Claiming deployment ownership as '$GH_USER'..."
gh variable set DEPLOY_OWNER --body "$GH_USER" -R "$GITHUB_REPO"

log "Done."
cat <<SUMMARY

Three-VM deployment provisioned:
  Resource group:      $RESOURCE_GROUP
  nginx VM:            $NGINX_IP            (ports 80/443 open)
  backend VM:          $BACKEND_PRIVATE_IP  (port $BACKEND_PORT from nginx only)
  database VM:         $DATABASE_PRIVATE_IP (port $DATABASE_PORT from backend only)

GitHub secrets set on $GITHUB_REPO:
  SSH_USER, SSH_HOST_NGINX, BACKEND_PRIVATE_IP, DATABASE_PRIVATE_IP, SSH_PRIVATE_KEY

Repo variable set:
  DEPLOY_MODE=three-vms

The three-VM provisioning step is complete, but the current CI/CD workflow
does not deploy DEPLOY_MODE=three-vms yet. This script prepares the infra
for the later Postgres and deploy-pipeline phases.

SUMMARY
