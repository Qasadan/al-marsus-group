"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader, Pagination, EmptyState } from "@/components/admin/shared";
import { Card, CardContent } from "@/components/ui/card";
import { api, ApiClientError, formatMoneyDisplay, formatDateTimeDisplay } from "@/lib/client";
import { useSettingsStore } from "@/lib/settings-store";
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface PaymentRow {
  id: string; amountCents: number; currency: string; method: string; reference: string | null;
  paidAt: string; notes: string | null;
  invoice: { invoiceNumber: string; customer: { name: string } };
  recordedBy?: { name: string } | null;
}

export default function PaymentsPage() {
  const [items, setItems] = useState<PaymentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalCollected, setTotalCollected] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const currency = useSettingsStore((s) => s.currency);
  useSettingsStore((s) => s).load();
  const pageSize = 25;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<{ items: PaymentRow[]; total: number; totalCollectedCents: number }>(`/api/payments?page=${page}&pageSize=${pageSize}`);
      setItems(data.items);
      setTotal(data.total);
      setTotalCollected(data.totalCollectedCents);
    } catch (e) {
      toast({ title: "Failed to load payments", description: e instanceof ApiClientError ? e.message : "", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <PageHeader title="Payments" description="All payments recorded against invoices." />
      <Card className="mb-6 max-w-sm">
        <CardContent className="p-5">
          <p className="text-sm text-muted-foreground">Total collected (all time)</p>
          <p className="text-2xl font-bold text-[var(--brand-green)]">{formatMoneyDisplay(totalCollected, currency)}</p>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : items.length === 0 ? (
        <EmptyState message="No payments recorded yet. Record payments from the invoice page." />
      ) : (
        <div className="rounded-lg border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left">
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Invoice</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Method</th>
                <th className="px-4 py-3 font-medium">Reference</th>
                <th className="px-4 py-3 font-medium">Recorded by</th>
                <th className="px-4 py-3 font-medium text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 whitespace-nowrap">{formatDateTimeDisplay(p.paidAt)}</td>
                  <td className="px-4 py-3 font-medium">{p.invoice.invoiceNumber}</td>
                  <td className="px-4 py-3">{p.invoice.customer.name}</td>
                  <td className="px-4 py-3">{p.method.replace("_", " ")}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.reference ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.recordedBy?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-right font-medium text-[var(--brand-green)] whitespace-nowrap">{formatMoneyDisplay(p.amountCents, p.currency)}</td>
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
