import { PublicShell } from "@/components/public/public-shell";
import { getPublicSettings } from "@/lib/settings";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "About Us",
  description: "Learn about Al-Marsus Group Ltd — our mission, vision and approach to solar energy.",
};

export default async function AboutPage() {
  const s = await getPublicSettings();
  return (
    <PublicShell>
      <section className="brand-gradient text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-16">
          <h1 className="text-4xl font-bold">About {s.companyName}</h1>
          <p className="mt-3 text-white/80 max-w-2xl">{s.tagline ?? "Solar energy solutions"}</p>
        </div>
      </section>
      <section className="mx-auto max-w-4xl px-4 sm:px-6 py-14 space-y-10">
        <div>
          <h2 className="text-2xl font-bold text-[var(--brand-indigo)] mb-3">Who we are</h2>
          <div className="prose-sm space-y-3 text-foreground/85 leading-relaxed">
            {(s.aboutText ?? "[Placeholder — configure in Admin → Settings.]")
              .split("\n")
              .filter(Boolean)
              .map((p, i) => (
                <p key={i}>{p}</p>
              ))}
          </div>
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
