// ============================================================
// Al-Marsus Group Ltd — one-time SQLite → PostgreSQL data copy
// ============================================================
// Copies EVERY table from the local SQLite database (db/custom.db)
// into a fresh PostgreSQL database created from
// prisma/schema.deploy.prisma — preserving ids, dates and the
// admin password hash, so existing logins keep working.
//
// Prerequisites (see DEPLOY-TO-VERCEL.md):
//   1. Supabase project created; connection strings in hand.
//   2. Tables created + client generated from the deploy schema:
//        npx prisma generate --schema=prisma/schema.deploy.prisma
//        npx prisma db push --schema=prisma/schema.deploy.prisma
//   3. Run with the Postgres URL in the environment:
//        DATABASE_URL="postgresql://..." bun scripts/migrate-sqlite-to-postgres.ts
//
// Notes:
//  - Reads SQLite through Bun's built-in SQLite driver (no extra deps).
//  - Self/circular references (Quotation.parentId, Quotation.convertedProjectId)
//    are filled in a second pass after both sides exist.
//  - Verifies per-table counts at the end and exits non-zero on mismatch.
// ============================================================

import { PrismaClient } from "@prisma/client";
// @ts-ignore — "bun:sqlite" types ship with the Bun runtime; Node's tsc here doesn't resolve them
import { Database } from "bun:sqlite";

const SQLITE_PATH = process.env.SQLITE_PATH ?? "db/custom.db";
const PG_URL = process.env.DATABASE_URL;

if (!PG_URL || !PG_URL.startsWith("postgresql") && !PG_URL.startsWith("postgres")) {
  console.error(
    "✗ DATABASE_URL must be set to the Supabase/PostgreSQL connection string.\n" +
      '  Example: DATABASE_URL="postgresql://postgres:PW@db.xxx.supabase.co:5432/postgres" bun scripts/migrate-sqlite-to-postgres.ts'
  );
  process.exit(1);
}

const pg = new PrismaClient({ datasourceUrl: PG_URL });
const sqlite = new Database(SQLITE_PATH, { readonly: true });

// --- helpers -------------------------------------------------

// SQLite booleans are 0/1 integers for these columns.
const BOOLEAN_COLUMNS: Record<string, string[]> = {
  User: ["isActive"],
  Supplier: ["isActive"],
  Product: ["isActive"],
  GalleryItem: ["isPublic"],
  MaintenanceRecord: ["warrantyCovered"],
  Notification: ["isRead"],
};

// Prisma stores SQLite DateTimes as strings; normalise both
// "2026-01-01T09:00:00.000Z" and "2026-01-01 09:00:00.000 +00:00" forms.
const ISO_RE = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}/;

function convert(table: string, row: Record<string, unknown>): Record<string, unknown> {
  const boolCols = new Set(BOOLEAN_COLUMNS[table] ?? []);
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (value === null || value === undefined) {
      out[key] = null;
    } else if (boolCols.has(key)) {
      out[key] = value === 1 || value === true;
    } else if (typeof value === "string" && ISO_RE.test(value)) {
      const normalised = value.includes("T") ? value : value.replace(" ", "T").replace(/\s*\+00:00$/, "Z");
      const d = new Date(normalised);
      out[key] = Number.isNaN(d.getTime()) ? value : d;
    } else {
      out[key] = value;
    }
  }
  return out;
}

function readTable(table: string): Record<string, unknown>[] {
  try {
    return sqlite.query(`SELECT * FROM "${table}"`).all() as Record<string, unknown>[];
  } catch (err) {
    console.error(`✗ Could not read table ${table} from ${SQLITE_PATH}:`, err);
    process.exit(1);
  }
}

async function copyTable(
  table: string,
  model: keyof typeof pg,
  transform?: (rows: Record<string, unknown>[]) => Record<string, unknown>[]
): Promise<number> {
  const raw = readTable(table);
  const rows = transform ? transform(raw) : raw.map((r) => convert(table, r));
  if (rows.length === 0) {
    console.log(`  ${table.padEnd(20)} 0 rows (skipped)`);
    return 0;
  }
  // createMany in chunks keeps memory flat and error messages readable.
  const CHUNK = 200;
  for (let i = 0; i < rows.length; i += CHUNK) {
    // @ts-expect-error — dynamic model access across all 22 models
    await pg[model].createMany({ data: rows.slice(i, i + CHUNK), skipDuplicates: false });
  }
  console.log(`  ${table.padEnd(20)} ${rows.length} rows copied`);
  return rows.length;
}

// --- main ----------------------------------------------------

let failures = 0;
try {
  console.log("Pre-flight: checking PostgreSQL connectivity…");
  await pg.$queryRaw`SELECT 1`;
  console.log("✓ PostgreSQL reachable\n");

  // Phase 1 — parents and independent tables first (FK order).
  const copied: Record<string, number> = {};
  copied.CompanySettings = await copyTable("CompanySettings", "companySettings");
  copied.User = await copyTable("User", "user");
  copied.Customer = await copyTable("Customer", "customer");
  copied.Supplier = await copyTable("Supplier", "supplier");
  copied.Product = await copyTable("Product", "product");
  copied.QuoteRequest = await copyTable("QuoteRequest", "quoteRequest");
  copied.SiteSurvey = await copyTable("SiteSurvey", "siteSurvey");

  // Quotation: strip self/circular refs for pass 1 (parentId → Quotation,
  // convertedProjectId → Project), remember them for pass 2.
  const quotationRefs: { id: string; parentId: string | null; convertedProjectId: string | null }[] = [];
  copied.Quotation = await copyTable("Quotation", "quotation", (rows) =>
    rows.map((r0) => {
      const r = convert("Quotation", r0);
      quotationRefs.push({
        id: r.id as string,
        parentId: (r.parentId as string | null) ?? null,
        convertedProjectId: (r.convertedProjectId as string | null) ?? null,
      });
      delete r.parentId;
      delete r.convertedProjectId;
      return r;
    })
  );

  copied.Project = await copyTable("Project", "project");
  copied.ProjectMember = await copyTable("ProjectMember", "projectMember");
  copied.Task = await copyTable("Task", "task");
  copied.ProjectPhoto = await copyTable("ProjectPhoto", "projectPhoto");
  copied.GalleryItem = await copyTable("GalleryItem", "galleryItem");
  copied.StockMovement = await copyTable("StockMovement", "stockMovement");
  copied.PurchaseOrder = await copyTable("PurchaseOrder", "purchaseOrder");
  copied.PurchaseOrderItem = await copyTable("PurchaseOrderItem", "purchaseOrderItem");
  copied.Invoice = await copyTable("Invoice", "invoice");
  copied.InvoiceItem = await copyTable("InvoiceItem", "invoiceItem");
  copied.Payment = await copyTable("Payment", "payment");
  copied.Expense = await copyTable("Expense", "expense");
  copied.MaintenanceRecord = await copyTable("MaintenanceRecord", "maintenanceRecord");
  copied.ServiceRequest = await copyTable("ServiceRequest", "serviceRequest");
  copied.Notification = await copyTable("Notification", "notification");
  copied.AuditLog = await copyTable("AuditLog", "auditLog");

  // Phase 2 — self/circular references.
  let refsFixed = 0;
  for (const ref of quotationRefs) {
    if (ref.parentId || ref.convertedProjectId) {
      await pg.quotation.update({
        where: { id: ref.id },
        data: {
          ...(ref.parentId ? { parentId: ref.parentId } : {}),
          ...(ref.convertedProjectId ? { convertedProjectId: ref.convertedProjectId } : {}),
        },
      });
      refsFixed++;
    }
  }
  console.log(`  Quotation refs restored (parentId/convertedProjectId): ${refsFixed}\n`);

  // Phase 3 — verification.
  console.log("Verifying row counts (SQLite → PostgreSQL)…");
  let mismatch = false;
  for (const [table, model] of Object.entries({
    CompanySettings: "companySettings",
    User: "user",
    Customer: "customer",
    Supplier: "supplier",
    Product: "product",
    QuoteRequest: "quoteRequest",
    SiteSurvey: "siteSurvey",
    Quotation: "quotation",
    Project: "project",
    ProjectMember: "projectMember",
    Task: "task",
    ProjectPhoto: "projectPhoto",
    GalleryItem: "galleryItem",
    StockMovement: "stockMovement",
    PurchaseOrder: "purchaseOrder",
    PurchaseOrderItem: "purchaseOrderItem",
    Invoice: "invoice",
    InvoiceItem: "invoiceItem",
    Payment: "payment",
    Expense: "expense",
    MaintenanceRecord: "maintenanceRecord",
    ServiceRequest: "serviceRequest",
    Notification: "notification",
    AuditLog: "auditLog",
  }) as [string, keyof typeof pg][]) {
    // @ts-expect-error — dynamic model access
    const pgCount = await pg[model].count();
    const liteCount = copied[table] ?? 0;
    const okFlag = pgCount === liteCount;
    if (!okFlag) mismatch = true;
    console.log(`  ${table.padEnd(20)} sqlite=${String(liteCount).padStart(5)}  postgres=${String(pgCount).padStart(5)}  ${okFlag ? "✓" : "✗ MISMATCH"}`);
  }

  if (mismatch) {
    console.error("\n✗ Some tables did not copy cleanly — check the log above.");
    failures = 1;
  } else {
    console.log("\n✓ Migration complete. Log in with your existing admin email & password.");
  }
} catch (err) {
  console.error("\n✗ Migration failed:", err);
  failures = 1;
} finally {
  await pg.$disconnect();
  sqlite.close();
}
process.exit(failures);
