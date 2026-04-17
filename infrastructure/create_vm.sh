#!/usr/bin/env bash
set -euo pipefail

# Provisions the single-VM cookbook deployment in Azure and wires up
# GitHub repo secrets so the CI/CD pipeline can SSH into the VM.
#
# Run interactively the first time:   bash infrastructure/create_vm.sh
# Safe to re-run: resource creation is idempotent; existing resources are reused.

RESOURCE_GROUP="${RESOURCE_GROUP:-rg-balladebaderne}"
LOCATION="${LOCATION:-francecentral}"

VM_NAME="${VM_NAME:-cookbook-vm}"
VM_SIZE="${VM_SIZE:-Standard_B1s}"
VM_IMAGE="Canonical:0001-com-ubuntu-server-jammy:22_04-lts:latest"
ADMIN_USER="${ADMIN_USER:-azureuser}"
SSH_PUB_KEY_PATH="${SSH_PUB_KEY_PATH:-$HOME/.ssh/id_rsa.pub}"
SSH_KEY_PATH="${SSH_KEY_PATH:-$HOME/.ssh/id_rsa}"

GITHUB_REPO="${GITHUB_REPO:-Balladebaderne/cookbook}"

APP_PORT=3000

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

# ---------- VM ----------
log "Creating VM '$VM_NAME'..."
if az vm show -g "$RESOURCE_GROUP" -n "$VM_NAME" >/dev/null 2>&1; then
  log "VM '$VM_NAME' already exists, skipping create."
else
  az vm create \
    --resource-group "$RESOURCE_GROUP" \
    --name "$VM_NAME" \
    --image "$VM_IMAGE" \
    --size "$VM_SIZE" \
    --admin-username "$ADMIN_USER" \
    --ssh-key-values "$SSH_PUB_KEY_PATH" \
    --public-ip-sku Standard \
    --output none
fi

# ---------- NSG rules ----------
log "Opening ports 80, 443, and $APP_PORT on '$VM_NAME'..."
az vm open-port --resource-group "$RESOURCE_GROUP" --name "$VM_NAME" --port 80        --priority 1001 --output none || true
az vm open-port --resource-group "$RESOURCE_GROUP" --name "$VM_NAME" --port 443       --priority 1002 --output none || true
az vm open-port --resource-group "$RESOURCE_GROUP" --name "$VM_NAME" --port "$APP_PORT" --priority 1003 --output none || true

# ---------- IP lookup ----------
log "Fetching IP address..."
VM_IP=$(az vm show -d -g "$RESOURCE_GROUP" -n "$VM_NAME" --query publicIps -o tsv)
log "  VM public IP: $VM_IP"

# ---------- Provision VM over SSH ----------
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

wait_for_ssh "$VM_IP"
log "Provisioning VM ($VM_IP): base packages + Docker..."
ssh "${SSH_OPTS[@]}" "$ADMIN_USER@$VM_IP" 'bash -s' <<'REMOTE'
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

# ---------- GitHub secrets ----------
log "Setting GitHub secrets on $GITHUB_REPO..."
set_secret() {
  # NB: `--body -` would literally store the string "-"; omit --body so gh
  # reads the value from stdin instead.
  printf '%s' "$2" | gh secret set "$1" -R "$GITHUB_REPO"
}

set_secret SSH_USER "$ADMIN_USER"
set_secret SSH_HOST "$VM_IP"
gh secret set SSH_PRIVATE_KEY -R "$GITHUB_REPO" < "$SSH_KEY_PATH"

log "Setting deploy-mode variable to 'single' on $GITHUB_REPO..."
gh variable set DEPLOY_MODE --body "single" -R "$GITHUB_REPO"

log "Done."
cat <<SUMMARY

Single-VM deployment provisioned:
  Resource group: $RESOURCE_GROUP
  VM:             $VM_NAME ($VM_IP)
  Open ports:     80, 443, $APP_PORT

GitHub secrets set on $GITHUB_REPO:
  SSH_USER, SSH_HOST, SSH_PRIVATE_KEY

Push to master to trigger the deploy pipeline.
SUMMARY
