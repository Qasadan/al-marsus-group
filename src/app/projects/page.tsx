import Link from "next/link";
import Image from "next/image";
import { PublicShell } from "@/components/public/public-shell";
import { PageHero } from "@/components/public/page-hero";
import { db } from "@/lib/db";
import { DIVISION_LIST, divisionLabel } from "@/lib/divisions";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Project Portfolio",
  description: "Completed projects across all four Al-Marsus Group divisions — MEP & solar, digital, operations and cold chain.",
};

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ division?: string }>;
}) {
  const { division: divisionSlug } = await searchParams;
  const selected = DIVISION_LIST.find((d) => d.slug === divisionSlug);
  const gallery = await db.galleryItem.findMany({
    where: { isPublic: true, ...(selected ? { division: selected.code } : {}) },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

  return (
    <PublicShell>
      <PageHero
        eyebrow="Portfolio"
        title="Latest Projects"
        description="A portfolio of work across the group's divisions. Projects are published by the company after handover."
      />
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-14">
        {/* Division filter */}
        <div className="flex flex-wrap gap-2 mb-8" role="navigation" aria-label="Filter projects by division">
          <Link
            href="/projects"
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              !selected
                ? "brand-gradient text-white shadow-sm"
                : "border border-border bg-card text-muted-foreground hover:text-[var(--brand-green)] hover:bg-secondary"
            }`}
          >
            All divisions
          </Link>
          {DIVISION_LIST.map((d) => (
            <Link
              key={d.code}
              href={`/projects?division=${d.slug}`}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                selected?.code === d.code
                  ? "brand-gradient text-white shadow-sm"
                  : "border border-border bg-card text-muted-foreground hover:text-[var(--brand-green)] hover:bg-secondary"
              }`}
            >
              {d.shortName}
            </Link>
          ))}
        </div>

        {gallery.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {gallery.map((item) => (
              <article key={item.id} className="glow-soft group overflow-hidden rounded-xl border border-border bg-card">
                <div className="relative aspect-[4/3] bg-muted">
                  <Image
                    src={item.imageUrl}
                    alt={item.title}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    {item.division && (
                      <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-primary">
                        {divisionLabel(item.division)}
                      </span>
                    )}
                    {item.category && (
                      <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground">
                        {item.category}
                      </span>
                    )}
                    {item.capacityKw != null && (
                      <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                        {item.capacityKw} kW
                      </span>
                    )}
                  </div>
                  <h2 className="font-semibold">{item.title}</h2>
                  {item.description && <p className="mt-1.5 text-sm text-muted-foreground">{item.description}</p>}
                  {item.location && <p className="mt-2 text-xs text-muted-foreground">{item.location}</p>}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
            {selected ? (
              <>
                No published projects for {selected.shortName} yet.{" "}
                <Link href="/projects" className="text-[var(--brand-green)] dark:text-[var(--brand-green-bright)] hover:underline">
                  View all divisions
                </Link>
              </>
            ) : (
              "No published projects yet. Completed work appears here once the company publishes it in Admin → Gallery."
            )}
          </div>
        )}
      </section>
    </PublicShell>
  );
}
