#!/usr/bin/env bash
set -euo pipefail

echo "[dev] Bringing up OCR service (docker compose up -d)"
if command -v docker >/dev/null 2>&1; then
  docker compose up -d
else
  echo "[dev] Docker not found. Skipping OCR container."
fi

echo "[dev] Starting API and Admin UI (Ctrl+C to stop)"

# Run API and UI concurrently; ensure children get killed on exit
cleanup() {
  echo "[dev] Shutting down..."
  jobs -p | xargs -r kill || true
}
trap cleanup EXIT INT TERM

(
  echo "[dev] API: npm run start:dev"
  npm run start:dev
) &

(
  echo "[dev] UI: (cd admin-ui && npm run dev)"
  cd admin-ui && npm run dev
) &

wait

