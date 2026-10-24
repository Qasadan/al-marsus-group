import { db } from "./db";

export interface PublicSettings {
  companyName: string;
  tagline: string | null;
  heroTitle: string | null;
  heroSubtitle: string | null;
  aboutText: string | null;
  missionText: string | null;
  visionText: string | null;
  services: { title: string; description: string; icon?: string }[];
  email: string | null;
  phone: string | null;
  whatsappNumber: string | null;
  address: string | null;
  currency: string;
  taxRate: number;
  logoUrl: string;
}

// Fetch (and cache briefly) company settings. Public fields only.
export async function getPublicSettings(): Promise<PublicSettings> {
  const s = await db.companySettings.findUnique({ where: { id: "main" } });
  let services: { title: string; description: string; icon?: string }[] = [];
  if (s?.servicesJson) {
    try {
      const parsed = JSON.parse(s.servicesJson);
      if (Array.isArray(parsed)) services = parsed;
    } catch {
      // ignore malformed JSON
    }
  }
  return {
    companyName: s?.companyName ?? "Al-Marsus Group Ltd",
    tagline: s?.tagline ?? null,
    heroTitle: s?.heroTitle ?? null,
    heroSubtitle: s?.heroSubtitle ?? null,
    aboutText: s?.aboutText ?? null,
    missionText: s?.missionText ?? null,
    visionText: s?.visionText ?? null,
    services,
    email: s?.email ?? null,
    phone: s?.phone ?? null,
    whatsappNumber: s?.whatsappNumber ?? null,
    address: s?.address ?? null,
    currency: s?.currency ?? "KES",
    taxRate: s?.taxRate ?? 0,
    logoUrl: s?.logoUrl ?? "/images/logo.jpg",
  };
}

export async function getSettings() {
  let s = await db.companySettings.findUnique({ where: { id: "main" } });
  if (!s) {
    s = await db.companySettings.create({ data: { id: "main" } });
  }
  return s;
}

export async function generateDocNumber(prefix: string, modelName: "quotation" | "invoice" | "project" | "purchaseOrder" | "maintenanceRecord" | "serviceRequest"): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const count = await (db as unknown as Record<string, { count: () => Promise<number> }>)[modelName].count();
  const seq = String(count + 1).padStart(4, "0");
  return `${prefix}-${year}-${seq}`;
}
