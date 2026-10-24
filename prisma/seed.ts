/**
 * Database seed — Al-Marsus Group Ltd
 *
 * Creates:
 *  1. Company settings defaults (all fields configurable in Admin → Settings)
 *  2. Initial super admin from environment variables:
 *       ADMIN_EMAIL, ADMIN_NAME, ADMIN_PASSWORD (min 8 chars)
 *     If env vars are missing AND NODE_ENV != production, documented dev
 *     credentials are created (dev only — change immediately).
 *     In production, missing env vars cause a hard failure (no backdoor).
 *  3. Optional DEMO data ONLY when SEED_DEMO_DATA=1 (development environments).
 *
 * Run: bun prisma/seed.ts
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  const isProduction = process.env.NODE_ENV === "production";

  // 1. Company settings
  const settings = await db.companySettings.upsert({
    where: { id: "main" },
    update: {},
    create: {
      id: "main",
      companyName: "Al-Marsus Group Ltd",
      tagline: "Reliable solar energy solutions",
      // PLACEHOLDER website copy — configure in Admin → Settings before launch.
      heroTitle: "Power Your Future With Solar Energy",
      heroSubtitle:
        "Professional solar design, installation and maintenance for homes and businesses. Configure this text in Admin → Settings.",
      aboutText:
        "Al-Marsus Group Ltd is a solar energy installation company. [Placeholder — replace with the company's real history, mission and certifications in Admin → Settings.]",
      missionText: "[Placeholder — configure in Settings]",
      visionText: "[Placeholder — configure in Settings]",
      servicesJson: JSON.stringify([
        { title: "Residential Solar Installation", description: "Complete rooftop solar systems for homes, from assessment to handover. [Placeholder — edit in Settings]" },
        { title: "Commercial & Industrial Solar", description: "Grid-tied and hybrid systems for businesses and industry. [Placeholder — edit in Settings]" },
        { title: "Solar Maintenance & Support", description: "Preventive maintenance, repairs and system health checks. [Placeholder — edit in Settings]" },
        { title: "Energy Assessment & Design", description: "Site surveys and preliminary system sizing by qualified personnel. [Placeholder — edit in Settings]" },
      ]),
      email: null,
      phone: null,
      whatsappNumber: null,
      address: null,
      currency: "KES", // placeholder default — configure in Admin → Settings
      taxRate: 16, // placeholder default — configure in Admin → Settings
      quotationPrefix: "QT",
      invoicePrefix: "INV",
      projectPrefix: "PRJ",
      surveyPrefix: "SVY",
      maintenancePrefix: "MNT",
      serviceRequestPrefix: "SRV",
      purchaseOrderPrefix: "PO",
      quotationTerms:
        "This quotation is valid for 30 days unless otherwise stated. Preliminary energy calculations are estimates and must be verified by qualified personnel before procurement.",
      invoiceTerms: "Payment due as per agreed terms. [Configure in Settings]",
      logoUrl: "/images/logo.jpg",
    },
  });
  console.log("✓ Company settings ready (currency: %s)", settings.currency);

  // 2. Initial super admin — from env only; dev fallback clearly marked
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim();
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminName = process.env.ADMIN_NAME?.trim() || "Super Admin";

  let email = adminEmail;
  let password = adminPassword;
  if (!email || !password) {
    if (isProduction) {
      throw new Error(
        "Refusing to seed in production without ADMIN_EMAIL and ADMIN_PASSWORD environment variables."
      );
    }
    email = email || "admin@almarsus.dev";
    password = password || "AlMarsus#2026";
    console.warn("⚠ DEV FALLBACK credentials used. Set ADMIN_EMAIL / ADMIN_PASSWORD to override.");
    console.warn(`⚠ Dev login: ${email} / ${password} — change this password immediately after first login.`);
  }
  if (password && password.length < 8) {
    throw new Error("ADMIN_PASSWORD must be at least 8 characters.");
  }

  const existing = await db.user.findUnique({ where: { email: email!.toLowerCase() } });
  if (!existing) {
    await db.user.create({
      data: {
        email: email!.toLowerCase(),
        name: adminName,
        role: "SUPER_ADMIN",
        passwordHash: await bcrypt.hash(password!, 10),
      },
    });
    console.log(`✓ Super admin created: ${email}`);
  } else {
    console.log(`• Super admin already exists: ${email}`);
  }

  // 3. Optional demo data — explicitly opt-in, dev only
  if (process.env.SEED_DEMO_DATA === "1" && !isProduction) {
    console.log("• Seeding DEMO data (SEED_DEMO_DATA=1)…");
    const demoCustomers = [
      { name: "Demo Customer A", email: "democust-a@example.com", phone: "+254700000001", type: "RESIDENTIAL" },
      { name: "Demo Business B", email: "democust-b@example.com", phone: "+254700000002", type: "COMMERCIAL" },
    ];
    for (const c of demoCustomers) {
      if (!(await db.customer.findFirst({ where: { email: c.email } }))) {
        await db.customer.create({ data: c });
      }
    }
    const demoProducts = [
      { sku: "PANEL-550W-DEMO", name: "Demo Solar Panel 550W", category: "PANEL", unit: "pcs", priceCents: 1_200_000, costCents: 900_000, quantity: 40, reorderLevel: 10 },
      { sku: "BATT-100AH-DEMO", name: "Demo Lithium Battery 100Ah", category: "BATTERY", unit: "pcs", priceCents: 12_000_000, costCents: 9_500_000, quantity: 12, reorderLevel: 4 },
      { sku: "INV-5KW-DEMO", name: "Demo Hybrid Inverter 5kW", category: "INVERTER", unit: "pcs", priceCents: 8_500_000, costCents: 6_800_000, quantity: 8, reorderLevel: 3 },
      { sku: "CBL-6MM-DEMO", name: "Demo Solar Cable 6mm² (50m)", category: "CABLE", unit: "roll", priceCents: 450_000, costCents: 320_000, quantity: 25, reorderLevel: 5 },
    ];
    for (const p of demoProducts) {
      if (!(await db.product.findUnique({ where: { sku: p.sku } }))) {
        await db.product.create({ data: p });
      }
    }
    console.log("✓ Demo data created (customers + products)");
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
