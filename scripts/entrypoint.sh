#!/usr/bin/env sh
set -eu

echo "[entrypoint] NODE_ENV=${NODE_ENV:-}"

if [ "${SKIP_PRISMA_GENERATE:-false}" != "true" ]; then
  echo "[entrypoint] Running prisma generate..."
  npx prisma generate 1>/dev/null
fi

if [ "${SKIP_PRISMA_MIGRATE:-false}" != "true" ]; then
  echo "[entrypoint] Applying database migrations..."
  npx prisma migrate deploy
else
  echo "[entrypoint] Skipping prisma migrate (SKIP_PRISMA_MIGRATE=true)"
fi

echo "[entrypoint] Starting application: $*"
exec "$@"

