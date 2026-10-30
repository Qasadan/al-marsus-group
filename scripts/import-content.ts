/**
 * Import a content snapshot (from scripts/export-content.ts) into a target
 * database — used to migrate website copy into the production PostgreSQL
 * database (Supabase).
 *
 * Upserts CompanySettings(id='main') and GalleryItem rows. NEVER touches
 * users, credentials or business records.
 *
 * Usage:
 *   TARGET_DATABASE_URL="postgresql://..." bun scripts/import-content.ts [file]
 *   (falls back to DATABASE_URL when TARGET_DATABASE_URL is unset)
 *
 * NOTE: the active Prisma client must match the target provider — run this
 * after `prisma schema.postgresql.prisma` has been swapped in + regenerated
 * (scripts/deploy-db.sh does this for you).
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";

interface SettingsSnapshot {
  companyName?: string;
  tagline?: string | null;
  heroTitle?: string | null;
  heroSubtitle?: string | null;
  heroJson?: string | null;
  aboutText?: string | null;
  missionText?: string | null;
  visionText?: string | null;
  servicesJson?: string | null;
  divisionsJson?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsappNumber?: string | null;
  address?: string | null;
  currency?: string;
  taxRate?: number;
  quotationPrefix?: string;
  invoicePrefix?: string;
  projectPrefix?: string;
  surveyPrefix?: string;
  maintenancePrefix?: string;
  serviceRequestPrefix?: string;
  purchaseOrderPrefix?: string;
  quotationTerms?: string | null;
  invoiceTerms?: string | null;
  logoUrl?: string;
}

interface GallerySnapshot {
  id: string;
  title: string;
  description?: string | null;
  imageUrl: string;
  division?: string | null;
  category?: string | null;
  location?: string | null;
  capacityKw?: number | null;
  isPublic?: boolean;
  projectId?: string | null;
  sortOrder?: number;
}

async function main() {
  const file = process.argv[2] ?? "content-snapshot.json";
  const targetUrl = process.env.TARGET_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!targetUrl) {
    throw new Error("Set TARGET_DATABASE_URL (or DATABASE_URL) to the destination database.");
  }
  if (/^file:/i.test(targetUrl)) {
    throw new Error("Target looks like SQLite (file:) — this script is for PostgreSQL imports.");
  }

  const db = new PrismaClient({ datasourceUrl: targetUrl });

  try {
    const snap = JSON.parse(readFileSync(file, "utf8")) as {
      settings?: SettingsSnapshot | null;
      gallery?: GallerySnapshot[];
    };

    // --- CompanySettings (content fields only; never id/updatedAt) -----------
    if (snap.settings) {
      const s = snap.settings;
      const { id: _drop, ...fields } = s as Record<string, unknown> & { id?: string };
      void _drop;
      await db.companySettings.upsert({
        where: { id: "main" },
        update: { ...fields },
        create: { id: "main", ...fields },
      });
      console.log(`✓ CompanySettings imported (${Object.keys(fields).length} fields)`);
    } else {
      console.log("• No settings in snapshot — skipped");
    }

    // --- Gallery items --------------------------------------------------------
    let imported = 0;
    for (const g of snap.gallery ?? []) {
      const { id, createdAt: _c, ...data } = g as Record<string, unknown> & { id: string; createdAt?: unknown };
      void _c;
      await db.galleryItem.upsert({
        where: { id },
        update: data,
        create: { id, ...data },
      });
      imported++;
    }
    console.log(`✓ Gallery items imported: ${imported}`);

    // --- Read-back verification ------------------------------------------------
    const verify = await db.companySettings.findUnique({ where: { id: "main" } });
    if (verify) {
      let heroImages = 0;
      try {
        heroImages = ((JSON.parse(verify.heroJson ?? "{}") as { images?: string[] }).images ?? []).length;
      } catch { /* malformed heroJson — count 0 */ }
      const divisions = (JSON.parse(verify.divisionsJson ?? "[]") as unknown[]).length;
      console.log(`✓ Read-back: companyName="${verify.companyName}", hero images=${heroImages}, divisions=${divisions}, visionText=${(verify.visionText ?? "").length} chars`);
    } else {
      throw new Error("Read-back failed: CompanySettings id='main' not found after import.");
    }
    console.log("Import complete. Users/credentials were not touched — seed creates the admin.");
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error("Import failed:", e);
  process.exit(1);
});
