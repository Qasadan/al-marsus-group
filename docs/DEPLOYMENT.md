# Deployment Guide — Al-Marsus Group Ltd System

Production-oriented deployment instructions. Read `docs/PROJECT_STATUS.md` for current build state first.

---

## 1. Prerequisites

- Node.js 20+ (or Bun 1.2+) and Git
- A PostgreSQL database (Supabase, Neon, RDS, self-hosted…)
- A domain with DNS access
- A hosting target: Vercel (easiest) or any VPS with Node (reverse proxy via Caddy/Nginx)

## 2. Database: port to PostgreSQL & versioned migrations

The sandbox ships SQLite for portability. For production:

1. Provision a PostgreSQL database (Supabase → Settings → Database gives a connection string).
2. Update `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
3. Create versioned migrations (they become your portable, reviewable schema history):
   ```bash
   npx prisma migrate dev --name init
   ```
4. Deploy to production DB:
   ```bash
   npx prisma migrate deploy
   ```

> SQLite→PostgreSQL notes: the schema avoids SQLite-only types (no enums/JSON columns were used), so migration is a provider switch. All monetary values are integer cents — no type changes needed.

## 3. Environment variables (production)

Set on your host (never in Git):

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DB?schema=public"
JWT_SECRET="<openssl rand -base64 32>"
ADMIN_EMAIL="<real admin email>"
ADMIN_PASSWORD="<strong one-time password, min 8 chars>"
ADMIN_NAME="Super Admin"
NODE_ENV="production"
```

- The seed **refuses to run in production** without `ADMIN_EMAIL`/`ADMIN_PASSWORD` (no undocumented backdoor accounts).
- Never expose `JWT_SECRET` or DB credentials to the browser — all privileged code runs server-side.

- If `JWT_SECRET` is not injected, the bundled `start.sh` boot script auto-generates a random secret and persists it to `<db-dir>/.jwt-secret` (file permissions 0600) so the first deployment works without manual setup and sessions survive restarts. For serious deployments, still inject an explicit `JWT_SECRET` per the checklist below — an injected value always takes precedence.

## 4. Initial seed & first login

```bash
NODE_ENV=production npx prisma db seed   # or: bun prisma/seed.ts
```

Then:
1. Open `https://your-domain/login`, sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
2. **Change the password immediately** (top-right avatar menu → change password, or the API `POST /api/auth/change-password`).
3. Go to **Admin → Settings** and configure: company name/tagline, hero copy, about/mission/vision, services, email/phone/WhatsApp/address, currency, tax rate, document prefixes, quotation/invoice terms.
4. Create staff accounts (Admin → Staff) with least-privilege roles; each user changes their own password.
5. Enter real products/suppliers or import via CSV.

## 5. Frontend + API deployment

### Option A — Vercel (CLI-assisted — the path used for this project)

The repo ships full deployment tooling: `scripts/vercel-build.sh` (Vercel build
pipeline: swaps in the PostgreSQL schema, pushes it, seeds/imports content,
then runs `next build`), `scripts/deploy-db.sh` (one-shot DB provisioning from
the sandbox), and `scripts/export-content.ts` / `scripts/import-content.ts`
(website-copy migration). `vercel.json` wires the build command.

**What the operator must provide** (free-tier accounts, no credit card):

| # | Item | Where to get it | Used for |
|---|------|-----------------|----------|
| 1 | Supabase **pooled** connection string | Supabase → Settings → Database → Connection string → *Transaction pooler* URI, with `[YOUR-PASSWORD]` replaced by the DB password you set when creating the project | `DATABASE_URL` (app runtime) |
| 2 | Supabase **direct** connection string | Same page → *Direct connection* URI (port 5432), password filled in | `DIRECT_DATABASE_URL` (schema push) |
| 3 | Vercel **access token** | vercel.com → Account Settings → Tokens → Create (scope: Full Account, expiry ~1 day) | CLI deploy: project creation, env vars, `deploy --prod` |
| 4 | GitHub **personal access token** (classic, `repo` scope) — optional but recommended | github.com → Settings → Developer settings → PAT | Push repo → enables auto-deploy on every push |
| 5 | Real **admin email + strong password** (min 8 chars) | Your choice — this becomes the first SUPER_ADMIN login | Seed + first login; change password after |

> Security: tokens live only in the deployment session (CLI env), never in the
> repo or in `.env` files that get committed. Revoke/rotate them after setup.

**Deployment sequence** (executed by the assistant once credentials arrive):

```bash
# 0. (optional) GitHub: create private repo + push
git remote add origin https://<TOKEN>@github.com/<user>/al-marsus-group.git
git push -u origin main

# 1. Vercel: link project + create Blob store for future uploads
npx vercel link --yes --project al-marsus-group --token <TOKEN>
#    (connect a Blob store in dashboard → Storage, or via `vercel blob`)

# 2. Environment variables
npx vercel env add DATABASE_URL production --token <TOKEN>          # pooled URL
npx vercel env add DIRECT_DATABASE_URL production --token <TOKEN>   # direct URL
npx vercel env add JWT_SECRET production --token <TOKEN>            # openssl rand -base64 32

# 3. Provision DB from the sandbox (push + seed + import content)
bash scripts/export-content.ts                                # snapshot website copy
TARGET_DATABASE_URL=... DIRECT_DATABASE_URL=... ADMIN_EMAIL=... ADMIN_PASSWORD=... \
  CONTENT_FILE=content-snapshot.json bash scripts/deploy-db.sh

# 4. First deploy (one-time seed flag)
npx vercel deploy --prod --token <TOKEN>
#    (or set RUN_DB_SEED=1 + ADMIN_* env vars for the first build if the
#     sandbox cannot reach Supabase directly, then remove them)

# 5. Verify against the live URL
TEST_BASE_URL=https://<app>.vercel.app TEST_ADMIN_EMAIL=... TEST_ADMIN_PASSWORD=... \
  bun scripts/api-tests.ts
```

**Supabase connection notes:**
- Runtime `DATABASE_URL` must be the **pooled** (transaction, port 6543) URL
  and include `?pgbouncer=true` — serverless functions need PgBouncer; Prisma
  requires the flag to disable prepared statements.
- Schema push (`prisma db push`) prefers `DIRECT_DATABASE_URL` (port 5432).
- Sandbox → Supabase reachability is verified during step 3; if blocked, the
  Vercel build itself performs push + seed (steps 3–4 merge into one deploy).

**Existing hero/gallery images:** all files under `public/uploads/` are
committed to git and deploy as static assets, so their `/uploads/...` URLs in
the settings keep working unchanged. New uploads made in production go to
**Vercel Blob** automatically (`BLOB_READ_WRITE_TOKEN` detected at runtime —
see `src/app/api/uploads/route.ts`).

**Two data-migration paths — pick one:**
- **Content-only (recommended for launch):** `scripts/deploy-db.sh` provisions
  an empty production DB, seeds the real admin from env vars, and imports the
  website copy snapshot (`scripts/export-content.ts` → CompanySettings +
  gallery). Customers/products/test data stay behind — clean start.
- **Full data copy:** `scripts/migrate-sqlite-to-postgres.ts` clones every
  table from `db/custom.db` (ids, dates, admin password hash preserved —
  existing logins keep working). Use if existing quotations/customers must
  survive the move. See `DEPLOY-TO-VERCEL.md` for the DIY variant of this path.

### Option B — Vercel (dashboard-only fallback)

1. Push the repository to GitHub (or use `vercel deploy` without Git).
2. Import the repo in Vercel → framework auto-detects Next.js; `vercel.json`
   already points the build at `scripts/vercel-build.sh`.
3. Add all env vars from §3 in Project → Settings → Environment Variables
   (`DATABASE_URL`, `DIRECT_DATABASE_URL`, `JWT_SECRET`).
4. Deploy. The build pushes the schema to Supabase automatically.
5. Attach your domain (Project → Domains) — HTTPS certificates are automatic.

### Option C — VPS (Node)
```bash
git clone <your-repo> && cd <repo>
bun install                       # or npm ci
npx prisma migrate deploy
NODE_ENV=production npm run build # standalone output configured in next.config.ts
NODE_ENV=production npm start     # serves .next/standalone on $PORT (default 3000)
```
Run under a process manager (systemd example):

```ini
[Service]
WorkingDirectory=/srv/almarsus
Environment=NODE_ENV=production
EnvironmentFile=/srv/almarsus/.env
ExecStart=/usr/bin/bun .next/standalone/server.js
Restart=always
User=almarsus
```

Reverse proxy with Caddy (automatic HTTPS):

```caddyfile
almarsus.example.com {
    reverse_proxy 127.0.0.1:3000
}
```

## 6. Domain, HTTPS & security checklist

- [ ] DNS A/AAAA or CNAME record points to the host
- [ ] HTTPS live (Caddy auto or Vercel managed) — cookies are `Secure` in production
- [ ] `JWT_SECRET` is unique per environment and ≥32 random chars
- [ ] Admin password changed after first login
- [ ] Staff accounts use least-privilege roles (technicians see only assigned work)
- [ ] Database credentials restricted to the app host / Supabase RLS-style network rules
- [ ] Backups scheduled (§7)
- [ ] Optional: WAF / rate-limit proxy in front of public endpoints

## 7. Backups & restoration

### Backup (nightly cron on the DB host)
```bash
# PostgreSQL
pg_dump "$DATABASE_URL" | gzip > /backups/almarsus-$(date +%F).sql.gz
# keep 30 days
find /backups -name 'almarsus-*.sql.gz' -mtime +30 -delete
```
Also snapshot uploaded files (`public/uploads/`) — e.g. restic/rclone to object storage.

### Restore (verify quarterly!)
```bash
gunzip -c /backups/almarsus-2026-01-31.sql.gz | psql "$DATABASE_URL"
```
Then smoke-test: login works, dashboard numbers plausible, one quotation opens.

## 8. Post-deployment smoke tests

Run against the live domain:

```bash
BASE=https://your-domain bun scripts/api-tests.ts
```

The suite is read/write on a test customer (suffix-randomised) and validates the full workflow chain. For a lighter probe:

1. `GET /api/health` → `healthy`
2. Login with the real admin → dashboard loads with non-zero stats after data entry
3. Submit the public quote form → appears in Admin → Quote Requests
4. Create quotation → approve → convert → task list exists
5. Record a payment → invoice balance updates → CSV export downloads

## 9. Upgrades & maintenance

- Schema changes: edit `prisma/schema.prisma` → `npx prisma migrate dev --name <change>` → commit migration → `prisma migrate deploy` on prod.
- Keep dependencies patched: `npm audit` monthly; renovate/dependabot recommended.
- Monitor `AuditLog` and `Notification` tables for unexpected activity.
- The application never stores card/bank credentials; if adding payment-gateway integrations (M-Pesa, Stripe…), implement them server-side with provider webhooks and add tests before claiming support.
