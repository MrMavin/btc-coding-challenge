#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TERRAFORM_DIR="$PROJECT_ROOT/packages/terraform"
NEXTJS_DIR="$PROJECT_ROOT/packages/nextjs"

# Source .env for AWS credentials
if [ -f "$PROJECT_ROOT/.env" ]; then
  set -a
  source "$PROJECT_ROOT/.env"
  set +a
else
  echo "Error: No .env file found. Copy .env.example to .env and fill in your AWS credentials."
  exit 1
fi

# Auto-run setup if .env.local doesn't exist
if [ ! -f "$NEXTJS_DIR/.env.local" ]; then
  echo "No .env.local found — running setup-frontend.sh first..."
  "$SCRIPT_DIR/setup-frontend.sh"
fi

echo "Building frontend..."
cd "$NEXTJS_DIR"
pnpm install
pnpm build

echo "Reading Terraform outputs..."
BUCKET_NAME=$(terraform -chdir="$TERRAFORM_DIR" output -raw frontend_bucket_name)

echo "Syncing $NEXTJS_DIR/out to s3://$BUCKET_NAME..."
aws s3 sync "$NEXTJS_DIR/out" "s3://$BUCKET_NAME" --delete

WEBSITE_URL=$(terraform -chdir="$TERRAFORM_DIR" output -raw frontend_website_url)
echo ""
echo "Frontend deployed successfully."
echo "Visit: $WEBSITE_URL"
