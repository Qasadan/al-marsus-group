import { z } from "zod";
import { NextRequest } from "next/server";
import { handleRoute, ok, requireAuth, parseBody } from "@/lib/api";
import { getPublicSettings, getSettings, writeHeroJson } from "@/lib/settings";
import { writeAudit } from "@/lib/audit";
import { db } from "@/lib/db";

// Public: website content + contact details (safe subset)
export async function GET() {
  return handleRoute(async () => {
    const settings = await getPublicSettings();
    return ok(settings);
  });
}

// No-code hero editor content — stored as JSON in CompanySettings.heroJson.
// Links must be in-app paths, section anchors, or absolute http(s)/mailto/tel links.
const heroLink = z
  .string()
  .max(300)
  .regex(/^(\/|#|https?:\/\/|mailto:|tel:)/i, "Links must start with /, #, http(s)://, mailto: or tel:");
const heroSchema = z
  .object({
    badge: z.string().max(120).nullable().optional(),
    primaryCtaLabel: z.string().max(80).nullable().optional(),
    primaryCtaHref: heroLink.nullable().optional(),
    secondaryCtaLabel: z.string().max(80).nullable().optional(),
    secondaryCtaHref: heroLink.nullable().optional(),
    note: z.string().max(300).nullable().optional(),
  })
  .strict();

const updateSchema = z.object({
  companyName: z.string().min(1).max(200).optional(),
  tagline: z.string().max(300).nullable().optional(),
  heroTitle: z.string().max(200).nullable().optional(),
  heroSubtitle: z.string().max(500).nullable().optional(),
  hero: heroSchema.nullable().optional(),
  aboutText: z.string().max(5000).nullable().optional(),
  missionText: z.string().max(2000).nullable().optional(),
  visionText: z.string().max(2000).nullable().optional(),
  servicesJson: z.string().max(20000).nullable().optional(),
  divisionsJson: z.string().max(60000).nullable().optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().max(30).nullable().optional(),
  whatsappNumber: z.string().max(30).nullable().optional(),
  address: z.string().max(300).nullable().optional(),
  currency: z.string().min(3).max(3).optional(),
  taxRate: z.number().min(0).max(100).optional(),
  quotationPrefix: z.string().min(1).max(10).optional(),
  invoicePrefix: z.string().min(1).max(10).optional(),
  projectPrefix: z.string().min(1).max(10).optional(),
  surveyPrefix: z.string().min(1).max(10).optional(),
  maintenancePrefix: z.string().min(1).max(10).optional(),
  serviceRequestPrefix: z.string().min(1).max(10).optional(),
  purchaseOrderPrefix: z.string().min(1).max(10).optional(),
  quotationTerms: z.string().max(5000).nullable().optional(),
  invoiceTerms: z.string().max(5000).nullable().optional(),
  logoUrl: z.string().max(500).optional(),
});

export async function PUT(req: NextRequest) {
  return handleRoute(async () => {
    const session = await requireAuth("settings");
    const { data } = await parseBody(req, updateSchema);
    await getSettings(); // ensure exists
    // Hero arrives as an object; persist it via the client-agnostic raw writer.
    const { hero, ...rest } = data;
    if (hero !== undefined) {
      await writeHeroJson(hero ? JSON.stringify(hero) : null);
    }
    const updated = await db.companySettings.update({ where: { id: "main" }, data: rest });
    await writeAudit(req, session, "UPDATE", "CompanySettings", "main", { keys: Object.keys(data) });
    return ok(updated);
  });
}
