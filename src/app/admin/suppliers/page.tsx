"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader, Pagination, EmptyState } from "@/components/admin/shared";
import { api, ApiClientError } from "@/lib/client";
import { Plus, Search, Loader2, Pencil, Truck } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Supplier {
  id: string; name: string; contactPerson: string | null; email: string | null; phone: string | null;
  address: string | null; notes: string | null; isActive: boolean;
  _count?: { purchaseOrders: number };
}

const emptyForm = { name: "", contactPerson: "", email: "", phone: "", address: "", notes: "" };

export default function SuppliersPage() {
  const [items, setItems] = useState<Supplier[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const pageSize = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (q) params.set("q", q);
      const data = await api<{ items: Supplier[]; total: number }>(`/api/suppliers?${params}`);
      setItems(data.items);
      setTotal(data.total);
    } catch (e) {
      toast({ title: "Failed to load suppliers", description: e instanceof ApiClientError ? e.message : "", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [page, q]);

  useEffect(() => { load(); }, [load]);

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const payload = {
        name: form.name, contactPerson: form.contactPerson || null, email: form.email || null,
        phone: form.phone || null, address: form.address || null, notes: form.notes || null,
      };
      if (editing) await api(`/api/suppliers?id=${editing.id}`, { method: "PUT", json: payload });
      else await api("/api/suppliers", { method: "POST", json: payload });
      toast({ title: editing ? "Supplier updated" : "Supplier added" });
      setDialogOpen(false);
      load();
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Suppliers"
        description="Equipment vendors and service providers used for purchase orders."
        actions={<Button onClick={() => { setEditing(null); setForm(emptyForm); setError(""); setDialogOpen(true); }}><Plus className="h-4 w-4" /> Add Supplier</Button>}
      />

      <div className="relative max-w-sm mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search suppliers…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className="pl-9" aria-label="Search suppliers" />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : items.length === 0 ? (
        <EmptyState message="No suppliers yet. Add the vendors you purchase equipment and materials from." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((s) => (
            <div key={s.id} className={`rounded-lg border border-border p-5 ${!s.isActive ? "opacity-60" : ""}`}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">{s.name}</h3>
                </div>
                <Button variant="ghost" size="icon" onClick={() => { setEditing(s); setForm({
                  name: s.name, contactPerson: s.contactPerson ?? "", email: s.email ?? "",
                  phone: s.phone ?? "", address: s.address ?? "", notes: s.notes ?? "",
                }); setError(""); setDialogOpen(true); }} aria-label={`Edit ${s.name}`}>
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
              <div className="text-sm text-muted-foreground space-y-0.5">
                {s.contactPerson && <p>{s.contactPerson}</p>}
                {s.phone && <p>{s.phone}</p>}
                {s.email && <p>{s.email}</p>}
                {s.address && <p>{s.address}</p>}
              </div>
              {s._count != null && <p className="mt-3 text-xs text-muted-foreground">{s._count.purchaseOrders} purchase order(s)</p>}
            </div>
          ))}
        </div>
      )}

      <div className="mt-4"><Pagination page={page} pageSize={pageSize} total={total} onPage={setPage} /></div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit Supplier" : "Add Supplier"}</DialogTitle></DialogHeader>
          {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="su-name">Name *</Label>
              <Input id="su-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="su-contact">Contact person</Label>
                <Input id="su-contact" value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="su-phone">Phone</Label>
                <Input id="su-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="su-email">Email</Label>
              <Input id="su-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="su-address">Address</Label>
              <Input id="su-address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="su-notes">Notes</Label>
              <Textarea id="su-notes" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.name.trim()} className="brand-gradient text-white">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
