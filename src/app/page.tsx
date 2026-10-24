import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Sun, BatteryCharging, Wrench, ClipboardCheck, ShieldCheck, Leaf } from "lucide-react";
import { PublicShell } from "@/components/public/public-shell";
import { getPublicSettings } from "@/lib/settings";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const settings = await getPublicSettings();
  const gallery = await db.galleryItem.findMany({
    where: { isPublic: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    take: 6,
  });
  const services = settings.services.slice(0, 4);

  return (
    <PublicShell>
      {/* Hero */}
      <section className="brand-gradient text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-20 lg:py-28">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium mb-6">
              <Sun className="h-4 w-4" /> Solar Energy Solutions
            </span>
            <h1 className="text-4xl sm:text-5xl font-bold leading-tight">
              {settings.heroTitle ?? "Power Your Future With Solar Energy"}
            </h1>
            <p className="mt-5 text-lg text-white/85 leading-relaxed">
              {settings.heroSubtitle ??
                "Professional solar design, installation and maintenance for homes and businesses."}
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link
                href="/quote"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-[var(--brand-green)] px-6 py-3 text-sm font-semibold text-white hover:bg-[var(--brand-green-dark)] transition-colors"
              >
                Request a Free Quote <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/services"
                className="inline-flex items-center justify-center gap-2 rounded-md border border-white/40 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
              >
                Explore Services
              </Link>
            </div>
            <p className="mt-6 text-xs text-white/60">
              Website content is managed by the company via the admin panel — sections marked as placeholders are
              pending official information.
            </p>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-[var(--brand-indigo)]">What We Do</h2>
          <p className="mt-2 text-muted-foreground max-w-2xl mx-auto">
            End-to-end solar services — from the first site survey to years of reliable maintenance.
          </p>
        </div>
        {services.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {services.map((s, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-6 hover:shadow-md transition-shadow">
                <div className="mb-4 inline-flex rounded-lg bg-secondary p-3 text-[var(--brand-indigo)]">
                  {i % 4 === 0 ? <Sun className="h-6 w-6" /> : i % 4 === 1 ? <BatteryCharging className="h-6 w-6" /> : i % 4 === 2 ? <Wrench className="h-6 w-6" /> : <ClipboardCheck className="h-6 w-6" />}
                </div>
                <h3 className="font-semibold mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.description}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground">Services will appear here once configured in Admin → Settings.</p>
        )}
      </section>

      {/* Why solar */}
      <section className="bg-muted">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-16">
          <div className="grid gap-8 md:grid-cols-3">
            <div className="flex gap-4">
              <ShieldCheck className="h-8 w-8 text-[var(--brand-green)] shrink-0" />
              <div>
                <h3 className="font-semibold mb-1">Quality Workmanship</h3>
                <p className="text-sm text-muted-foreground">Professional installation with documented testing and handover records.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <Leaf className="h-8 w-8 text-[var(--brand-green)] shrink-0" />
              <div>
                <h3 className="font-semibold mb-1">Clean Energy</h3>
                <p className="text-sm text-muted-foreground">Reduce grid dependence and your carbon footprint with solar power.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <BatteryCharging className="h-8 w-8 text-[var(--brand-green)] shrink-0" />
              <div>
                <h3 className="font-semibold mb-1">Energy Independence</h3>
                <p className="text-sm text-muted-foreground">Hybrid and backup systems sized to your consumption profile.</p>
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
            No published projects yet. Company administrators can publish completed installations in Admin → Gallery.
          </div>
        )}
      </section>

      {/* CTA */}
      <section className="brand-gradient-green text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-14 text-center">
          <h2 className="text-3xl font-bold">Ready to go solar?</h2>
          <p className="mt-3 text-white/85 max-w-xl mx-auto">
            Request a quotation and our team will schedule a site survey to assess your energy needs.
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
