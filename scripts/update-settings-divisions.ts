// One-off: migrate existing CompanySettings row to the four-division group
// positioning (solar-only hero/about copy is outdated after the divisions update).
import { db } from "../src/lib/db";

async function main() {
  const s = await db.companySettings.findUnique({ where: { id: "main" } });
  if (!s) {
    console.log("No settings row — run prisma/seed.ts first.");
    return;
  }
  const updated = await db.companySettings.update({
    where: { id: "main" },
    data: {
      tagline: "Engineering · Digital · Operations · Cold Chain",
      heroTitle: "Engineering, Digital, Operations & Cold Chain — Delivered by One Group",
      heroSubtitle:
        "Al-Marsus Group Ltd serves homes and businesses through four specialised divisions: MEP engineering (including solar energy), digital solutions, operations services, and cold chain storage & logistics. Configure this text in Admin → Settings.",
      aboutText:
        "Al-Marsus Group Ltd is a multi-division engineering and services group operating through four specialised branches: Al-Marsus MEP Engineering, Al-Marsus Digital, Al-Marsus Operations Services, and Al-Marsus Cold Chain Storage & Logistics. [Placeholder — replace with the company's real history, mission and certifications in Admin → Settings.]",
      // Solar service list is superseded by the MEP Engineering division catalogue
      servicesJson: null,
    },
  });
  console.log("✓ Settings updated to group positioning:", {
    tagline: updated.tagline,
    servicesJson: updated.servicesJson,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
