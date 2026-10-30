# 🚀 Deploy Al-Marsus to Vercel + Supabase (24/7, free)

> **Two ways to deploy — pick one:**
> - **Assisted (new, fastest):** you create the free accounts and send the assistant the
>   tokens/connection strings listed in `docs/DEPLOYMENT.md` §5 Option A — it runs the
>   whole deployment from the sandbox (`scripts/vercel-build.sh`, `scripts/deploy-db.sh`)
>   and verifies with the 73-assertion suite. No local install needed on your computer.
> - **DIY (this runbook):** you do every step yourself on your own computer from
>   `al-marsus-deploy-bundle.zip`. Same result.

Follow these steps **in order**. Total time: ~45–60 minutes. Everything below uses **free tiers**.
Your local sandbox copy stays exactly as it is — the deploy schema (`prisma/schema.deploy.prisma`) is separate from the local one.

**What you get:** a permanent URL like `almarsus-group.vercel.app` (or your own domain) that never sleeps, with your full admin system and all current data.

---

## Step 0 — What you need to create (all free)

| Account | Why | Link |
|---|---|---|
| Supabase | PostgreSQL database | https://supabase.com |
| GitHub | Source code hosting | https://github.com |
| Vercel | Website hosting | https://vercel.com |

Sign up with the same email everywhere to keep it simple. Vercel can log you in **with GitHub**.

---

## Step 1 — Get the code onto your computer

1. Download **`al-marsus-deploy-bundle.zip`** (from this chat's download panel) and **unzip it** — e.g. to `C:\almarsus`.
2. Install **Bun** (runs everything — replaces Node/npm):
   Open **PowerShell** and run:
   ```powershell
   powershell -c "irm bun.sh/install.ps1 | iex"
   ```
   Close and reopen PowerShell afterwards, then check:
   ```powershell
   bun --version
   ```
3. In PowerShell, go to the unzipped folder and install dependencies:
   ```powershell
   cd C:\almarsus
   bun install
   ```

---

## Step 2 — Create the Supabase database

1. Go to https://supabase.com → **Sign in** → **New project**.
2. Name: `almarsus` · Generate a **Database Password** and **save it** (you'll need it twice below) · Region: closest to your users (e.g. Frankfurt) · **Create**.
3. When ready, click **Connect** (top bar). You will see connection strings. You need **both**:
   - **Direct** one (port `5432`) — for the one-time setup/migration in Step 3.
   - **Transaction / Pooled** one (port `6543`) — for Vercel in Step 5.
   💡 If a **Prisma / ORM** tab is shown, copy exactly what it gives you — it includes the right parameters.
4. They look like:
   ```
   Direct:   postgresql://postgres:PASSWORD@db.xxxxxxxx.supabase.co:5432/postgres
   Pooled:   postgresql://postgres.xxxxxxxx:PASSWORD@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
   ```

---

## Step 3 — Create tables and copy your data (one-time, on your PC)

1. In the project folder, create a file named **`.env`** (no name before the dot). Paste:
   ```
   # For setup/migration — the DIRECT (5432) Supabase string:
   DATABASE_URL="postgresql://postgres:PASSWORD@db.xxxxxxxx.supabase.co:5432/postgres"
   ```
   (Replace with **your** Direct string from Step 2.)
2. Run these three commands, one at a time:
   ```powershell
   bunx prisma generate --schema=prisma/schema.deploy.prisma
   bunx prisma db push --schema=prisma/schema.deploy.prisma
   bun scripts/migrate-sqlite-to-postgres.ts
   ```
   - Command 1: generates the PostgreSQL client.
   - Command 2: creates all 24 tables in Supabase.
   - Command 3: copies **everything** — settings, hero images config, customers, gallery, users incl. your admin login — and verifies every table's row count.
3. Expected ending: `✓ Migration complete. Log in with your existing admin email & password.`
   > ⚠️ If command 3 says it can't reach the database, you pasted the **Pooled** (6543) string — use the **Direct** (5432) one in `.env` and run it again.

---

## Step 4 — Put the code on GitHub

1. Create a **Private** repository at https://github.com/new — name: `al-marsus-group` (do **not** tick any "initialize" boxes).
2. In PowerShell (still in `C:\almarsus`):
   ```powershell
   git init
   git add -A
   git commit -m "Al-Marsus Group Ltd — production deployment"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/al-marsus-group.git
   git push -u origin main
   ```
   (GitHub will open a browser window to authorize you the first time.)

---

## Step 5 — Deploy on Vercel

1. Go to https://vercel.com → **Sign in with GitHub**.
2. **Add New → Project** → **Import** the `al-marsus-group` repo.
3. Framework is auto-detected (Next.js). Before pressing Deploy, open **Environment Variables** and add:
   | Name | Value |
   |---|---|
   | `DATABASE_URL` | the **Pooled** (6543) Supabase string from Step 2 |
   | `JWT_SECRET` | any long random text (generate: see below) |
   
   Generate a strong secret in PowerShell:
   ```powershell
   -join ((1..48) | ForEach-Object { '{0:x2}' -f (Get-Random -Max 256) })
   ```
4. Open **Build and Output Settings** → override **Build Command** with:
   ```
   npx prisma generate --schema=prisma/schema.deploy.prisma && next build
   ```
   (This tells the build to use the PostgreSQL schema instead of the local SQLite one.)
5. Press **Deploy**. Wait ~2–3 minutes.
6. Open your new URL → the website should be live. Sign in at `/login` with your **existing admin email & password** (the login was migrated too).

---

## Step 6 — Make image uploads work (Vercel Blob, 2 minutes)

Vercel's servers can't store files on disk, so new uploads (hero images, gallery) go to Vercel Blob:

1. In your Vercel project → **Storage** tab → **Create Database → Blob** (name: `almarsus-media`).
2. When asked, **connect it to your project** → Vercel adds `BLOB_READ_WRITE_TOKEN` automatically.
3. **Redeploy** (Deployments tab → ⋯ → Redeploy) — the code already knows to use Blob when this token exists.
4. Test: log in → Admin → Settings → upload a hero image → it should appear and stay.

> Images that already exist (uploaded before deployment) ship **inside the bundle** and keep working as static files — nothing to redo.

---

## Step 7 — Verify everything (5 minutes)

| Check | Where | Expected |
|---|---|---|
| Site opens | `https://your-project.vercel.app` | Homepage with hero slider |
| Health check | `/api/health` | `{"status":"healthy",...}` |
| Admin login | `/login` | Your existing admin credentials work |
| Content | About / Divisions / Contact pages | Vision, Mission, Core Values, 4 divisions, Mogadishu/Baidoa/Barawe locations |
| Admin data | Admin → Dashboard | Same numbers as the sandbox |
| Uploads | Admin → Settings → hero image | New image uploads succeed |
| Quote form | `/quote` | Submit → appears in Admin → Quote Requests |

---

## Step 8 — Your own domain (optional)

You own `almarsus.ltd` (or any domain)? Vercel → Project → **Domains** → add it → Vercel shows the DNS records to set at your registrar. HTTPS is automatic.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `P1001: can't reach database` during Step 3 | You used the **Pooled** string — use **Direct** (5432) in `.env` |
| Login works locally but not on Vercel | `JWT_SECRET` missing/wrong on Vercel → set it → Redeploy |
| "JWT_SECRET must be set in production" | Same as above — it must be set **before** deploying |
| Image upload fails on Vercel | Blob store not connected (Step 6) → connect → **Redeploy** |
| Admin logs out unexpectedly | You changed `JWT_SECRET` after logging in → just log in again |
| Supabase database "paused" | Free projects pause after ~1 week without use → open the Supabase dashboard and **Restore**; consider the upgrade later |
| Vercel build fails on Prisma | Make sure the **Build Command** override from Step 5.4 is exactly right |

---

## What was changed in the project to make this possible

- `prisma/schema.deploy.prisma` — **new**: identical model set, PostgreSQL provider (local `schema.prisma` untouched).
- `src/app/api/uploads/route.ts` — **one guarded change**: uses Vercel Blob only when `BLOB_READ_WRITE_TOKEN` exists; local storage behavior is byte-identical otherwise.
- `scripts/migrate-sqlite-to-postgres.ts` — **new**: one-time data copy with verification.
- `package.json` — added `@vercel/blob` dependency.
- Everything else — untouched (73/73 E2E tests still pass, lint clean).

*Full operational reference (backups, VPS option, security checklist): `docs/DEPLOYMENT.md`.*
