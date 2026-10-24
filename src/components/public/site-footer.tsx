import Link from "next/link";
import { Mail, Phone, MapPin, MessageCircle } from "lucide-react";

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
    <footer className="mt-auto bg-[var(--brand-indigo-dark)] text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12">
        <div className="grid gap-10 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-3 mb-4">
              { }
              <img src={logoUrl} alt={`${companyName} logo`} className="h-12 w-auto rounded bg-white/95 p-1" />
            </div>
            <p className="text-sm text-white/70 max-w-xs">
              {companyName} — solar energy design, installation and maintenance. Contact details are configured by the
              company in the admin panel.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-4">Company</h3>
            <ul className="space-y-2 text-sm text-white/80">
              <li><Link href="/about" className="hover:text-white">About Us</Link></li>
              <li><Link href="/services" className="hover:text-white">Solar Services</Link></li>
              <li><Link href="/projects" className="hover:text-white">Projects</Link></li>
              <li><Link href="/privacy" className="hover:text-white">Privacy Policy</Link></li>
              <li><Link href="/login" className="hover:text-white">Staff Login</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-4">Get in touch</h3>
            <ul className="space-y-3 text-sm text-white/80">
              {email && (
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4 shrink-0" />
                  <a href={`mailto:${email}`} className="hover:text-white">{email}</a>
                </li>
              )}
              {phone && (
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4 shrink-0" />
                  <a href={`tel:${phone}`} className="hover:text-white">{phone}</a>
                </li>
              )}
              {whatsapp && (
                <li className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 shrink-0" />
                  <a
                    href={`https://wa.me/${whatsapp.replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white"
                  >
                    WhatsApp chat
                  </a>
                </li>
              )}
              {address && (
                <li className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{address}</span>
                </li>
              )}
              {!email && !phone && !address && !whatsapp && (
                <li className="text-white/60">
                  Contact details are not configured yet. Site administrators can add them in Admin → Settings.
                </li>
              )}
            </ul>
          </div>
        </div>
        <div className="mt-10 border-t border-white/15 pt-6 text-xs text-white/50 flex flex-col sm:flex-row justify-between gap-2">
          <span>© {new Date().getFullYear()} {companyName}. All rights reserved.</span>
          <span>Solar energy solutions</span>
        </div>
      </div>
    </footer>
  );
}
