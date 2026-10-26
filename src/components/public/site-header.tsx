"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  MessageCircle,
  ChevronDown,
  Zap,
  Cpu,
  HardHat,
  Snowflake,
  LayoutGrid,
  Phone,
  Mail,
  MapPin,
  ArrowRight,
} from "lucide-react";
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
  email,
  phone,
  address,
}: {
  companyName?: string;
  logoUrl?: string;
  whatsapp?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const isDivisionRoute = pathname.startsWith("/divisions");

  const linkCls = (active: boolean) =>
    `relative px-1 py-2 text-[0.92rem] font-medium transition-colors after:absolute after:inset-x-0 after:bottom-0.5 after:h-0.5 after:origin-left after:scale-x-0 after:bg-[var(--brand-green)] after:transition-transform after:duration-300 hover:text-[var(--brand-green)] ${
      active ? "text-[var(--brand-green)] after:scale-x-100" : "text-foreground/80"
    }`;

  return (
    <header className="relative z-40">
      {/* Topbar — contact strip (reference design) */}
      <div className="bg-[var(--brand-footer)] text-white/75">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex h-10 items-center justify-between gap-4 text-xs">
            <div className="flex min-w-0 items-center gap-5">
              {phone && (
                <a href={`tel:${phone}`} className="inline-flex items-center gap-1.5 hover:text-white">
                  <Phone className="h-3.5 w-3.5 text-[var(--brand-green-bright)]" />
                  <span className="truncate">{phone}</span>
                </a>
              )}
              {email && (
                <a href={`mailto:${email}`} className="hidden items-center gap-1.5 hover:text-white sm:inline-flex">
                  <Mail className="h-3.5 w-3.5 text-[var(--brand-green-bright)]" />
                  <span className="truncate">{email}</span>
                </a>
              )}
              {address && (
                <span className="hidden items-center gap-1.5 md:inline-flex">
                  <MapPin className="h-3.5 w-3.5 text-[var(--brand-green-bright)]" />
                  <span className="truncate">{address}</span>
                </span>
              )}
            </div>
            <Link
              href="/quote"
              className="inline-flex shrink-0 items-center gap-1.5 font-semibold text-white transition-colors hover:text-[var(--brand-green-bright)]"
            >
              Request a quote <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Main bar — logo left, centered nav, socials right */}
      <div className="sticky top-0 border-b border-border/60 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex h-[4.5rem] items-center justify-between gap-4">
            <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label={`${companyName} home`}>
              <img src={logoUrl} alt={`${companyName} logo`} className="h-11 w-auto" />
            </Link>

            <nav className="hidden items-center gap-7 lg:flex" aria-label="Main navigation">
              {NAV_LINKS.slice(0, 2).map((link) => (
                <Link key={link.href} href={link.href} className={linkCls(pathname === link.href)}>
                  {link.label}
                </Link>
              ))}

              {/* Divisions dropdown — the group's four business branches */}
              <DropdownMenu>
                <DropdownMenuTrigger
                  className={`relative px-1 py-2 text-[0.92rem] font-medium transition-colors outline-none after:absolute after:inset-x-0 after:bottom-0.5 after:h-0.5 after:origin-left after:scale-x-0 after:bg-[var(--brand-green)] after:transition-transform after:duration-300 hover:text-[var(--brand-green)] ${
                    isDivisionRoute ? "text-[var(--brand-green)] after:scale-x-100" : "text-foreground/80"
                  }`}
                  aria-label="Our divisions"
                >
                  <span className="inline-flex items-center gap-1">
                    Discover <ChevronDown className="h-3.5 w-3.5" />
                  </span>
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
                <Link key={link.href} href={link.href} className={linkCls(pathname === link.href)}>
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              {whatsapp && (
                <a
                  href={`https://wa.me/${whatsapp.replace(/[^0-9]/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Chat on WhatsApp"
                  className="hidden h-10 w-10 items-center justify-center rounded-full bg-muted text-foreground/70 transition-colors hover:bg-secondary hover:text-[var(--brand-green)] sm:inline-flex"
                >
                  <MessageCircle className="h-4.5 w-4.5" />
                </a>
              )}
              <ThemeToggle />
              <Link href="/quote" className="hidden md:block">
                <Button className="glow-border brand-gradient-green rounded-lg px-5 text-white shadow-sm hover:opacity-90" size="sm">
                  Request a Quote
                </Button>
              </Link>
              <button
                className="p-2 lg:hidden"
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
          <nav
            className="absolute inset-x-0 top-full z-50 max-h-[calc(100vh-2.5rem)] space-y-1 overflow-y-auto border-b border-border bg-background px-4 pb-4 pt-3 shadow-xl lg:hidden"
            aria-label="Mobile navigation"
          >
          {NAV_LINKS.slice(0, 2).map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className={`block px-3 py-2.5 rounded-md text-sm font-medium ${
                pathname === link.href ? "text-[var(--brand-green)] bg-secondary" : "text-foreground hover:bg-muted"
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
                  pathname === `/divisions/${d.slug}` ? "text-[var(--brand-green)] bg-secondary" : "text-foreground hover:bg-muted"
                }`}
              >
                <Icon className="h-4 w-4 text-[var(--brand-green)]" />
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
                pathname === link.href ? "text-[var(--brand-green)] bg-secondary" : "text-foreground hover:bg-muted"
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
              <Button className="w-full brand-gradient-green text-white rounded-lg">Request a Quote</Button>
            </Link>
          </div>
          </nav>
        )}
      </div>
    </header>
  );
}
