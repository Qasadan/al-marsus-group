"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader, Pagination, EmptyState, useConfirm } from "@/components/admin/shared";
import { api, ApiClientError, formatMoneyDisplay } from "@/lib/client";
import { useSettingsStore } from "@/lib/settings-store";
import { Plus, Search, Loader2, Pencil, PackagePlus, AlertTriangle, History } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Product {
  id: string; sku: string; name: string; category: string; brand: string | null; model: string | null;
  unit: string; costCents: number | null; priceCents: number | null; quantity: number;
  reorderLevel: number; isActive: boolean;
}
interface Movement {
  id: string; type: string; quantity: number; balanceAfter: number; reason: string | null;
  referenceType: string | null; createdAt: string;
  product: { sku: string; name: string; unit: string };
  user?: { name: string } | null;
}

const CATEGORIES = ["PANEL", "BATTERY", "INVERTER", "CABLE", "MOUNTING", "ACCESSORY", "OTHER"];

const emptyForm = {
  sku: "", name: "", category: "PANEL", brand: "", model: "", unit: "pcs",
  cost: "", price: "", reorderLevel: "0", openingQuantity: "0",
};

export default function InventoryPage() {
  const [items, setItems] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("all");
  const [lowStock, setLowStock] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [stockDialog, setStockDialog] = useState<Product | null>(null);
  const [stockForm, setStockForm] = useState({ type: "IN", quantity: "1", reason: "" });
  const [movementsOpen, setMovementsOpen] = useState(false);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [movementsProduct, setMovementsProduct] = useState<Product | null>(null);
  const [movementsLoading, setMovementsLoading] = useState(false);
  const { confirm, confirmDialog } = useConfirm();
  const currency = useSettingsStore((s) => s.currency);
  useSettingsStore((s) => s).load();
  const pageSize = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (q) params.set("q", q);
      if (category !== "all") params.set("category", category);
      if (lowStock) params.set("lowStock", "true");
      const data = await api<{ items: Product[]; total: number }>(`/api/products?${params}`);
      setItems(data.items);
      setTotal(data.total);
    } catch (e) {
      toast({ title: "Failed to load inventory", description: e instanceof ApiClientError ? e.message : "", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [page, q, category, lowStock]);

  useEffect(() => { load(); }, [load]);

  async function openMovements(p: Product) {
    setMovementsProduct(p);
    setMovementsOpen(true);
    setMovementsLoading(true);
    try {
      const data = await api<{ items: Movement[] }>(`/api/stock-movements?productId=${p.id}&pageSize=50`);
      setMovements(data.items);
    } catch {
      setMovements([]);
    } finally {
      setMovementsLoading(false);
    }
  }

  async function handleSaveProduct() {
    setSaving(true);
    setError("");
    try {
      const payload = {
        sku: form.sku, name: form.name, category: form.category, brand: form.brand || null,
        model: form.model || null, unit: form.unit, reorderLevel: Number(form.reorderLevel || 0),
        cost: form.cost ? Number(form.cost) : null, price: form.price ? Number(form.price) : null,
      };
      if (editing) {
        await api(`/api/products/${editing.id}`, { method: "PUT", json: payload });
      } else {
        await api("/api/products", { method: "POST", json: { ...payload, openingQuantity: Number(form.openingQuantity || 0) } });
      }
      toast({ title: editing ? "Product updated" : "Product created" });
      setDialogOpen(false);
      load();
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleStockMovement() {
    if (!stockDialog) return;
    setSaving(true);
    try {
      await api("/api/stock-movements", {
        method: "POST",
        json: {
          productId: stockDialog.id, type: stockForm.type,
          quantity: Number(stockForm.quantity), reason: stockForm.reason,
        },
      });
      toast({ title: "Stock movement recorded" });
      setStockDialog(null);
      setStockForm({ type: "IN", quantity: "1", reason: "" });
      load();
    } catch (e) {
      toast({ title: "Movement rejected", description: e instanceof ApiClientError ? e.message : "", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Inventory"
        description="Panels, batteries, inverters, cables, refrigeration spares and accessories with a full movement ledger."
        actions={
          <Button onClick={() => { setEditing(null); setForm(emptyForm); setError(""); setDialogOpen(true); }}>
            <Plus className="h-4 w-4" /> Add Product
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search SKU, name, brand…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className="pl-9" aria-label="Search products" />
        </div>
        <Select value={category} onValueChange={(v) => { setCategory(v); setPage(1); }}>
          <SelectTrigger className="w-44" aria-label="Filter by category"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant={lowStock ? "default" : "outline"} size="sm" onClick={() => { setLowStock(!lowStock); setPage(1); }}
          className={lowStock ? "bg-red-600 hover:bg-red-700 text-white" : ""}>
          <AlertTriangle className="h-4 w-4" /> Low stock
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : items.length === 0 ? (
        <EmptyState message="No products in inventory yet." />
      ) : (
        <div className="rounded-lg border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left">
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium text-right">Cost</th>
                <th className="px-4 py-3 font-medium text-right">Price</th>
                <th className="px-4 py-3 font-medium text-center">Stock</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} className={`border-b border-border last:border-0 hover:bg-muted/30 ${p.quantity <= p.reorderLevel ? "bg-red-50/50" : ""}`}>
                  <td className="px-4 py-3">
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{p.sku}{p.brand ? ` · ${p.brand}` : ""}</div>
                  </td>
                  <td className="px-4 py-3">{p.category}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">{p.costCents != null ? formatMoneyDisplay(p.costCents, currency) : "—"}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">{p.priceCents != null ? formatMoneyDisplay(p.priceCents, currency) : "—"}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex flex-col items-center ${p.quantity <= p.reorderLevel ? "text-red-600 font-semibold" : ""}`}>
                      {p.quantity} {p.unit}
                      <span className="text-[10px] text-muted-foreground font-normal">min {p.reorderLevel}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openMovements(p)} aria-label={`Movement history for ${p.name}`} title="Movement history">
                        <History className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => { setStockDialog(p); setStockForm({ type: "IN", quantity: "1", reason: "" }); }} aria-label={`Adjust stock for ${p.name}`} title="Stock movement">
                        <PackagePlus className="h-4 w-4 text-[var(--brand-green)]" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => { setEditing(p); setForm({
                        sku: p.sku, name: p.name, category: p.category, brand: p.brand ?? "", model: p.model ?? "", unit: p.unit,
                        cost: p.costCents != null ? String(p.costCents / 100) : "", price: p.priceCents != null ? String(p.priceCents / 100) : "",
                        reorderLevel: String(p.reorderLevel), openingQuantity: "0",
                      }); setError(""); setDialogOpen(true); }} aria-label={`Edit ${p.name}`}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4"><Pagination page={page} pageSize={pageSize} total={total} onPage={setPage} /></div>

      {/* Product dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Product" : "Add Product"}</DialogTitle></DialogHeader>
          {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="p-sku">SKU *</Label>
                <Input id="p-sku" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} disabled={!!editing} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-cat">Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger id="p-cat"><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-name">Name *</Label>
              <Input id="p-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="p-brand">Brand</Label>
                <Input id="p-brand" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-model">Model</Label>
                <Input id="p-model" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-unit">Unit</Label>
                <Input id="p-unit" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="p-cost">Cost</Label>
                <Input id="p-cost" type="number" min="0" step="any" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-price">Sell price</Label>
                <Input id="p-price" type="number" min="0" step="any" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-re">Reorder level</Label>
                <Input id="p-re" type="number" min="0" value={form.reorderLevel} onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })} />
              </div>
            </div>
            {!editing && (
              <div className="space-y-1.5">
                <Label htmlFor="p-open">Opening quantity</Label>
                <Input id="p-open" type="number" min="0" value={form.openingQuantity} onChange={(e) => setForm({ ...form, openingQuantity: e.target.value })} />
                <p className="text-xs text-muted-foreground">Recorded as the first &quot;IN&quot; movement in the ledger.</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveProduct} disabled={saving || !form.sku.trim() || !form.name.trim()} className="brand-gradient text-white">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stock movement dialog */}
      <Dialog open={!!stockDialog} onOpenChange={(o) => !o && setStockDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Stock movement — {stockDialog?.name}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Current balance: <strong>{stockDialog?.quantity} {stockDialog?.unit}</strong></p>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={stockForm.type} onValueChange={(v) => setStockForm({ ...stockForm, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="IN">Stock in (+)</SelectItem>
                  <SelectItem value="OUT">Stock out (−)</SelectItem>
                  <SelectItem value="RESERVE">Reserve for project</SelectItem>
                  <SelectItem value="RELEASE">Release reservation</SelectItem>
                  <SelectItem value="ADJUSTMENT">Correction (set exact)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sm-qty">Quantity {stockForm.type === "ADJUSTMENT" ? "(new balance)" : ""} *</Label>
              <Input id="sm-qty" type="number" min="1" value={stockForm.quantity} onChange={(e) => setStockForm({ ...stockForm, quantity: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sm-reason">Reason *</Label>
              <Input id="sm-reason" value={stockForm.reason} onChange={(e) => setStockForm({ ...stockForm, reason: e.target.value })} placeholder="e.g. Damaged panel write-off, counted correction…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStockDialog(null)}>Cancel</Button>
            <Button onClick={handleStockMovement} disabled={saving || !stockForm.reason.trim()} className="brand-gradient text-white">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Movement history dialog */}
      <Dialog open={movementsOpen} onOpenChange={setMovementsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Movement history — {movementsProduct?.name}</DialogTitle></DialogHeader>
          {movementsLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : movements.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No movements recorded.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2">Date</th><th className="py-2">Type</th><th className="py-2 text-right">Qty</th>
                  <th className="py-2 text-right">Balance</th><th className="py-2">Reason</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => (
                  <tr key={m.id} className="border-b last:border-0">
                    <td className="py-2 whitespace-nowrap">{new Date(m.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</td>
                    <td className="py-2">{m.type}</td>
                    <td className="py-2 text-right">{m.quantity}</td>
                    <td className="py-2 text-right font-medium">{m.balanceAfter}</td>
                    <td className="py-2 text-muted-foreground text-xs">{m.reason}{m.referenceType ? ` (${m.referenceType.replace("_", " ")})` : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </DialogContent>
      </Dialog>
      {confirmDialog}
    </div>
  );
}
