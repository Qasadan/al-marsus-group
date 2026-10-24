import Link from "next/link";
import { ArrowRight, Zap, Cpu, HardHat, Snowflake } from "lucide-react";
import { PublicShell } from "@/components/public/public-shell";
import { getPublicSettings } from "@/lib/settings";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "About Us",
  description:
    "Learn about Al-Marsus Group Ltd — a multi-division engineering and services group: MEP engineering, digital, operations services and cold chain logistics.",
};

const DIVISION_ICONS = { zap: Zap, cpu: Cpu, "hard-hat": HardHat, snowflake: Snowflake } as const;

export default async function AboutPage() {
  const s = await getPublicSettings();
  return (
    <PublicShell>
      <section className="brand-gradient text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-16">
          <h1 className="text-4xl font-bold">About {s.companyName}</h1>
          <p className="mt-3 text-white/80 max-w-2xl">
            {s.tagline ?? "A multi-division engineering and services group."}
          </p>
        </div>
      </section>
      <section className="mx-auto max-w-4xl px-4 sm:px-6 py-14 space-y-10">
        <div>
          <h2 className="text-2xl font-bold text-[var(--brand-indigo)] mb-3">Who we are</h2>
          <div className="prose-sm space-y-3 text-foreground/85 leading-relaxed">
            {(s.aboutText ??
              "Al-Marsus Group Ltd is an engineering and services group operating through four specialised divisions. [Full company profile — configure in Admin → Settings.]")
              .split("\n")
              .filter(Boolean)
              .map((p, i) => (
                <p key={i}>{p}</p>
              ))}
          </div>
        </div>

        {/* Group structure — the four divisions */}
        <div>
          <h2 className="text-2xl font-bold text-[var(--brand-indigo)] mb-3">Group structure</h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-2xl">
            The group delivers its work through four specialised business branches, each with dedicated teams and a
            defined service catalogue.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {s.divisions.map((d) => {
              const Icon = DIVISION_ICONS[d.icon];
              return (
                <Link
                  key={d.code}
                  href={`/divisions/${d.slug}`}
                  className="group rounded-xl border border-border bg-card p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="inline-flex rounded-lg bg-secondary p-2 text-[var(--brand-indigo)]">
                      <Icon className="h-5 w-5" />
                    </span>
                    <h3 className="font-semibold text-[var(--brand-indigo)] group-hover:underline">{d.fullName}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{d.tagline}</p>
                </Link>
              );
            })}
          </div>
          <Link
            href="/divisions"
            className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[var(--brand-green)] hover:underline"
          >
            Explore all divisions <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="rounded-xl border border-border p-6">
            <h3 className="font-semibold text-[var(--brand-indigo)] mb-2">Our Mission</h3>
            <p className="text-sm text-muted-foreground">
              {s.missionText ?? "[Placeholder — configure in Admin → Settings.]"}
            </p>
          </div>
          <div className="rounded-xl border border-border p-6">
            <h3 className="font-semibold text-[var(--brand-green)] mb-2">Our Vision</h3>
            <p className="text-sm text-muted-foreground">
              {s.visionText ?? "[Placeholder — configure in Admin → Settings.]"}
            </p>
          </div>
        </div>
        <div className="rounded-xl bg-muted p-6 text-sm text-muted-foreground">
          <strong className="text-foreground">Note:</strong> Company history, certifications, team details and
          testimonials are intentionally left as configurable placeholders — they are published only after the company
          enters verified information in the admin panel.
        </div>
      </section>
    </PublicShell>
  );
}
