# Al-Marsus Group Ltd — Solar Business Management System

A complete, production-oriented website **and** business management system for Al-Marsus Group Ltd, a solar energy installation company. Public marketing website + full back office: customers, leads, surveys, quotations, projects, inventory, procurement, invoicing, payments, expenses, maintenance, service requests, reports and audit trail.

![Stack](https://img.shields.io/badge/Next.js-16-black) ![TS](https://img.shields.io/badge/TypeScript-5-blue) ![Prisma](https://img.shields.io/badge/Prisma-6-darkgreen) ![Tests](https://img.shields.io/badge/API%20tests-71%20passing-brightgreen)

---

## 1. Technology (as built)

| Layer | Requested | Delivered (sandbox) | Why |
|---|---|---|---|
| Frontend | React + Vite + React Router | **Next.js 16 (React 19) App Router** | The build environment mandates Next.js; it provides React + routing with the same component model |
| Styling | Tailwind CSS | **Tailwind CSS 4 + shadcn/ui** | Same |
| Backend | Node.js + Express | **Next.js API routes (Node runtime)** | Equivalent server layer, same REST endpoints (`/api/...`) |
| Database | Supabase PostgreSQL | **Prisma ORM + SQLite** (`db/custom.db`) | No Supabase instance/credentials exist in this sandbox. Prisma migrations are version-controlled and the schema ports to PostgreSQL by changing the datasource provider |
| Auth | Supabase Auth | **JWT sessions (jose) + bcryptjs, httpOnly cookies** with role-based access control (server-enforced) | Same capability, no external dependency |
| Storage | Supabase Storage | **Local uploads via authenticated API** (`/api/uploads`, `public/uploads`) | Swap to any S3-compatible bucket in production |
| Tests | Automated tests | **71-assertion end-to-end API workflow suite** (`scripts/api-tests.ts`) + ESLint | Runs against the live server |

All money is stored as **integer minor units (cents)** with an explicit **currency code per record** — no floating-point drift, no mixed currencies.

## 2. Branding

- Logo: client-supplied file at `public/images/logo.jpg` (interlocking chain symbol + white star, preserved as-is).
- Colors (centralized in `src/app/globals.css`):
  - Indigo `#34369B` — primary (`--brand-indigo`)
  - Green `#00A651` — accent (`--brand-green`)
  - White `#FFFFFF` — background
- No company address, phone, certifications, staff, testimonials or history are invented. All public-site copy lives in **Admin → Settings** and ships as clearly-marked placeholders.

## 3. Quick start

```bash
bun install                 # or npm install
cp .env.example .env        # set JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
bun run db:push             # create/update the database schema
bun prisma/seed.ts          # company settings + initial super admin (env-driven)
bun run dev                 # http://localhost:3000
```

Default dev credentials (created only when env vars are missing in non-production — **change immediately**):

```
email:    admin@almarsus.dev
password: AlMarsus#2026
```

## 4. Scripts

| Command | Purpose |
|---|---|
| `bun run dev` | Development server (port 3000) |
| `bun run lint` | ESLint (passes clean) |
| `bun run build` + `bun start` | Production build & serve (standalone) |
| `bun run db:push` | Apply `prisma/schema.prisma` to the database |
| `bun prisma/seed.ts` | Seed settings + admin (idempotent) |
| `bun scripts/api-tests.ts` | Run the 71-assertion E2E workflow suite against the running server |

## 5. Environment variables (`.env.example`)

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | yes | `file:./db/custom.db` (SQLite) or PostgreSQL URL after porting |
| `JWT_SECRET` | **yes in production** | ≥16 random chars. Session signing key — never commit |
| `ADMIN_EMAIL` | **yes in production** | Initial super admin email (seed refuses to run in production without it) |
| `ADMIN_PASSWORD` | **yes in production** | ≥8 chars. Used once by seed; user should change after first login |
| `ADMIN_NAME` | no | Display name for the initial admin |
| `SEED_DEMO_DATA` | no | `=1` seeds demo customers/products. **Dev environments only — seed refuses in production** |

## 6. Roles & permissions (server-enforced)

| Role | Access |
|---|---|
| `SUPER_ADMIN` | Everything, incl. staff accounts and company settings |
| `MANAGER` | All business modules, reports, audit log; no staff/settings administration |
| `TECHNICIAN` | Only projects they are assigned to (tasks, photos), their surveys and maintenance jobs |
| `CUSTOMER` | Portal only — their own projects, invoices, and service requests |

- Authorization runs in **every API route** (`requireAuth(permission)`) and every query is scoped by identity — a hidden button is never the security boundary.
- Middleware only redirects unauthenticated browsers for UX; the API layer is the enforcement point (verified by test section 18).
- Sessions are httpOnly, SameSite=Lax, signed JWTs, 7-day expiry.

## 7. Feature inventory

**Public website** — homepage (hero, services, portfolio preview), About, Services, Projects portfolio, Contact (DB-driven details, WhatsApp link), Request-a-Quote (validated, persisted, rate-limited 5/10min/IP + honeypot + spam heuristics), Privacy Policy, SEO metadata, responsive header/footer, sticky footer.

**Back office**
- Dashboard: live counts (customers, projects, leads, requests, low stock, service), revenue/expenses/outstanding computed from records.
- Customers: CRUD, search, filter, pagination, link-safe delete.
- Leads: pipeline statuses, follow-up dates, one-click conversion to customer.
- Quote Requests: review → convert to lead (carries form data).
- Site surveys: scheduling, roof/consumption data, technician assignment.
- Quotations: equipment/labor line items, catalog autofill, **server-calculated subtotal/discount/tax/total**, auto numbering (`QT-YYYY-NNNN`), send → approve/reject workflow, printable PDF via browser print.
- Projects: created from approved quotations in a **transaction with duplicate protection**, budgets, schedule, warranty, status workflow (validated transitions), members, tasks (auto progress %), site/installation/handover photos, commissioning checklist handover.
- Inventory: products (panels/batteries/inverters/cables/mounting), SKUs, reorder levels, **transactional stock ledger** (IN/OUT/RESERVE/RELEASE/ADJUSTMENT with balance snapshots), low-stock notifications.
- Procurement: suppliers, purchase orders with items, receiving writes stock + ledger atomically; over-receiving rejected.
- Finance: invoices (server-calculated), **payments with overpayment/duplicate protection and balance recompute in a transaction**, partial payments, expenses linked to projects/suppliers.
- Maintenance: warranty/routine/repair scheduling, technician assignment, findings/actions, warranty-covered flag.
- Service requests: priority workflow OPEN → ASSIGNED → IN_PROGRESS → RESOLVED → CLOSED.
- Reports: revenue/invoices/projects/expenses/inventory/maintenance with date/customer/status filters + **CSV export** (validated, audited).
- Notifications: low stock, payments, approvals, conversions, service requests.
- Audit log: who/what/when/IP for every significant action.
- Settings: company identity, website copy, contact/WhatsApp details, currency, tax rate, document prefixes, terms — **everything configurable, nothing hard-coded**.

## 8. Data integrity guarantees (tested)

- Quotation/invoice totals are **always recomputed server-side** from line items.
- Quotation → project conversion is **transactional + unique-constrained** — duplicates impossible (409 on second attempt).
- Stock movements update product balance and ledger **atomically**; negative balances rejected.
- PO receiving updates items, product balance and ledger in **one transaction**; over-receiving rejected.
- Payments recompute paid/outstanding inside a transaction; **overpayment (422)** and **duplicate payment on settled invoice (409)** rejected; invoice status transitions automatic.
- Customer delete is blocked when projects/invoices/quotations exist; products/suppliers soft-deactivate to preserve history.
- Last-active super admin cannot be demoted/deactivated/deleted.

## 9. Known limitations

1. **SQLite** in the sandbox — port to PostgreSQL (Supabase/Neon/RDS) for production concurrency; schema is portable (`provider = "postgresql"`).
2. **PDF generation** uses the browser's print dialog on dedicated print pages (quotation, invoice) — no server-side PDF renderer. Acceptable for most SME flows; add `react-pdf`/Puppeteer if server-side PDFs are required.
3. **File storage** is local-disk; use object storage (S3/Supabase Storage) for multi-instance deployments. Uploads are limited to images ≤5MB with random names.
4. **Rate limiting** is in-memory per instance — use Redis/a gateway for horizontal scale.
5. **Email/SMS/WhatsApp notifications** are not sent — the WhatsApp link is `wa.me` deep-linking only. No bank/mobile-money gateway integration is claimed or included; payments are recorded manually with references.
6. **CSV export** covers all report types; PDF reports are print-view based.
7. Demo/seed data must never be used in production (`SEED_DEMO_DATA` guard).

## 10. Production deployment checklist

See **docs/DEPLOYMENT.md** for step-by-step instructions (Vercel/VPS + PostgreSQL, domain, HTTPS, backups, smoke tests) and **docs/PROJECT_STATUS.md** for the exact current state, commands run and test results.
