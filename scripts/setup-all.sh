#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

step() {
  echo ""
  echo "════════════════════════════════════════════════════════"
  echo -e "  ${GREEN}▶${NC} $1"
  echo "════════════════════════════════════════════════════════"
  echo ""
}

fail() {
  echo -e "${RED}✘ $1${NC}"
  exit 1
}

# 1. Prerequisites check
step "Checking prerequisites"
"$SCRIPT_DIR/check-prerequisites.sh" || fail "Prerequisites check failed. Fix the issues above and re-run."

# 2. Terraform init
step "Terraform init"
"$SCRIPT_DIR/tf.sh" init

# 3. Build lambdas
step "Building lambdas"
"$SCRIPT_DIR/deploy-lambdas.sh" build

# 4. Terraform apply
step "Terraform apply"
"$SCRIPT_DIR/tf.sh" apply -auto-approve

# 5. Setup frontend env
step "Setting up frontend environment"
"$SCRIPT_DIR/setup-frontend.sh"

# 6. Deploy frontend
step "Deploying frontend"
"$SCRIPT_DIR/deploy-frontend.sh"

# 7. Run tests
step "Running tests"
cd "$(cd "$SCRIPT_DIR/.." && pwd)/packages/test"
uv run python test_api.py

echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✔ Setup complete!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
echo ""
