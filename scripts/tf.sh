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

terraform -chdir="$TERRAFORM_DIR" "$@"
