#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_COMPOSE_FILE="${BACKEND_COMPOSE_FILE:-$SCRIPT_DIR/backend-blue-green.yml}"
ACTIVE_ENV_FILE="${ACTIVE_ENV_FILE:-$SCRIPT_DIR/active-color.env}"
HEALTH_RETRIES="${HEALTH_RETRIES:-30}"
HEALTH_SLEEP_SECONDS="${HEALTH_SLEEP_SECONDS:-2}"

requested_target_color="${TARGET_COLOR:-}"
requested_backend_image_tag="${BACKEND_IMAGE_TAG:-}"
requested_frontend_image_tag="${FRONTEND_IMAGE_TAG:-}"
requested_backend_private_ip="${BACKEND_PRIVATE_IP:-}"

if [[ -f "$ACTIVE_ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ACTIVE_ENV_FILE"
  set +a
fi

GITHUB_OWNER="${GITHUB_OWNER:?GITHUB_OWNER is required}"
GITHUB_OWNER="$(printf "%s" "$GITHUB_OWNER" | tr '[:upper:]' '[:lower:]')"
BACKEND_IMAGE_TAG="${requested_backend_image_tag:-${BACKEND_IMAGE_TAG:-latest}}"
FRONTEND_IMAGE_TAG="${requested_frontend_image_tag:-${FRONTEND_IMAGE_TAG:-latest}}"
BACKEND_PRIVATE_IP="${requested_backend_private_ip:-${BACKEND_PRIVATE_IP:-}}"
TARGET_COLOR="${requested_target_color:-}"
ACTIVE_COLOR="${ACTIVE_COLOR:-blue}"

if [[ -z "$BACKEND_PRIVATE_IP" && -n "${BACKEND_HOST:-}" ]]; then
  BACKEND_PRIVATE_IP="${BACKEND_HOST%:*}"
fi
BACKEND_PRIVATE_IP="${BACKEND_PRIVATE_IP:-127.0.0.1}"

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
  docker compose -f "$BACKEND_COMPOSE_FILE" "$@"
}

health_check() {
  local color="$1"
  local port="$2"
  local container="cookbook-backend-$color"
  local health_url="http://127.0.0.1:$port/health"

  if command -v curl >/dev/null 2>&1 && curl -fsS --max-time 5 "$health_url" >/dev/null; then
    return 0
  fi

  local status
  status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{end}}' "$container" 2>/dev/null || true)"
  [[ "$status" == "healthy" ]]
}

validate_color "$ACTIVE_COLOR"
if [[ -n "$TARGET_COLOR" ]]; then
  validate_color "$TARGET_COLOR"
else
  TARGET_COLOR="$(opposite_color "$ACTIVE_COLOR")"
fi

TARGET_PORT="$(port_for_color "$TARGET_COLOR")"
TARGET_BACKEND_HOST="$BACKEND_PRIVATE_IP:$TARGET_PORT"
PREVIOUS_COLOR="$ACTIVE_COLOR"
BLUE_BACKEND_HOST="$BACKEND_PRIVATE_IP:3001"
GREEN_BACKEND_HOST="$BACKEND_PRIVATE_IP:3002"

export GITHUB_OWNER BACKEND_IMAGE_TAG
# JWT_SECRET is passed in via the CI deploy env (never written to active-color.env,
# which is world-readable and synced between VMs). The backend fails to boot in
# production if it is empty — see backend/src/services/users.js.
export JWT_SECRET="${JWT_SECRET:-}"
export DATABASE_URL="${DATABASE_URL:-}"
export POSTGRES_HOST="${POSTGRES_HOST:-}"
export POSTGRES_PORT="${POSTGRES_PORT:-5432}"
export POSTGRES_DB="${POSTGRES_DB:-}"
export POSTGRES_USER="${POSTGRES_USER:-}"
export POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-}"

echo "Deploying backend-$TARGET_COLOR with image tag $BACKEND_IMAGE_TAG"
compose pull "backend-$TARGET_COLOR"
compose up -d "backend-$TARGET_COLOR"

for attempt in $(seq 1 "$HEALTH_RETRIES"); do
  if health_check "$TARGET_COLOR" "$TARGET_PORT"; then
    tmp_file="$(mktemp "$ACTIVE_ENV_FILE.XXXXXX")"
    {
      printf "ACTIVE_COLOR=%s\n" "$TARGET_COLOR"
      printf "PREVIOUS_COLOR=%s\n" "$PREVIOUS_COLOR"
      printf "BACKEND_PRIVATE_IP=%s\n" "$BACKEND_PRIVATE_IP"
      printf "BACKEND_HOST=%s\n" "$TARGET_BACKEND_HOST"
      printf "BLUE_BACKEND_HOST=%s\n" "$BLUE_BACKEND_HOST"
      printf "GREEN_BACKEND_HOST=%s\n" "$GREEN_BACKEND_HOST"
      printf "BACKEND_IMAGE_TAG=%s\n" "$BACKEND_IMAGE_TAG"
      printf "FRONTEND_IMAGE_TAG=%s\n" "$FRONTEND_IMAGE_TAG"
      printf "UPDATED_AT=%s\n" "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
    } > "$tmp_file"
    mv "$tmp_file" "$ACTIVE_ENV_FILE"
    # Written under sudo (root). Hand ownership back to the SSH user (owner of
    # the deploy dir) so the CI sync/switch steps can scp this file both ways on
    # every deploy, not just the first. Contains no secrets.
    chown --reference="$SCRIPT_DIR" "$ACTIVE_ENV_FILE" 2>/dev/null || true
    chmod 0644 "$ACTIVE_ENV_FILE"
    echo "backend-$TARGET_COLOR is healthy on $TARGET_BACKEND_HOST"
    exit 0
  fi

  echo "Waiting for backend-$TARGET_COLOR health check ($attempt/$HEALTH_RETRIES)"
  sleep "$HEALTH_SLEEP_SECONDS"
done

echo "backend-$TARGET_COLOR failed health checks; active traffic remains on $ACTIVE_COLOR" >&2
exit 1
