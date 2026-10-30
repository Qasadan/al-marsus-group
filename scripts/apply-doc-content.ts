// One-off (Task 20): apply the official company document "Our Vision and mission"
// to the live database.
//  1. Migrate division rows from the retired OPERATIONS_SERVICES code to AGRO_PROCESSING
//     (division display names live in src/lib/divisions.ts; DB rows store codes).
//  2. Rewrite CompanySettings website copy from the document: vision, mission,
//     about, tagline, hero title/subtitle, address, and per-division content
//     (divisionsJson) for the four documented businesses.
import { db } from "../src/lib/db";

const VISION = `To become a leading and trusted business group we want to be known for excellence in engineering, logistics, digital innovation and agro processing. The leading and trusted diversified business group that we imagine will help sustainable growth and lift people's livelihoods. We will bring excellence in engineering, cold-chain infrastructure and solutions, innovation and agro processing to every project and we will create sustainable economic growth for communities.`;

const MISSION = `To establish, develop and manage businesses that deliver high-quality products and services to respond to market needs to create employment opportunities to embrace innovation and to generate lasting value, for customers, partners, employees and shareholders. Successful businesses create value.`;

const ABOUT = [
  `Al-Marsus Group Ltd is a diversified parent company being developed with a vision to establish sustainable businesses across engineering, cold-chain infrastructure, digital technology, and agro-processing.`,
  `At Al-Marsus Group Ltd, we believe that great businesses are built not only to create value, but also to create opportunities, solve real challenges, and contribute to a better future.`,
  `Our Group is being developed around four important sectors: engineering, cold-chain infrastructure, digital innovation, and agro-processing. These sectors offer opportunities to strengthen infrastructure, improve the handling and preservation of products, support business digitalization, and increase the value of agricultural resources.`,
  `We aim to establish businesses that prioritize quality, professionalism, innovation, and lasting relationships with customers and partners.`,
  `From our designated head-office location in Mogadishu to our branches in Baidoa and Barawe, our long-term ambition is to develop a strong business presence that responds to market needs and supports economic progress.`,
  `As we build our organization, we remain focused on developing capable teams, pursuing strategic partnerships, and creating sustainable business opportunities.`,
].join("\n");

const DIVISIONS_JSON = JSON.stringify([
  {
    code: "MEP_ENGINEERING",
    tagline: "Engineering Reliable Infrastructure",
    description:
      "Al-Marsus MEP Engineering focuses on mechanical, electrical, and plumbing engineering services for buildings, commercial facilities, and infrastructure projects. Its intended service areas include electrical installations, plumbing and drainage systems, HVAC, refrigeration systems, engineering support, installation, and maintenance. Our objective is to support reliable, efficient, and functional facilities through professional engineering practices and quality-focused solutions.",
    services: [
      { title: "Electrical Installations", description: "Power distribution, lighting, backup and UPS systems, earthing and lightning protection — installed to code, tested and commissioned before handover." },
      { title: "Plumbing & Drainage Systems", description: "Water supply, pumping, storage and drainage systems designed for pressure, hygiene and durability in residential, commercial and public buildings." },
      { title: "HVAC & Refrigeration Systems", description: "Air conditioning, ventilation, climate control and refrigeration systems for buildings and cold rooms, sized and balanced by qualified engineers." },
      { title: "Solar Energy Solutions", description: "Grid-tied, hybrid and off-grid solar PV systems with battery storage — site surveys, system design, installation, commissioning and long-term maintenance." },
      { title: "Engineering Support & Installation", description: "Technical supervision, installation management and commissioning support for developers, contractors and facility owners." },
      { title: "Maintenance & Retrofit", description: "Preventive maintenance contracts, fault troubleshooting and energy-efficiency upgrades for existing MEP installations." },
    ],
  },
  {
    code: "COLD_CHAIN",
    tagline: "Preserving Quality. Connecting Markets.",
    description:
      "Al-Marsus Cold Chain Infrastructure & Solutions focuses on cold storage infrastructure and temperature-controlled services for farmers, exporters, food businesses, and other customers handling perishable products. Its intended activities include cold storage facilities, refrigerated fleets, farmer collection centers, pre-cooling facilities, export cold-chain hubs, and temperature monitoring. Our ambition is to help preserve product quality, reduce avoidable post-harvest losses, and strengthen connections between producers and markets.",
    services: [
      { title: "Cold Storage Facilities", description: "Walk-in chillers and freezers designed, built and operated around your product's temperature profile, with chilled and frozen storage capacity." },
      { title: "Refrigerated Fleet & Distribution", description: "Temperature-controlled collection and delivery with planned routes, monitoring and delivery documentation from farm or facility to market." },
      { title: "Farmer Collection Centres", description: "Local collection points where producers can bring perishable produce for immediate cooling, safe storage and onward distribution." },
      { title: "Pre-Cooling Facilities", description: "Rapid pre-cooling that removes field heat from freshly harvested produce — a critical step for preserving shelf life and quality." },
      { title: "Export Cold-Chain Hubs", description: "Consolidation, storage and handling hubs that prepare temperature-sensitive goods for export markets under controlled conditions." },
      { title: "Temperature Monitoring & Compliance", description: "Continuous temperature logging, alarm escalation and reports supporting food-safety and quality requirements across the chain." },
    ],
  },
  {
    code: "DIGITAL",
    tagline: "Digital Engineering. Smarter Maintenance.",
    description:
      "Al-Marsus Digital delivers digital MEP design, BIM modelling, engineering software solutions, and QR-code-based maintenance management for buildings and engineering facilities. Our services enable clients to access equipment records, track maintenance dates, schedule servicing, and manage engineering assets more efficiently. Our goal: to connect engineering with digital innovation for smarter, safer, and more efficient building management.",
    services: [
      { title: "Digital MEP Design & BIM Modelling", description: "Building Information Modelling and coordinated digital MEP design that reduces clashes, rework and cost before construction begins." },
      { title: "Engineering Software Solutions", description: "Business management software — quotations, inventory, invoicing and workflow tools — tailored to how your operation actually runs." },
      { title: "QR-Code Maintenance Management", description: "QR-coded equipment that lets clients access equipment records, track maintenance dates, schedule servicing and manage engineering assets efficiently." },
      { title: "Smart Building & Monitoring", description: "Sensors and dashboards for energy, temperature and equipment monitoring across one or many sites." },
      { title: "Websites & Business Applications", description: "Company websites, customer portals and online booking or ordering systems — designed, built and maintained by the team." },
      { title: "Networking & Security Systems", description: "Structured cabling, LAN and Wi-Fi, servers, CCTV and access control with remote monitoring and recording." },
    ],
  },
  {
    code: "AGRO_PROCESSING",
    tagline: "Turning Agricultural Resources into Greater Value",
    description:
      "Al-Marsus Agro-Processing focuses on agricultural processing and value addition, with an emphasis on improving product quality, preservation, packaging, and market readiness. Its intended activities include agricultural produce handling, cleaning, sorting, grading, processing, packaging, and the development of value-added products. Our ambition is to support agricultural producers, strengthen local value chains, reduce post-harvest losses, and create opportunities for agricultural products to reach wider markets.",
    services: [
      { title: "Produce Handling & Reception", description: "Careful reception and handling of agricultural produce at the point of intake to protect quality from the very first step." },
      { title: "Cleaning, Sorting & Grading", description: "Cleaning, sorting and grading lines that prepare produce to consistent quality standards buyers can rely on." },
      { title: "Processing & Preservation", description: "Processing and preservation methods that extend shelf life and open the door to new product formats." },
      { title: "Packaging & Market Readiness", description: "Packaging solutions that protect the product, communicate quality and prepare goods for retail and export markets." },
      { title: "Value-Added Product Development", description: "Development of value-added products that turn raw agricultural resources into higher-value offerings." },
      { title: "Post-Harvest Loss Reduction", description: "Practical support for producers on handling, storage and market linkage — reducing avoidable post-harvest losses." },
    ],
  },
]);

async function main() {
  // 1) Migrate retired division code → AGRO_PROCESSING across all business tables
  for (const table of ["Lead", "QuoteRequest", "Quotation", "Project", "GalleryItem"]) {
    const res = await db.$executeRawUnsafe(
      `UPDATE "${table}" SET division = 'AGRO_PROCESSING' WHERE division = 'OPERATIONS_SERVICES'`
    );
    if (res > 0) console.log(`${table}: migrated ${res} row(s) OPERATIONS_SERVICES → AGRO_PROCESSING`);
  }

  // 2) Document content → CompanySettings
  const s = await db.companySettings.findUnique({ where: { id: "main" } });
  if (!s) throw new Error("No CompanySettings row — run prisma/seed.ts first.");
  await db.companySettings.update({
    where: { id: "main" },
    data: {
      tagline: "Engineering · Cold Chain · Digital · Agro-Processing",
      heroTitle: "Engineering, Cold Chain, Digital & Agro-Processing — Delivered by One Group",
      heroSubtitle:
        "Al-Marsus Group Ltd is a diversified parent company being developed with a vision to establish sustainable businesses across engineering, cold-chain infrastructure, digital technology, and agro-processing.",
      aboutText: ABOUT,
      missionText: MISSION,
      visionText: VISION,
      address: "Mogadishu, Somalia",
      divisionsJson: DIVISIONS_JSON,
    },
  });
  console.log("✓ CompanySettings updated from the official document (vision/mission/about/hero/divisions/address)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
