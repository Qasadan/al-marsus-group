"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { PageHeader, StatusBadge, Pagination, EmptyState } from "@/components/admin/shared";
import { PurchaseOrderDialog } from "./po-dialog";
import { api, ApiClientError, formatMoneyDisplay, formatDateDisplay } from "@/lib/client";
import { useSettingsStore } from "@/lib/settings-store";
import { Plus, Loader2, PackageCheck } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export interface PORow {
  id: string; poNumber: string; status: string; orderDate: string; expectedDate: string | null;
  currency: string; subtotalCents: number; taxCents: number; totalCents: number; notes: string | null;
  supplier: { id: string; name: string };
  items: { id: string; productId: string | null; description: string; quantity: number; receivedQuantity: number; unitCostCents: number; totalCents: number }[];
}

export default function PurchaseOrdersPage() {
  const [items, setItems] = useState<PORow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const currency = useSettingsStore((s) => s.currency);
  useSettingsStore((s) => s).load();
  const pageSize = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<{ items: PORow[]; total: number }>(`/api/purchase-orders?page=${page}&pageSize=${pageSize}`);
      setItems(data.items);
      setTotal(data.total);
    } catch (e) {
      toast({ title: "Failed to load purchase orders", description: e instanceof ApiClientError ? e.message : "", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  async function receiveOrder(po: PORow) {
    const lines = po.items
      .filter((i) => i.receivedQuantity < i.quantity)
      .map((i) => ({ itemId: i.id, quantity: i.quantity - i.receivedQuantity }));
    if (lines.length === 0) {
      toast({ title: "All items already received" });
      return;
    }
    try {
      await api(`/api/purchase-orders/${po.id}/receive`, { method: "POST", json: { lines } });
      toast({ title: "Stock received", description: `${lines.length} item line(s) added to inventory.` });
      load();
    } catch (e) {
      toast({ title: "Receiving failed", description: e instanceof ApiClientError ? e.message : "", variant: "destructive" });
    }
  }

  async function updateStatus(po: PORow, status: string) {
    try {
      await api(`/api/purchase-orders?id=${po.id}`, { method: "PUT", json: { status } });
      toast({ title: "Status updated" });
      load();
    } catch (e) {
      toast({ title: "Update failed", description: e instanceof ApiClientError ? e.message : "", variant: "destructive" });
    }
  }

  return (
    <div>
      <PageHeader
        title="Purchase Orders"
        description="Order equipment from suppliers; receiving stock updates inventory atomically."
        actions={<Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4" /> New Purchase Order</Button>}
      />

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : items.length === 0 ? (
        <EmptyState message="No purchase orders yet." action={<Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4" /> New Purchase Order</Button>} />
      ) : (
        <div className="space-y-4">
          {items.map((po) => {
            const fullyReceived = po.items.every((i) => i.receivedQuantity >= i.quantity);
            const anyReceived = po.items.some((i) => i.receivedQuantity > 0);
            return (
              <div key={po.id} className="rounded-lg border border-border bg-card p-5">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-[var(--brand-indigo)]">{po.poNumber}</span>
                      <StatusBadge status={po.status} />
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {po.supplier.name} · Ordered {formatDateDisplay(po.orderDate)}
                      {po.expectedDate ? ` · Expected ${formatDateDisplay(po.expectedDate)}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold mr-2">{formatMoneyDisplay(po.totalCents, po.currency || currency)}</span>
                    {["DRAFT", "ORDERED"].includes(po.status) && <Button size="sm" variant="outline" onClick={() => updateStatus(po, "ORDERED")}>Mark ordered</Button>}
                    {["ORDERED", "PARTIALLY_RECEIVED", "DRAFT"].includes(po.status) && !fullyReceived && (
                      <Button size="sm" onClick={() => receiveOrder(po)} className="brand-gradient-green text-white">
                        <PackageCheck className="h-4 w-4" /> Receive all remaining
                      </Button>
                    )}
                    {anyReceived && !fullyReceived && po.status !== "CANCELLED" && (
                      <Button size="sm" variant="outline" onClick={() => receiveOrder(po)}>Receive remaining</Button>
                    )}
                    {po.status !== "RECEIVED" && po.status !== "CANCELLED" && (
                      <Button size="sm" variant="ghost" className="text-red-600" onClick={() => updateStatus(po, "CANCELLED")}>Cancel</Button>
                    )}
                  </div>
                </div>
                <div className="mt-3 rounded-md border border-border overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/50 text-left">
                        <th className="px-3 py-2 font-medium">Item</th>
                        <th className="px-3 py-2 font-medium text-right">Ordered</th>
                        <th className="px-3 py-2 font-medium text-right">Received</th>
                        <th className="px-3 py-2 font-medium text-right">Unit cost</th>
                        <th className="px-3 py-2 font-medium text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {po.items.map((i) => (
                        <tr key={i.id} className="border-t border-border">
                          <td className="px-3 py-2">{i.description}</td>
                          <td className="px-3 py-2 text-right">{i.quantity}</td>
                          <td className={`px-3 py-2 text-right ${i.receivedQuantity >= i.quantity ? "text-[var(--brand-green)]" : i.receivedQuantity > 0 ? "text-amber-600" : ""}`}>
                            {i.receivedQuantity}
                          </td>
                          <td className="px-3 py-2 text-right whitespace-nowrap">{formatMoneyDisplay(i.unitCostCents, po.currency || currency)}</td>
                          <td className="px-3 py-2 text-right whitespace-nowrap">{formatMoneyDisplay(i.totalCents, po.currency || currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4"><Pagination page={page} pageSize={pageSize} total={total} onPage={setPage} /></div>

      <PurchaseOrderDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={() => { setDialogOpen(false); load(); }}
      />
    </div>
  );
}
