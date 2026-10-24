# PROJECT STATUS — Al-Marsus Group Ltd System

Last updated: 2026-10-24 (UTC+8 build session)
Current state: **All 8 phases implemented, tested and browser-verified in the sandbox. Plus: four-branch group expansion (Task 9) complete — the site now presents MEP Engineering, Digital, Operations Services and Cold Chain instead of solar-only.**

---

## 0. Four-branch group expansion (latest update) ✅

The company operates FOUR divisions; the website and management system now reflect this:

1. **Al-Marsus MEP Engineering** — mechanical, electrical & plumbing, with solar energy as flagship service
2. **Al-Marsus Digital** — web/software, networks, CCTV & access control, smart monitoring, IT support
3. **Al-Marsus Operations Services** — facility management, technical manpower, generator/plant operation
4. **Al-Marsus Cold Chain Storage & Logistics** — cold rooms, warehousing, refrigerated transport, monitoring

What was built:
- `src/lib/divisions.ts` — built-in division definitions (names, slugs, taglines, descriptions, service catalogues) with `resolveDivisions()` merging admin overrides
- Public: home group hero + 4-division grid; `/divisions` + `/divisions/[slug]` pages; services grouped by division; about group-structure section; projects division filter; header dropdown + footer column; generalized metadata
- Quote form: required "Which division?" select (validated server-side, rate-limited as before), dynamic labels per division
- Admin: division tagging on quote requests → leads → quotations → projects → gallery; division filter UI on quote requests; division-specific default task checklists on quotation→project conversion; "Divisions" editor in Settings (per-division tagline/description/services → `divisionsJson`, editable without code changes)
- Schema: nullable `division` on QuoteRequest/Lead/Quotation/Project/GalleryItem; `CompanySettings.divisionsJson`
- Tests: 73 assertions pass (incl. division validation + filter); lint clean; browser-verified incl. mobile

Honesty notes unchanged: division service catalogues are default configurable content (Admin → Settings); no certifications/client names are fabricated anywhere.

---

## 1. What is done (per phase)

### Phase 1 — Foundation ✅
- Monorepo-style Next.js 16 project (App Router, TypeScript strict).
- Centralized theme: brand indigo `#34369B` / green `#00A651` / white in `src/app/globals.css` CSS variables.
- Consistent API envelope `{ success, data | error }` in `src/lib/api.ts` with typed `ApiError`, route wrapper, rate limiter, client-IP extraction, pagination helper.
- Client logo copied to `public/images/logo.jpg` and used in header/footer/login/print/documents.
- Health endpoint: `GET /api/health` → `{ status: "healthy", database: "connected" }`.

### Phase 2 — Public website ✅
- Routes: `/` `/about` `/services` `/projects` `/contact` `/quote` `/privacy` (+ `/login`, `/portal`).
- Header/footer driven by DB company settings; WhatsApp deep-link; empty-state guidance instead of fake data.
- Quote request form: zod validation (client + server), honeypot, link-spam heuristic, IP rate-limit (5/10 min), persisted to `QuoteRequest`, notification to admins.
- SEO: metadata templates, OpenGraph, robots.txt, semantic HTML, aria labels, alt text.

### Phase 3 — Database, auth & security ✅
- 24-table relational schema in `prisma/schema.prisma` (users, customers, leads, quote requests, surveys, quotations + items, projects + members/tasks/photos, gallery, products + stock movements, suppliers + POs + items, invoices + items, payments, expenses, maintenance, service requests, notifications, settings, audit logs).
- Indexes on all FKs/status/date fields; unique constraints on codes, SKUs, emails, PO member pairs.
- JWT auth (jose HS256) + bcrypt hashes (10 rounds), httpOnly cookie, 7-day expiry.
- RBAC matrix in `src/lib/auth.ts`, enforced per-route + identity-scoped queries; technician project scoping; customer portal scoping.
- Audit logging on every mutating action; login rate-limit 10/min/IP.

### Phase 4 — Admin & customer management ✅
- Dashboard with real aggregates (revenue this month, outstanding, low stock, etc.).
- Customers CRUD + search/filter/pagination; leads pipeline + conversion; quote-request review/convert; staff management (super admin, last-admin protection, soft deactivate); company settings (all website content + finance defaults); gallery management (publish toggle, image upload); audit log viewer; notifications center.

### Phase 5 — Solar operations ✅
- Surveys (schedule/complete, roof & consumption data, technician assignment).
- Quotations: line-item editor, product-catalog autofill, server-side totals, numbering, expiry, send/approve/reject workflow, print/PDF page with disclaimer.
- Project conversion: transactional, duplicate-proof (`convertedProjectId` unique), auto 7-task checklist, budget from quotation.
- Projects: validated status transitions (`PROJECT_TRANSITIONS`), members, tasks with auto-recalculated progress, photo uploads (site/installation/handover), commissioning checklist handover that requires ALL tests to pass and starts warranty.

### Phase 6 — Inventory, procurement & finance ✅
- Products with categories/SKUs/cost/price/reorder levels; opening stock recorded as first ledger entry.
- Transactional stock ledger with balance snapshots; low-stock notifications; reserve/release for projects.
- Suppliers; POs with items; receiving updates received quantities + stock + ledger atomically; partial/over-receive handling.
- Invoices (server-calculated, per-record currency), partial/full payments in a transaction (overpay/duplicate rejected), payment references & methods, expenses linked to projects/suppliers.
- Money = integer cents everywhere; currency code stored per record; settings currency applies to new records only (no silent mixing).

### Phase 7 — Maintenance & reporting ✅
- Maintenance records (warranty/routine/repair) with technician assignment, findings/actions/parts/cost, warranty-covered flag, upcoming/overdue filters.
- Service requests with assignment and resolution notes workflow.
- Reports: 6 types with date/customer/status filters; CSV exports (audited); print views for quotation/invoice.
- Notifications for low stock, payments, approvals, conversions, PO receiving, service requests, handovers.

### Phase 8 — QA & deployment prep ✅
- **71-assertion E2E API suite** (`scripts/api-tests.ts`) — final result: **71 passed, 0 failed** (19 sections covering health, public form, auth, CRUD, quotation math, conversion duplicate-protection, stock ledger reconciliation, PO receiving, payment protections, expenses, maintenance, service, handover validation, reports, CSV, notifications, audit content, technician 403s, anonymous 401s, logout).
- ESLint: **0 errors, 0 warnings**.
- Browser-verified (Agent Browser): homepage desktop+mobile, contact, quote form submission (persisted), login, dashboard, quotations list, project detail, print quotation — all rendering with brand styling, no console errors.
- Responsive layouts verified at 390×844 and 1280×800.
- Docs: README.md, docs/DEPLOYMENT.md, .env.example, this file.

## 2. Commands run & results (actual)

| Command | Result |
|---|---|
| `bun run db:push` | ✅ schema in sync, client generated (v6.19.2) |
| `bun prisma/seed.ts` | ✅ settings + super admin created (dev fallback creds, documented) |
| `bun run lint` | ✅ clean (0 errors / 0 warnings) |
| `bun scripts/api-tests.ts` | ✅ **71 passed, 0 failed** |
| `curl /api/health` | ✅ healthy, database connected |
| `bun run build` | ⚠️ **not run** — the sandbox dev harness occupies the project and forbids concurrent builds (per environment rules). Production build instructions are in docs/DEPLOYMENT.md and must be run in CI/locally before deploy. |
| Supabase/PostgreSQL migration | ⚠️ not executed — no external DB in sandbox; port per DEPLOYMENT.md §2 |

## 3. Bugs found & fixed during QA

1. `parseBody` envelope destructuring bug across 8 routes (fields read from envelope instead of `data`) — fixed, covered by tests.
2. Prisma relation completeness — added missing `Invoice ↔ User (InvoiceAuthor)` relation after 500 on invoice detail.
3. Print pages used `onClick` in Server Components — extracted `PrintButton` client component.
4. React lint `set-state-in-effect` in dialogs — refactored to remount pattern.
5. Missing `Select` imports in gallery page.

## 4. Remaining tasks (external to sandbox)

1. Run `bun run build` in CI or locally; fix any prod-only warnings if they appear.
2. Provision PostgreSQL (Supabase), switch datasource provider, run `prisma migrate dev` to generate versioned SQL migrations, `prisma db push`/deploy.
3. Set real `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`; run seed; **change admin password after first login**.
4. Configure company settings (contact details, about text, services, terms, currency, tax rate) in Admin → Settings.
5. Optional hardening: object storage for uploads, Redis rate-limiting, email/SMS provider, server-side PDF rendering, monitoring/logging aggregation.
6. Schedule DB backups per DEPLOYMENT.md §7 and verify a restore.

## 5. Exact next action

On a machine with network + PostgreSQL: follow **docs/DEPLOYMENT.md** from §1 (fresh clone → env → migrate → seed → build → deploy → smoke tests).
