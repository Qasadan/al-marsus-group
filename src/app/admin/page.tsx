"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users, FolderKanban, Target, ClipboardList, FileText, Package,
  LifeBuoy, TrendingUp, TrendingDown, Wallet, AlertTriangle, Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader, StatusBadge } from "@/components/admin/shared";
import { api, formatMoneyDisplay, formatDateDisplay } from "@/lib/client";
import { useSettingsStore } from "@/lib/settings-store";

interface Stats {
  customers: number;
  activeProjects: number;
  openLeads: number;
  newQuoteRequests: number;
  scheduledSurveys: number;
  pendingQuotations: number;
  lowStockCount: number;
  openServiceRequests: number;
  totalRevenueCents: number;
  totalExpensesCents: number;
  revenueThisMonthCents: number;
  outstandingCents: number;
  outstandingInvoicesCount: number;
  recentProjects: {
    id: string; code: string; name: string; status: string; progress: number; createdAt: string;
    customer: { name: string };
  }[];
  projectStatusCounts: { status: string; _count: number }[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");
  const currency = useSettingsStore((s) => s.currency);

  useEffect(() => {
    api<Stats>("/api/stats")
      .then(setStats)
      .catch((e) => setError(e.message));
  }, []);

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
    );
  }

  if (!stats) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      </div>
    );
  }

  const cards = [
    { label: "Customers", value: stats.customers, icon: Users, href: "/admin/customers", color: "text-[var(--brand-indigo)]" },
    { label: "Active Projects", value: stats.activeProjects, icon: FolderKanban, href: "/admin/projects", color: "text-[var(--brand-green)]" },
    { label: "Open Leads", value: stats.openLeads, icon: Target, href: "/admin/leads", color: "text-[var(--brand-indigo)]" },
    { label: "New Quote Requests", value: stats.newQuoteRequests, icon: ClipboardList, href: "/admin/quote-requests", color: "text-[var(--brand-green)]" },
    { label: "Scheduled Surveys", value: stats.scheduledSurveys, icon: ClipboardList, href: "/admin/surveys", color: "text-[var(--brand-indigo)]" },
    { label: "Pending Quotations", value: stats.pendingQuotations, icon: FileText, href: "/admin/quotations", color: "text-[var(--brand-green)]" },
    { label: "Low Stock Items", value: stats.lowStockCount, icon: Package, href: "/admin/inventory?lowStock=true", color: "text-red-600" },
    { label: "Open Service Requests", value: stats.openServiceRequests, icon: LifeBuoy, href: "/admin/service-requests", color: "text-[var(--brand-indigo)]" },
  ];

  return (
    <div>
      <PageHeader title="Dashboard" description="Live business statistics computed from database records." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        {cards.map((c) => (
          <Link key={c.label} href={c.href}>
            <Card className="hover:shadow-md transition-shadow h-full">
              <CardContent className="p-5 flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{c.label}</p>
                  <p className="text-3xl font-bold mt-1">{c.value}</p>
                </div>
                <c.icon className={`h-8 w-8 ${c.color}`} />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Wallet className="h-4 w-4" /> Total Revenue</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-[var(--brand-green)]">{formatMoneyDisplay(stats.totalRevenueCents, currency)}</p>
            <p className="text-xs text-muted-foreground mt-1">{formatMoneyDisplay(stats.revenueThisMonthCents, currency)} this month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><TrendingDown className="h-4 w-4" /> Total Expenses</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{formatMoneyDisplay(stats.totalExpensesCents, currency)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Outstanding</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-[var(--brand-indigo)]">{formatMoneyDisplay(stats.outstandingCents, currency)}</p>
            <p className="text-xs text-muted-foreground mt-1">{stats.outstandingInvoicesCount} unpaid invoice(s)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Attention</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            {stats.lowStockCount > 0 && <p className="text-red-600">{stats.lowStockCount} product(s) at/below reorder level</p>}
            {stats.newQuoteRequests > 0 && <p>{stats.newQuoteRequests} new quote request(s) to review</p>}
            {stats.newQuoteRequests === 0 && stats.lowStockCount === 0 && <p className="text-muted-foreground">Nothing urgent.</p>}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Recent Projects</CardTitle></CardHeader>
          <CardContent>
            {stats.recentProjects.length === 0 ? (
              <p className="text-sm text-muted-foreground">No projects yet. Convert an approved quotation to create the first project.</p>
            ) : (
              <ul className="space-y-3">
                {stats.recentProjects.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2 border-b border-border pb-2 last:border-0 last:pb-0">
                    <div className="min-w-0">
                      <Link href={`/admin/projects/${p.id}`} className="text-sm font-medium hover:underline truncate block">
                        {p.code} — {p.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">{p.customer.name} · {formatDateDisplay(p.createdAt)}</p>
                    </div>
                    <StatusBadge status={p.status} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Projects by Status</CardTitle></CardHeader>
          <CardContent>
            {stats.projectStatusCounts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No project data yet.</p>
            ) : (
              <ul className="space-y-2.5">
                {stats.projectStatusCounts.map((s) => {
                  const max = Math.max(...stats.projectStatusCounts.map((x) => x._count));
                  return (
                    <li key={s.status} className="flex items-center gap-3">
                      <span className="w-32 text-sm shrink-0"><StatusBadge status={s.status} /></span>
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full brand-gradient" style={{ width: `${(s._count / max) * 100}%` }} />
                      </div>
                      <span className="text-sm font-medium w-8 text-right">{s._count}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
