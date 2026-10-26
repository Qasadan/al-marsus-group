import Link from "next/link";
import { Mail, Phone, MapPin, MessageCircle, ArrowRight } from "lucide-react";
import { DIVISION_CODES, DIVISIONS } from "@/lib/divisions";

export function SiteFooter({
  companyName = "Al-Marsus Group Ltd",
  logoUrl = "/images/logo.jpg",
  email,
  phone,
  whatsapp,
  address,
}: {
  companyName?: string;
  logoUrl?: string;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  address?: string | null;
}) {
  return (
    <footer className="mt-auto text-white">
      {/* Irregular wave top edge, like the reference design's torn footer seam */}
      <div className="bg-[var(--brand-footer)]" aria-hidden="true">
        <svg viewBox="0 0 1440 60" preserveAspectRatio="none" className="block h-[46px] w-full" fill="#ffffff">
          <path d="M0 32 C 90 14 180 8 300 18 C 430 29 520 44 660 40 C 800 36 900 12 1040 10 C 1180 8 1300 24 1440 16 L 1440 60 L 0 60 Z" />
        </svg>
      </div>
      <div className="dark:bg-[var(--brand-footer)] bg-[var(--brand-footer)] bg-dots-dark">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-14">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {/* Brand + blurb + socials */}
            <div>
              <div className="mb-4 inline-flex rounded-lg bg-white/95 p-1.5">
                <img src={logoUrl} alt={`${companyName} logo`} className="h-11 w-auto" />
              </div>
              <p className="text-sm leading-relaxed text-white/60 max-w-xs">
                {companyName} — a multi-branch engineering and services group: MEP engineering, digital solutions,
                operations services and cold chain logistics.
              </p>
              <div className="mt-5 flex items-center gap-2.5">
                {whatsapp && (
                  <a
                    href={`https://wa.me/${whatsapp.replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Chat on WhatsApp"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/25 text-white/80 transition-colors hover:border-[var(--brand-green-bright)] hover:text-[var(--brand-green-bright)]"
                  >
                    <MessageCircle className="h-4 w-4" />
                  </a>
                )}
                {email && (
                  <a
                    href={`mailto:${email}`}
                    aria-label="Email us"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/25 text-white/80 transition-colors hover:border-[var(--brand-green-bright)] hover:text-[var(--brand-green-bright)]"
                  >
                    <Mail className="h-4 w-4" />
                  </a>
                )}
                {phone && (
                  <a
                    href={`tel:${phone}`}
                    aria-label="Call us"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/25 text-white/80 transition-colors hover:border-[var(--brand-green-bright)] hover:text-[var(--brand-green-bright)]"
                  >
                    <Phone className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>

            {/* Address / contact — reference "Our Address" column */}
            <div>
              <h3 className="mb-5 text-lg font-bold">Our Address</h3>
              <ul className="space-y-3.5 text-sm text-white/70">
                {phone && (
                  <li className="flex items-center gap-3">
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/5 text-[var(--brand-green-bright)]">
                      <Phone className="h-4 w-4" />
                    </span>
                    <a href={`tel:${phone}`} className="hover:text-white">{phone}</a>
                  </li>
                )}
                {email && (
                  <li className="flex items-center gap-3">
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/5 text-[var(--brand-green-bright)]">
                      <Mail className="h-4 w-4" />
                    </span>
                    <a href={`mailto:${email}`} className="hover:text-white">{email}</a>
                  </li>
                )}
                {address && (
                  <li className="flex items-start gap-3">
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/5 text-[var(--brand-green-bright)]">
                      <MapPin className="h-4 w-4" />
                    </span>
                    <span className="pt-1.5">{address}</span>
                  </li>
                )}
                {!email && !phone && !address && !whatsapp && (
                  <li className="text-white/50">
                    Contact details are not configured yet. Site administrators can add them in Admin → Settings.
                  </li>
                )}
              </ul>
            </div>

            {/* Quick links — two-column, like the reference "Extra Links" */}
            <div>
              <h3 className="mb-5 text-lg font-bold">Quick Links</h3>
              <ul className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm text-white/70">
                <li><Link href="/about" className="hover:text-[var(--brand-green-bright)]">About</Link></li>
                <li><Link href="/projects" className="hover:text-[var(--brand-green-bright)]">Projects</Link></li>
                <li><Link href="/services" className="hover:text-[var(--brand-green-bright)]">Services</Link></li>
                <li><Link href="/contact" className="hover:text-[var(--brand-green-bright)]">Contact</Link></li>
                <li><Link href="/quote" className="hover:text-[var(--brand-green-bright)]">Request Quote</Link></li>
                <li><Link href="/privacy" className="hover:text-[var(--brand-green-bright)]">Privacy Policy</Link></li>
                <li><Link href="/divisions" className="hover:text-[var(--brand-green-bright)]">Divisions</Link></li>
                <li><Link href="/login" className="hover:text-[var(--brand-green-bright)]">Staff Login</Link></li>
              </ul>
            </div>

            {/* Divisions + contact CTA — reference "NewsLetter" slot */}
            <div>
              <h3 className="mb-5 text-lg font-bold">Our Divisions</h3>
              <ul className="space-y-2.5 text-sm text-white/70">
                {DIVISION_CODES.map((code) => (
                  <li key={code}>
                    <Link href={`/divisions/${DIVISIONS[code].slug}`} className="hover:text-[var(--brand-green-bright)]">
                      {DIVISIONS[code].shortName}
                    </Link>
                  </li>
                ))}
              </ul>
              {phone && (
                <Link
                  href="/contact"
                  className="mt-5 inline-flex items-center gap-2 rounded-lg brand-gradient-green px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                >
                  Let&apos;s Talk <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          </div>

          <div className="mt-12 border-t border-white/10 pt-6 text-center text-xs text-white/45">
            © {new Date().getFullYear()} {companyName}. All Rights Reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
