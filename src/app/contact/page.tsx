import { PublicShell } from "@/components/public/public-shell";
import { PageHero } from "@/components/public/page-hero";
import { QuoteForm } from "@/components/public/quote-form";
import { Mail, Phone, MapPin, MessageCircle, Clock } from "lucide-react";
import { getPublicSettings } from "@/lib/settings";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Contact Al-Marsus Group Ltd — general enquiries, partnerships, investment opportunities and subsidiary-specific services across all four businesses.",
};

export default async function ContactPage() {
  const s = await getPublicSettings();
  const contacts = [
    s.email ? { icon: Mail, label: "Email", value: s.email, href: `mailto:${s.email}` } : null,
    s.phone ? { icon: Phone, label: "Phone", value: s.phone, href: `tel:${s.phone}` } : null,
    s.whatsappNumber
      ? {
          icon: MessageCircle,
          label: "WhatsApp",
          value: s.whatsappNumber,
          href: `https://wa.me/${s.whatsappNumber.replace(/[^0-9]/g, "")}`,
        }
      : null,
    s.address ? { icon: MapPin, label: "Address", value: s.address, href: null } : null,
  ].filter(Boolean) as { icon: typeof Mail; label: string; value: string; href: string | null }[];

  return (
    <PublicShell>
      <PageHero
        eyebrow="Contact"
        title="Let's Build Opportunities Together."
        description="We welcome enquiries from customers, investors, suppliers, institutions, and potential business partners interested in our vision and future business opportunities."
      />

      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-14 grid gap-10 lg:grid-cols-5">
        <div className="lg:col-span-2 space-y-4">
          {contacts.length > 0 ? (
            contacts.map((c) => (
              <div key={c.label} className="flex items-start gap-4 rounded-xl border border-border bg-card p-5">
                <div className="rounded-lg bg-secondary p-2.5 text-primary">
                  <c.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{c.label}</p>
                  {c.href ? (
                    <a href={c.href} target={c.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" className="font-medium hover:text-primary">
                      {c.value}
                    </a>
                  ) : (
                    <p className="font-medium">{c.value}</p>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
              Contact details are not configured yet. Administrators can add email, phone, WhatsApp and address in
              Admin → Settings.
            </div>
          )}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-secondary p-2.5 text-primary">
                <MapPin className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Our Locations</p>
                <p className="mt-1 font-medium">
                  Head Office — Mogadishu, Somalia
                </p>
                <p className="text-sm text-muted-foreground">
                  Branches — Baidoa, Somalia · Barawe, Somalia
                </p>
              </div>
            </div>
            <p className="mt-4 border-t border-border pt-3 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Business enquiries:</span> general enquiries, partnerships,
              investment opportunities, and subsidiary-specific services.
            </p>
          </div>
          <div className="flex items-start gap-4 rounded-xl border border-border bg-card p-5">
            <div className="rounded-lg bg-secondary p-2.5 text-primary">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Response time</p>
              <p className="font-medium">Quotation requests are reviewed by our team and routed to the relevant division, which will contact you with the next steps.</p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-xl font-semibold mb-1">Request a Quotation</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Fill in the form and it will be saved directly to our system.
            </p>
            <QuoteForm />
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
