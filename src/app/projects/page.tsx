import Image from "next/image";
import { PublicShell } from "@/components/public/public-shell";
import { db } from "@/lib/db";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Project Portfolio",
  description: "Completed solar installations published by Al-Marsus Group Ltd.",
};

export default async function ProjectsPage() {
  const gallery = await db.galleryItem.findMany({
    where: { isPublic: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

  return (
    <PublicShell>
      <section className="brand-gradient text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-16">
          <h1 className="text-4xl font-bold">Our Projects</h1>
          <p className="mt-3 text-white/80 max-w-2xl">
            A portfolio of solar installations. Projects are published by the company after handover.
          </p>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-14">
        {gallery.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {gallery.map((item) => (
              <article key={item.id} className="rounded-xl overflow-hidden border border-border bg-card">
                <div className="relative aspect-[4/3] bg-muted">
                  <Image
                    src={item.imageUrl}
                    alt={item.title}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover"
                  />
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    {item.category && (
                      <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-[var(--brand-indigo)]">
                        {item.category}
                      </span>
                    )}
                    {item.capacityKw != null && (
                      <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground">
                        {item.capacityKw} kW
                      </span>
                    )}
                  </div>
                  <h2 className="font-semibold">{item.title}</h2>
                  {item.description && <p className="mt-1.5 text-sm text-muted-foreground">{item.description}</p>}
                  {item.location && <p className="mt-2 text-xs text-muted-foreground">📍 {item.location}</p>}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
            No published projects yet. Completed installations appear here once the company publishes them in
            Admin → Gallery.
          </div>
        )}
      </section>
    </PublicShell>
  );
}
