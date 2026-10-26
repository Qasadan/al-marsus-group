# PROJECT STATUS — Al-Marsus Group Ltd System

Last updated: 2026-10-25 (hero image slider session)
Current state: **All 8 phases implemented, tested and browser-verified in the sandbox; full 73-assertion E2E suite also passes against the PRODUCTION build. Four-branch group expansion (Task 9) complete. Production build verified (Task 10). Preview-panel login fixed (Task 12). Public site restyled minimal/clean with persisted dark mode (Task 13). Cursor border-glow animations + no-code homepage hero editor in Admin → Settings delivered (Task 14). No-code hero IMAGE SLIDER (2–3 fast auto-sliding, glow-framed images, admin-managed) delivered (Task 15); 73/73 E2E, lint clean, production build + smoke verified.**

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

## 0b. Cursor glow + no-code hero editor (Task 14) ✅

**Cursor glow system** (`globals.css`, brand green ↔ indigo, `prefers-reduced-motion`-aware, disabled in print):
- Universal animated "breathe" glow on hover for every interactive element (links, buttons, inputs, selects, textareas, menu items) — gated by `@media (hover: hover)` so touch devices are unaffected
- Keyboard `:focus-visible` glow (outline + brand-green halo) on all interactive elements — not media-gated
- Premium `.glow-border` utility: rotating conic-gradient "comet" border sweep on hover/focus (applied to hero CTAs, header CTA, division cards), behind an `@supports (mask-composite)` guard so unsupported browsers just skip the ring
- `.card-hover` and `.glow-soft` extended with matching brand glow; Radix menu items glow when keyboard-highlighted

**No-code hero editor** (Admin → Settings → "Homepage hero section"):
- `CompanySettings.heroJson` (Prisma schema + db:push applied) stores badge, primary/secondary CTA labels + links, footnote; hero title/subtitle remain dedicated columns — all editable in the admin with a **live gradient preview** that updates as you type; blank fields fall back to built-in defaults
- `PUT /api/settings` accepts a validated `hero` object (links must be `/…`, `#…`, `http(s)://…`, `mailto:…`, `tel:…` — `javascript:` and other schemes rejected 422); GET returns parsed `hero`
- Homepage renders every hero string from settings; zero code required to reword/relink the hero
- Implementation note: hero JSON is read/written via **parameterized raw SQL** (`readHeroJson`/`writeHeroJson` in `src/lib/settings.ts`) so any Prisma client generation can serve it — including a long-running dev server whose client predates the column; typed Prisma field remains in the schema for future client generations
- Verified end-to-end in the browser: admin edit → Save All → homepage reflects changes (badge/CTA/note), hero:null reset restores defaults

Evidence: `download/preview/18–31` (light/dark × desktop/mobile glow states, CTA/card/input glow, admin hero editor + live preview, customized hero rendering, defaults restored).

---

## 0c. Hero image slider — admin-managed, glow-framed (Task 15) ✅

The hero can now show up to **3 images that auto-slide quickly** (3s crossfade), framed by the animated brand border glow — all managed from the admin panel without code:

- `HeroContent.images` (string[], ≤3) added to the existing `heroJson` — no schema migration needed; parsed defensively in `parseHero`
- `PUT /api/settings` validates `hero.images`: each must be an uploaded path (`/uploads/…`) or `https://` URL (http rejected — mixed content); ≤3 images enforced (422 otherwise)
- New `src/components/public/hero-slider.tsx` (client): stacked crossfade slides (700ms ease), 3s auto-advance, pauses while hovered/focused, clickable dot controls, `aria` labels, `priority` first image
- Border glow on the slider: new `.glow-frame` utility — **always-on breathing glow** (green ↔ indigo, 3.4s, `prefers-reduced-motion` static fallback, print reset) + existing `.glow-border` comet sweep on hover; computed styles verified in-browser (`glow-breathe` running, comet `glow-spin` opacity 0→1 on hover)
- Homepage hero: two-column layout when images are set (text left, slider right, mobile stacks text→slider); falls back to the previous text-only hero when no images — nothing else changed
- Admin → Settings → "Hero slider images (up to 3)": **Upload image** (reuses secured `/api/uploads`, JPEG/PNG/WebP ≤5MB), paste image URL, reorder ↑/↓, remove, duplicate/limit guards with toasts; the live preview now embeds the real slider (WYSIWYG); changes publish on "Save All"
- `next.config.ts`: `images.remotePatterns` allows `https://**` so admins can paste external image URLs; `distDir` env override (`NEXT_DIST_DIR`) enables non-destructive validation builds while the dev server runs (platform builds unaffected, still `.next`)
- API verification: `ftp://` image → 422; 4th image → 422; upload → URL → UI add → reorder → Save All → homepage renders all 3 slides (browser E2E via agent-browser)
- Production: isolated standalone build exit 0; smoke on :3001 — health 200, slider + 3 images in HTML, `/uploads/*` 200, `_next/image` optimizer 200

Demo images note: the three hero images currently live in the DB/public/uploads are **AI-generated placeholders** (solar installation / network operations / cold-chain warehouse) so the feature is visible immediately; the company should replace them with real photos in Admin → Settings (upload or paste URL, reorder, Save All).

Evidence: `download/preview/32–38` (desktop light hero, dark desktop, mobile dark ×2, hover comet, admin editor with live slider preview, images editor with reorder controls).

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
| `bun run lint` | ✅ clean (re-run 2026-10-25: 0 errors / 0 warnings) |
| `bun scripts/api-tests.ts` | ✅ **73 passed, 0 failed** (re-run 2026-10-25 after Task 9 expansion; re-run again **against the production standalone build** on 2026-10-25 — same result) |
| `curl /api/health` | ✅ healthy, database connected |
| `bun run build` (Task 10, 2026-10-25) | ✅ **exit 0** — all public pages, API routes, admin pages, print views and middleware compiled; `.next/standalone/server.js` produced with static assets copied |
| Production smoke test (standalone on :3001) | ✅ `/api/health` healthy + DB connected; `/`, `/divisions`, `/divisions/mep-engineering`, `/quote`, `/services`, `/login` all HTTP 200; home HTML contains "Our Divisions", "MEP Engineering", "Cold Chain" |
| Supabase/PostgreSQL migration | ⚠️ not executed — no external DB in sandbox; port per DEPLOYMENT.md §2 |
| Visual redesign to reference design (Task 16, 2026-10-26) | ✅ lint clean; 73/73 E2E; isolated prod build compiled + standalone smoke 200 on 7 routes; browser-verified light/dark × desktop/mobile + hover comet + admin |
| `bun scripts/api-tests.ts` after Task 16 | ✅ 73 passed, 0 failed |

## 3. Bugs found & fixed during QA

1. `parseBody` envelope destructuring bug across 8 routes (fields read from envelope instead of `data`) — fixed, covered by tests.
2. Prisma relation completeness — added missing `Invoice ↔ User (InvoiceAuthor)` relation after 500 on invoice detail.
3. Print pages used `onClick` in Server Components — extracted `PrintButton` client component.
4. React lint `set-state-in-effect` in dialogs — refactored to remount pattern.
5. Missing `Select` imports in gallery page.
6. **Production-only login 500** (found 2026-10-25 during live prod smoke test): `getSecret()` threw "JWT_SECRET must be set in production" — dev used a fallback, prod had none, and the platform deploy pipeline sets no `JWT_SECRET`. Fixed at runtime-provisioning level (no app-code change): real `JWT_SECRET` added to sandbox `.env`; bundled `start.sh` now auto-generates and persists a random secret to `<db-dir>/.jwt-secret` (0600) when none is injected. Verified: login 200 + Set-Cookie; Edge middleware accepts the session (`/admin` renders dashboard).
7. **Admin login "not working" in the preview panel** (reported by user 2026-10-25): server logs showed `POST /api/auth/login 200` followed by a bounce back to `/login?next=/admin` — credentials were valid and the cookie was set, but the browser dropped it. Root cause: the preview renders the site inside a **cross-site iframe**, and browsers reject `SameSite=Lax` cookies in that context. Fix (minimal, `src/lib/auth.ts` only): session cookie attributes changed to `SameSite=None; Secure`. Verified: real browser login lands on `/admin` (top-level AND embedded-frame reproduction via cross-site iframe to the public preview URL — screenshot `download/preview/11-iframe-embed-login-fixed.png`); full 73-assertion suite re-run: 73/73 pass.
8. **Frontend redesign cascade fixes** (Task 16, 2026-10-26, found during self-verification): (a) `Yantramanav` weight `600` rejected by next/font → build 500, reduced to available weights; (b) `.dark-eco-gradient` used the `background` shorthand so pattern utilities setting `background-image` wiped the gradient (white login page) → solid `background-color` + layered `background-image`; (c) unlayered `.eyebrow { display:inline-block }` beats layered Tailwind `block` utility → division-hero eyebrow sat inline after the back-link, wrapped in a block container; (d) a zero-width space in an eyebrow string removed. All covered by browser screenshots `download/preview/40-58`.

## 4. Remaining tasks (external to sandbox)

1. Provision PostgreSQL (Supabase), switch datasource provider, run `prisma migrate dev` to generate versioned SQL migrations, `prisma db push`/deploy.
2. Set real `ADMIN_EMAIL`, `ADMIN_PASSWORD`; run seed; **change admin password after first login**. (`JWT_SECRET` is auto-provisioned by `start.sh` if not injected, but an explicit value is still recommended.)
3. Configure company settings (contact details, about text, division service catalogues, terms, currency, tax rate) in Admin → Settings.
4. Optional hardening: object storage for uploads, Redis rate-limiting, email/SMS provider, server-side PDF rendering, monitoring/logging aggregation.
5. Schedule DB backups per DEPLOYMENT.md §7 and verify a restore.

Environment note (Task 10, honest record): the sandbox reaps any process spawned from a tool call when the call ends, and the harness supervisor only launches the dev server at boot. The dev server was stopped for the production build and could not be re-attached persistently from a tool call; serving is handled by the platform pipeline (`Complete` → `.zscripts/build.sh` + `start.sh`), which the verified standalone build unblocks.

## 5. Exact next action

On a machine with network + PostgreSQL: follow **docs/DEPLOYMENT.md** from §1 (fresh clone → env → migrate → seed → build → deploy → smoke tests). The production build is proven green in the sandbox, so deploy pipelines can rely on `bun run build` producing a working standalone bundle.
