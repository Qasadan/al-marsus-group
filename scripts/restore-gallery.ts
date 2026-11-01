/**
 * Restore gallery items from the committed files in public/uploads/.
 * The DB rows were lost in a sandbox reset; the image files survive in git.
 * Titles are generic but accurate to what each photo shows — the admin can
 * refine them in Admin → Gallery at any time.
 *
 * Idempotent: fixed IDs derived from the file hash → safe to re-run.
 *
 * Usage:
 *   bun scripts/restore-gallery.ts                 # local SQLite (default .env)
 *   TARGET_DATABASE_URL=<pg-url> bun scripts/restore-gallery.ts
 */
import { PrismaClient } from "@prisma/client";

const items = [
  // file, title, division, category
  { file: "24eb5d3b0c0b49231f825b11.jpg", title: "Solar-assisted agro drying facility", division: "AGRO_PROCESSING", category: "COMMERCIAL" },
  { file: "71e8a6a20721bc1ca3102769.jpg", title: "Solar PV panel installation", division: "MEP_ENGINEERING", category: "COMMERCIAL" },
  { file: "39e8a084a051da4660d136b0.png", title: "Cold storage handling operations", division: "COLD_CHAIN", category: "INDUSTRIAL" },
  { file: "49aaad2c406122c159d39956.png", title: "Operations control room", division: "DIGITAL", category: "COMMERCIAL" },
  { file: "33c2f839a6b72595ca7e9ffe.jpg", title: "Farm field operations", division: "AGRO_PROCESSING", category: null as string | null },
  { file: "025748e43f2315850370b8d4.png", title: "Rooftop solar installation crew", division: "MEP_ENGINEERING", category: "COMMERCIAL" },
  { file: "49e6b43d6adabc32469816e9.jpg", title: "Official education forum — company representation", division: null, category: null },
  { file: "30d9250adec2fe827c624e4e.jpg", title: "Stakeholder meeting — company delegation", division: null, category: null },
  { file: "90446d1a02525ed389909400.jpg", title: "Rooftop solar array", division: "MEP_ENGINEERING", category: null as string | null },
  { file: "62763a37505dea331971a7c7.jpg", title: "Ground-mounted solar array", division: "MEP_ENGINEERING", category: "INDUSTRIAL" },
  { file: "c5bfd8fd7af9b55a1cf06ec5.jpg", title: "CCTV surveillance monitoring", division: "DIGITAL", category: "COMMERCIAL" },
];

const db = new PrismaClient({
  datasources: process.env.TARGET_DATABASE_URL ? { db: { url: process.env.TARGET_DATABASE_URL } } : undefined,
});

for (const it of items) {
  const id = "gal-" + it.file.slice(0, 12).replace(/[^a-z0-9]/gi, "").toLowerCase();
  await db.galleryItem.upsert({
    where: { id },
    update: { imageUrl: `/uploads/${it.file}`, isPublic: true },
    create: {
      id,
      title: it.title,
      imageUrl: `/uploads/${it.file}`,
      division: it.division,
      category: it.category,
      isPublic: true,
    },
  });
  console.log(`upserted ${id} — ${it.title}`);
}
console.log(`Done: ${items.length} gallery items`);
await db.$disconnect();
