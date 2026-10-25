// Al-Marsus Group Ltd — division (business branch) definitions.
//
// The group operates FOUR branches:
//   1. Al-Marsus MEP Engineering
//   2. Al-Marsus Digital
//   3. Al-Marsus Operations Services
//   4. Al-Marsus Cold Chain Storage & Logistics
//
// This file is the built-in default content. Administrators can override the
// tagline, description and service lists per division via Admin → Settings
// (stored as `divisionsJson` on CompanySettings — see resolveDivisions()).
//
// NOTE: service lists are the group's default offering descriptions. Any
// claim that requires verification (certifications, accreditations, client
// names) is intentionally NOT included here.

export const DIVISION_CODES = ["MEP_ENGINEERING", "DIGITAL", "OPERATIONS_SERVICES", "COLD_CHAIN"] as const;
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
  icon: "zap" | "cpu" | "hard-hat" | "snowflake";
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
    defaultTagline:
      "Mechanical, electrical and plumbing engineering — with solar energy as our flagship offering.",
    defaultDescription:
      "The engineering backbone of the group. Al-Marsus MEP Engineering designs, supplies, installs and commissions mechanical, electrical and plumbing systems for residential, commercial and industrial buildings — including solar PV and energy storage systems delivered end to end, from site survey to long-term maintenance.",
    defaultServices: [
      {
        title: "Solar Energy Solutions",
        description:
          "Grid-tied, hybrid and off-grid solar PV systems with battery storage — site surveys, system design, installation, commissioning and long-term maintenance.",
      },
      {
        title: "Electrical Systems",
        description:
          "Power distribution, lighting, backup and UPS systems, earthing and lightning protection — installed to code and tested before handover.",
      },
      {
        title: "Mechanical & HVAC",
        description:
          "Air conditioning, ventilation and climate-control systems for buildings and cold rooms, sized and balanced by qualified engineers.",
      },
      {
        title: "Plumbing & Water Systems",
        description:
          "Water supply, pumping, storage and drainage systems designed for pressure, hygiene and durability.",
      },
      {
        title: "Fire Protection Systems",
        description:
          "Fire detection, alarm and suppression pipework integrated with the rest of the building services.",
      },
      {
        title: "Maintenance & Retrofit",
        description:
          "Preventive maintenance contracts, fault troubleshooting and energy-efficiency upgrades for existing MEP installations.",
      },
    ],
  },
  DIGITAL: {
    code: "DIGITAL",
    slug: "digital",
    shortName: "Digital",
    fullName: "Al-Marsus Digital",
    icon: "cpu",
    defaultTagline:
      "Digital products, connectivity and smart technology for modern businesses.",
    defaultDescription:
      "Al-Marsus Digital builds the technology layer of the group — from company websites and business management software to the networks, security systems and smart devices that keep sites connected, monitored and secure.",
    defaultServices: [
      {
        title: "Websites & Web Applications",
        description:
          "Company websites, customer portals and online booking or ordering systems — designed, built and maintained by the team.",
      },
      {
        title: "Business Management Software",
        description:
          "Quotation, inventory, invoicing and workflow tools tailored to how your business actually operates.",
      },
      {
        title: "Networking & IT Infrastructure",
        description:
          "Structured cabling, LAN and Wi-Fi, servers and cloud setup for offices, sites and warehouses.",
      },
      {
        title: "CCTV & Access Control",
        description:
          "Surveillance cameras, access control and alarm systems with remote monitoring and recording.",
      },
      {
        title: "Smart Building & Monitoring",
        description:
          "Sensors and dashboards for energy, temperature and equipment monitoring across one or many sites.",
      },
      {
        title: "IT Support & Managed Services",
        description:
          "Helpdesk support, device and account management, backups and ongoing system care.",
      },
    ],
  },
  OPERATIONS_SERVICES: {
    code: "OPERATIONS_SERVICES",
    slug: "operations-services",
    shortName: "Operations Services",
    fullName: "Al-Marsus Operations Services",
    icon: "hard-hat",
    defaultTagline:
      "Operations, maintenance and skilled manpower that keep facilities running.",
    defaultDescription:
      "Al-Marsus Operations Services takes responsibility for the day-to-day running of buildings and equipment — planned preventive maintenance, repairs, operations support and qualified technicians on the ground, all coordinated and supervised by the group.",
    defaultServices: [
      {
        title: "Facility Management",
        description:
          "Planned preventive maintenance schedules and day-to-day repairs for commercial and residential properties.",
      },
      {
        title: "Technical Manpower",
        description:
          "Skilled technicians, machine operators and maintenance crews supplied, scheduled and supervised by the group.",
      },
      {
        title: "Generator & Plant Operation",
        description:
          "Standby generator servicing, fuel management and plant-room operation with run-hour logs and reports.",
      },
      {
        title: "Equipment Servicing",
        description:
          "Pumps, HVAC units, distribution boards and cold-room equipment serviced on a fixed schedule.",
      },
      {
        title: "Operations Support & Reporting",
        description:
          "Site supervision, checklists, service logs and monthly reporting that keep operations auditable.",
      },
    ],
  },
  COLD_CHAIN: {
    code: "COLD_CHAIN",
    slug: "cold-chain",
    shortName: "Cold Chain",
    fullName: "Al-Marsus Cold Chain Storage & Logistics",
    icon: "snowflake",
    defaultTagline:
      "Cold storage and temperature-controlled logistics you can rely on.",
    defaultDescription:
      "Al-Marsus Cold Chain provides temperature-controlled storage and distribution for food, agricultural and pharmaceutical goods — from cold-room design and construction to refrigerated transport, monitoring and compliance reporting.",
    defaultServices: [
      {
        title: "Cold Room Design & Construction",
        description:
          "Walk-in chillers and freezers designed, built and commissioned around your product's temperature profile.",
      },
      {
        title: "Cold Storage Warehousing",
        description:
          "Chilled and frozen pallet storage with inventory tracking, stock rotation and loading support.",
      },
      {
        title: "Refrigerated Transport & Distribution",
        description:
          "Temperature-controlled collection and delivery with planned routes and delivery documentation.",
      },
      {
        title: "Temperature Monitoring & Compliance",
        description:
          "Continuous temperature logging, alarm escalation and reports supporting food-safety and GDP requirements.",
      },
      {
        title: "Refrigeration Equipment & Service",
        description:
          "Refrigeration units, spare parts and preventive maintenance contracts for cold rooms and display equipment.",
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
