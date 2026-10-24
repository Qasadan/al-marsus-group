"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader, StatusBadge, Pagination, EmptyState } from "@/components/admin/shared";
import { api, ApiClientError, formatMoneyDisplay, formatDateDisplay } from "@/lib/client";
import { Plus, Search, Loader2 } from "lucide-react";
import { useSettingsStore } from "@/lib/settings-store";
import { toast } from "@/hooks/use-toast";

interface QuotationRow {
  id: string; quoteNumber: string; title: string; status: string; totalCents: number;
  issueDate: string; expiryDate: string | null; currency: string; createdAt: string;
  customer: { id: string; name: string };
  _count: { items: number };
}

export default function QuotationsPage() {
  const [items, setItems] = useState<QuotationRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const currency = useSettingsStore((s) => s.currency);
  useSettingsStore((s) => s).load();
  const pageSize = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (q) params.set("q", q);
      if (status !== "all") params.set("status", status);
      const data = await api<{ items: QuotationRow[]; total: number }>(`/api/quotations?${params}`);
      setItems(data.items);
      setTotal(data.total);
    } catch (e) {
      toast({ title: "Failed to load quotations", description: e instanceof ApiClientError ? e.message : "", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [page, q, status]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <PageHeader
        title="Quotations"
        description="Create, send and track quotations across all divisions with server-calculated totals."
        actions={
          <Link href="/admin/quotations/new">
            <Button><Plus className="h-4 w-4" /> New Quotation</Button>
          </Link>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search quote number or title…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className="pl-9" aria-label="Search quotations" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {["all", "DRAFT", "SENT", "APPROVED", "REJECTED", "CONVERTED"].map((s) => (
            <Button key={s} variant={status === s ? "default" : "outline"} size="sm"
              onClick={() => { setStatus(s); setPage(1); }} className={status === s ? "brand-gradient text-white" : ""}>
              {s === "all" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : items.length === 0 ? (
        <EmptyState
          message="No quotations yet. Create one from a completed site survey or from scratch."
          action={<Link href="/admin/quotations/new"><Button><Plus className="h-4 w-4" /> New Quotation</Button></Link>}
        />
      ) : (
        <div className="rounded-lg border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left">
                <th className="px-4 py-3 font-medium">Quote #</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Issued</th>
                <th className="px-4 py-3 font-medium">Expires</th>
                <th className="px-4 py-3 font-medium text-right">Total</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((qt) => (
                <tr key={qt.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <Link href={`/admin/quotations/${qt.id}`} className="font-medium text-[var(--brand-indigo)] hover:underline">
                      {qt.quoteNumber}
                    </Link>
                    <div className="text-xs text-muted-foreground">{qt.title} · {qt._count.items} items</div>
                  </td>
                  <td className="px-4 py-3">{qt.customer.name}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatDateDisplay(qt.issueDate)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{qt.expiryDate ? formatDateDisplay(qt.expiryDate) : "—"}</td>
                  <td className="px-4 py-3 text-right font-medium whitespace-nowrap">{formatMoneyDisplay(qt.totalCents, qt.currency || currency)}</td>
                  <td className="px-4 py-3"><StatusBadge status={qt.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4"><Pagination page={page} pageSize={pageSize} total={total} onPage={setPage} /></div>
    </div>
  );
}
