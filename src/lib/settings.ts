import { db } from "./db";
import { resolveDivisions, type ResolvedDivision } from "./divisions";

/** No-code hero editor content (stored as JSON in CompanySettings.heroJson). */
export interface HeroContent {
  badge: string | null;
  primaryCtaLabel: string | null;
  primaryCtaHref: string | null;
  secondaryCtaLabel: string | null;
  secondaryCtaHref: string | null;
  note: string | null;
  /** Up to 3 image URLs — rendered as a fast auto-sliding, glow-framed carousel. */
  images: string[];
}

export const HERO_IMAGE_LIMIT = 3;

/** String-valued hero fields (images is an array and is parsed separately). */
const HERO_KEYS: Exclude<keyof HeroContent, "images">[] = [
  "badge",
  "primaryCtaLabel",
  "primaryCtaHref",
  "secondaryCtaLabel",
  "secondaryCtaHref",
  "note",
];

/** Parse the stored hero JSON defensively — malformed content falls back to nulls. */
function parseHero(json: unknown): HeroContent {
  const hero: HeroContent = {
    badge: null,
    primaryCtaLabel: null,
    primaryCtaHref: null,
    secondaryCtaLabel: null,
    secondaryCtaHref: null,
    note: null,
    images: [],
  };
  if (typeof json !== "string" || !json) return hero;
  try {
    const parsed = JSON.parse(json) as Record<string, unknown>;
    if (parsed && typeof parsed === "object") {
      for (const key of HERO_KEYS) {
        const value = parsed[key];
        if (typeof value === "string" && value.trim()) hero[key] = value.trim();
      }
      if (Array.isArray(parsed.images)) {
        hero.images = parsed.images
          .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
          .map((v) => v.trim())
          .slice(0, HERO_IMAGE_LIMIT);
      }
    }
  } catch {
    // ignore malformed JSON — defaults apply
  }
  return hero;
}

/**
 * heroJson is read/written via parameterized raw SQL so that any Prisma client
 * generation can serve it — including a long-running dev server whose client was
 * generated before the column was added (typed selects simply omit it; raw SQL
 * bypasses the client's schema snapshot). Tagged templates are parameterized,
 * so these calls are injection-safe.
 */
export async function readHeroJson(): Promise<string | null> {
  const rows = await db.$queryRaw<{ heroJson: string | null }[]>`SELECT heroJson FROM CompanySettings WHERE id = 'main'`;
  return rows[0]?.heroJson ?? null;
}

export async function writeHeroJson(json: string | null): Promise<void> {
  await db.$executeRaw`UPDATE CompanySettings SET heroJson = ${json} WHERE id = 'main'`;
}

export interface PublicSettings {
  companyName: string;
  tagline: string | null;
  heroTitle: string | null;
  heroSubtitle: string | null;
  hero: HeroContent;
  aboutText: string | null;
  missionText: string | null;
  visionText: string | null;
  services: { title: string; description: string; icon?: string }[];
  divisions: ResolvedDivision[];
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
    hero: parseHero(await readHeroJson()),
    aboutText: s?.aboutText ?? null,
    missionText: s?.missionText ?? null,
    visionText: s?.visionText ?? null,
    services,
    divisions: resolveDivisions(s?.divisionsJson ?? null),
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
