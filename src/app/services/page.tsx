import Link from "next/link";
import { PublicShell } from "@/components/public/public-shell";
import { getPublicSettings } from "@/lib/settings";
import { Sun, BatteryCharging, Wrench, ClipboardCheck, ArrowRight } from "lucide-react";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Solar Services",
  description: "Solar installation, maintenance, energy assessment and design services by Al-Marsus Group Ltd.",
};

const ICONS = [Sun, BatteryCharging, Wrench, ClipboardCheck];

export default async function ServicesPage() {
  const s = await getPublicSettings();
  return (
    <PublicShell>
      <section className="brand-gradient text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-16">
          <h1 className="text-4xl font-bold">Solar Services</h1>
          <p className="mt-3 text-white/80 max-w-2xl">
            From the first site survey to long-term maintenance — everything your solar system needs.
          </p>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-14">
        {s.services.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2">
            {s.services.map((svc, i) => {
              const Icon = ICONS[i % ICONS.length];
              return (
                <div key={i} className="rounded-xl border border-border bg-card p-6">
                  <div className="mb-4 inline-flex rounded-lg bg-secondary p-3 text-[var(--brand-indigo)]">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h2 className="text-lg font-semibold mb-2">{svc.title}</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">{svc.description}</p>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-muted-foreground">Services will appear here once configured in Admin → Settings.</p>
        )}
        <div className="mt-10 rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
          Preliminary energy calculations and system sizing shown in quotations are estimates. Final designs must be
          verified by qualified personnel before installation.
        </div>
        <div className="mt-10 text-center">
          <Link
            href="/quote"
            className="inline-flex items-center gap-2 rounded-md brand-gradient-green px-6 py-3 text-sm font-semibold text-white hover:opacity-90"
          >
            Request a Quote <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </PublicShell>
  );
}
