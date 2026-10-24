"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About Us" },
  { href: "/services", label: "Services" },
  { href: "/projects", label: "Projects" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader({
  companyName = "Al-Marsus Group Ltd",
  logoUrl = "/images/logo.jpg",
  whatsapp,
}: {
  companyName?: string;
  logoUrl?: string;
  whatsapp?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-3" aria-label={`${companyName} home`}>
            { }
            <img src={logoUrl} alt={`${companyName} logo`} className="h-10 w-auto" />
            <span className="hidden sm:block font-semibold text-lg text-[var(--brand-indigo)]">{companyName}</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? "text-[var(--brand-indigo)] bg-secondary"
                    : "text-muted-foreground hover:text-[var(--brand-indigo)] hover:bg-muted"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="ml-3 flex items-center gap-2">
              {whatsapp && (
                <a
                  href={`https://wa.me/${whatsapp.replace(/[^0-9]/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--brand-green)] hover:underline"
                  aria-label="Chat on WhatsApp"
                >
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </a>
              )}
              <Link href="/quote">
                <Button className="brand-gradient-green text-white hover:opacity-90" size="sm">
                  Request a Quote
                </Button>
              </Link>
            </div>
          </nav>

          <button
            className="md:hidden p-2 rounded-md hover:bg-muted"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="md:hidden border-t border-border bg-white px-4 pb-4 pt-2 space-y-1" aria-label="Mobile navigation">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className={`block px-3 py-2.5 rounded-md text-sm font-medium ${
                pathname === link.href ? "text-[var(--brand-indigo)] bg-secondary" : "text-foreground hover:bg-muted"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-2 space-y-2">
            {whatsapp && (
              <a
                href={`https://wa.me/${whatsapp.replace(/[^0-9]/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-[var(--brand-green)]"
              >
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </a>
            )}
            <Link href="/quote" className="block" onClick={() => setOpen(false)}>
              <Button className="w-full brand-gradient-green text-white">Request a Quote</Button>
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
