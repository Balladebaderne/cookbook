#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NGINX_COMPOSE_FILE="${NGINX_COMPOSE_FILE:-$SCRIPT_DIR/nginx-blue-green.yml}"
ACTIVE_ENV_FILE="${ACTIVE_ENV_FILE:-$SCRIPT_DIR/active-color.env}"

requested_rollback_color="${ROLLBACK_COLOR:-}"
requested_frontend_image_tag="${FRONTEND_IMAGE_TAG:-}"
requested_backend_image_tag="${BACKEND_IMAGE_TAG:-}"
requested_backend_private_ip="${BACKEND_PRIVATE_IP:-}"

if [[ -f "$ACTIVE_ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ACTIVE_ENV_FILE"
  set +a
else
  echo "Missing active color file: $ACTIVE_ENV_FILE" >&2
  exit 1
fi

GITHUB_OWNER="${GITHUB_OWNER:?GITHUB_OWNER is required}"
GITHUB_OWNER="$(printf "%s" "$GITHUB_OWNER" | tr '[:upper:]' '[:lower:]')"
ACTIVE_COLOR="${ACTIVE_COLOR:-blue}"
PREVIOUS_COLOR="${PREVIOUS_COLOR:-}"
ROLLBACK_COLOR="${requested_rollback_color:-${PREVIOUS_COLOR:-}}"
BACKEND_IMAGE_TAG="${requested_backend_image_tag:-${BACKEND_IMAGE_TAG:-latest}}"
FRONTEND_IMAGE_TAG="${requested_frontend_image_tag:-${FRONTEND_IMAGE_TAG:-latest}}"
BACKEND_PRIVATE_IP="${requested_backend_private_ip:-${BACKEND_PRIVATE_IP:-}}"

if [[ -z "$BACKEND_PRIVATE_IP" && -n "${BACKEND_HOST:-}" ]]; then
  BACKEND_PRIVATE_IP="${BACKEND_HOST%:*}"
fi

validate_color() {
  case "$1" in
    blue|green) ;;
    *) echo "Invalid color '$1'. Expected blue or green." >&2; exit 2 ;;
  esac
}

opposite_color() {
  if [[ "$1" == "blue" ]]; then
    printf "green"
  else
    printf "blue"
  fi
}

port_for_color() {
  if [[ "$1" == "blue" ]]; then
    printf "3001"
  else
    printf "3002"
  fi
}

compose() {
  docker compose --env-file "$ACTIVE_ENV_FILE" -f "$NGINX_COMPOSE_FILE" "$@"
}

validate_color "$ACTIVE_COLOR"
if [[ -z "$ROLLBACK_COLOR" ]]; then
  ROLLBACK_COLOR="$(opposite_color "$ACTIVE_COLOR")"
fi
validate_color "$ROLLBACK_COLOR"

BACKEND_PRIVATE_IP="${BACKEND_PRIVATE_IP:?BACKEND_PRIVATE_IP is required}"
ROLLBACK_PORT="$(port_for_color "$ROLLBACK_COLOR")"
ROLLBACK_BACKEND_HOST="$BACKEND_PRIVATE_IP:$ROLLBACK_PORT"
BLUE_BACKEND_HOST="$BACKEND_PRIVATE_IP:3001"
GREEN_BACKEND_HOST="$BACKEND_PRIVATE_IP:3002"

tmp_file="$(mktemp "$ACTIVE_ENV_FILE.XXXXXX")"
{
  printf "ACTIVE_COLOR=%s\n" "$ROLLBACK_COLOR"
  printf "PREVIOUS_COLOR=%s\n" "$ACTIVE_COLOR"
  printf "BACKEND_PRIVATE_IP=%s\n" "$BACKEND_PRIVATE_IP"
  printf "BACKEND_HOST=%s\n" "$ROLLBACK_BACKEND_HOST"
  printf "BLUE_BACKEND_HOST=%s\n" "$BLUE_BACKEND_HOST"
  printf "GREEN_BACKEND_HOST=%s\n" "$GREEN_BACKEND_HOST"
  printf "BACKEND_IMAGE_TAG=%s\n" "$BACKEND_IMAGE_TAG"
  printf "FRONTEND_IMAGE_TAG=%s\n" "$FRONTEND_IMAGE_TAG"
  printf "UPDATED_AT=%s\n" "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
} > "$tmp_file"
mv "$tmp_file" "$ACTIVE_ENV_FILE"

export GITHUB_OWNER FRONTEND_IMAGE_TAG
compose up -d frontend
echo "Rolled nginx back to backend-$ROLLBACK_COLOR at $ROLLBACK_BACKEND_HOST"
