"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api, ApiClientError, formatMoneyDisplay } from "@/lib/client";
import { useSettingsStore } from "@/lib/settings-store";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ProductOption { id: string; sku: string; name: string; costCents: number | null }
interface SupplierOption { id: string; name: string }

const emptyLine = { productId: "none", description: "", quantity: 1, unitCost: 0 };

export function PurchaseOrderDialog({
  open, onOpenChange, onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: () => void;
}) {
  // Inner form remounts on each open — state always starts fresh.
  if (!open) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>New Purchase Order</DialogTitle></DialogHeader>
        <POFormInner onDone={() => { onCreated(); onOpenChange(false); }} onCancel={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function POFormInner({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const currency = useSettingsStore((s) => s.currency);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [taxRate, setTaxRate] = useState("0");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState([{ ...emptyLine }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    api<{ items: SupplierOption[] }>("/api/suppliers?pageSize=100").then((d) => { if (!cancelled) setSuppliers(d.items); }).catch(() => {});
    api<{ items: ProductOption[] }>("/api/products?pageSize=100").then((d) => { if (!cancelled) setProducts(d.items); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  function updateLine(i: number, patch: Partial<typeof emptyLine>) {
    setLines(lines.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  function applyProduct(i: number, productId: string) {
    const p = products.find((x) => x.id === productId);
    if (!p) return;
    updateLine(i, { productId, description: `${p.name} (${p.sku})`, unitCost: p.costCents != null ? p.costCents / 100 : 0 });
  }

  const subtotal = lines.reduce((s, l) => s + Math.round(l.quantity * l.unitCost * 100), 0);
  const taxC = Math.round(subtotal * (Number(taxRate || 0) / 100));

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      await api("/api/purchase-orders", {
        method: "POST",
        json: {
          supplierId,
          expectedDate: expectedDate || null,
          taxRate: Number(taxRate || 0),
          notes: notes || null,
          items: lines.map((l) => ({
            productId: l.productId === "none" ? null : l.productId,
            description: l.description,
            quantity: l.quantity,
            unitCost: l.unitCost,
          })),
        },
      });
      toast({ title: "Purchase order created" });
      onDone();
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Save failed");
      setSaving(false);
    }
  }

  return (
    <>
      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
      <div className="grid gap-4 py-2">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Supplier *</Label>
            <Select value={supplierId} onValueChange={setSupplierId}>
              <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
              <SelectContent>
                {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="po-exp">Expected date</Label>
            <Input id="po-exp" type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="po-tax">Tax rate (%)</Label>
            <Input id="po-tax" type="number" min="0" max="100" step="any" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Items *</Label>
          {lines.map((l, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-end rounded-md border border-border p-2.5">
              <div className="col-span-12 sm:col-span-4 space-y-1">
                <Label className="text-xs">From catalog</Label>
                <Select value={l.productId} onValueChange={(v) => (v === "none" ? updateLine(i, { productId: "none" }) : applyProduct(i, v))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Custom item</SelectItem>
                    {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} ({p.sku})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-12 sm:col-span-4 space-y-1">
                <Label className="text-xs">Description *</Label>
                <Input className="h-9" value={l.description} onChange={(e) => updateLine(i, { description: e.target.value })} />
              </div>
              <div className="col-span-3 sm:col-span-1 space-y-1">
                <Label className="text-xs">Qty</Label>
                <Input className="h-9" type="number" min="1" value={l.quantity} onChange={(e) => updateLine(i, { quantity: Number(e.target.value) })} />
              </div>
              <div className="col-span-6 sm:col-span-2 space-y-1">
                <Label className="text-xs">Unit cost</Label>
                <Input className="h-9" type="number" min="0" step="any" value={l.unitCost} onChange={(e) => updateLine(i, { unitCost: Number(e.target.value) })} />
              </div>
              <div className="col-span-2 sm:col-span-1 flex justify-end">
                <Button variant="ghost" size="icon" onClick={() => setLines(lines.filter((_, idx) => idx !== i))} aria-label="Remove line">
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => setLines([...lines, { ...emptyLine }])}>
            <Plus className="h-4 w-4" /> Add item
          </Button>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="po-notes">Notes</Label>
          <Input id="po-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <div className="rounded-md bg-muted p-3 text-sm flex justify-between font-semibold">
          <span>Total (incl. tax {formatMoneyDisplay(taxC, currency)})</span>
          <span>{formatMoneyDisplay(subtotal + taxC, currency)}</span>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSave} disabled={saving || !supplierId || lines.length === 0} className="brand-gradient text-white">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />} Create order
        </Button>
      </DialogFooter>
    </>
  );
}
