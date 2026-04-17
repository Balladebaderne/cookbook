#!/usr/bin/env bash
set -euo pipefail

# Deletes the entire resource group used by the cookbook deployment.
# This is destructive and irreversible — requires explicit confirmation.

RESOURCE_GROUP="${RESOURCE_GROUP:-rg-balladebaderne}"
GITHUB_REPO="${GITHUB_REPO:-Balladebaderne/cookbook}"

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

log "About to DELETE resource group '$RESOURCE_GROUP' in:"
log "  Subscription:    $ACCOUNT_NAME"
log "  Subscription ID: $SUBSCRIPTION_ID"
log "Resources that will be removed:"
az resource list -g "$RESOURCE_GROUP" --query "[].{name:name,type:type}" -o table || true

read -rp $'\nType the resource group name to confirm: ' confirm
[[ "$confirm" == "$RESOURCE_GROUP" ]] || die "Confirmation did not match. Aborting."

log "Deleting..."
az group delete --name "$RESOURCE_GROUP" --yes --no-wait
log "Delete submitted. Azure will finish in the background."

# ---------- Clear shared deploy state on GitHub ----------
# Best-effort: the teardown should still succeed even if gh isn't available.
# This matters because leaving DEPLOY_OWNER / secrets behind blocks the next
# teammate from running create_*.sh cleanly.
if command -v gh >/dev/null && gh auth status >/dev/null 2>&1; then
  log "Clearing repo deploy state on $GITHUB_REPO..."
  for var in DEPLOY_OWNER DEPLOY_MODE; do
    gh variable delete "$var" -R "$GITHUB_REPO" >/dev/null 2>&1 || true
  done
  for secret in SSH_HOST SSH_HOST_NGINX SSH_HOST_BACKEND BACKEND_PRIVATE_IP SSH_USER SSH_PRIVATE_KEY; do
    gh secret delete "$secret" -R "$GITHUB_REPO" >/dev/null 2>&1 || true
  done
  log "Cleared DEPLOY_OWNER, DEPLOY_MODE, and deploy secrets."
else
  log "gh CLI not available or not logged in — skipping GitHub cleanup."
  log "Run this manually if needed so the next teammate can deploy:"
  log "  gh variable delete DEPLOY_OWNER DEPLOY_MODE -R $GITHUB_REPO"
fi
