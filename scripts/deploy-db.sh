#!/usr/bin/env bash
# ============================================================
# Al-Marsus Group Ltd — one-shot production DB provisioning
# ------------------------------------------------------------
# Provisions a PostgreSQL target (Supabase) from the sandbox:
#   1. swaps in the PostgreSQL Prisma schema + regenerates client
#   2. prisma db push (creates tables)
#   3. seeds admin + company settings (production-guarded)
#   4. optionally imports the website content snapshot
#   5. restores the SQLite schema + client for local dev (always)
#
# Usage:
#   TARGET_DATABASE_URL="postgresql://postgres.<ref>:<pw>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true" \
#   DIRECT_DATABASE_URL="postgresql://postgres:<pw>@db.<ref>.supabase.co:5432/postgres" \
#   ADMIN_EMAIL="admin@almarsusgroup.com" ADMIN_PASSWORD="********" ADMIN_NAME="Super Admin" \
#   CONTENT_FILE="content-snapshot.json" \
#   bash scripts/deploy-db.sh
#
# All env vars except TARGET_DATABASE_URL are optional (seed/content steps
# are skipped when their inputs are missing; SKIP_SEED=1 skips seeding).
# ============================================================
set -euo pipefail
cd "$(dirname "$0")/.."

: "${TARGET_DATABASE_URL:?Set TARGET_DATABASE_URL to the destination PostgreSQL URL}"
PUSH_URL="${DIRECT_DATABASE_URL:-$TARGET_DATABASE_URL}"

SCHEMA_BAK=$(mktemp)
cleanup() {
  # ALWAYS restore the local SQLite schema + client, even on failure.
  cp "$SCHEMA_BAK" prisma/schema.prisma
  rm -f "$SCHEMA_BAK"
  bunx prisma generate >/dev/null 2>&1 || npx --yes prisma generate >/dev/null 2>&1 || true
  echo "↩ Restored local SQLite schema + client"
}
trap cleanup EXIT

PRISMA="npx --yes prisma"
command -v bunx >/dev/null 2>&1 && PRISMA="bunx prisma"

run_ts() {
  if command -v bun >/dev/null 2>&1; then bun "$1"; else npx --yes tsx "$1"; fi
}

echo "▶ 1/4 Swapping in PostgreSQL schema + regenerating client"
cp "$SCHEMA_BAK" /dev/null 2>/dev/null || true
cp prisma/schema.prisma "$SCHEMA_BAK"
cp prisma/schema.deploy.prisma prisma/schema.prisma
$PRISMA generate

echo "▶ 2/4 Pushing schema to PostgreSQL (direct connection)"
DATABASE_URL="$PUSH_URL" $PRISMA db push --skip-generate

if [ "${SKIP_SEED:-0}" != "1" ]; then
  echo "▶ 3/4 Seeding admin + defaults (production mode)"
  if [ -z "${ADMIN_EMAIL:-}" ] || [ -z "${ADMIN_PASSWORD:-}" ]; then
    echo "⚠ ADMIN_EMAIL / ADMIN_PASSWORD not set — skipping seed (run again with credentials, or seed via Vercel build RUN_DB_SEED=1)"
  else
    DATABASE_URL="$PUSH_URL" NODE_ENV=production \
      ADMIN_EMAIL="$ADMIN_EMAIL" ADMIN_PASSWORD="$ADMIN_PASSWORD" \
      ADMIN_NAME="${ADMIN_NAME:-Super Admin}" \
      run_ts prisma/seed.ts
  fi
else
  echo "▶ 3/4 Seed skipped (SKIP_SEED=1)"
fi

if [ -n "${CONTENT_FILE:-}" ] && [ -f "$CONTENT_FILE" ]; then
  echo "▶ 4/4 Importing website content from $CONTENT_FILE"
  TARGET_DATABASE_URL="$PUSH_URL" run_ts scripts/import-content.ts "$CONTENT_FILE"
else
  echo "▶ 4/4 No CONTENT_FILE provided — content import skipped"
fi

echo "✔ Database provisioning complete."
