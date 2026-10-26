import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ArrowLeft, Zap, Cpu, HardHat, Snowflake, CheckCircle2 } from "lucide-react";
import { PublicShell } from "@/components/public/public-shell";
import { getPublicSettings } from "@/lib/settings";
import { getDivisionBySlug, DIVISION_LIST } from "@/lib/divisions";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

const DIVISION_ICONS = { zap: Zap, cpu: Cpu, "hard-hat": HardHat, snowflake: Snowflake } as const;

export async function generateStaticParams() {
  return DIVISION_LIST.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const division = getDivisionBySlug(slug);
  if (!division) return { title: "Division not found" };
  return {
    title: division.fullName,
    description: `${division.fullName} — ${division.defaultTagline} A division of Al-Marsus Group Ltd.`,
  };
}

export default async function DivisionDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const settings = await getPublicSettings();
  const division = settings.divisions.find((d) => d.slug === slug);
  if (!division) notFound();

  const Icon = DIVISION_ICONS[division.icon];
  const others = settings.divisions.filter((d) => d.slug !== slug);

  return (
    <PublicShell>
      {/* Division hero — reference dark eco band with wave seam */}
      <section className="dark-eco-gradient relative overflow-hidden text-white">
        <div className="absolute inset-0 bg-dots-dark" aria-hidden="true" />
        <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-14 sm:px-6 lg:pb-20 lg:pt-16">
          <Link
            href="/divisions"
            className="inline-flex items-center gap-1.5 text-sm text-white/70 hover:text-white mb-6"
          >
            <ArrowLeft className="h-4 w-4" /> All divisions
          </Link>
          <div className="mb-3">
            <span className="eyebrow text-[var(--brand-green-bright)]">
              <span>{"// "}</span>Division of {settings.companyName}
            </span>
          </div>
          <div className="flex items-center gap-5">
            <span className="inline-flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-[var(--brand-green)] shadow-lg shadow-black/20">
              <Icon className="h-10 w-10" strokeWidth={1.5} />
            </span>
            <h1 className="text-3xl font-bold leading-tight sm:text-4xl lg:text-[3rem]">{division.fullName}</h1>
          </div>
          <p className="mt-6 max-w-2xl text-lg text-white/80 leading-relaxed">{division.tagline}</p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Link
              href="/quote"
              className="glow-border inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--brand-green)] px-7 py-3.5 text-sm font-semibold text-white hover:bg-[var(--brand-green-dark)]"
            >
              Request a Quote <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/40 px-7 py-3.5 text-sm font-semibold text-white hover:bg-white/10"
            >
              Contact Us
            </Link>
          </div>
        </div>
        <svg
          viewBox="0 0 1440 48"
          preserveAspectRatio="none"
          aria-hidden="true"
          className="absolute bottom-0 left-0 block h-8 w-full fill-background"
        >
          <path d="M0 30 C 120 12 260 10 400 20 C 560 32 700 40 880 34 C 1060 28 1180 10 1320 12 C 1370 13 1410 16 1440 20 L 1440 48 L 0 48 Z" />
        </svg>
      </section>

      {/* Overview */}
      <section className="mx-auto max-w-4xl px-4 sm:px-6 py-14">
        <h2 className="text-2xl font-bold mb-4">About this division</h2>
        <div className="space-y-3 text-foreground/85 leading-relaxed">
          {division.description.split("\n").filter(Boolean).map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </section>

      {/* Services */}
      <section className="bg-muted">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-14">
          <h2 className="text-2xl font-bold mb-2">Services</h2>
          <p className="text-muted-foreground mb-8">
            {division.shortName} offers the following services. The company can update this catalogue at any time in
            Admin → Settings.
          </p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {division.services.map((s) => (
              <div key={s.title} className="glow-soft card-hover rounded-xl border border-border bg-card p-6">
                <CheckCircle2 className="h-6 w-6 text-[var(--brand-green)] dark:text-[var(--brand-green-bright)] mb-3" strokeWidth={1.6} />
                <h3 className="font-semibold mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cross-links to other divisions */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-14">
        <h2 className="text-xl font-bold mb-6">Explore our other divisions</h2>
        <div className="grid gap-6 sm:grid-cols-3">
          {others.map((d) => {
            const OtherIcon = DIVISION_ICONS[d.icon];
            return (
              <Link
                key={d.code}
                href={`/divisions/${d.slug}`}
                className="group glow-soft card-hover rounded-xl border border-border bg-card p-6"
              >
                <span className="mb-3 inline-flex rounded-lg bg-secondary p-2.5 text-primary">
                  <OtherIcon className="h-5 w-5" />
                </span>
                <h3 className="font-semibold group-hover:underline">{d.shortName}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">{d.tagline}</p>
              </Link>
            );
          })}
        </div>
      </section>
    </PublicShell>
  );
}
