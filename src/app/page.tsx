import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Zap, Cpu, HardHat, Snowflake, ShieldCheck, Users, Wrench } from "lucide-react";
import { PublicShell } from "@/components/public/public-shell";
import { getPublicSettings } from "@/lib/settings";
import { db } from "@/lib/db";
import { divisionLabel } from "@/lib/divisions";

export const dynamic = "force-dynamic";

const DIVISION_ICONS = { zap: Zap, cpu: Cpu, "hard-hat": HardHat, snowflake: Snowflake } as const;

export default async function HomePage() {
  const settings = await getPublicSettings();
  const gallery = await db.galleryItem.findMany({
    where: { isPublic: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    take: 6,
  });
  const divisions = settings.divisions;

  return (
    <PublicShell>
      {/* Hero — group level */}
      <section className="brand-gradient text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-20 lg:py-28">
          <div className="max-w-2xl">
            <span className="inline-flex items-center rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium mb-6">
              One Group · Four Specialised Divisions
            </span>
            <h1 className="text-4xl sm:text-5xl font-bold leading-tight">
              {settings.heroTitle ?? "Engineering, Digital, Operations & Cold Chain — Delivered by One Group"}
            </h1>
            <p className="mt-5 text-lg text-white/85 leading-relaxed">
              {settings.heroSubtitle ??
                "Al-Marsus Group Ltd serves homes and businesses through four specialised branches: MEP engineering (including solar energy), digital solutions, operations services, and cold chain storage & logistics."}
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link
                href="/quote"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-[var(--brand-green)] px-6 py-3 text-sm font-semibold text-white hover:bg-[var(--brand-green-dark)] transition-colors"
              >
                Request a Free Quote <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/divisions"
                className="inline-flex items-center justify-center gap-2 rounded-md border border-white/40 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
              >
                Explore Our Divisions
              </Link>
            </div>
            <p className="mt-6 text-xs text-white/60">
              Website content is managed by the company via the admin panel — sections marked as placeholders are
              pending official information.
            </p>
          </div>
        </div>
      </section>

      {/* Divisions — the four business branches */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-[var(--brand-indigo)]">Our Divisions</h2>
          <p className="mt-2 text-muted-foreground max-w-2xl mx-auto">
            Four specialised branches, one accountable partner — each with its own engineering teams and service
            catalogue.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {divisions.map((d) => {
            const Icon = DIVISION_ICONS[d.icon];
            return (
              <Link
                key={d.code}
                href={`/divisions/${d.slug}`}
                className="group flex flex-col rounded-xl border border-border bg-card p-6 hover:shadow-md transition-shadow"
              >
                <div className="mb-4 inline-flex rounded-lg bg-secondary p-3 text-[var(--brand-indigo)]">
                  <Icon className="h-6 w-6" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--brand-green)]">
                  {d.code === "MEP_ENGINEERING" ? "01" : d.code === "DIGITAL" ? "02" : d.code === "OPERATIONS_SERVICES" ? "03" : "04"}
                </p>
                <h3 className="mt-1 font-semibold text-[var(--brand-indigo)] group-hover:underline">
                  {d.shortName}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground line-clamp-3">{d.tagline}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[var(--brand-green)]">
                  Learn more <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Why the group */}
      <section className="bg-muted">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-16">
          <div className="grid gap-8 md:grid-cols-3">
            <div className="flex gap-4">
              <ShieldCheck className="h-8 w-8 text-[var(--brand-green)] shrink-0" />
              <div>
                <h3 className="font-semibold mb-1">Quality Workmanship</h3>
                <p className="text-sm text-muted-foreground">Documented testing, commissioning and handover records across every division.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <Users className="h-8 w-8 text-[var(--brand-green)] shrink-0" />
              <div>
                <h3 className="font-semibold mb-1">Skilled Teams</h3>
                <p className="text-sm text-muted-foreground">Engineers, technicians and operators supervised under one accountable group.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <Wrench className="h-8 w-8 text-[var(--brand-green)] shrink-0" />
              <div>
                <h3 className="font-semibold mb-1">Long-Term Support</h3>
                <p className="text-sm text-muted-foreground">From installation to maintenance contracts — we stay after handover.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Portfolio preview */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-[var(--brand-indigo)]">Recent Projects</h2>
            <p className="mt-2 text-muted-foreground">A selection of work published by the company.</p>
          </div>
          <Link href="/projects" className="hidden sm:inline-flex items-center gap-1 text-sm font-medium text-[var(--brand-green)] hover:underline">
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {gallery.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {gallery.map((item) => (
              <div key={item.id} className="group rounded-xl overflow-hidden border border-border bg-card">
                <div className="relative aspect-[4/3] bg-muted">
                  <Image
                    src={item.imageUrl}
                    alt={item.title}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-4">
                  {item.division && (
                    <span className="mb-1.5 inline-block rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-[var(--brand-indigo)]">
                      {divisionLabel(item.division)}
                    </span>
                  )}
                  <h3 className="font-medium">{item.title}</h3>
                  {(item.location || item.capacityKw) && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {[item.location, item.capacityKw ? `${item.capacityKw} kW` : null].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
            No published projects yet. Company administrators can publish completed work in Admin → Gallery.
          </div>
        )}
      </section>

      {/* CTA */}
      <section className="brand-gradient-green text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-14 text-center">
          <h2 className="text-3xl font-bold">Have a project in mind?</h2>
          <p className="mt-3 text-white/85 max-w-xl mx-auto">
            Request a quotation and the right division will get back to you — solar and MEP, digital, operations or
            cold chain.
          </p>
          <Link
            href="/quote"
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-md bg-white px-6 py-3 text-sm font-semibold text-[var(--brand-green-dark)] hover:bg-white/90 transition-colors"
          >
            Request a Quote <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </PublicShell>
  );
}
