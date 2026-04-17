#!/usr/bin/env bash
# Pre-push security gate for the cookbook repo.
# Runs: (1) forbidden-file check, (2) secret scan, (3) npm audit in backend + frontend.
# Exit non-zero on any failure. Do NOT bypass with --no-verify.

set -uo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || {
  echo "ERROR: must be run inside the git repo." >&2
  exit 2
}
cd "$REPO_ROOT"

FAIL=0
SELF_PATH="scripts/security-check.sh"

section() { printf '\n=== %s ===\n' "$1"; }
pass()    { printf '  OK   %s\n' "$1"; }
fail()    { printf '  FAIL %s\n' "$1"; FAIL=1; }

# ---------------------------------------------------------------------------
# 1. Forbidden-file check
# ---------------------------------------------------------------------------
section "Forbidden file check"

FORBIDDEN_REGEX='(^|/)(\.env(\..+)?|.+\.db|.+\.pem)$|(^|/)(node_modules|dist)(/|$)'

# Tracked files (what's actually pushed) + currently staged files.
TRACKED=$(git ls-files)
STAGED=$(git diff --cached --name-only)

OFFENDERS=$(printf '%s\n%s\n' "$TRACKED" "$STAGED" \
  | sort -u \
  | grep -E "$FORBIDDEN_REGEX" || true)

# Allow .env.example / .env.sample explicitly.
OFFENDERS=$(printf '%s\n' "$OFFENDERS" \
  | grep -vE '(^|/)\.env\.(example|sample|template)$' || true)

if [ -n "$OFFENDERS" ]; then
  fail "forbidden files tracked or staged:"
  printf '%s\n' "$OFFENDERS" | sed 's/^/       - /'
else
  pass "no forbidden files (.env, *.db, *.pem, node_modules/, dist/)"
fi

# ---------------------------------------------------------------------------
# 2. Secret scan
# ---------------------------------------------------------------------------
section "Secret scan"

# Patterns for common credentials. Deliberately conservative to limit false
# positives. Extend as needed.
PATTERNS=(
  'AKIA[0-9A-Z]{16}'                                 # AWS access key id
  '-----BEGIN ((RSA|DSA|EC|OPENSSH|PGP) )?PRIVATE KEY-----'  # private keys
  'ghp_[A-Za-z0-9]{36}'                              # GitHub PAT (classic)
  'github_pat_[A-Za-z0-9_]{82}'                      # GitHub PAT (fine-grained)
  'gh[osu]_[A-Za-z0-9]{36}'                          # GitHub OAuth/server/user tokens
  'xox[baprs]-[A-Za-z0-9-]{10,}'                     # Slack tokens
  'sk-[A-Za-z0-9]{32,}'                              # OpenAI / Anthropic-style keys
  'AIza[0-9A-Za-z_-]{35}'                            # Google API keys
)

# Build a single alternation for grep -E.
JOINED_PATTERN=$(IFS='|'; echo "${PATTERNS[*]}")

# Scan tracked text files only. Exclude this script (contains the patterns
# above) and the node_modules/dist folders (already banned, but cheap guard).
MATCHES=$(git ls-files -z \
  | grep -zvE "^($SELF_PATH|.*node_modules/.*|.*dist/.*)$" \
  | xargs -0 grep -InE "$JOINED_PATTERN" 2>/dev/null || true)

if [ -n "$MATCHES" ]; then
  fail "possible secrets detected:"
  printf '%s\n' "$MATCHES" | sed 's/^/       /'
else
  pass "no known secret patterns found in tracked files"
fi

# ---------------------------------------------------------------------------
# 3. npm audit (backend + frontend)
# ---------------------------------------------------------------------------
run_audit() {
  local dir="$1"
  if [ ! -f "$dir/package.json" ]; then
    pass "$dir: no package.json, skipping"
    return
  fi
  if [ ! -f "$dir/package-lock.json" ]; then
    fail "$dir: missing package-lock.json (npm audit needs it)"
    return
  fi
  ( cd "$dir" && npm audit --audit-level=high --omit=dev >/tmp/audit.$$ 2>&1 )
  local rc=$?
  if [ $rc -eq 0 ]; then
    pass "$dir: npm audit clean at level=high"
  else
    fail "$dir: npm audit found vulnerabilities at level=high"
    sed 's/^/       /' /tmp/audit.$$
  fi
  rm -f /tmp/audit.$$
}

section "npm audit: backend"
run_audit backend

section "npm audit: frontend"
run_audit frontend

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo
if [ $FAIL -ne 0 ]; then
  echo "Security check FAILED. Fix the issues above before pushing."
  exit 1
fi
echo "Security check PASSED."
exit 0
