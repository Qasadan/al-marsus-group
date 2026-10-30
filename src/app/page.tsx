import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Zap,
  Cpu,
  Wheat,
  Snowflake,
  Phone,
  ShieldCheck,
  Users,
  Wrench,
  LayoutGrid,
  FolderCheck,
  Quote,
  Award,
} from "lucide-react";
import { PublicShell } from "@/components/public/public-shell";
import { HeroSlider } from "@/components/public/hero-slider";
import { getPublicSettings } from "@/lib/settings";
import { db } from "@/lib/db";
import { divisionLabel } from "@/lib/divisions";

export const dynamic = "force-dynamic";

const DIVISION_ICONS = { zap: Zap, cpu: Cpu, "wheat": Wheat, snowflake: Snowflake } as const;

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
  const heroTitle = settings.heroTitle ?? "Engineering, Cold Chain, Digital & Agro-Processing — Delivered by One Group";
  const heroSubtitle =
    settings.heroSubtitle ??
    "Al-Marsus Group Ltd is a diversified parent company establishing sustainable businesses across engineering, cold-chain infrastructure & solutions, digital innovation, and agro-processing.";
  const heroBadge = hero.badge ?? "One Group · Four Specialised Divisions";
  const primaryCta = { label: hero.primaryCtaLabel ?? "Request a Free Quote", href: hero.primaryCtaHref ?? "/quote" };
  const secondaryCta = { label: hero.secondaryCtaLabel ?? "Explore Our Divisions", href: hero.secondaryCtaHref ?? "/divisions" };
  const heroNote =
    hero.note ??
    "Website content is managed by the company via the admin panel — sections marked as placeholders are pending official information.";
  // Hero slider images (up to 3) — uploaded/managed in Admin → Settings, no code.
  const heroImages = hero.images ?? [];
  const serviceCount = divisions.reduce((sum, d) => sum + (d.services?.length ?? 0), 0);

  return (
    <PublicShell>
      {/* ————— Hero — split layout like the reference design: pale panel with the
          headline on the left, fast glow-framed admin-managed slider on the right,
          green hotline box overlapping the image edge. Content is editable in
          Admin → Settings without code. ————— */}
      <section className="relative overflow-hidden">
        <div className="grid lg:min-h-[560px] lg:grid-cols-2">
          {/* Left panel */}
          <div className="flex items-center bg-[var(--brand-mint)] dark:bg-[var(--brand-mint)] bg-grid-lines">
            <div className="px-4 py-14 sm:px-6 lg:py-20 lg:pl-[max(1.5rem,calc((100vw-80rem)/2+1.5rem))] lg:pr-16 w-full">
              <div className="max-w-xl">
                {heroBadge && (
                  <span className="eyebrow mb-4 text-[0.8rem] font-semibold tracking-[0.14em] uppercase text-[var(--brand-green)] dark:text-[var(--brand-green-bright)]">
                    {heroBadge}
                  </span>
                )}
                <h1 className="text-4xl font-bold leading-[1.06] tracking-tight sm:text-5xl xl:text-[3.6rem]">
                  {heroTitle}
                </h1>
                <p className="mt-6 text-[1.05rem] leading-relaxed text-muted-foreground">{heroSubtitle}</p>
                <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Link
                    href={primaryCta.href}
                    className="glow-border inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--brand-green)] px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[var(--brand-green)]/25 transition-colors hover:bg-[var(--brand-green-dark)]"
                  >
                    {primaryCta.label} <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href={secondaryCta.href}
                    className="inline-flex items-center justify-center gap-2 rounded-lg px-2 py-3 text-sm font-semibold text-foreground underline decoration-[var(--brand-green)] decoration-2 underline-offset-8 transition-colors hover:text-[var(--brand-green)] sm:ml-2"
                  >
                    {secondaryCta.label}
                  </Link>
                </div>
                <p className="mt-8 text-xs text-muted-foreground/70">{heroNote}</p>
              </div>
            </div>
          </div>

          {/* Right panel — slider (admin-managed) or branded fallback */}
          <div className="relative min-h-[320px] lg:min-h-full">
            {/* Diagonal white slash accent, like the reference hero cut (behind media) */}
            <div
              aria-hidden="true"
              className="absolute -left-24 bottom-0 z-0 hidden h-10 w-[130%] -rotate-2 bg-background lg:block"
            />
            {heroImages.length > 0 ? (
              <div className="absolute inset-0 z-[1]">
                <HeroSlider
                  images={heroImages}
                  intervalMs={hero.intervalMs ?? undefined}
                  priorityFirst
                  className="h-full w-full rounded-none"
                />
              </div>
            ) : (
              <div className="dark-eco-gradient relative z-[1] flex h-full items-center justify-center bg-grid-lines">
                <img
                  src={settings.logoUrl}
                  alt=""
                  aria-hidden="true"
                  className="w-48 opacity-20 grayscale invert dark:opacity-25 dark:invert-0"
                />
              </div>
            )}
            {/* Green hotline box — reference design signature element. Uses the
                company's configured phone/email; falls back to the quote form
                while contact details are not yet configured. */}
            <div className="hotline-box absolute bottom-6 left-0 z-10 hidden items-center gap-4 py-4 pl-6 pr-8 text-white shadow-xl sm:flex lg:bottom-12">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/30">
                <Phone className="h-5 w-5" />
              </span>
              <span className="text-sm leading-snug">
                For any inquiries call the
                <br />
                hotline:{" "}
                {settings.phone ? (
                  <a href={`tel:${settings.phone}`} className="font-bold text-white underline-offset-2 hover:underline">
                    {settings.phone}
                  </a>
                ) : settings.email ? (
                  <a href={`mailto:${settings.email}`} className="font-bold text-white underline-offset-2 hover:underline">
                    {settings.email}
                  </a>
                ) : (
                  <Link href="/quote" className="font-bold text-white underline-offset-2 hover:underline">
                    request a quote online
                  </Link>
                )}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ————— Divisions — the four business branches (reference blob-card style) ————— */}
      <section className="bg-grid-lines">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-24">
          <div className="mb-14 text-center">
            <span className="eyebrow mb-3">
              <span className="text-[var(--brand-green)] dark:text-[var(--brand-green-bright)]">{"// "}</span>
              What we do
            </span>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-[2.9rem]">Our Divisions</h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              Four specialised branches, one accountable partner — each with its own engineering teams and service
              catalogue.
            </p>
          </div>
          <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
            {divisions.map((d, idx) => {
              const Icon = DIVISION_ICONS[d.icon];
              return (
                <Link key={d.code} href={`/divisions/${d.slug}`} className="group glow-soft flex flex-col items-center text-center">
                  <span className="relative mb-6 inline-block">
                    <span className="blob-shape flex h-36 w-36 items-center justify-center bg-secondary ring-8 ring-card transition-transform duration-300 group-hover:scale-105 dark:ring-[var(--brand-cream)]">
                      <Icon className="h-12 w-12 text-[var(--brand-green)] dark:text-[var(--brand-green-bright)]" strokeWidth={1.4} />
                    </span>
                    <span className="absolute -left-2 -top-2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-card text-sm font-bold text-[var(--brand-green)] shadow-md ring-1 ring-border dark:ring-[var(--brand-green)]/30">
                      0{idx + 1}
                    </span>
                  </span>
                  <h3 className="text-xl font-bold">{d.shortName}</h3>
                  <p className="mt-2.5 line-clamp-3 flex-1 text-sm leading-relaxed text-muted-foreground">{d.tagline}</p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--brand-green)] transition-transform group-hover:translate-x-0.5 dark:text-[var(--brand-green-bright)]">
                    Learn more <ArrowRight className="h-4 w-4" />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ————— About the group — collage + checklist (reference "What we do best") ————— */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Collage from the real published portfolio (fallback: branded panel) */}
          <div className="relative mx-auto w-full max-w-lg pb-10 pl-6 pt-10 lg:mx-0">
            {gallery.length > 0 ? (
              <>
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl shadow-xl">
                  <Image
                    src={gallery[0].imageUrl}
                    alt={gallery[0].title}
                    fill
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className="object-cover"
                  />
                </div>
                {gallery.length > 1 && (
                  <div className="absolute bottom-0 left-0 aspect-[16/10] w-52 overflow-hidden rounded-xl border-4 border-card shadow-xl dark:border-[var(--brand-cream)]">
                    <Image
                      src={gallery[1].imageUrl}
                      alt={gallery[1].title}
                      fill
                      sizes="220px"
                      className="object-cover"
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="dark-eco-gradient flex aspect-[4/3] w-full items-center justify-center rounded-2xl">
                <img src={settings.logoUrl} alt="" aria-hidden="true" className="w-40 opacity-25 grayscale invert dark:opacity-30 dark:invert-0" />
              </div>
            )}
            <span className="brand-gradient-green absolute left-0 top-0 inline-flex h-20 w-20 items-center justify-center rounded-2xl text-white shadow-lg">
              <Award className="h-9 w-9" strokeWidth={1.5} />
            </span>
          </div>

          <div>
            <span className="eyebrow mb-3">
              <span className="text-[var(--brand-green)] dark:text-[var(--brand-green-bright)]">{"// "}</span>
              About the group
            </span>
            <h2 className="text-3xl font-bold leading-[1.1] tracking-tight sm:text-4xl lg:text-[2.9rem]">
              One accountable partner for four specialised branches
            </h2>
            <p className="mt-5 leading-relaxed text-muted-foreground">
              {(settings.aboutText ?? settings.missionText ?? settings.tagline ??
                "Al-Marsus Group Ltd delivers engineering, digital, operations and cold chain services through dedicated division teams — from site survey to handover and long-term support.")
                .split("\n")[0]}
            </p>
            <div className="mt-7 grid gap-5 sm:grid-cols-2">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-8 w-8 shrink-0 text-[var(--brand-green)] dark:text-[var(--brand-green-bright)]" strokeWidth={1.5} />
                <p className="text-sm font-semibold leading-snug">
                  Documented testing, commissioning and handover records on every job
                </p>
              </div>
              <div className="flex items-start gap-3">
                <Wrench className="mt-0.5 h-8 w-8 shrink-0 text-[var(--brand-green)] dark:text-[var(--brand-green-bright)]" strokeWidth={1.5} />
                <p className="text-sm font-semibold leading-snug">
                  Maintenance contracts and support that continue after handover
                </p>
              </div>
            </div>
            <div className="mt-9 flex flex-wrap items-center gap-5">
              <Link
                href="/about"
                className="glow-border inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--brand-green)] px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[var(--brand-green)]/25 transition-colors hover:bg-[var(--brand-green-dark)]"
              >
                About us <ArrowRight className="h-4 w-4" />
              </Link>
              {settings.phone && (
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-[var(--brand-green)]">
                    <Phone className="h-4 w-4" />
                  </span>
                  <span className="text-sm leading-tight">
                    <span className="block text-muted-foreground">Call for help</span>
                    <a href={`tel:${settings.phone}`} className="font-bold hover:text-[var(--brand-green)]">
                      {settings.phone}
                    </a>
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ————— Featured work — dark band with numbered list (reference parallax band) ————— */}
      <section className="dark-eco-gradient relative overflow-hidden text-white">
        <div className="absolute inset-0 bg-dots-dark" aria-hidden="true" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <span className="eyebrow mb-3 text-[var(--brand-green-bright)]">
                <span>{"// "}</span>
                {gallery.length > 0 ? "Featured project" : "Our work"}
              </span>
              <h2 className="text-3xl font-bold leading-[1.08] sm:text-4xl lg:text-[3rem]">
                {gallery.length > 0 ? gallery[0].title : "Engineering, digital, operations and cold chain — under one roof"}
              </h2>
              {gallery.length > 0 && (gallery[0].description || gallery[0].location || gallery[0].category) && (
                <p className="mt-4 max-w-xl text-white/70">
                  {[gallery[0].category, gallery[0].location, gallery[0].description].filter(Boolean).join(" · ")}
                </p>
              )}
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/projects"
                  className="glow-border inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--brand-green)] px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--brand-green-dark)]"
                >
                  View Projects <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/quote"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/30 px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                >
                  Request a Quote
                </Link>
              </div>
            </div>
            {/* Numbered list of the latest published work (or divisions when empty) */}
            <ol className="space-y-4">
              {(gallery.length > 0 ? gallery.slice(0, 3) : divisions).map((item, i) => {
                const title = "title" in item ? item.title : item.shortName;
                const meta =
                  "division" in item
                    ? [item.category, item.location, item.capacityKw ? `${item.capacityKw} kW` : null]
                        .filter(Boolean)
                        .join(" · ") || divisionLabel(item.division)
                    : item.tagline;
                return (
                  <li key={i} className="flex items-center gap-5 border-b border-white/10 pb-4">
                    <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--brand-green)] text-sm font-bold text-white shadow-lg shadow-black/20">
                      0{i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-bold leading-snug">{title}</p>
                      <p className="truncate text-sm text-white/55">{meta}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </section>

      {/* ————— Latest projects — staggered overlay cards on cream (reference style) ————— */}
      <section className="bg-contour bg-[var(--brand-cream)] dark:bg-[var(--brand-cream)]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-24">
          <div className="mb-12 text-center">
            <span className="eyebrow mb-3">
              <span className="text-[var(--brand-green)] dark:text-[var(--brand-green-bright)]">{"// "}</span>
              Successful projects
            </span>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-[2.9rem]">Latest Projects</h2>
          </div>
          {gallery.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {gallery.slice(0, 3).map((item, i) => (
                <Link
                  key={item.id}
                  href="/projects"
                  className={`glow-soft group relative block overflow-hidden rounded-xl ${i === 1 ? "lg:mt-10" : i === 2 ? "lg:mt-20" : ""}`}
                >
                  <div className="relative aspect-[3/4] bg-muted">
                    <Image
                      src={item.imageUrl}
                      alt={item.title}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" aria-hidden="true" />
                  </div>
                  <div className="absolute inset-x-0 bottom-0 p-6">
                    {item.division && (
                      <span className="eyebrow mb-1.5 block text-[0.72rem] text-[var(--brand-green-bright)]">
                        {divisionLabel(item.division)}
                      </span>
                    )}
                    <h3 className="text-xl font-bold text-white">{item.title}</h3>
                    {(item.location || item.capacityKw) && (
                      <p className="mt-1 text-sm text-white/70">
                        {[item.location, item.capacityKw ? `${item.capacityKw} kW` : null].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="mx-auto max-w-2xl rounded-2xl border border-dashed border-border bg-card p-10 text-center text-muted-foreground">
              No published projects yet. Company administrators can publish completed work in Admin → Gallery.
            </div>
          )}
          <div className="mt-10 text-center">
            <Link
              href="/projects"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand-green)] hover:underline dark:text-[var(--brand-green-bright)]"
            >
              Explore all projects <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ————— The group at a glance — dark stats band (reference counters) ————— */}
      <section className="dark-eco-gradient relative overflow-hidden text-white">
        <div className="absolute inset-0 bg-dots-dark" aria-hidden="true" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <span className="eyebrow mb-3 text-[var(--brand-green-bright)]">
                <span>{"// "}</span>
                Providing value
              </span>
              <h2 className="text-3xl font-bold leading-[1.1] sm:text-4xl">The group at a glance</h2>
              <p className="mt-4 max-w-xl text-white/70">
                Real figures from this platform — published portfolio work, active divisions and the service lines
                behind them.
              </p>
              <div className="mt-9 grid grid-cols-3 gap-6">
                {[
                  { icon: LayoutGrid, value: String(divisions.length), label: "Specialised divisions" },
                  { icon: FolderCheck, value: String(gallery.length), label: "Projects published" },
                  { icon: Wrench, value: String(serviceCount), label: "Service lines offered" },
                ].map(({ icon: Icon, value, label }) => (
                  <div key={label}>
                    <Icon className="mb-3 h-8 w-8 text-[var(--brand-green-bright)]" strokeWidth={1.4} />
                    <p className="text-4xl font-bold text-[var(--brand-amber)]">{value}</p>
                    <p className="mt-1 text-sm font-medium text-white/70">{label}</p>
                  </div>
                ))}
              </div>
            </div>
            {/* Mission/vision card — real admin-configured content only */}
            {(settings.visionText || settings.missionText) && (
              <div className="relative lg:pl-10">
                <div className="rounded-2xl bg-[#0D140F]/90 p-8 shadow-2xl ring-1 ring-white/10">
                  <Quote className="mb-4 h-8 w-8 text-[var(--brand-green-bright)]" strokeWidth={1.5} />
                  <p className="leading-relaxed text-white/85">
                    {(settings.visionText ?? settings.missionText ?? "").split("\n")[0]}
                  </p>
                  <p className="mt-5 text-sm font-bold text-[var(--brand-amber)]">
                    {settings.visionText ? "Our Vision" : "Our Mission"}
                    <span className="ml-2 font-normal text-white/50">— configured by the company</span>
                  </p>
                </div>
              </div>
            )}
          </div>
          {/* Why cards — reference green/eco USP trio */}
          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {[
              {
                icon: ShieldCheck,
                title: "Quality Workmanship",
                text: "Documented testing, commissioning and handover records across every division.",
              },
              {
                icon: Users,
                title: "Skilled Teams",
                text: "Engineers, technicians and operators supervised under one accountable group.",
              },
              {
                icon: Wrench,
                title: "Long-Term Support",
                text: "From installation to maintenance contracts — we stay after handover.",
              },
            ].map(({ icon: Icon, title, text }) => (
              <div key={title} className="glow-soft rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                <Icon className="mb-3 h-7 w-7 text-[var(--brand-green-bright)]" strokeWidth={1.5} />
                <h3 className="font-bold">{title}</h3>
                <p className="mt-1.5 text-sm text-white/65">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ————— CTA strip (reference "Make your life easier") ————— */}
      <section className="brand-gradient-green hero-glow hero-glow-green text-white">
        <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Make your operations easier with {settings.companyName}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-white/85">
            Request a quotation and the right division will get back to you — solar and MEP, digital, operations or
            cold chain.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/quote"
              className="glow-border inline-flex items-center justify-center gap-2 rounded-lg bg-white px-7 py-3.5 text-sm font-semibold text-[var(--brand-green-dark)] shadow-lg shadow-black/10 transition-colors hover:bg-white/90"
            >
              Request a Quote <ArrowRight className="h-4 w-4" />
            </Link>
            {settings.phone && (
              <a
                href={`tel:${settings.phone}`}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/40 px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                <Phone className="h-4 w-4" /> Call us: {settings.phone}
              </a>
            )}
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
