"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/admin/shared";
import { api, ApiClientError, formatMoneyDisplay } from "@/lib/client";
import { useSettingsStore } from "@/lib/settings-store";
import { Loader2, Save, ArrowLeft, Plus, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Item { kind: string; description: string; productId: string | null; quantity: number; unitPrice: number }
interface ProductOption { id: string; sku: string; name: string; priceCents: number | null; unit: string }

const emptyItem: Item = { kind: "EQUIPMENT", description: "", productId: null, quantity: 1, unitPrice: 0 };

export default function NewQuotationPage() {
  const router = useRouter();
  const currency = useSettingsStore((s) => s.currency);
  const taxRateDefault = useSettingsStore((s) => s.taxRate);
  useSettingsStore((s) => s).load();

  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [surveys, setSurveys] = useState<{ id: string; customer: { id: string; name: string }; avgMonthlyKwh: number | null }[]>([]);
  const [form, setForm] = useState({ customerId: "", surveyId: "none", title: "", discount: "0", taxRate: "", notes: "" });
  const [taxTouched, setTaxTouched] = useState(false);
  const taxRateEffective = taxTouched ? form.taxRate : taxRateDefault > 0 ? String(taxRateDefault) : form.taxRate;
  const [items, setItems] = useState<Item[]>([{ ...emptyItem }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ items: { id: string; name: string }[] }>("/api/customers?pageSize=100").then((d) => setCustomers(d.items)).catch(() => {});
    api<{ items: ProductOption[] }>("/api/products?pageSize=100").then((d) => setProducts(d.items)).catch(() => {});
    api<{ items: { id: string; customer: { id: string; name: string }; avgMonthlyKwh: number | null }[] }>("/api/surveys?status=COMPLETED&pageSize=50")
      .then((d) => setSurveys(d.items)).catch(() => {});
  }, []);

  function updateItem(i: number, patch: Partial<Item>) {
    setItems(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }

  function applyProduct(i: number, productId: string) {
    const p = products.find((x) => x.id === productId);
    if (!p) return;
    updateItem(i, { productId, description: `${p.name} (${p.sku})`, unitPrice: p.priceCents != null ? p.priceCents / 100 : 0 });
  }

  const subtotal = items.reduce((s, it) => s + Math.round(it.quantity * it.unitPrice * 100), 0);
  const discountC = Math.max(0, Math.round(Number(form.discount || 0) * 100));
  const taxC = Math.round(Math.max(0, subtotal - discountC) * (Number(taxRateEffective || 0) / 100));
  const total = Math.max(0, subtotal - discountC) + taxC;

  async function handleSave(markSent: boolean) {
    setSaving(true);
    setError("");
    try {
      const created = await api<{ id: string; quoteNumber: string }>("/api/quotations", {
        method: "POST",
        json: {
          customerId: form.customerId,
          surveyId: form.surveyId === "none" ? null : form.surveyId,
          title: form.title,
          discount: Number(form.discount || 0),
          taxRate: Number(taxRateEffective || 0),
          notes: form.notes || null,
          items: items.map((it) => ({ kind: it.kind, description: it.description, productId: it.productId, quantity: it.quantity, unitPrice: it.unitPrice })),
        },
      });
      if (markSent) {
        await api(`/api/quotations?id=${created.id}`, { method: "PUT", json: { action: "send" } });
      }
      toast({ title: "Quotation created", description: created.quoteNumber });
      router.push(`/admin/quotations/${created.id}`);
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Save failed");
      setSaving(false);
    }
  }

  const selectedSurvey = surveys.find((s) => s.id === form.surveyId);

  return (
    <div>
      <div className="mb-4">
        <Link href="/admin/quotations" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Back to quotations
        </Link>
      </div>
      <PageHeader title="New Quotation" description="Line item totals, tax and discounts are recalculated on the server when saved." />

      {error && <p className="mb-4 text-sm text-red-600" role="alert">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-5">
          <div className="rounded-lg border border-border p-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Customer *</Label>
                <Select value={form.customerId} onValueChange={(v) => setForm({ ...form, customerId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {customers.length === 0 && <p className="text-xs text-amber-600">Add a customer first in the Customers page.</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="n-title">Title *</Label>
                <Input id="n-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. 5kW hybrid solar installation" maxLength={200} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Link completed survey (optional)</Label>
              <Select value={form.surveyId} onValueChange={(v) => setForm({ ...form, surveyId: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {surveys.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.customer.name}{s.avgMonthlyKwh != null ? ` — ${s.avgMonthlyKwh} kWh/mo` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedSurvey?.avgMonthlyKwh != null && (
                <p className="text-xs text-muted-foreground">
                  Survey records {selectedSurvey.avgMonthlyKwh} kWh/month average consumption — use it to size the system. All sizing is preliminary and must be verified by qualified personnel.
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Equipment & labor line items *</Label>
            {items.map((it, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-end rounded-md border border-border p-3">
                <div className="col-span-12 sm:col-span-2 space-y-1">
                  <Label className="text-xs">Type</Label>
                  <Select value={it.kind} onValueChange={(v) => updateItem(i, { kind: v })}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EQUIPMENT">Equipment</SelectItem>
                      <SelectItem value="LABOR">Labor</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-12 sm:col-span-4 space-y-1">
                  <Label className="text-xs">From catalog</Label>
                  <Select value={it.productId ?? "none"} onValueChange={(v) => (v === "none" ? updateItem(i, { productId: null }) : applyProduct(i, v))}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Optional" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Custom item</SelectItem>
                      {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} ({p.sku})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-12 sm:col-span-4 space-y-1">
                  <Label className="text-xs">Description *</Label>
                  <Input className="h-9" value={it.description} onChange={(e) => updateItem(i, { description: e.target.value })} />
                </div>
                <div className="col-span-4 sm:col-span-1 space-y-1">
                  <Label className="text-xs">Qty</Label>
                  <Input className="h-9" type="number" min="0" step="any" value={it.quantity} onChange={(e) => updateItem(i, { quantity: Number(e.target.value) })} />
                </div>
                <div className="col-span-6 sm:col-span-2 space-y-1">
                  <Label className="text-xs">Unit price</Label>
                  <Input className="h-9" type="number" min="0" step="any" value={it.unitPrice} onChange={(e) => updateItem(i, { unitPrice: Number(e.target.value) })} />
                </div>
                <div className="col-span-2 sm:col-span-1 flex justify-end">
                  <Button variant="ghost" size="icon" onClick={() => setItems(items.filter((_, idx) => idx !== i))} aria-label="Remove item">
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setItems([...items, { ...emptyItem }])}>
              <Plus className="h-4 w-4" /> Add item
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-border p-5 space-y-3">
            <h3 className="font-semibold">Pricing</h3>
            <div className="space-y-1.5">
              <Label htmlFor="n-discount">Discount (amount)</Label>
              <Input id="n-discount" type="number" min="0" step="any" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="n-tax">Tax rate (%)</Label>
              <Input id="n-tax" type="number" min="0" max="100" step="any" value={taxRateEffective} onChange={(e) => { setTaxTouched(true); setForm({ ...form, taxRate: e.target.value }); }} />
            </div>
            <div className="rounded-md bg-muted p-3 text-sm space-y-1.5">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatMoneyDisplay(subtotal, currency)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span>-{formatMoneyDisplay(discountC, currency)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>{formatMoneyDisplay(taxC, currency)}</span></div>
              <div className="flex justify-between border-t border-border pt-1.5 font-bold"><span>Total</span><span className="text-[var(--brand-indigo)]">{formatMoneyDisplay(total, currency)}</span></div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="n-notes">Notes</Label>
              <Textarea id="n-notes" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <div className="rounded-lg bg-accent border border-[var(--brand-green)]/20 p-4 text-xs text-accent-foreground">
            Preliminary energy calculations are estimates, not certified engineering designs. Qualified personnel must verify system sizing before procurement and installation.
          </div>
          <div className="flex flex-col gap-2">
            <Button onClick={() => handleSave(false)} disabled={saving || !form.customerId || !form.title.trim()} className="brand-gradient text-white">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save as draft
            </Button>
            <Button onClick={() => handleSave(true)} disabled={saving || !form.customerId || !form.title.trim()} variant="outline">
              Save & mark as sent
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
