"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, MessageCircle, ChevronDown, Zap, Cpu, HardHat, Snowflake, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DIVISION_CODES, DIVISIONS } from "@/lib/divisions";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About Us" },
  { href: "/services", label: "Services" },
  { href: "/projects", label: "Projects" },
  { href: "/contact", label: "Contact" },
];

const DIVISION_ICONS = { zap: Zap, cpu: Cpu, "hard-hat": HardHat, snowflake: Snowflake } as const;

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
  const isDivisionRoute = pathname.startsWith("/divisions");

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-3" aria-label={`${companyName} home`}>
            <img src={logoUrl} alt={`${companyName} logo`} className="h-10 w-auto" />
            <span className="hidden sm:block font-semibold text-lg text-primary">{companyName}</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
            {NAV_LINKS.slice(0, 2).map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-2 rounded-full text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? "text-primary bg-secondary"
                    : "text-muted-foreground hover:text-primary hover:bg-muted"
                }`}
              >
                {link.label}
              </Link>
            ))}

            {/* Divisions dropdown — the group's four business branches */}
            <DropdownMenu>
              <DropdownMenuTrigger
                className={`inline-flex items-center gap-1 px-3 py-2 rounded-full text-sm font-medium transition-colors outline-none ${
                  isDivisionRoute
                    ? "text-primary bg-secondary"
                    : "text-muted-foreground hover:text-primary hover:bg-muted"
                }`}
                aria-label="Our divisions"
              >
                Our Divisions <ChevronDown className="h-3.5 w-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-72">
                <DropdownMenuLabel>Four specialised branches</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {DIVISION_CODES.map((code) => {
                  const d = DIVISIONS[code];
                  const Icon = DIVISION_ICONS[d.icon];
                  return (
                    <DropdownMenuItem key={code} asChild>
                      <Link href={`/divisions/${d.slug}`} className="flex items-start gap-3 py-2.5">
                        <span className="mt-0.5 rounded-md bg-secondary p-1.5 text-primary">
                          <Icon className="h-4 w-4" />
                        </span>
                        <span>
                          <span className="block text-sm font-medium">{d.shortName}</span>
                          <span className="block text-xs text-muted-foreground line-clamp-1">{d.fullName}</span>
                        </span>
                      </Link>
                    </DropdownMenuItem>
                  );
                })}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/divisions" className="flex items-center gap-2 text-sm font-medium text-[var(--brand-green)] dark:text-[var(--brand-green-bright)]">
                    <LayoutGrid className="h-4 w-4" /> All divisions overview
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {NAV_LINKS.slice(2).map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-2 rounded-full text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? "text-primary bg-secondary"
                    : "text-muted-foreground hover:text-primary hover:bg-muted"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="ml-3 flex items-center gap-1.5">
              {whatsapp && (
                <a
                  href={`https://wa.me/${whatsapp.replace(/[^0-9]/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--brand-green)] hover:underline dark:text-[var(--brand-green-bright)]"
                  aria-label="Chat on WhatsApp"
                >
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </a>
              )}
              <ThemeToggle />
              <Link href="/quote">
                <Button className="brand-gradient-green text-white shadow-sm hover:opacity-90 rounded-full" size="sm">
                  Request a Quote
                </Button>
              </Link>
            </div>
          </nav>

          <div className="flex items-center gap-1 md:hidden">
            <ThemeToggle />
            <button
              className="p-2 rounded-md hover:bg-muted"
              onClick={() => setOpen(!open)}
              aria-expanded={open}
              aria-label={open ? "Close menu" : "Open menu"}
            >
              {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {open && (
        <nav className="md:hidden border-t border-border bg-background px-4 pb-4 pt-2 space-y-1 max-h-[calc(100vh-4rem)] overflow-y-auto" aria-label="Mobile navigation">
          {NAV_LINKS.slice(0, 2).map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className={`block px-3 py-2.5 rounded-md text-sm font-medium ${
                pathname === link.href ? "text-primary bg-secondary" : "text-foreground hover:bg-muted"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <p className="px-3 pt-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Our Divisions
          </p>
          {DIVISION_CODES.map((code) => {
            const d = DIVISIONS[code];
            const Icon = DIVISION_ICONS[d.icon];
            return (
              <Link
                key={code}
                href={`/divisions/${d.slug}`}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium ${
                  pathname === `/divisions/${d.slug}` ? "text-primary bg-secondary" : "text-foreground hover:bg-muted"
                }`}
              >
                <Icon className="h-4 w-4 text-primary" />
                {d.fullName}
              </Link>
            );
          })}
          {NAV_LINKS.slice(2).map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className={`block px-3 py-2.5 rounded-md text-sm font-medium ${
                pathname === link.href ? "text-primary bg-secondary" : "text-foreground hover:bg-muted"
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
                className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-[var(--brand-green)] dark:text-[var(--brand-green-bright)]"
              >
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </a>
            )}
            <Link href="/quote" className="block" onClick={() => setOpen(false)}>
              <Button className="w-full brand-gradient-green text-white rounded-full">Request a Quote</Button>
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
