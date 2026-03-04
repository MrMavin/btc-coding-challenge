#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TERRAFORM_DIR="$PROJECT_ROOT/packages/terraform"

# Source .env for AWS credentials
if [ -f "$PROJECT_ROOT/.env" ]; then
  set -a
  source "$PROJECT_ROOT/.env"
  set +a
else
  echo "Error: No .env file found. Copy .env.example to .env and fill in your AWS credentials."
  exit 1
fi

# Pass COINSTATS_API_KEY from .env to Terraform if set
EXTRA_VARS=()
if [ -n "${COINSTATS_API_KEY:-}" ]; then
  EXTRA_VARS+=(-var "coinstats_api_key=${COINSTATS_API_KEY}")
fi

terraform -chdir="$TERRAFORM_DIR" "$@" "${EXTRA_VARS[@]}"
