import Link from "next/link";
import { PublicShell } from "@/components/public/public-shell";
import { PageHero } from "@/components/public/page-hero";
import { getPublicSettings } from "@/lib/settings";
import { Zap, Cpu, HardHat, Snowflake, ArrowRight, CheckCircle2 } from "lucide-react";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Services",
  description:
    "Services across all four Al-Marsus Group divisions: MEP engineering & solar, digital solutions, operations services, and cold chain storage & logistics.",
};

const DIVISION_ICONS = { zap: Zap, cpu: Cpu, "hard-hat": HardHat, snowflake: Snowflake } as const;

export default async function ServicesPage() {
  const s = await getPublicSettings();
  return (
    <PublicShell>
      <PageHero
        eyebrow="Services"
        title="What we deliver, division by division"
        description="Organised by division — from solar and building engineering to software, facility operations and cold chain logistics."
      />

      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-14 space-y-14">
        {s.divisions.map((d) => {
          const Icon = DIVISION_ICONS[d.icon];
          return (
            <div key={d.code} id={d.slug}>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
                <span className="inline-flex rounded-lg bg-secondary p-3 text-primary">
                  <Icon className="h-6 w-6" />
                </span>
                <div className="flex-1">
                  <h2 className="text-xl font-bold">{d.fullName}</h2>
                  <p className="text-sm text-muted-foreground">{d.tagline}</p>
                </div>
                <Link
                  href={`/divisions/${d.slug}`}
                  className="inline-flex items-center gap-1 text-sm font-medium text-[var(--brand-green)] dark:text-[var(--brand-green-bright)] hover:underline shrink-0"
                >
                  Division details <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {d.services.map((svc) => (
                  <div key={svc.title} className="rounded-xl border border-border bg-card p-6">
                    <CheckCircle2 className="h-5 w-5 text-[var(--brand-green)] dark:text-[var(--brand-green-bright)] mb-3" />
                    <h3 className="font-semibold mb-2">{svc.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{svc.description}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {s.services.length > 0 && (
          <div>
            <h2 className="text-xl font-bold mb-2">Other group-wide services</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Additional services configured by the company in Admin → Settings.
            </p>
            <div className="grid gap-6 sm:grid-cols-2">
              {s.services.map((svc, i) => (
                <div key={i} className="rounded-xl border border-border bg-card p-6">
                  <h3 className="font-semibold mb-2">{svc.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{svc.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
          Preliminary energy calculations and system sizing shown in quotations are estimates. Final designs must be
          verified by qualified personnel before installation.
        </div>

        <div className="text-center">
          <Link
            href="/quote"
            className="glow-border inline-flex items-center gap-2 rounded-lg brand-gradient-green px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[var(--brand-green)]/25 hover:opacity-90"
          >
            Request a Quote <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </PublicShell>
  );
}
