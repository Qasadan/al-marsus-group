"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Users, Target, ClipboardList, FileText, FolderKanban,
  Package, Truck, ShoppingCart, ReceiptText, CreditCard, Receipt,
  Wrench, LifeBuoy, BarChart3, UserCog, Images, Settings, ScrollText,
  Bell, LogOut, Menu, X, Sun,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/client";
import type { Role } from "@/lib/auth";

const NAV_GROUPS: { title: string; items: { href: string; label: string; icon: typeof LayoutDashboard; roles: Role[] }[] }[] = [
  {
    title: "Overview",
    items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard, roles: ["SUPER_ADMIN", "MANAGER", "TECHNICIAN"] }],
  },
  {
    title: "Customers",
    items: [
      { href: "/admin/customers", label: "Customers", icon: Users, roles: ["SUPER_ADMIN", "MANAGER"] },
      { href: "/admin/leads", label: "Leads", icon: Target, roles: ["SUPER_ADMIN", "MANAGER"] },
      { href: "/admin/quote-requests", label: "Quote Requests", icon: ClipboardList, roles: ["SUPER_ADMIN", "MANAGER"] },
    ],
  },
  {
    title: "Sales & Projects",
    items: [
      { href: "/admin/surveys", label: "Site Surveys", icon: ClipboardList, roles: ["SUPER_ADMIN", "MANAGER", "TECHNICIAN"] },
      { href: "/admin/quotations", label: "Quotations", icon: FileText, roles: ["SUPER_ADMIN", "MANAGER"] },
      { href: "/admin/projects", label: "Projects", icon: FolderKanban, roles: ["SUPER_ADMIN", "MANAGER", "TECHNICIAN"] },
    ],
  },
  {
    title: "Inventory & Procurement",
    items: [
      { href: "/admin/inventory", label: "Inventory", icon: Package, roles: ["SUPER_ADMIN", "MANAGER"] },
      { href: "/admin/suppliers", label: "Suppliers", icon: Truck, roles: ["SUPER_ADMIN", "MANAGER"] },
      { href: "/admin/purchase-orders", label: "Purchase Orders", icon: ShoppingCart, roles: ["SUPER_ADMIN", "MANAGER"] },
    ],
  },
  {
    title: "Finance",
    items: [
      { href: "/admin/invoices", label: "Invoices", icon: ReceiptText, roles: ["SUPER_ADMIN", "MANAGER"] },
      { href: "/admin/payments", label: "Payments", icon: CreditCard, roles: ["SUPER_ADMIN", "MANAGER"] },
      { href: "/admin/expenses", label: "Expenses", icon: Receipt, roles: ["SUPER_ADMIN", "MANAGER"] },
    ],
  },
  {
    title: "Service",
    items: [
      { href: "/admin/maintenance", label: "Maintenance", icon: Wrench, roles: ["SUPER_ADMIN", "MANAGER", "TECHNICIAN"] },
      { href: "/admin/service-requests", label: "Service Requests", icon: LifeBuoy, roles: ["SUPER_ADMIN", "MANAGER", "TECHNICIAN"] },
    ],
  },
  {
    title: "Administration",
    items: [
      { href: "/admin/reports", label: "Reports", icon: BarChart3, roles: ["SUPER_ADMIN", "MANAGER"] },
      { href: "/admin/gallery", label: "Gallery", icon: Images, roles: ["SUPER_ADMIN", "MANAGER"] },
      { href: "/admin/staff", label: "Staff Accounts", icon: UserCog, roles: ["SUPER_ADMIN"] },
      { href: "/admin/settings", label: "Settings", icon: Settings, roles: ["SUPER_ADMIN"] },
      { href: "/admin/audit", label: "Audit Log", icon: ScrollText, roles: ["SUPER_ADMIN", "MANAGER"] },
    ],
  },
];

export function AdminShell({
  user,
  children,
}: {
  user: { name: string; email: string; role: Role };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  async function handleLogout() {
    await api("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  const sidebar = (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-3 px-5 h-16 border-b border-white/10">
        <Image src="/images/logo.jpg" alt="Logo" width={36} height={32} className="rounded bg-white/95 p-0.5" />
        <div className="leading-tight">
          <p className="font-semibold text-sm">Al-Marsus Group</p>
          <p className="text-[11px] text-white/60">Management System</p>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5 text-sm" aria-label="Admin navigation">
        {NAV_GROUPS.map((group) => {
          const visible = group.items.filter((i) => i.roles.includes(user.role));
          if (visible.length === 0) return null;
          return (
            <div key={group.title}>
              <p className="px-2 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/40">{group.title}</p>
              <ul className="space-y-0.5">
                {visible.map((item) => {
                  const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setSidebarOpen(false)}
                        className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 transition-colors ${
                          active ? "bg-white/15 text-white font-medium" : "text-white/70 hover:bg-white/10 hover:text-white"
                        }`}
                        aria-current={active ? "page" : undefined}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>
      <div className="border-t border-white/10 p-3">
        <div className="flex items-center justify-between gap-2 px-2 py-1.5">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-[11px] text-white/50">{user.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-md p-2 text-white/60 hover:bg-white/10 hover:text-white"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-60 shrink-0 sticky top-0 h-screen">{sidebar}</aside>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} aria-hidden="true" />
          <aside className="absolute inset-y-0 left-0 w-64">{sidebar}</aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-border bg-white/95 backdrop-blur px-4">
          <div className="flex items-center gap-3">
            <button className="lg:hidden p-2 rounded-md hover:bg-muted" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <span className="text-sm font-medium text-muted-foreground">
              {NAV_GROUPS.flatMap((g) => g.items).find((i) => (i.href === "/admin" ? pathname === "/admin" : pathname.startsWith(i.href)))?.label ?? "Admin"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/notifications" aria-label="Notifications">
                <Bell className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link href="/" aria-label="View website">
                <Sun className="h-4 w-4" /> Website
              </Link>
            </Button>
            <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">{user.role.replace("_", " ")}</span>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
