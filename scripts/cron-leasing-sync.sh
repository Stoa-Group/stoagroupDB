#!/usr/bin/env bash
# Run every 30 min: trigger sync-from-domo (async), wait 2 min, then rebuild snapshot. Keeps dashboard up to date.
# Usage: set API_BASE_URL and optionally LEASING_SYNC_WEBHOOK_SECRET (env or .env), then:
#   ./scripts/cron-leasing-sync.sh
# Crontab: */30 * * * * /path/to/stoagroupDB/scripts/cron-leasing-sync.sh

set -e
cd "$(dirname "$0")/.."

# Load .env if present
if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

API_BASE_URL="${API_BASE_URL:-}"
SECRET="${LEASING_SYNC_WEBHOOK_SECRET:-}"
WAIT_SEC="${LEASING_CRON_WAIT_AFTER_SYNC_MS:-120000}"
WAIT_SEC=$((WAIT_SEC / 1000))
if [ -z "$API_BASE_URL" ]; then
  echo "API_BASE_URL not set" >&2
  exit 1
fi

BASE="${API_BASE_URL%/}"
SYNC_URL="$BASE/api/leasing/sync-from-domo"
REBUILD_URL="$BASE/api/leasing/rebuild-snapshot"

echo "Triggering sync-from-domo (async)..."
if [ -n "$SECRET" ]; then
  curl -sS -X POST -H "Content-Type: application/json" -H "X-Sync-Secret: $SECRET" -m 90 "${SYNC_URL}?async=true" || true
else
  curl -sS -X POST -H "Content-Type: application/json" -m 90 "${SYNC_URL}?async=true" || true
fi

echo "Waiting ${WAIT_SEC}s for sync to finish..."
sleep "$WAIT_SEC"

echo "Rebuilding snapshot..."
if [ -n "$SECRET" ]; then
  curl -sS -X POST -H "Content-Type: application/json" -H "X-Sync-Secret: $SECRET" -m 180 "$REBUILD_URL" || exit 1
else
  curl -sS -X POST -H "Content-Type: application/json" -m 180 "$REBUILD_URL" || exit 1
fi
echo "Done."
