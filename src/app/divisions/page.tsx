import Link from "next/link";
import { ArrowRight, Zap, Cpu, HardHat, Snowflake } from "lucide-react";
import { PublicShell } from "@/components/public/public-shell";
import { getPublicSettings } from "@/lib/settings";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Our Divisions",
  description:
    "Al-Marsus Group Ltd operates four specialised divisions: MEP Engineering, Digital, Operations Services and Cold Chain Storage & Logistics.",
};

const DIVISION_ICONS = { zap: Zap, cpu: Cpu, "hard-hat": HardHat, snowflake: Snowflake } as const;

export default async function DivisionsPage() {
  const settings = await getPublicSettings();
  return (
    <PublicShell>
      <section className="brand-gradient text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-16">
          <h1 className="text-4xl font-bold">Our Divisions</h1>
          <p className="mt-3 text-white/80 max-w-2xl">
            {settings.companyName} delivers engineering and services through four specialised branches — each with its
            own team, expertise and service catalogue, all backed by one accountable group.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-14 space-y-10">
        {settings.divisions.map((d, index) => {
          const Icon = DIVISION_ICONS[d.icon];
          return (
            <article
              key={d.code}
              className="grid gap-8 lg:grid-cols-2 items-center rounded-2xl border border-border bg-card p-6 sm:p-8"
            >
              <div className={index % 2 === 1 ? "lg:order-2" : undefined}>
                <div className="flex items-center gap-3 mb-4">
                  <span className="inline-flex rounded-lg bg-secondary p-3 text-[var(--brand-indigo)]">
                    <Icon className="h-6 w-6" />
                  </span>
                  <span className="text-4xl font-bold text-secondary select-none">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-[var(--brand-indigo)]">{d.fullName}</h2>
                <p className="mt-2 font-medium text-[var(--brand-green)]">{d.tagline}</p>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{d.description}</p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    href={`/divisions/${d.slug}`}
                    className="inline-flex items-center gap-2 rounded-md brand-gradient px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                  >
                    Division details <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/quote"
                    className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-semibold text-[var(--brand-indigo)] hover:bg-muted"
                  >
                    Request a quote
                  </Link>
                </div>
              </div>
              <div className="rounded-xl bg-muted p-6">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
                  What this division delivers
                </h3>
                <ul className="space-y-3">
                  {d.services.slice(0, 5).map((s) => (
                    <li key={s.title} className="flex items-start gap-3 text-sm">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--brand-green)]" />
                      <span>
                        <span className="font-medium">{s.title}</span>
                        <span className="block text-muted-foreground line-clamp-2">{s.description}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          );
        })}

        <div className="rounded-xl brand-gradient-green text-white p-8 text-center">
          <h2 className="text-2xl font-bold">Not sure which division you need?</h2>
          <p className="mt-2 text-white/85 max-w-xl mx-auto text-sm">
            Submit your request through the quotation form and select the closest match — our team will route it to the
            right division.
          </p>
          <Link
            href="/quote"
            className="mt-5 inline-flex items-center gap-2 rounded-md bg-white px-6 py-3 text-sm font-semibold text-[var(--brand-green-dark)] hover:bg-white/90"
          >
            Request a Quote <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </PublicShell>
  );
}
