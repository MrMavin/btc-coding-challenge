#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TERRAFORM_DIR="$PROJECT_ROOT/packages/terraform"
TFVARS_FILE="$TERRAFORM_DIR/terraform.tfvars"
FUNCTIONS=("price-updater" "api")

# Source .env for AWS credentials
if [ -f "$PROJECT_ROOT/.env" ]; then
  set -a
  source "$PROJECT_ROOT/.env"
  set +a
else
  echo "Error: No .env file found. Copy .env.example to .env and fill in your AWS credentials."
  exit 1
fi

get_bucket_name() {
  terraform -chdir="$TERRAFORM_DIR" output -raw lambda_artifacts_bucket_name
}

# Convert function name to tfvars key: price-updater -> price_updater_lambda_s3_key
tfvars_key() {
  echo "${1//-/_}_lambda_s3_key"
}

# List latest 5 versions for a function from S3
list_versions() {
  local func="$1"
  local bucket
  bucket=$(get_bucket_name)

  echo "Versions for $func (latest 5):"
  local versions
  versions=$(aws s3 ls "s3://$bucket/lambdas/$func/" 2>/dev/null \
    | awk '{print $2}' \
    | sed 's|/||' \
    | sort -V \
    | tail -5 || true)
  if [ -z "$versions" ]; then
    echo "  (none)"
  else
    echo "$versions" | sed 's/^/  /'
  fi
}

# Get the latest version from S3 for a function
latest_version() {
  local func="$1"
  local bucket
  bucket=$(get_bucket_name)

  aws s3 ls "s3://$bucket/lambdas/$func/" 2>/dev/null \
    | awk '{print $2}' \
    | sed 's|/||' \
    | sort -V \
    | tail -1 \
    || true
}

# Increment patch version: v0.0.1 -> v0.0.2
bump_version() {
  local version="$1"
  local prefix="${version%.*}"
  local patch="${version##*.}"
  echo "${prefix}.$((patch + 1))"
}

# Delete all versions except the latest 5 for a function
cleanup_old_versions() {
  local func="$1"
  local bucket
  bucket=$(get_bucket_name)

  local versions
  versions=$(aws s3 ls "s3://$bucket/lambdas/$func/" 2>/dev/null \
    | awk '{print $2}' \
    | sed 's|/||' \
    | sort -V)

  local count
  count=$(echo "$versions" | grep -c . || true)

  if [ "$count" -le 5 ]; then
    return
  fi

  local to_delete
  to_delete=$(echo "$versions" | head -n "$((count - 5))")

  for ver in $to_delete; do
    echo "  Deleting old version s3://$bucket/lambdas/$func/$ver/..."
    aws s3 rm "s3://$bucket/lambdas/$func/$ver/" --recursive --quiet
  done
}

# Update a single key in terraform.tfvars
update_tfvars() {
  local key="$1"
  local value="$2"

  if grep -q "^${key}" "$TFVARS_FILE"; then
    sed -i '' "s|^${key}.*|${key} = \"${value}\"|" "$TFVARS_FILE"
  else
    echo "${key} = \"${value}\"" >> "$TFVARS_FILE"
  fi
}

# Build: package, upload to S3, update tfvars
cmd_build() {
  local version="$1"
  local bucket
  bucket=$(get_bucket_name)

  for func in "${FUNCTIONS[@]}"; do
    local source_dir="$PROJECT_ROOT/packages/$func"
    if [ ! -d "$source_dir" ]; then
      echo "Skipping $func — $source_dir not found"
      continue
    fi

    local s3_key="lambdas/${func}/${version}/handler.zip"
    local zip_file="/tmp/${func}-${version}.zip"

    echo ""
    echo "=== Building $func ($version) ==="

    echo "  Packaging..."
    (cd "$source_dir" && zip -rq "$zip_file" . -x '*.pyc' '__pycache__/*' '.venv/*' 'tests/*' '.git/*')

    echo "  Uploading to s3://$bucket/$s3_key..."
    aws s3 cp "$zip_file" "s3://$bucket/$s3_key" --quiet

    echo "  Updating tfvars..."
    update_tfvars "$(tfvars_key "$func")" "$s3_key"

    rm -f "$zip_file"
    echo "  Done."
  done

  echo ""
  echo "Cleaning up old versions (keeping latest 5)..."
  for func in "${FUNCTIONS[@]}"; do
    cleanup_old_versions "$func"
  done

  echo ""
  echo "All lambdas built and uploaded as $version."
  echo "terraform.tfvars updated. Run 'pnpm tf:apply' to deploy."
}

# Update tfvars to point to an existing version (rollback or pin)
cmd_update() {
  local version="$1"
  local bucket
  bucket=$(get_bucket_name)

  for func in "${FUNCTIONS[@]}"; do
    local s3_key="lambdas/${func}/${version}/handler.zip"

    # Verify the version exists in S3
    if ! aws s3 ls "s3://$bucket/$s3_key" &>/dev/null; then
      echo "Error: s3://$bucket/$s3_key does not exist"
      exit 1
    fi

    echo "Setting $func -> $version"
    update_tfvars "$(tfvars_key "$func")" "$s3_key"
  done

  echo ""
  echo "terraform.tfvars updated to $version. Run 'pnpm tf:apply' to deploy."
}

# --- Main ---

usage() {
  cat <<EOF
Usage: $0 <command> [options]

Commands:
  build [version]     Build, upload to S3, and update tfvars
                      If no version given, auto-bumps from latest in S3
  update <version>    Update tfvars to point to an existing S3 version (rollback)
  list                List available versions in S3 for all functions

Examples:
  $0 build            # auto-bump: v0.0.1 -> v0.0.2
  $0 build v1.0.0     # build with explicit version
  $0 update v0.0.1    # rollback to v0.0.1
  $0 list             # show all deployed versions
EOF
}

COMMAND="${1:-}"
shift || true

case "$COMMAND" in
  build)
    VERSION="${1:-}"
    if [ -z "$VERSION" ]; then
      # Auto-bump from latest version of first function
      LATEST=$(latest_version "${FUNCTIONS[0]}")
      if [ -z "$LATEST" ]; then
        VERSION="v0.0.1"
      else
        VERSION=$(bump_version "$LATEST")
      fi
      echo "Auto-bumped version to $VERSION"
    fi
    cmd_build "$VERSION"
    ;;
  update)
    VERSION="${1:-}"
    if [ -z "$VERSION" ]; then
      VERSION=$(latest_version "${FUNCTIONS[0]}")
      if [ -z "$VERSION" ]; then
        echo "Error: no versions found in S3"
        exit 1
      fi
      echo "Using latest version: $VERSION"
    fi
    cmd_update "$VERSION"
    ;;
  list)
    BUCKET=$(get_bucket_name)
    for func in "${FUNCTIONS[@]}"; do
      list_versions "$func"
      echo ""
    done
    ;;
  *)
    usage
    exit 1
    ;;
esac
