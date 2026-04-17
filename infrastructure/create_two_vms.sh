#!/usr/bin/env bash
set -euo pipefail

# Provisions the two-VM cookbook deployment in Azure and wires up
# GitHub repo secrets so the CI/CD pipeline can SSH into the VMs.
#
# Run interactively the first time:   bash infrastructure/create_two_vms.sh
# Safe to re-run: resource creation is idempotent; existing resources are reused.

RESOURCE_GROUP="${RESOURCE_GROUP:-rg-balladebaderne}"
LOCATION="${LOCATION:-francecentral}"
VNET_NAME="${VNET_NAME:-cookbook-vnet}"
SUBNET_NAME="${SUBNET_NAME:-cookbook-subnet}"
VNET_CIDR="10.0.0.0/16"
SUBNET_CIDR="10.0.1.0/24"

NGINX_VM="${NGINX_VM:-cookbook-nginx}"
BACKEND_VM="${BACKEND_VM:-cookbook-backend}"
VM_SIZE="${VM_SIZE:-Standard_B1s}"
VM_IMAGE="Canonical:0001-com-ubuntu-server-jammy:22_04-lts:latest"
ADMIN_USER="${ADMIN_USER:-azureuser}"
SSH_PUB_KEY_PATH="${SSH_PUB_KEY_PATH:-$HOME/.ssh/id_rsa.pub}"
SSH_KEY_PATH="${SSH_KEY_PATH:-$HOME/.ssh/id_rsa}"

GITHUB_REPO="${GITHUB_REPO:-Balladebaderne/cookbook}"

BACKEND_PORT=3000

log() { printf '\n\033[1;34m[setup]\033[0m %s\n' "$*"; }
die() { printf '\n\033[1;31m[error]\033[0m %s\n' "$*" >&2; exit 1; }

command -v az >/dev/null || die "Azure CLI (az) not installed."
command -v gh >/dev/null || die "GitHub CLI (gh) not installed."
command -v ssh >/dev/null || die "ssh not installed."
[[ -f "$SSH_PUB_KEY_PATH" ]] || die "SSH public key not found at $SSH_PUB_KEY_PATH"
[[ -f "$SSH_KEY_PATH" ]] || die "SSH private key not found at $SSH_KEY_PATH"

log "Verifying Azure login..."
az account show >/dev/null 2>&1 || die "Not logged in to Azure. Run 'az login' first."
ACCOUNT_NAME=$(az account show --query name -o tsv)
log "Azure account: $ACCOUNT_NAME"

log "Verifying GitHub login..."
gh auth status >/dev/null 2>&1 || die "Not logged in to GitHub. Run 'gh auth login' first."

# ---------- Resource group ----------
log "Creating resource group '$RESOURCE_GROUP' in $LOCATION..."
az group create --name "$RESOURCE_GROUP" --location "$LOCATION" --output none

# ---------- Network ----------
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
  log "Creating VM '$name'..."
  if az vm show -g "$RESOURCE_GROUP" -n "$name" >/dev/null 2>&1; then
    log "VM '$name' already exists, skipping create."
    return
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
    --public-ip-sku Standard \
    --output none
}

create_vm "$NGINX_VM"
create_vm "$BACKEND_VM"

# ---------- NSG rules ----------
log "Opening ports 80 and 443 on '$NGINX_VM'..."
az vm open-port --resource-group "$RESOURCE_GROUP" --name "$NGINX_VM" --port 80  --priority 1001 --output none || true
az vm open-port --resource-group "$RESOURCE_GROUP" --name "$NGINX_VM" --port 443 --priority 1002 --output none || true

NGINX_PRIVATE_IP=$(az vm show -d -g "$RESOURCE_GROUP" -n "$NGINX_VM" --query privateIps -o tsv)
[[ -n "$NGINX_PRIVATE_IP" ]] || die "Could not resolve nginx private IP"

log "Allowing backend port $BACKEND_PORT from nginx ($NGINX_PRIVATE_IP) only on '$BACKEND_VM'..."
BACKEND_NSG=$(az vm show -g "$RESOURCE_GROUP" -n "$BACKEND_VM" \
  --query "networkProfile.networkInterfaces[0].id" -o tsv \
  | xargs -I{} az network nic show --ids {} --query "networkSecurityGroup.id" -o tsv)

if [[ -z "$BACKEND_NSG" ]]; then
  # Fallback: NSG named after the VM (default az vm create behaviour)
  BACKEND_NSG=$(az network nsg show -g "$RESOURCE_GROUP" -n "${BACKEND_VM}NSG" --query id -o tsv 2>/dev/null || true)
fi
[[ -n "$BACKEND_NSG" ]] || die "Could not locate NSG for $BACKEND_VM"

BACKEND_NSG_NAME="$(basename "$BACKEND_NSG")"

# If a prior run created a broader rule, drop it so we end up with the stricter one.
az network nsg rule delete \
  --resource-group "$RESOURCE_GROUP" \
  --nsg-name "$BACKEND_NSG_NAME" \
  --name "allow-backend-from-vnet" \
  --output none 2>/dev/null || true

az network nsg rule create \
  --resource-group "$RESOURCE_GROUP" \
  --nsg-name "$BACKEND_NSG_NAME" \
  --name "allow-backend-from-nginx" \
  --priority 1100 \
  --source-address-prefixes "$NGINX_PRIVATE_IP" \
  --destination-port-ranges "$BACKEND_PORT" \
  --access Allow --protocol Tcp --direction Inbound \
  --output none 2>/dev/null || \
az network nsg rule update \
  --resource-group "$RESOURCE_GROUP" \
  --nsg-name "$BACKEND_NSG_NAME" \
  --name "allow-backend-from-nginx" \
  --source-address-prefixes "$NGINX_PRIVATE_IP" \
  --destination-port-ranges "$BACKEND_PORT" \
  --output none

# ---------- IP lookup ----------
log "Fetching IP addresses..."
NGINX_IP=$(az vm show -d -g "$RESOURCE_GROUP" -n "$NGINX_VM"   --query publicIps  -o tsv)
BACKEND_IP=$(az vm show -d -g "$RESOURCE_GROUP" -n "$BACKEND_VM" --query publicIps  -o tsv)
BACKEND_PRIVATE_IP=$(az vm show -d -g "$RESOURCE_GROUP" -n "$BACKEND_VM" --query privateIps -o tsv)

log "  nginx   public IP:  $NGINX_IP"
log "  backend public IP:  $BACKEND_IP"
log "  backend private IP: $BACKEND_PRIVATE_IP"

# ---------- Provision VMs over SSH ----------
SSH_OPTS=(-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=30 -i "$SSH_KEY_PATH")

wait_for_ssh() {
  local host="$1"
  log "Waiting for SSH on $host..."
  for _ in $(seq 1 30); do
    if ssh "${SSH_OPTS[@]}" "$ADMIN_USER@$host" 'true' 2>/dev/null; then
      return 0
    fi
    sleep 5
  done
  die "SSH never came up on $host"
}

provision() {
  local host="$1" label="$2"
  wait_for_ssh "$host"
  log "Provisioning $label ($host): base packages + Docker..."
  ssh "${SSH_OPTS[@]}" "$ADMIN_USER@$host" 'bash -s' <<'REMOTE'
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

provision "$NGINX_IP"   "nginx VM"
provision "$BACKEND_IP" "backend VM"

# ---------- GitHub secrets ----------
log "Setting GitHub secrets on $GITHUB_REPO..."
set_secret() {
  # NB: `--body -` would literally store the string "-"; omit --body so gh
  # reads the value from stdin instead.
  printf '%s' "$2" | gh secret set "$1" -R "$GITHUB_REPO"
}

set_secret SSH_USER            "$ADMIN_USER"
set_secret SSH_HOST_NGINX      "$NGINX_IP"
set_secret SSH_HOST_BACKEND    "$BACKEND_IP"
set_secret BACKEND_PRIVATE_IP  "$BACKEND_PRIVATE_IP"
gh secret set SSH_PRIVATE_KEY -R "$GITHUB_REPO" < "$SSH_KEY_PATH"

log "Setting deploy-mode variable to 'two-vms' on $GITHUB_REPO..."
gh variable set DEPLOY_MODE --body "two-vms" -R "$GITHUB_REPO"

log "Done."
cat <<SUMMARY

Two-VM deployment provisioned:
  Resource group:     $RESOURCE_GROUP
  nginx VM:           $NGINX_IP   (ports 80/443 open)
  backend VM:         $BACKEND_IP (port $BACKEND_PORT open from VNet only)
  backend private IP: $BACKEND_PRIVATE_IP

GitHub secrets set on $GITHUB_REPO:
  SSH_USER, SSH_HOST_NGINX, SSH_HOST_BACKEND,
  BACKEND_PRIVATE_IP, SSH_PRIVATE_KEY

Push to master to trigger the deploy pipeline.
SUMMARY
