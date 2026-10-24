#!/usr/bin/env bash
set -euo pipefail
VM_HOST="${VM_HOST:-root@165.227.2.163}"
APP_DIR="${APP_DIR:-/opt/apps/dear-december}"
APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
[[ "$APP_DIR" =~ ^/[A-Za-z0-9/_-]+$ ]] || { echo "Invalid app directory"; exit 1; }
cd "$APP_ROOT"
npm run build
RELEASE="$(date -u +%Y%m%dT%H%M%SZ)-$(git rev-parse --short HEAD)"
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT
mkdir -p "$STAGE/server"
cp package.json package-lock.json "$STAGE/"
cp deploy/Dockerfile "$STAGE/Dockerfile"
rsync -a dist/ "$STAGE/dist/"
rsync -a --exclude='dev.mjs' --exclude='db-schema.mjs' server/ "$STAGE/server/"
ssh -o BatchMode=yes "$VM_HOST" "mkdir -p '$APP_DIR/releases/$RELEASE' '$APP_DIR/deploy' '$APP_DIR/backups'"
rsync -az "$STAGE/" "$VM_HOST:$APP_DIR/releases/$RELEASE/"
rsync -az deploy/compose.yml deploy/backup.mjs deploy/backup.sh "$VM_HOST:$APP_DIR/deploy/"
ssh -o BatchMode=yes "$VM_HOST" bash -s -- "$APP_DIR" "$RELEASE" <<'REMOTE'
set -euo pipefail
app_dir="$1";release="$2"
cd "$app_dir/deploy"
test -s .env || { echo "Configure $app_dir/deploy/.env first"; exit 1; }
exec 9>"$app_dir/deploy.lock"
flock -n 9 || { echo "Another deployment is running"; exit 1; }
old_image="$(docker inspect dear-december --format '{{.Config.Image}}' 2>/dev/null || true)"
if [[ -n "$old_image" ]]; then bash backup.sh; fi
docker build --memory=384m --memory-swap=768m -t "dear-december:$release" "$app_dir/releases/$release"
if ! DEAR_DECEMBER_IMAGE="dear-december:$release" docker compose up -d --wait --wait-timeout 120; then
 if [[ -n "$old_image" ]]; then DEAR_DECEMBER_IMAGE="$old_image" docker compose up -d --wait --wait-timeout 120; fi
 exit 1
fi
sed -i '/^DEAR_DECEMBER_IMAGE=/d' .env
printf '%s\n' "DEAR_DECEMBER_IMAGE=dear-december:$release" >> .env
ln -sfn "$app_dir/releases/$release" "$app_dir/current"
docker compose ps
REMOTE
echo "Deployed Dear December: https://deardecember.mteschke.com"
