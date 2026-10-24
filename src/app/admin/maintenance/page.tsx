"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader, StatusBadge, Pagination, EmptyState } from "@/components/admin/shared";
import { api, ApiClientError, formatDateDisplay } from "@/lib/client";
import { Plus, Loader2, CalendarClock, CalendarX2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface MaintenanceRow {
  id: string; code: string; type: string; scheduledDate: string; completedDate: string | null;
  status: string; findings: string | null; technicianId: string | null; warrantyCovered: boolean | null;
  customer: { id: string; name: string; phone: string | null };
  project?: { id: string; code: string; name: string } | null;
  technician?: { id: string; name: string } | null;
}

const emptyForm = { customerId: "", projectId: "none", type: "ROUTINE", scheduledDate: "", technicianId: "none", warrantyCovered: "none" };

export default function MaintenancePage() {
  const [items, setItems] = useState<MaintenanceRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);
  const [projects, setProjects] = useState<{ id: string; code: string; name: string }[]>([]);
  const [technicians, setTechnicians] = useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const pageSize = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (filter === "upcoming" || filter === "overdue") params.set(filter, "true");
      else if (filter !== "all") params.set("status", filter);
      const data = await api<{ items: MaintenanceRow[]; total: number }>(`/api/maintenance?${params}`);
      setItems(data.items);
      setTotal(data.total);
    } catch (e) {
      toast({ title: "Failed to load maintenance records", description: e instanceof ApiClientError ? e.message : "", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [page, filter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api<{ items: { id: string; name: string }[] }>("/api/customers?pageSize=100").then((d) => setCustomers(d.items)).catch(() => {});
    api<{ items: { id: string; code: string; name: string }[] }>("/api/projects?pageSize=100").then((d) => setProjects(d.items)).catch(() => {});
    api<{ items: { id: string; name: string }[] }>("/api/staff?pageSize=100").then((d) => setTechnicians(d.items.filter((u) => u.role !== "CUSTOMER"))).catch(() => {});
  }, []);

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      await api("/api/maintenance", {
        method: "POST",
        json: {
          customerId: form.customerId,
          projectId: form.projectId === "none" ? null : form.projectId,
          type: form.type,
          scheduledDate: form.scheduledDate,
          technicianId: form.technicianId === "none" ? null : form.technicianId,
          warrantyCovered: form.warrantyCovered === "none" ? null : form.warrantyCovered === "yes",
        },
      });
      toast({ title: "Maintenance scheduled" });
      setDialogOpen(false);
      setForm(emptyForm);
      load();
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(m: MaintenanceRow, status: string) {
    try {
      await api(`/api/maintenance?id=${m.id}`, { method: "PUT", json: { status } });
      toast({ title: "Maintenance updated" });
      load();
    } catch (e) {
      toast({ title: "Update failed", description: e instanceof ApiClientError ? e.message : "", variant: "destructive" });
    }
  }

  return (
    <div>
      <PageHeader
        title="Maintenance"
        description="Warranty service, routine maintenance and repairs per project."
        actions={<Button onClick={() => { setForm(emptyForm); setError(""); setDialogOpen(true); }}><Plus className="h-4 w-4" /> Schedule Maintenance</Button>}
      />

      <div className="flex gap-2 flex-wrap mb-4">
        {["all", "upcoming", "overdue", "SCHEDULED", "IN_PROGRESS", "COMPLETED"].map((f) => (
          <Button key={f} variant={filter === f ? "default" : "outline"} size="sm"
            onClick={() => { setFilter(f); setPage(1); }} className={filter === f ? "brand-gradient text-white" : ""}>
            {f === "all" ? "All" : f === "upcoming" ? "Upcoming (30d)" : f === "overdue" ? "Overdue" : f.replace("_", " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : items.length === 0 ? (
        <EmptyState message="No maintenance records for this filter." />
      ) : (
        <div className="rounded-lg border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left">
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Customer / Project</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Scheduled</th>
                <th className="px-4 py-3 font-medium">Technician</th>
                <th className="px-4 py-3 font-medium">Warranty</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((m) => (
                <tr key={m.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{m.code}</td>
                  <td className="px-4 py-3">
                    <div>{m.customer.name}</div>
                    {m.project && <div className="text-xs text-muted-foreground">{m.project.code}</div>}
                  </td>
                  <td className="px-4 py-3">{m.type}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatDateDisplay(m.scheduledDate)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{m.technician?.name ?? "Unassigned"}</td>
                  <td className="px-4 py-3">{m.warrantyCovered == null ? "—" : m.warrantyCovered ? "Covered" : "Billable"}</td>
                  <td className="px-4 py-3"><StatusBadge status={m.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      {m.status === "SCHEDULED" && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => updateStatus(m, "IN_PROGRESS")}><CalendarClock className="h-3.5 w-3.5" /> Start</Button>
                          <Button size="sm" variant="outline" onClick={() => updateStatus(m, "COMPLETED")}>Complete</Button>
                          <Button size="sm" variant="ghost" className="text-red-600" onClick={() => updateStatus(m, "CANCELLED")}><CalendarX2 className="h-3.5 w-3.5" /></Button>
                        </>
                      )}
                      {m.status === "IN_PROGRESS" && <Button size="sm" variant="outline" onClick={() => updateStatus(m, "COMPLETED")}>Complete</Button>}
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
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Schedule Maintenance</DialogTitle></DialogHeader>
          {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Customer *</Label>
              <Select value={form.customerId} onValueChange={(v) => setForm({ ...form, customerId: v })}>
                <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent>{customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Project (optional)</Label>
              <Select value={form.projectId} onValueChange={(v) => setForm({ ...form, projectId: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.code} — {p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ROUTINE">Routine</SelectItem>
                    <SelectItem value="WARRANTY">Warranty</SelectItem>
                    <SelectItem value="REPAIR">Repair</SelectItem>
                    <SelectItem value="INSTALLATION">Installation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="m-date">Scheduled date *</Label>
                <Input id="m-date" type="date" value={form.scheduledDate} onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Technician</Label>
                <Select value={form.technicianId} onValueChange={(v) => setForm({ ...form, technicianId: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {technicians.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Warranty covered?</Label>
                <Select value={form.warrantyCovered} onValueChange={(v) => setForm({ ...form, warrantyCovered: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not set</SelectItem>
                    <SelectItem value="yes">Yes — covered</SelectItem>
                    <SelectItem value="no">No — billable</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.customerId || !form.scheduledDate} className="brand-gradient text-white">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
