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

if [ "${RUN_PRISMA_SEED_ON_BOOT:-false}" != "true" ]; then
  echo "[entrypoint] Checking if database seed is required..."
  if node - <<'NODE'
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const count = await prisma.user.count();
    await prisma.$disconnect();
    process.exit(count === 0 ? 0 : 1);
  } catch (err) {
    console.error('[entrypoint] Seed check failed', err);
    await prisma.$disconnect();
    process.exit(2);
  }
})();
NODE
  then
    echo "[entrypoint] Running prisma db seed..."
    if ! npx prisma db seed; then
      echo "[entrypoint] Prisma seed failed" >&2
    fi
  else
    echo "[entrypoint] Seed skipped (users already exist or check failed)"
  fi
fi

echo "I entered this here to test git"
echo "[entrypoint] Starting application: $*"
exec "$@"
