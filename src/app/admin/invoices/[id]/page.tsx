"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge, useConfirm } from "@/components/admin/shared";
import { api, ApiClientError, formatMoneyDisplay, formatDateDisplay, formatDateTimeDisplay } from "@/lib/client";
import { useSettingsStore } from "@/lib/settings-store";
import { ArrowLeft, Loader2, Printer, CreditCard, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface InvoiceDetail {
  id: string; invoiceNumber: string; status: string; issueDate: string; dueDate: string | null;
  currency: string; subtotalCents: number; discountCents: number; taxRate: number; taxCents: number;
  totalCents: number; amountPaidCents: number; notes: string | null; terms: string | null;
  customer: { id: string; name: string; email: string | null; phone: string | null; address: string | null };
  project?: { id: string; code: string; name: string } | null;
  items: { id: string; description: string; quantity: number; unitPriceCents: number; totalCents: number }[];
  payments: { id: string; amountCents: number; currency: string; method: string; reference: string | null; paidAt: string; notes: string | null; recordedBy?: { name: string } | null }[];
}

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const currency = useSettingsStore((s) => s.currency);
  useSettingsStore((s) => s).load();
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [payOpen, setPayOpen] = useState(false);
  const [payForm, setPayForm] = useState({ amount: "", method: "BANK_TRANSFER", reference: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const { confirm, confirmDialog } = useConfirm();

  const load = useCallback(async () => {
    try {
      const data = await api<InvoiceDetail>(`/api/invoices/${id}`);
      setInvoice(data);
    } catch (e) {
      toast({ title: "Failed to load invoice", description: e instanceof ApiClientError ? e.message : "", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  if (!invoice) return <p className="text-sm text-muted-foreground">Invoice not found.</p>;

  const cur = invoice.currency || currency;
  const outstanding = invoice.totalCents - invoice.amountPaidCents;

  async function recordPayment() {
    setSaving(true);
    try {
      await api("/api/payments", {
        method: "POST",
        json: {
          invoiceId: invoice!.id,
          amount: Number(payForm.amount),
          method: payForm.method,
          reference: payForm.reference || null,
          notes: payForm.notes || null,
        },
      });
      toast({ title: "Payment recorded" });
      setPayOpen(false);
      setPayForm({ amount: String(outstanding / 100), method: "BANK_TRANSFER", reference: "", notes: "" });
      load();
    } catch (e) {
      toast({ title: "Payment rejected", description: e instanceof ApiClientError ? e.message : "", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function deletePayment(paymentId: string) {
    confirm({
      title: "Delete this payment?",
      description: "The invoice balance and status will be recalculated from remaining payments.",
      onConfirm: async () => {
        toast({ title: "Payment deletions require super admin", description: "For audit integrity, payments cannot be deleted from the UI. Issue a credit note or contact the administrator." });
      },
    });
  }

  return (
    <div>
      <div className="mb-4">
        <Link href="/admin/invoices" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Back to invoices
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[var(--brand-indigo)]">{invoice.invoiceNumber}</h1>
            <StatusBadge status={invoice.status} />
          </div>
          <p className="text-sm text-muted-foreground mt-1">{invoice.customer.name}{invoice.project ? ` · ${invoice.project.code}` : ""}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {outstanding > 0 && !["CANCELLED", "DRAFT"].includes(invoice.status) && (
            <Button onClick={() => { setPayForm({ amount: String(outstanding / 100), method: "BANK_TRANSFER", reference: "", notes: "" }); setPayOpen(true); }} className="brand-gradient-green text-white">
              <CreditCard className="h-4 w-4" /> Record Payment
            </Button>
          )}
          {invoice.status === "DRAFT" && (
            <Button variant="outline" onClick={async () => { await api(`/api/invoices?id=${invoice.id}`, { method: "PUT", json: { status: "SENT" } }); load(); }}>
              Mark as sent
            </Button>
          )}
          <Link href={`/print/invoice/${invoice.id}`} target="_blank">
            <Button variant="outline"><Printer className="h-4 w-4" /> Print / PDF</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3 mb-6">
        <div className="lg:col-span-2 rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left">
                <th className="px-4 py-3 font-medium">Description</th>
                <th className="px-4 py-3 font-medium text-right">Qty</th>
                <th className="px-4 py-3 font-medium text-right">Unit Price</th>
                <th className="px-4 py-3 font-medium text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((it) => (
                <tr key={it.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">{it.description}</td>
                  <td className="px-4 py-3 text-right">{it.quantity}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">{formatMoneyDisplay(it.unitPriceCents, cur)}</td>
                  <td className="px-4 py-3 text-right font-medium whitespace-nowrap">{formatMoneyDisplay(it.totalCents, cur)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="space-y-4">
          <div className="rounded-lg border border-border p-5 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatMoneyDisplay(invoice.subtotalCents, cur)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span>-{formatMoneyDisplay(invoice.discountCents, cur)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Tax ({invoice.taxRate}%)</span><span>{formatMoneyDisplay(invoice.taxCents, cur)}</span></div>
            <div className="flex justify-between border-t border-border pt-2 font-bold"><span>Total</span><span>{formatMoneyDisplay(invoice.totalCents, cur)}</span></div>
            <div className="flex justify-between text-[var(--brand-green)]"><span>Paid</span><span>{formatMoneyDisplay(invoice.amountPaidCents, cur)}</span></div>
            <div className="flex justify-between font-bold text-red-600"><span>Outstanding</span><span>{formatMoneyDisplay(outstanding, cur)}</span></div>
          </div>
          <div className="rounded-lg border border-border p-5 text-sm space-y-1">
            <h3 className="font-semibold">Customer</h3>
            <p className="font-medium">{invoice.customer.name}</p>
            {invoice.customer.phone && <p className="text-muted-foreground">{invoice.customer.phone}</p>}
            {invoice.customer.email && <p className="text-muted-foreground">{invoice.customer.email}</p>}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border p-5">
        <h3 className="font-semibold mb-3">Payment history</h3>
        {invoice.payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2">Date</th><th className="py-2">Method</th><th className="py-2">Reference</th>
                  <th className="py-2">Recorded by</th><th className="py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.payments.map((p) => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="py-2 whitespace-nowrap">{formatDateTimeDisplay(p.paidAt)}</td>
                    <td className="py-2">{p.method.replace("_", " ")}</td>
                    <td className="py-2 text-muted-foreground">{p.reference ?? "—"}</td>
                    <td className="py-2 text-muted-foreground">{p.recordedBy?.name ?? "—"}</td>
                    <td className="py-2 text-right font-medium whitespace-nowrap">{formatMoneyDisplay(p.amountCents, p.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Record Payment — {invoice.invoiceNumber}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Outstanding balance: <strong>{formatMoneyDisplay(outstanding, cur)}</strong>. Partial payments are supported; overpayments are rejected.</p>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="pay-amt">Amount *</Label>
                <Input id="pay-amt" type="number" min="0" step="any" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Method</Label>
                <Select value={payForm.method} onValueChange={(v) => setPayForm({ ...payForm, method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="BANK_TRANSFER">Bank transfer</SelectItem>
                    <SelectItem value="MOBILE_MONEY">Mobile money</SelectItem>
                    <SelectItem value="CHEQUE">Cheque</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pay-ref">Payment reference</Label>
              <Input id="pay-ref" value={payForm.reference} onChange={(e) => setPayForm({ ...payForm, reference: e.target.value })} placeholder="Transaction ID / receipt no." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayOpen(false)}>Cancel</Button>
            <Button onClick={recordPayment} disabled={saving || !payForm.amount || Number(payForm.amount) <= 0} className="brand-gradient-green text-white">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Record payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {confirmDialog}
    </div>
  );
}
