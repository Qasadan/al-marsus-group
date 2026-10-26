"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader, StatusBadge, Pagination, EmptyState } from "@/components/admin/shared";
import { InvoiceDialog } from "./invoice-dialog";
import { api, ApiClientError, formatMoneyDisplay, formatDateDisplay } from "@/lib/client";
import { useSettingsStore } from "@/lib/settings-store";
import { Plus, Search, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface InvoiceRow {
  id: string; invoiceNumber: string; status: string; issueDate: string; dueDate: string | null;
  totalCents: number; amountPaidCents: number; currency: string;
  customer: { id: string; name: string };
  project?: { id: string; code: string; name: string } | null;
}

export default function InvoicesPage() {
  const [items, setItems] = useState<InvoiceRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const currency = useSettingsStore((s) => s.currency);
  useSettingsStore((s) => s).load();
  const pageSize = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (q) params.set("q", q);
      if (status !== "all") params.set("status", status);
      const data = await api<{ items: InvoiceRow[]; total: number }>(`/api/invoices?${params}`);
      setItems(data.items);
      setTotal(data.total);
    } catch (e) {
      toast({ title: "Failed to load invoices", description: e instanceof ApiClientError ? e.message : "", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [page, q, status]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <PageHeader
        title="Invoices"
        description="Customer invoices with server-calculated totals and payment tracking."
        actions={<Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4" /> New Invoice</Button>}
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search invoice number…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className="pl-9" aria-label="Search invoices" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {["all", "DRAFT", "SENT", "PARTIALLY_PAID", "PAID", "OVERDUE"].map((s) => (
            <Button key={s} variant={status === s ? "default" : "outline"} size="sm"
              onClick={() => { setStatus(s); setPage(1); }} className={status === s ? "brand-gradient text-white" : ""}>
              {s === "all" ? "All" : s.replace("_", " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : items.length === 0 ? (
        <EmptyState message="No invoices yet." action={<Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4" /> New Invoice</Button>} />
      ) : (
        <div className="rounded-lg border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left">
                <th className="px-4 py-3 font-medium">Invoice #</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Issued</th>
                <th className="px-4 py-3 font-medium">Due</th>
                <th className="px-4 py-3 font-medium text-right">Total</th>
                <th className="px-4 py-3 font-medium text-right">Balance</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((inv) => (
                <tr key={inv.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <Link href={`/admin/invoices/${inv.id}`} className="font-medium text-primary hover:underline">
                      {inv.invoiceNumber}
                    </Link>
                    {inv.project && <div className="text-xs text-muted-foreground">{inv.project.code}</div>}
                  </td>
                  <td className="px-4 py-3">{inv.customer.name}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatDateDisplay(inv.issueDate)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatDateDisplay(inv.dueDate)}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">{formatMoneyDisplay(inv.totalCents, inv.currency || currency)}</td>
                  <td className={`px-4 py-3 text-right whitespace-nowrap font-medium ${inv.totalCents - inv.amountPaidCents > 0 ? "text-red-600" : "text-[var(--brand-green)]"}`}>
                    {formatMoneyDisplay(inv.totalCents - inv.amountPaidCents, inv.currency || currency)}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={inv.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4"><Pagination page={page} pageSize={pageSize} total={total} onPage={setPage} /></div>

      <InvoiceDialog open={dialogOpen} onOpenChange={setDialogOpen} onCreated={load} />
    </div>
  );
}
