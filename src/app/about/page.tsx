import Link from "next/link";
import { ArrowRight, Zap, Cpu, Wheat, Snowflake } from "lucide-react";
import { PublicShell } from "@/components/public/public-shell";
import { PageHero } from "@/components/public/page-hero";
import { getPublicSettings } from "@/lib/settings";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "About Us",
  description:
    "Learn about Al-Marsus Group Ltd — a diversified group establishing sustainable businesses across engineering, cold-chain infrastructure, digital innovation and agro-processing.",
};

const DIVISION_ICONS = { zap: Zap, cpu: Cpu, "wheat": Wheat, snowflake: Snowflake } as const;

export default async function AboutPage() {
  const s = await getPublicSettings();
  return (
    <PublicShell>
      <PageHero
        eyebrow="About Us"
        title={`About ${s.companyName}`}
        description={s.tagline ?? "A multi-division engineering and services group."}
      />
      <section className="mx-auto max-w-4xl px-4 sm:px-6 py-14 space-y-10">
        <div>
          <h2 className="text-2xl font-bold mb-3">Who we are</h2>
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
          <h2 className="text-2xl font-bold mb-3">Group structure</h2>
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
                  className="group glow-soft rounded-xl border border-border bg-card p-5 card-hover"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="inline-flex rounded-lg bg-secondary p-2 text-primary">
                      <Icon className="h-5 w-5" />
                    </span>
                    <h3 className="font-semibold group-hover:underline">{d.fullName}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{d.tagline}</p>
                </Link>
              );
            })}
          </div>
          <Link
            href="/divisions"
            className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[var(--brand-green)] dark:text-[var(--brand-green-bright)] hover:underline"
          >
            Explore all divisions <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="glow-soft rounded-xl border border-border p-6">
            <h3 className="font-bold mb-2">Our Mission</h3>
            <p className="text-sm text-muted-foreground">
              {s.missionText ?? "[Placeholder — configure in Admin → Settings.]"}
            </p>
          </div>
          <div className="glow-soft rounded-xl border border-border p-6">
            <h3 className="font-bold text-[var(--brand-green)] dark:text-[var(--brand-green-bright)] mb-2">Our Vision</h3>
            <p className="text-sm text-muted-foreground">
              {s.visionText ?? "[Placeholder — configure in Admin → Settings.]"}
            </p>
          </div>
        </div>

        {/* Core values — official company document */}
        <div>
          <h2 className="text-2xl font-bold mb-3">Our Core Values</h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-2xl">
            The principles that guide how we build and run every business in the group.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Integrity",
                text: "Conducting business with honesty, transparency, and accountability.",
              },
              {
                title: "Excellence",
                text: "Striving for high standards in service delivery and business performance.",
              },
              {
                title: "Innovation",
                text: "Embracing modern technology and practical solutions to meet changing needs.",
              },
              {
                title: "Commitment",
                text: "Building trust through responsibility, professionalism, and dedication.",
              },
              {
                title: "Sustainability",
                text: "Pursuing responsible business practices and long-term value creation.",
              },
              {
                title: "Collaboration",
                text: "Developing meaningful partnerships and encouraging cooperation across our businesses.",
              },
            ].map((v) => (
              <div key={v.title} className="glow-soft rounded-xl border border-border bg-card p-5">
                <h3 className="font-semibold text-[var(--brand-green)] dark:text-[var(--brand-green-bright)]">{v.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{v.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* The strength of our group — integrated approach from the company document */}
        <div className="glow-soft rounded-xl border border-border bg-card p-6">
          <h2 className="text-2xl font-bold mb-3">The Strength of Our Group</h2>
          <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p>
              Our subsidiaries have the potential to work together to deliver coordinated solutions. Engineering can
              support suitable technical infrastructure. Cold-chain services can help preserve agricultural products.
              Digital systems can improve operational management, while agro-processing can turn agricultural
              resources into market-ready products.
            </p>
            <p>
              Through this integrated approach, {s.companyName} aims to develop complementary businesses that create
              value across multiple sectors.
            </p>
          </div>
        </div>

        {/* A message from our founder — official company document */}
        <figure className="relative overflow-hidden rounded-xl bg-[var(--brand-footer)] p-8 text-white">
          <div className="bg-dots-dark absolute inset-0 opacity-40" aria-hidden="true" />
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--brand-green-bright)]">
              A Message from Our Founder
            </p>
            <blockquote className="mt-4 text-lg font-medium leading-relaxed">
              “We believe that great businesses are built not only to create value, but also to create opportunities,
              solve real challenges, and contribute to a better future.”
            </blockquote>
            <figcaption className="mt-4 text-sm text-white/70">— Founder, {s.companyName}</figcaption>
          </div>
        </figure>
        <div className="rounded-xl bg-muted p-6 text-sm text-muted-foreground">
          <strong className="text-foreground">Note:</strong> Company history, certifications, team details and
          testimonials are intentionally left as configurable placeholders — they are published only after the company
          enters verified information in the admin panel.
        </div>
      </section>
    </PublicShell>
  );
}
