#!/usr/bin/env bash
set -euo pipefail

# Deletes the entire resource group used by the cookbook deployment.
# This is destructive and irreversible — requires explicit confirmation.

RESOURCE_GROUP="${RESOURCE_GROUP:-rg-balladebaderne}"

log() { printf '\n\033[1;34m[teardown]\033[0m %s\n' "$*"; }
die() { printf '\n\033[1;31m[error]\033[0m %s\n' "$*" >&2; exit 1; }

command -v az >/dev/null || die "Azure CLI (az) not installed."
az account show >/dev/null 2>&1 || die "Not logged in to Azure. Run 'az login' first."

if ! az group show --name "$RESOURCE_GROUP" >/dev/null 2>&1; then
  log "Resource group '$RESOURCE_GROUP' does not exist. Nothing to do."
  exit 0
fi

log "About to DELETE resource group '$RESOURCE_GROUP' and everything in it:"
az resource list -g "$RESOURCE_GROUP" --query "[].{name:name,type:type}" -o table || true

read -rp $'\nType the resource group name to confirm: ' confirm
[[ "$confirm" == "$RESOURCE_GROUP" ]] || die "Confirmation did not match. Aborting."

log "Deleting..."
az group delete --name "$RESOURCE_GROUP" --yes --no-wait
log "Delete submitted. Azure will finish in the background."
