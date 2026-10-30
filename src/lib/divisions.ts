// Al-Marsus Group Ltd — division (business branch) definitions.
//
// The group operates FOUR specialised businesses (per the official company
// document "Our Vision and mission"):
//   1. Al-Marsus MEP Engineering
//   2. Al-Marsus Cold Chain Infrastructure & Solutions
//   3. Al-Marsus Digital
//   4. Al-Marsus Agro-Processing
//
// This file is the built-in default content. Administrators can override the
// tagline, description and service lists per division via Admin → Settings
// (stored as `divisionsJson` on CompanySettings — see resolveDivisions()).
//
// NOTE: service lists are the group's default offering descriptions. Any
// claim that requires verification (certifications, accreditations, client
// names) is intentionally NOT included here.

export const DIVISION_CODES = ["MEP_ENGINEERING", "COLD_CHAIN", "DIGITAL", "AGRO_PROCESSING"] as const;
export type DivisionCode = (typeof DIVISION_CODES)[number];

export interface DivisionService {
  title: string;
  description: string;
}

export interface DivisionDefinition {
  code: DivisionCode;
  slug: string;
  shortName: string;
  fullName: string;
  icon: "zap" | "cpu" | "snowflake" | "wheat";
  defaultTagline: string;
  defaultDescription: string;
  defaultServices: DivisionService[];
}

export const DIVISIONS: Record<DivisionCode, DivisionDefinition> = {
  MEP_ENGINEERING: {
    code: "MEP_ENGINEERING",
    slug: "mep-engineering",
    shortName: "MEP Engineering",
    fullName: "Al-Marsus MEP Engineering",
    icon: "zap",
    defaultTagline: "Engineering Reliable Infrastructure",
    defaultDescription:
      "Al-Marsus MEP Engineering focuses on mechanical, electrical, and plumbing engineering services for buildings, commercial facilities, and infrastructure projects. Our objective is to support reliable, efficient, and functional facilities through professional engineering practices and quality-focused solutions.",
    defaultServices: [
      {
        title: "Electrical Installations",
        description:
          "Power distribution, lighting, backup and UPS systems, earthing and lightning protection — installed to code, tested and commissioned before handover.",
      },
      {
        title: "Plumbing & Drainage Systems",
        description:
          "Water supply, pumping, storage and drainage systems designed for pressure, hygiene and durability in residential, commercial and public buildings.",
      },
      {
        title: "HVAC & Refrigeration Systems",
        description:
          "Air conditioning, ventilation, climate control and refrigeration systems for buildings and cold rooms, sized and balanced by qualified engineers.",
      },
      {
        title: "Solar Energy Solutions",
        description:
          "Grid-tied, hybrid and off-grid solar PV systems with battery storage — site surveys, system design, installation, commissioning and long-term maintenance.",
      },
      {
        title: "Engineering Support & Installation",
        description:
          "Technical supervision, installation management and commissioning support for developers, contractors and facility owners.",
      },
      {
        title: "Maintenance & Retrofit",
        description:
          "Preventive maintenance contracts, fault troubleshooting and energy-efficiency upgrades for existing MEP installations.",
      },
    ],
  },
  COLD_CHAIN: {
    code: "COLD_CHAIN",
    slug: "cold-chain",
    shortName: "Cold Chain",
    fullName: "Al-Marsus Cold Chain Infrastructure & Solutions",
    icon: "snowflake",
    defaultTagline: "Preserving Quality. Connecting Markets.",
    defaultDescription:
      "Al-Marsus Cold Chain Infrastructure & Solutions focuses on cold storage infrastructure and temperature-controlled services for farmers, exporters, food businesses, and other customers handling perishable products. Our ambition is to help preserve product quality, reduce avoidable post-harvest losses, and strengthen connections between producers and markets.",
    defaultServices: [
      {
        title: "Cold Storage Facilities",
        description:
          "Walk-in chillers and freezers designed, built and operated around your product's temperature profile, with chilled and frozen storage capacity.",
      },
      {
        title: "Refrigerated Fleet & Distribution",
        description:
          "Temperature-controlled collection and delivery with planned routes, monitoring and delivery documentation from farm or facility to market.",
      },
      {
        title: "Farmer Collection Centres",
        description:
          "Local collection points where producers can bring perishable produce for immediate cooling, safe storage and onward distribution.",
      },
      {
        title: "Pre-Cooling Facilities",
        description:
          "Rapid pre-cooling that removes field heat from freshly harvested produce — a critical step for preserving shelf life and quality.",
      },
      {
        title: "Export Cold-Chain Hubs",
        description:
          "Consolidation, storage and handling hubs that prepare temperature-sensitive goods for export markets under controlled conditions.",
      },
      {
        title: "Temperature Monitoring & Compliance",
        description:
          "Continuous temperature logging, alarm escalation and reports supporting food-safety and quality requirements across the chain.",
      },
    ],
  },
  DIGITAL: {
    code: "DIGITAL",
    slug: "digital",
    shortName: "Digital",
    fullName: "Al-Marsus Digital",
    icon: "cpu",
    defaultTagline: "Digital Engineering. Smarter Maintenance.",
    defaultDescription:
      "Al-Marsus Digital delivers digital MEP design, BIM modelling, engineering software solutions, and QR-code-based maintenance management for buildings and engineering facilities. Our goal is to connect engineering with digital innovation for smarter, safer, and more efficient building management.",
    defaultServices: [
      {
        title: "Digital MEP Design & BIM Modelling",
        description:
          "Building Information Modelling and coordinated digital MEP design that reduces clashes, rework and cost before construction begins.",
      },
      {
        title: "Engineering Software Solutions",
        description:
          "Business management software — quotations, inventory, invoicing and workflow tools — tailored to how your operation actually runs.",
      },
      {
        title: "QR-Code Maintenance Management",
        description:
          "QR-coded equipment that lets clients access equipment records, track maintenance dates, schedule servicing and manage engineering assets efficiently.",
      },
      {
        title: "Smart Building & Monitoring",
        description:
          "Sensors and dashboards for energy, temperature and equipment monitoring across one or many sites.",
      },
      {
        title: "Websites & Business Applications",
        description:
          "Company websites, customer portals and online booking or ordering systems — designed, built and maintained by the team.",
      },
      {
        title: "Networking & Security Systems",
        description:
          "Structured cabling, LAN and Wi-Fi, servers, CCTV and access control with remote monitoring and recording.",
      },
    ],
  },
  AGRO_PROCESSING: {
    code: "AGRO_PROCESSING",
    slug: "agro-processing",
    shortName: "Agro-Processing",
    fullName: "Al-Marsus Agro-Processing",
    icon: "wheat",
    defaultTagline: "Turning Agricultural Resources into Greater Value",
    defaultDescription:
      "Al-Marsus Agro-Processing focuses on agricultural processing and value addition, with an emphasis on improving product quality, preservation, packaging, and market readiness. Our ambition is to support agricultural producers, strengthen local value chains, reduce post-harvest losses, and create opportunities for agricultural products to reach wider markets.",
    defaultServices: [
      {
        title: "Produce Handling & Reception",
        description:
          "Careful reception and handling of agricultural produce at the point of intake to protect quality from the very first step.",
      },
      {
        title: "Cleaning, Sorting & Grading",
        description:
          "Cleaning, sorting and grading lines that prepare produce to consistent quality standards buyers can rely on.",
      },
      {
        title: "Processing & Preservation",
        description:
          "Processing and preservation methods that extend shelf life and open the door to new product formats.",
      },
      {
        title: "Packaging & Market Readiness",
        description:
          "Packaging solutions that protect the product, communicate quality and prepare goods for retail and export markets.",
      },
      {
        title: "Value-Added Product Development",
        description:
          "Development of value-added products that turn raw agricultural resources into higher-value offerings.",
      },
      {
        title: "Post-Harvest Loss Reduction",
        description:
          "Practical support for producers on handling, storage and market linkage — reducing avoidable post-harvest losses.",
      },
    ],
  },
};

export const DIVISION_LIST: DivisionDefinition[] = DIVISION_CODES.map((c) => DIVISIONS[c]);

export function getDivisionBySlug(slug: string): DivisionDefinition | undefined {
  return DIVISION_LIST.find((d) => d.slug === slug);
}

export function divisionLabel(code: string | null | undefined): string {
  if (!code) return "";
  return DIVISIONS[code as DivisionCode]?.shortName ?? "";
}

// ---------------- Settings overrides ----------------

export interface DivisionOverride {
  code: string;
  tagline?: string | null;
  description?: string | null;
  services?: DivisionService[] | null;
}

export interface ResolvedDivision extends DivisionDefinition {
  tagline: string;
  description: string;
  services: DivisionService[];
}

/**
 * Merge admin-configured overrides (divisionsJson) on top of the built-in
 * defaults. Malformed rows are ignored; unknown codes are dropped.
 */
export function resolveDivisions(overridesJson: string | null | undefined): ResolvedDivision[] {
  let overrides: DivisionOverride[] = [];
  if (overridesJson) {
    try {
      const parsed = JSON.parse(overridesJson);
      if (Array.isArray(parsed)) overrides = parsed;
    } catch {
      // ignore malformed JSON — fall back to defaults
    }
  }
  const byCode = new Map(overrides.map((o) => [String(o.code), o]));
  return DIVISION_LIST.map((d) => {
    const o = byCode.get(d.code);
    const services =
      o?.services && Array.isArray(o.services) && o.services.length > 0
        ? o.services
            .filter((s) => s && typeof s.title === "string")
            .map((s) => ({
              title: String(s.title).slice(0, 200),
              description: typeof s.description === "string" ? s.description.slice(0, 1000) : "",
            }))
        : d.defaultServices;
    return {
      ...d,
      tagline: (o?.tagline ?? d.defaultTagline).trim() || d.defaultTagline,
      description: (o?.description ?? d.defaultDescription).trim() || d.defaultDescription,
      services,
    };
  });
}

export function resolveDivisionBySlug(
  slug: string,
  overridesJson: string | null | undefined
): ResolvedDivision | undefined {
  return resolveDivisions(overridesJson).find((d) => d.slug === slug);
}
