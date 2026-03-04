#!/usr/bin/env bash
set -uo pipefail

# ── Color helpers ───────────────────────────────────────────────
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASS=0
FAIL=0
WARN=0
TOTAL=0

pass() {
  echo -e "  ${GREEN}✔${NC} $1"
  PASS=$((PASS + 1))
  TOTAL=$((TOTAL + 1))
}

fail() {
  echo -e "  ${RED}✘${NC} $1"
  FAIL=$((FAIL + 1))
  TOTAL=$((TOTAL + 1))
}

warn() {
  echo -e "  ${YELLOW}⚠${NC} $1"
  WARN=$((WARN + 1))
}

# ── Project root ────────────────────────────────────────────────
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo ""
echo "Checking prerequisites..."
echo ""

# ── 1. OS Detection ────────────────────────────────────────────
OS="$(uname -s)"
case "$OS" in
  Darwin|Linux)
    pass "OS detected: $OS"
    ;;
  *)
    fail "Unsupported OS: $OS (only macOS and Linux are supported)"
    echo ""
    echo -e "${RED}Cannot continue on unsupported OS.${NC}"
    exit 1
    ;;
esac

# ── 2. .env file exists ────────────────────────────────────────
if [ -f "$PROJECT_ROOT/.env" ]; then
  pass ".env file exists"
else
  fail ".env file not found — copy .env.example to .env and fill in your credentials"
fi

# ── 3. AWS credentials populated ───────────────────────────────
if [ -f "$PROJECT_ROOT/.env" ]; then
  set -a
  source "$PROJECT_ROOT/.env"
  set +a

  ENV_OK=true
  for var in AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_REGION; do
    if [ -z "${!var:-}" ]; then
      ENV_OK=false
    fi
  done

  if [ "$ENV_OK" = true ]; then
    pass "AWS credentials populated in .env (region: ${AWS_REGION})"
  else
    fail "AWS credentials incomplete — ensure AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_REGION are set in .env"
  fi
else
  fail "AWS credentials — skipped (.env missing)"
fi

# ── 4. AWS CLI installed ───────────────────────────────────────
if command -v aws &>/dev/null; then
  AWS_VER="$(aws --version 2>&1 | awk '{print $1}')"
  pass "AWS CLI installed ($AWS_VER)"
else
  fail "AWS CLI not installed — https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
fi

# ── 5. AWS credentials valid ───────────────────────────────────
if command -v aws &>/dev/null && [ -n "${AWS_ACCESS_KEY_ID:-}" ]; then
  if CALLER_IDENTITY="$(aws sts get-caller-identity --output json 2>&1)"; then
    CALLER_ARN="$(echo "$CALLER_IDENTITY" | grep '"Arn"' | sed 's/.*"Arn": "\(.*\)".*/\1/')"
    pass "AWS credentials valid (${CALLER_ARN})"
  else
    fail "AWS credentials invalid — sts get-caller-identity failed"
    CALLER_ARN=""
  fi
else
  fail "AWS credentials validation — skipped (AWS CLI or credentials missing)"
  CALLER_ARN=""
fi

# ── 6. AWS admin permissions ───────────────────────────────────
if [ -n "${CALLER_ARN:-}" ]; then
  if echo "$CALLER_ARN" | grep -q ":root"; then
    warn "Running as root account — admin access assumed but IAM users are recommended"
  elif echo "$CALLER_ARN" | grep -q ":assumed-role/"; then
    warn "Running as assumed role — cannot verify AdministratorAccess policy directly"
  elif echo "$CALLER_ARN" | grep -q ":user/"; then
    USERNAME="$(echo "$CALLER_ARN" | sed 's|.*:user/||')"
    if POLICIES="$(aws iam list-attached-user-policies --user-name "$USERNAME" --output text 2>&1)"; then
      if echo "$POLICIES" | grep -q "AdministratorAccess"; then
        pass "IAM user '$USERNAME' has AdministratorAccess"
      else
        fail "IAM user '$USERNAME' does not have AdministratorAccess policy attached"
      fi
    else
      warn "Could not check policies for '$USERNAME' — ensure IAM permissions allow iam:ListAttachedUserPolicies"
    fi
  else
    warn "Unrecognized ARN format — cannot determine admin permissions"
  fi
else
  fail "AWS admin permissions — skipped (identity unknown)"
fi

# ── 7. Terraform installed ─────────────────────────────────────
if command -v terraform &>/dev/null; then
  TF_VER="$(terraform --version 2>&1 | head -1)"
  pass "Terraform installed ($TF_VER)"
else
  fail "Terraform not installed — https://developer.hashicorp.com/terraform/install"
fi

# ── 8. pnpm installed ──────────────────────────────────────────
if command -v pnpm &>/dev/null; then
  PNPM_VER="$(pnpm --version 2>&1)"
  pass "pnpm installed (v${PNPM_VER})"
else
  fail "pnpm not installed — https://pnpm.io/installation"
fi

# ── 9. Node.js installed ───────────────────────────────────────
if command -v node &>/dev/null; then
  NODE_VER="$(node --version 2>&1)"
  pass "Node.js installed (${NODE_VER})"
else
  fail "Node.js not installed — https://nodejs.org/"
fi

# ── 10. Python installed ─────────────────────────────────────
if command -v python3 &>/dev/null; then
  PY_VER="$(python3 --version 2>&1)"
  pass "Python installed ($PY_VER)"
else
  fail "Python 3 not installed — https://www.python.org/downloads/"
fi

# ── 11. zip installed ──────────────────────────────────────────
if command -v zip &>/dev/null; then
  ZIP_VER="$(zip --version 2>&1 | head -2 | tail -1 | xargs)"
  pass "zip installed ($ZIP_VER)"
else
  fail "zip not installed — install via your package manager"
fi

# ── Summary ─────────────────────────────────────────────────────
echo ""
echo "────────────────────────────────────"
if [ "$FAIL" -eq 0 ]; then
  echo -e "${GREEN}All checks passed: ${PASS}/${TOTAL}${NC}"
else
  echo -e "${RED}${PASS}/${TOTAL} checks passed, ${FAIL} failed${NC}"
fi
if [ "$WARN" -gt 0 ]; then
  echo -e "${YELLOW}${WARN} warning(s)${NC}"
fi
echo ""

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
