#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TERRAFORM_DIR="$PROJECT_ROOT/packages/terraform"
ENV_LOCAL="$PROJECT_ROOT/packages/nextjs/.env.local"

# Source .env for AWS credentials
if [ -f "$PROJECT_ROOT/.env" ]; then
  set -a
  source "$PROJECT_ROOT/.env"
  set +a
else
  echo "Error: No .env file found. Copy .env.example to .env and fill in your AWS credentials."
  exit 1
fi

echo "Reading Terraform outputs..."
API_URL=$(terraform -chdir="$TERRAFORM_DIR" output -raw api_gateway_invoke_url)
WS_URL=$(terraform -chdir="$TERRAFORM_DIR" output -raw websocket_api_url)
FRONTEND_URL=$(terraform -chdir="$TERRAFORM_DIR" output -raw frontend_website_url)

echo "Writing $ENV_LOCAL..."
cat > "$ENV_LOCAL" <<EOF
NEXT_PUBLIC_API_BASE_URL=$API_URL
NEXT_PUBLIC_WS_URL=$WS_URL
NEXT_PUBLIC_FRONTEND_URL=$FRONTEND_URL
EOF

echo "Frontend environment configured:"
cat "$ENV_LOCAL"
