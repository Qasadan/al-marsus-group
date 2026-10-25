"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader, StatusBadge, Pagination, EmptyState, useConfirm } from "@/components/admin/shared";
import { api, ApiClientError, formatDateTimeDisplay } from "@/lib/client";
import { Plus, Loader2, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Survey {
  id: string; customerId: string; scheduledAt: string; status: string; location: string | null;
  propertyType: string | null; roofType: string | null; roofAreaSqm: number | null;
  avgMonthlyKwh: number | null; energyNotes: string | null; assignedToId: string | null;
  createdAt: string;
  customer: { id: string; name: string; phone: string | null };
  assignedTo?: { id: string; name: string } | null;
  _count?: { quotations: number };
}

interface CustomerOption { id: string; name: string }
interface StaffOption { id: string; name: string; role: string }

const emptyForm = {
  customerId: "", scheduledAt: "", location: "", propertyType: "RESIDENTIAL",
  roofType: "", roofAreaSqm: "", avgMonthlyKwh: "", energyNotes: "", assignedToId: "none",
};

export default function SurveysPage() {
  const [items, setItems] = useState<Survey[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Survey | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [technicians, setTechnicians] = useState<StaffOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const { confirm, confirmDialog } = useConfirm();
  const pageSize = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (status !== "all") params.set("status", status);
      const data = await api<{ items: Survey[]; total: number }>(`/api/surveys?${params}`);
      setItems(data.items);
      setTotal(data.total);
    } catch (e) {
      toast({ title: "Failed to load surveys", description: e instanceof ApiClientError ? e.message : "", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api<{ items: CustomerOption[] }>("/api/customers?pageSize=100").then((d) => setCustomers(d.items)).catch(() => {});
    api<{ items: StaffOption[] }>("/api/staff?pageSize=100").then((d) => setTechnicians(d.items.filter((u) => u.role === "TECHNICIAN" || u.role === "MANAGER" || u.role === "SUPER_ADMIN"))).catch(() => {});
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormError("");
    setDialogOpen(true);
  }

  function openEdit(s: Survey) {
    setEditing(s);
    setForm({
      customerId: s.customerId,
      scheduledAt: new Date(s.scheduledAt).toISOString().slice(0, 16),
      location: s.location ?? "",
      propertyType: s.propertyType ?? "RESIDENTIAL",
      roofType: s.roofType ?? "",
      roofAreaSqm: s.roofAreaSqm?.toString() ?? "",
      avgMonthlyKwh: s.avgMonthlyKwh?.toString() ?? "",
      energyNotes: s.energyNotes ?? "",
      assignedToId: s.assignedToId ?? "none",
    });
    setFormError("");
    setDialogOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    setFormError("");
    try {
      const payload = {
        customerId: form.customerId,
        scheduledAt: form.scheduledAt,
        location: form.location || null,
        propertyType: form.propertyType || null,
        roofType: form.roofType || null,
        roofAreaSqm: form.roofAreaSqm ? Number(form.roofAreaSqm) : null,
        avgMonthlyKwh: form.avgMonthlyKwh ? Number(form.avgMonthlyKwh) : null,
        energyNotes: form.energyNotes || null,
        assignedToId: form.assignedToId === "none" ? null : form.assignedToId,
      };
      if (editing) {
        await api(`/api/surveys?id=${editing.id}`, { method: "PUT", json: payload });
      } else {
        await api("/api/surveys", { method: "POST", json: payload });
      }
      toast({ title: editing ? "Survey updated" : "Survey scheduled" });
      setDialogOpen(false);
      load();
    } catch (e) {
      setFormError(e instanceof ApiClientError ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function quickStatus(s: Survey, newStatus: string) {
    try {
      await api(`/api/surveys?id=${s.id}`, { method: "PUT", json: { status: newStatus } });
      toast({ title: "Survey updated" });
      load();
    } catch (e) {
      toast({ title: "Update failed", description: e instanceof ApiClientError ? e.message : "", variant: "destructive" });
    }
  }

  async function handleDelete(s: Survey) {
    confirm({
      title: "Delete this survey?",
      description: "Surveys with linked quotations cannot be deleted.",
      onConfirm: async () => {
        try {
          await api(`/api/surveys?id=${s.id}`, { method: "DELETE" });
          toast({ title: "Survey deleted" });
          load();
        } catch (e) {
          toast({ title: "Delete failed", description: e instanceof ApiClientError ? e.message : "", variant: "destructive" });
        }
      },
    });
  }

  return (
    <div>
      <PageHeader
        title="Site Surveys"
        description="Schedule appointments and record site/energy assessment notes."
        actions={<Button onClick={openCreate}><Plus className="h-4 w-4" /> Schedule Survey</Button>}
      />

      <div className="mb-4">
        <div className="flex gap-2 flex-wrap">
          {["all", "SCHEDULED", "COMPLETED", "CANCELLED"].map((s) => (
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
        <EmptyState message="No surveys scheduled yet." action={<Button onClick={openCreate}><Plus className="h-4 w-4" /> Schedule Survey</Button>} />
      ) : (
        <div className="rounded-lg border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left">
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Scheduled</th>
                <th className="px-4 py-3 font-medium">Location</th>
                <th className="px-4 py-3 font-medium">Consumption</th>
                <th className="px-4 py-3 font-medium">Technician</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{s.customer.name}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatDateTimeDisplay(s.scheduledAt)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.location ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.avgMonthlyKwh != null ? `${s.avgMonthlyKwh} kWh/mo` : "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.assignedTo?.name ?? "Unassigned"}</td>
                  <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      {s.status === "SCHEDULED" && (
                        <Button size="sm" variant="outline" onClick={() => quickStatus(s, "COMPLETED")}>Complete</Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => openEdit(s)}>Edit</Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(s)} aria-label="Delete survey">
                        <Trash2 className="h-4 w-4 text-red-500" />
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Survey" : "Schedule Survey"}</DialogTitle></DialogHeader>
          {customers.length === 0 && <p className="text-sm text-amber-600">You need at least one customer first. <Link className="underline" href="/admin/customers">Add customer</Link></p>}
          {formError && <p className="text-sm text-red-600" role="alert">{formError}</p>}
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Customer *</Label>
              <Select value={form.customerId} onValueChange={(v) => setForm({ ...form, customerId: v })}>
                <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent>
                  {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="s-when">Date & time *</Label>
                <Input id="s-when" type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Property type</Label>
                <Select value={form.propertyType} onValueChange={(v) => setForm({ ...form, propertyType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RESIDENTIAL">Residential</SelectItem>
                    <SelectItem value="COMMERCIAL">Commercial</SelectItem>
                    <SelectItem value="INDUSTRIAL">Industrial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-loc">Location</Label>
              <Input id="s-loc" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} maxLength={300} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="s-roof">Roof type</Label>
                <Input id="s-roof" value={form.roofType} onChange={(e) => setForm({ ...form, roofType: e.target.value })} placeholder="Tile, metal…" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-area">Roof area (m²)</Label>
                <Input id="s-area" type="number" min="0" value={form.roofAreaSqm} onChange={(e) => setForm({ ...form, roofAreaSqm: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-kwh">Avg monthly kWh</Label>
                <Input id="s-kwh" type="number" min="0" value={form.avgMonthlyKwh} onChange={(e) => setForm({ ...form, avgMonthlyKwh: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Assign technician</Label>
              <Select value={form.assignedToId} onValueChange={(v) => setForm({ ...form, assignedToId: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {technicians.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-notes">Energy assessment notes</Label>
              <Textarea id="s-notes" rows={3} value={form.energyNotes} onChange={(e) => setForm({ ...form, energyNotes: e.target.value })} placeholder="Consumption patterns, shading, mounting constraints…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.customerId || !form.scheduledAt} className="brand-gradient text-white">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {confirmDialog}
    </div>
  );
}
