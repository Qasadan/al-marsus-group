#!/usr/bin/env bash
# ============================================================
# Al-Marsus Group Ltd — Vercel production build
# ------------------------------------------------------------
# Runs INSTEAD of `npm run build` on Vercel (see vercel.json).
# Why: the repo default schema is SQLite for local dev, while
# production runs PostgreSQL (Supabase). This script swaps in
# the PostgreSQL schema, pushes it to the database, generates
# the Prisma client, then runs a plain `next build` (the extra
# `cp` steps in package.json's build script are only needed for
# self-hosted standalone output, not on Vercel).
#
# Environment (set in Vercel → Project → Settings → Env Vars):
#   DATABASE_URL          pooled Postgres URL (runtime, pgbouncer)
#   DIRECT_DATABASE_URL   direct Postgres URL (optional, preferred for DDL)
#   RUN_DB_SEED=1         one-time: seed admin + defaults on first deploy
#   ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME   (required when RUN_DB_SEED=1)
#   IMPORT_CONTENT_FILE   optional path to a content snapshot JSON to import
# ============================================================
set -euo pipefail
cd "$(dirname "$0")/.."

echo "▶ Al-Marsus Group — production build (PostgreSQL)"
cp prisma/schema.deploy.prisma prisma/schema.prisma

PRISMA="npx --yes prisma"
if command -v bunx >/dev/null 2>&1; then
  PRISMA="bunx prisma"
fi

# TypeScript runner for seed/import scripts
run_ts() {
  if command -v bun >/dev/null 2>&1; then
    bun "$1"
  else
    npx --yes tsx "$1"
  fi
}

# --- 1. Schema push (direct URL preferred for DDL) ---------------------------
PUSH_URL="${DIRECT_DATABASE_URL:-${DATABASE_URL:?DATABASE_URL is required}}"
echo "▶ prisma db push → ${DIRECT_DATABASE_URL:+(direct connection)}"
DATABASE_URL="$PUSH_URL" $PRISMA db push --skip-generate

# --- 2. Client generation -----------------------------------------------------
$PRISMA generate

# --- 3. One-time seed (first deploy only) --------------------------------------
if [ "${RUN_DB_SEED:-0}" = "1" ]; then
  echo "▶ Seeding database (RUN_DB_SEED=1 — remove this env var after first deploy)"
  DATABASE_URL="$PUSH_URL" NODE_ENV=production \
    ADMIN_EMAIL="${ADMIN_EMAIL:?ADMIN_EMAIL required when RUN_DB_SEED=1}" \
    ADMIN_PASSWORD="${ADMIN_PASSWORD:?ADMIN_PASSWORD required when RUN_DB_SEED=1}" \
    ADMIN_NAME="${ADMIN_NAME:-Super Admin}" \
    run_ts prisma/seed.ts
fi

# --- 4. Optional content snapshot import (website copy migration) -------------
if [ -n "${IMPORT_CONTENT_FILE:-}" ] && [ -f "$IMPORT_CONTENT_FILE" ]; then
  echo "▶ Importing content snapshot: $IMPORT_CONTENT_FILE"
  TARGET_DATABASE_URL="$PUSH_URL" run_ts scripts/import-content.ts "$IMPORT_CONTENT_FILE"
fi

# --- 5. Next.js build -----------------------------------------------------------
if command -v bun >/dev/null 2>&1; then
  bun run build:next
else
  npx --yes next build
fi
