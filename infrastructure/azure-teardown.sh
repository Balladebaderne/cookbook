#!/usr/bin/env bash
set -euo pipefail

# Tears down the cookbook Azure deployment.
#
# Deletes the VMs, NICs, OS disks, NSGs and the VNet individually — but
# DELIBERATELY KEEPS the static public IP ($PUBLIC_IP_NAME) so the report/demo
# link survives a teardown + re-provision cycle (create_three_vms.sh reuses it).
# Destructive and irreversible — requires explicit confirmation.

RESOURCE_GROUP="${RESOURCE_GROUP:-rg-balladebaderne}"
GITHUB_REPO="${GITHUB_REPO:-Balladebaderne/cookbook}"
PUBLIC_IP_NAME="${PUBLIC_IP_NAME:-cookbook-nginx-ip}"

log() { printf '\n\033[1;34m[teardown]\033[0m %s\n' "$*"; }
die() { printf '\n\033[1;31m[error]\033[0m %s\n' "$*" >&2; exit 1; }

command -v az >/dev/null || die "Azure CLI (az) not installed."
az account show >/dev/null 2>&1 || die "Not logged in to Azure. Run 'az login' first."
ACCOUNT_NAME=$(az account show --query name -o tsv)
SUBSCRIPTION_ID=$(az account show --query id -o tsv)

if ! az group show --name "$RESOURCE_GROUP" >/dev/null 2>&1; then
  log "Resource group '$RESOURCE_GROUP' does not exist in subscription '$ACCOUNT_NAME'. Nothing to do."
  exit 0
fi

log "About to DELETE the cookbook resources in '$RESOURCE_GROUP':"
log "  Subscription:    $ACCOUNT_NAME"
log "  Subscription ID: $SUBSCRIPTION_ID"
log "The static public IP '$PUBLIC_IP_NAME' will be PRESERVED (kept on purpose)."
log "Resources currently in the group:"
az resource list -g "$RESOURCE_GROUP" --query "[].{name:name,type:type}" -o table || true

read -rp $'\nType the resource group name to confirm: ' confirm
[[ "$confirm" == "$RESOURCE_GROUP" ]] || die "Confirmation did not match. Aborting."

# Delete resources one type at a time, in dependency order, so we can keep the
# public IP. We do NOT delete the whole resource group, because that would also
# remove the static public IP. Deleting the nginx NIC releases its association
# with the public IP, leaving the IP as a standalone resource for the next run.
delete_each() {
  local label="$1" list_cmd="$2" del_cmd="$3"
  local names
  names=$(eval "$list_cmd" 2>/dev/null || true)
  [[ -n "$names" ]] || { log "No $label to delete."; return 0; }
  while IFS= read -r name; do
    [[ -n "$name" ]] || continue
    log "Deleting $label: $name"
    eval "${del_cmd//\{\}/$name}" || true
  done <<< "$names"
}

# VMs first (frees disks/NICs), then NICs (frees the public IP + NSGs), then
# NSGs, then the VNet, then any leftover managed disks.
delete_each "virtual machine" \
  "az vm list -g '$RESOURCE_GROUP' --query '[].name' -o tsv" \
  "az vm delete -g '$RESOURCE_GROUP' -n '{}' --yes --output none"

delete_each "network interface" \
  "az network nic list -g '$RESOURCE_GROUP' --query '[].name' -o tsv" \
  "az network nic delete -g '$RESOURCE_GROUP' -n '{}' --output none"

delete_each "network security group" \
  "az network nsg list -g '$RESOURCE_GROUP' --query '[].name' -o tsv" \
  "az network nsg delete -g '$RESOURCE_GROUP' -n '{}' --output none"

delete_each "virtual network" \
  "az network vnet list -g '$RESOURCE_GROUP' --query '[].name' -o tsv" \
  "az network vnet delete -g '$RESOURCE_GROUP' -n '{}' --output none"

delete_each "managed disk" \
  "az disk list -g '$RESOURCE_GROUP' --query '[].name' -o tsv" \
  "az disk delete -g '$RESOURCE_GROUP' -n '{}' --yes --no-wait --output none"

log "Done. Preserved static public IP '$PUBLIC_IP_NAME' so the report link survives."

# ---------- Clear shared deploy state on GitHub ----------
# Best-effort: the teardown should still succeed even if gh isn't available.
# (No DEPLOY_OWNER anymore — the lock was removed; create re-syncs the rest.)
if command -v gh >/dev/null && gh auth status >/dev/null 2>&1; then
  log "Clearing repo deploy state on $GITHUB_REPO..."
  gh variable delete DEPLOY_MODE -R "$GITHUB_REPO" >/dev/null 2>&1 || true
  for secret in SSH_HOST SSH_HOST_NGINX SSH_HOST_BACKEND BACKEND_PRIVATE_IP DATABASE_PRIVATE_IP SSH_USER SSH_PRIVATE_KEY; do
    gh secret delete "$secret" -R "$GITHUB_REPO" >/dev/null 2>&1 || true
  done
  log "Cleared DEPLOY_MODE and deploy secrets."
else
  log "gh CLI not available or not logged in — skipping GitHub cleanup."
  log "Run this manually if needed so the next deploy starts clean:"
  log "  gh variable delete DEPLOY_MODE -R $GITHUB_REPO"
fi
