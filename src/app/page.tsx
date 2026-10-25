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
  // No-code hero content — every value is admin-editable (Admin → Settings → Homepage hero).
  const hero = settings.hero;
  const heroTitle = settings.heroTitle ?? "Engineering, Digital, Operations & Cold Chain — Delivered by One Group";
  const heroSubtitle =
    settings.heroSubtitle ??
    "Al-Marsus Group Ltd serves homes and businesses through four specialised branches: MEP engineering (including solar energy), digital solutions, operations services, and cold chain storage & logistics.";
  const heroBadge = hero.badge ?? "One Group · Four Specialised Divisions";
  const primaryCta = { label: hero.primaryCtaLabel ?? "Request a Free Quote", href: hero.primaryCtaHref ?? "/quote" };
  const secondaryCta = { label: hero.secondaryCtaLabel ?? "Explore Our Divisions", href: hero.secondaryCtaHref ?? "/divisions" };
  const heroNote =
    hero.note ??
    "Website content is managed by the company via the admin panel — sections marked as placeholders are pending official information.";

  return (
    <PublicShell>
      {/* Hero — group level (content editable in Admin → Settings, no code required) */}
      <section className="brand-gradient hero-glow text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-20 lg:py-28">
          <div className="max-w-2xl">
            {heroBadge && (
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium mb-6 ring-1 ring-white/20 backdrop-blur-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand-green-bright,#00A651)]" aria-hidden="true" />
                {heroBadge}
              </span>
            )}
            <h1 className="text-4xl sm:text-5xl lg:text-[3.4rem] font-bold leading-[1.08] tracking-tight">
              {heroTitle}
            </h1>
            <p className="mt-6 text-lg text-white/85 leading-relaxed">{heroSubtitle}</p>
            <div className="mt-9 flex flex-col sm:flex-row gap-3">
              <Link
                href={primaryCta.href}
                className="glow-border inline-flex items-center justify-center gap-2 rounded-full bg-[var(--brand-green)] px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-[#00A651]/25 hover:bg-[var(--brand-green-dark)] transition-colors"
              >
                {primaryCta.label} <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href={secondaryCta.href}
                className="glow-border inline-flex items-center justify-center gap-2 rounded-full border border-white/40 px-7 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
              >
                {secondaryCta.label}
              </Link>
            </div>
            <p className="mt-8 text-xs text-white/60">{heroNote}</p>
          </div>
        </div>
      </section>

      {/* Divisions — the four business branches */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-16 lg:py-20">
        <div className="text-center mb-12">
          <span className="eyebrow mb-3">What we do</span>
          <h2 className="text-3xl font-bold tracking-tight text-primary">Our Divisions</h2>
          <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
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
                className="group glow-border flex flex-col rounded-2xl border border-border/70 bg-card p-6 card-hover"
              >
                <div className="mb-5 inline-flex w-fit rounded-xl bg-secondary p-3 text-primary">
                  <Icon className="h-6 w-6" />
                </div>
                <p className="eyebrow !text-[0.68rem]">
                  {d.code === "MEP_ENGINEERING" ? "01" : d.code === "DIGITAL" ? "02" : d.code === "OPERATIONS_SERVICES" ? "03" : "04"}
                </p>
                <h3 className="mt-1.5 font-semibold text-primary">
                  {d.shortName}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground line-clamp-3 flex-1">{d.tagline}</p>
                <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--brand-green)] transition-transform group-hover:translate-x-0.5 dark:text-[var(--brand-green-bright)]">
                  Learn more <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Why the group */}
      <section className="bg-muted/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-16">
          <div className="grid gap-5 md:grid-cols-3">
            <div className="flex gap-4 rounded-2xl border border-border/70 bg-card p-6 glow-soft">
              <div className="inline-flex h-fit rounded-xl bg-secondary p-2.5 text-primary shrink-0">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Quality Workmanship</h3>
                <p className="text-sm text-muted-foreground">Documented testing, commissioning and handover records across every division.</p>
              </div>
            </div>
            <div className="flex gap-4 rounded-2xl border border-border/70 bg-card p-6 glow-soft">
              <div className="inline-flex h-fit rounded-xl bg-secondary p-2.5 text-primary shrink-0">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Skilled Teams</h3>
                <p className="text-sm text-muted-foreground">Engineers, technicians and operators supervised under one accountable group.</p>
              </div>
            </div>
            <div className="flex gap-4 rounded-2xl border border-border/70 bg-card p-6 glow-soft">
              <div className="inline-flex h-fit rounded-xl bg-secondary p-2.5 text-primary shrink-0">
                <Wrench className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Long-Term Support</h3>
                <p className="text-sm text-muted-foreground">From installation to maintenance contracts — we stay after handover.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Portfolio preview */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-16 lg:py-20">
        <div className="flex items-end justify-between mb-8">
          <div>
            <span className="eyebrow mb-3">Our work</span>
            <h2 className="text-3xl font-bold tracking-tight text-primary">Recent Projects</h2>
            <p className="mt-3 text-muted-foreground">A selection of work published by the company.</p>
          </div>
          <Link href="/projects" className="hidden sm:inline-flex items-center gap-1 text-sm font-medium text-[var(--brand-green)] hover:underline dark:text-[var(--brand-green-bright)]">
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {gallery.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {gallery.map((item) => (
              <div key={item.id} className="group glow-soft rounded-2xl overflow-hidden border border-border/70 bg-card card-hover">
                <div className="relative aspect-[4/3] bg-muted">
                  <Image
                    src={item.imageUrl}
                    alt={item.title}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-5">
                  {item.division && (
                    <span className="mb-1.5 inline-block rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-primary">
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
          <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
            No published projects yet. Company administrators can publish completed work in Admin → Gallery.
          </div>
        )}
      </section>

      {/* CTA */}
      <section className="brand-gradient-green hero-glow hero-glow-green text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-16 text-center">
          <h2 className="text-3xl font-bold tracking-tight">Have a project in mind?</h2>
          <p className="mt-3 text-white/85 max-w-xl mx-auto">
            Request a quotation and the right division will get back to you — solar and MEP, digital, operations or
            cold chain.
          </p>
          <Link
            href="/quote"
            className="mt-7 inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-3 text-sm font-semibold text-[var(--brand-green-dark)] shadow-lg shadow-black/10 hover:bg-white/90 transition-colors"
          >
            Request a Quote <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </PublicShell>
  );
}
