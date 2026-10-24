#!/usr/bin/env bash
set -euo pipefail
cd /opt/apps/dear-december/deploy
if [[ "${DEPLOY_LOCK_HELD:-0}" != 1 ]]; then
 exec 8>/opt/apps/dear-december/deploy.lock
 flock -n 8 || exit 0
fi
exec 9>/opt/apps/dear-december/backup.lock
flock -n 9 || exit 0
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
image="$(docker inspect dear-december --format '{{.Config.Image}}')"
# Stop the application to obtain a database+media snapshot without racing deletions.
docker compose stop -t 30
cleanup(){
 docker run --rm --network none --user root -v dear_december_data:/data --entrypoint rm "$image" -rf "/data/backups/$stamp" >/dev/null 2>&1 || true
 docker compose start >/dev/null
}
trap cleanup EXIT
docker run --rm --network none --user node -v dear_december_data:/data -v /opt/apps/dear-december/deploy/backup.mjs:/app/backup.mjs:ro "$image" node /app/backup.mjs "/data/backups/$stamp"
mkdir -p /opt/apps/dear-december/backups
chmod 700 /opt/apps/dear-december/backups
# Copy the completed snapshot out of the live volume, then remove its staging copy.
docker run --rm --network none --user root -v dear_december_data:/data -v /opt/apps/dear-december/backups:/backups --entrypoint sh "$image" -c "umask 077; tar -C /data/backups -czf /backups/$stamp.tar.gz '$stamp' && rm -rf '/data/backups/$stamp' && chmod 600 '/backups/$stamp.tar.gz'"
find /opt/apps/dear-december/backups -name '*.tar.gz' -mmin +43140 -delete
