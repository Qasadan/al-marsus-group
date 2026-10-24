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

### Option A — Vercel
1. Push the repository to GitHub.
2. Import the repo in Vercel → framework auto-detects Next.js.
3. Add all env vars from §3 in Project → Settings → Environment Variables.
4. Deploy. `next build` runs automatically.
5. Attach your domain (Project → Domains) — HTTPS certificates are automatic.

### Option B — VPS (Node)
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
