/**
 * Export public website content from the current (local SQLite) database to a
 * JSON snapshot, for migration to another database (e.g. Supabase PostgreSQL).
 *
 * Exports: CompanySettings (all website copy, hero carousel, divisions) and
 * GalleryItem rows. Read-only against the source; never exports users,
 * password hashes or business records.
 *
 * Usage:  bun scripts/export-content.ts [outfile]   (default content-snapshot.json)
 */
import { PrismaClient } from "@prisma/client";
import { writeFileSync } from "fs";

const db = new PrismaClient(); // uses .env DATABASE_URL → local SQLite

async function main() {
  const outfile = process.argv[2] ?? "content-snapshot.json";

  const settings = await db.companySettings.findUnique({ where: { id: "main" } });
  const gallery = await db.galleryItem.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });

  if (!settings) {
    throw new Error("No CompanySettings row found in the source database (id='main').");
  }

  const snapshot = {
    exportedAt: new Date().toISOString(),
    source: "local-sqlite",
    settings,
    gallery,
  };
  writeFileSync(outfile, JSON.stringify(snapshot, null, 2));
  console.log(`✓ Exported CompanySettings + ${gallery.length} gallery item(s) → ${outfile}`);
  console.log("  Note: uploaded image files under public/uploads/ are committed to git");
  console.log("  and deploy as static assets — their relative URLs stay valid.");
}

main()
  .catch((e) => {
    console.error("Export failed:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
