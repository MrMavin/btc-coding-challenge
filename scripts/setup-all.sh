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

# 3. Terraform apply (creates buckets and infra)
step "Terraform apply"
"$SCRIPT_DIR/tf.sh" apply -auto-approve

# 4. Build and upload lambdas
step "Building lambdas"
"$SCRIPT_DIR/deploy-lambdas.sh" build

# 5. Update lambdas to use uploaded code
step "Terraform apply (update lambda code)"
"$SCRIPT_DIR/tf.sh" apply -auto-approve

# 6. Setup frontend env
step "Setting up frontend environment"
"$SCRIPT_DIR/setup-frontend.sh"

# 7. Deploy frontend
step "Deploying frontend"
"$SCRIPT_DIR/deploy-frontend.sh"

# 8. Wait for lambdas to be ready
step "Waiting 30s for services to initialize"
sleep 30

# 9. Run tests
step "Running tests"
cd "$(cd "$SCRIPT_DIR/.." && pwd)/packages/test"
uv run python test_api.py

echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✔ Setup complete!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
echo ""
