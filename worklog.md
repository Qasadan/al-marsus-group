# Al-Marsus Group Ltd — Build Worklog

Project: Solar energy installation company website + business management system.
Stack (adapted to sandbox): Next.js 16 App Router + TypeScript, Tailwind CSS 4, shadcn/ui, Prisma ORM + SQLite, JWT auth (jose + bcryptjs), local file storage.

Brand: Indigo #34369B, Green #00A651, White #FFFFFF. Logo at public/images/logo.jpg (client-supplied, interlocking chains + white star).

Phases: 1 Foundation, 2 Public site, 3 DB/Auth/Security, 4 Admin core, 5 Solar ops, 6 Inventory/finance, 7 Maintenance/reports, 8 QA/deployment.

---
Task ID: 1
Agent: main
Task: Phase 1 Foundation - inspect repo, init env, copy logo, install deps

Work Log:
- Ran fullstack init script; repo = Next.js 16 + Prisma/SQLite + shadcn/ui scaffold, dev server on :3000
- Copied client logo upload/WhatsApp Image...jpeg -> public/images/logo.jpg (260x233 RGB)
- Installed bcryptjs + jose

Stage Summary:
- Environment ready; schema currently default User/Post placeholder; will replace with full domain schema.

---
Task ID: 2-7 (all phases)
Agent: main
Task: Implement Phases 1-8 of the Al-Marsus system end to end

Work Log:
- Phase 1: brand theme vars in globals.css; lib/auth.ts (JWT+bcrypt+RBAC matrix), lib/api.ts (envelope, guards, rate-limit), lib/audit.ts, lib/settings.ts, lib/constants.ts (status validation + cents math); /api/health
- Phase 3 (done early to unblock): 24-table Prisma schema with FKs, indexes, uniques; db:push OK; prisma/seed.ts (env-driven admin, production guard, optional demo data)
- Phase 2: PublicShell + SiteHeader/SiteFooter (DB-driven, WhatsApp link); pages /, /about, /services, /projects, /contact, /quote, /privacy; QuoteForm with honeypot; POST /api/quote-requests (zod, rate-limit 5/10min, spam heuristic); SEO metadata
- Auth routes: login (rate-limited), logout, me, change-password; middleware redirects for /admin (UX only; API is enforcement layer)
- Phase 4: /api/stats (real aggregates); admin shell with role-based sidebar; pages dashboard, customers, leads, quote-requests, staff, settings, gallery, audit, notifications
- Phase 5: /api/surveys, /api/quotations (+[id], convert w/ transaction + unique constraint), /api/projects (+tasks/members/photos/handover); pages incl. quotation detail w/ line-item editor + print view, project detail w/ task board + handover checklist
- Phase 6: /api/products(+[id]), /api/stock-movements (transactional ledger + low-stock notify), /api/suppliers, /api/purchase-orders(+receive atomic), /api/invoices(+[id]), /api/payments (overpay/duplicate protection), /api/expenses; pages for all
- Phase 7: /api/maintenance, /api/service-requests, /api/reports (6 types), /api/reports/export (CSV, audited), /api/gallery, /api/uploads (image-only, random names); pages incl. reports w/ filters
- Customer portal /portal (identity-scoped projects/invoices/service requests)
- Print views /print/quotation/[id], /print/invoice/[id] with PrintButton client comp + engineering disclaimer
- Phase 8: scripts/api-tests.ts (71 assertions, 19 sections); lint clean; Agent Browser verification (home desktop+mobile, contact, quote submit E2E, login, dashboard, quotations, project detail, print view); README.md, docs/PROJECT_STATUS.md, docs/DEPLOYMENT.md, .env.example; package scripts seed/test

Bugs found & fixed during QA:
1. parseBody envelope destructuring across 8 routes (fields read from {success,data} envelope instead of data) -> broken approve/send/status/payment endpoints; fixed via sed + manual edits; covered by tests
2. Missing Invoice-User (InvoiceAuthor) relation -> 500 on invoice detail; added to schema + db:push; required dev server restart to load regenerated client
3. onClick in Server Components on print pages -> extracted PrintButton client component
4. react-hooks/set-state-in-effect errors in 3 dialogs + header -> remount pattern / event-based close
5. Missing Select imports in gallery page
6. Test harness fixes: set-cookie capture, unique suffixes per run (idempotency), rate-limit tolerance, audit pageSize

Acceptance results (actual):
- bun run db:push: schema in sync
- bun prisma/seed.ts: settings + super admin (dev fallback documented)
- bun run lint: 0 errors, 0 warnings
- bun scripts/api-tests.ts: 71 passed, 0 failed
- curl /api/health: healthy, database connected
- Browser: all public pages 200; login->dashboard->quotations->project detail->print verified visually; mobile 390x844 verified; quote form persisted (verified via UI + API)
- NOT run: bun run build (sandbox forbids concurrent builds; documented in PROJECT_STATUS); PostgreSQL/Supabase migration (no external DB available; port documented)

Stage Summary:
- Complete working system delivered in sandbox; all 8 phases implemented with server-side authorization, transactional money/stock operations, audit trail, configurable branding; deployment-ready with docs.
