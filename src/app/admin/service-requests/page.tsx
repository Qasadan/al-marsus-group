"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader, StatusBadge, Pagination, EmptyState } from "@/components/admin/shared";
import { api, ApiClientError, formatDateTimeDisplay } from "@/lib/client";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ServiceRequestRow {
  id: string; code: string; issue: string; description: string | null; priority: string;
  status: string; requestedAt: string; resolvedAt: string | null; resolutionNotes: string | null;
  customer: { id: string; name: string; phone: string | null };
  project?: { id: string; code: string; name: string } | null;
  assignedTechnician?: { id: string; name: string } | null;
}

const emptyForm = { customerId: "", projectId: "none", issue: "", description: "", priority: "MEDIUM" };

export default function ServiceRequestsPage() {
  const [items, setItems] = useState<ServiceRequestRow[]>([]);
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
  const [assigning, setAssigning] = useState<ServiceRequestRow | null>(null);
  const [assignTech, setAssignTech] = useState("");
  const pageSize = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (filter !== "all") params.set("status", filter);
      const data = await api<{ items: ServiceRequestRow[]; total: number }>(`/api/service-requests?${params}`);
      setItems(data.items);
      setTotal(data.total);
    } catch (e) {
      toast({ title: "Failed to load service requests", description: e instanceof ApiClientError ? e.message : "", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [page, filter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api<{ items: { id: string; name: string }[] }>("/api/customers?pageSize=100").then((d) => setCustomers(d.items)).catch(() => {});
    api<{ items: { id: string; code: string; name: string }[] }>("/api/projects?pageSize=100").then((d) => setProjects(d.items)).catch(() => {});
    api<{ items: { id: string; name: string; role: string }[] }>("/api/staff?pageSize=100").then((d) => setTechnicians(d.items.filter((u) => ["TECHNICIAN", "MANAGER", "SUPER_ADMIN"].includes(u.role)))).catch(() => {});
  }, []);

  async function handleCreate() {
    setSaving(true);
    setError("");
    try {
      await api("/api/service-requests", {
        method: "POST",
        json: {
          customerId: form.customerId,
          projectId: form.projectId === "none" ? null : form.projectId,
          issue: form.issue,
          description: form.description || null,
          priority: form.priority,
        },
      });
      toast({ title: "Service request created" });
      setDialogOpen(false);
      setForm(emptyForm);
      load();
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(sr: ServiceRequestRow, status: string) {
    try {
      await api(`/api/service-requests?id=${sr.id}`, { method: "PUT", json: { status } });
      toast({ title: "Status updated" });
      load();
    } catch (e) {
      toast({ title: "Update failed", description: e instanceof ApiClientError ? e.message : "", variant: "destructive" });
    }
  }

  async function assign() {
    if (!assigning) return;
    try {
      await api(`/api/service-requests?id=${assigning.id}`, { method: "PUT", json: { assignedTechnicianId: assignTech } });
      toast({ title: "Technician assigned" });
      setAssigning(null);
      load();
    } catch (e) {
      toast({ title: "Assignment failed", description: e instanceof ApiClientError ? e.message : "", variant: "destructive" });
    }
  }

  return (
    <div>
      <PageHeader
        title="Service Requests"
        description="Customer-reported issues, assignment and resolution tracking."
        actions={<Button onClick={() => { setForm(emptyForm); setError(""); setDialogOpen(true); }}><Plus className="h-4 w-4" /> New Request</Button>}
      />

      <div className="flex gap-2 flex-wrap mb-4">
        {["all", "OPEN", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED"].map((f) => (
          <Button key={f} variant={filter === f ? "default" : "outline"} size="sm"
            onClick={() => { setFilter(f); setPage(1); }} className={filter === f ? "brand-gradient text-white" : ""}>
            {f === "all" ? "All" : f.replace("_", " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : items.length === 0 ? (
        <EmptyState message="No service requests for this filter." />
      ) : (
        <div className="space-y-3">
          {items.map((sr) => (
            <div key={sr.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-[var(--brand-indigo)]">{sr.code}</span>
                    <StatusBadge status={sr.status} />
                    <StatusBadge status={sr.priority} />
                  </div>
                  <p className="text-sm font-medium mt-1">{sr.issue}</p>
                  <p className="text-sm text-muted-foreground">
                    {sr.customer.name}{sr.project ? ` · ${sr.project.code}` : ""} · Requested {formatDateTimeDisplay(sr.requestedAt)}
                    {sr.assignedTechnician ? ` · Tech: ${sr.assignedTechnician.name}` : ""}
                  </p>
                  {sr.description && <p className="text-sm text-muted-foreground mt-1">{sr.description}</p>}
                  {sr.resolutionNotes && <p className="text-sm text-[var(--brand-green)] mt-1">Resolution: {sr.resolutionNotes}</p>}
                </div>
                <div className="flex gap-2 flex-wrap shrink-0">
                  {["OPEN", "ASSIGNED"].includes(sr.status) && (
                    <Button size="sm" variant="outline" onClick={() => { setAssigning(sr); setAssignTech(sr.assignedTechnician?.id ?? ""); }}>Assign</Button>
                  )}
                  {sr.status === "ASSIGNED" && <Button size="sm" variant="outline" onClick={() => updateStatus(sr, "IN_PROGRESS")}>Start</Button>}
                  {["ASSIGNED", "IN_PROGRESS"].includes(sr.status) && (
                    <Button size="sm" className="brand-gradient-green text-white" onClick={() => {
                      const notes = window.prompt("Resolution notes:") ?? "";
                      api(`/api/service-requests?id=${sr.id}`, { method: "PUT", json: { status: "RESOLVED", resolutionNotes: notes || null } })
                        .then(() => { toast({ title: "Marked resolved" }); load(); })
                        .catch((e) => toast({ title: "Failed", description: e instanceof ApiClientError ? e.message : "", variant: "destructive" }));
                    }}>
                      Resolve
                    </Button>
                  )}
                  {sr.status === "RESOLVED" && <Button size="sm" variant="outline" onClick={() => updateStatus(sr, "CLOSED")}>Close</Button>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4"><Pagination page={page} pageSize={pageSize} total={total} onPage={setPage} /></div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Service Request</DialogTitle></DialogHeader>
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
            <div className="space-y-1.5">
              <Label htmlFor="sr-issue">Issue summary *</Label>
              <Input id="sr-issue" value={form.issue} onChange={(e) => setForm({ ...form, issue: e.target.value })} maxLength={300} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sr-desc">Description</Label>
              <Textarea id="sr-desc" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving || !form.customerId || !form.issue.trim()} className="brand-gradient text-white">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign dialog */}
      <Dialog open={!!assigning} onOpenChange={(o) => !o && setAssigning(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Assign technician</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">{assigning?.code} — {assigning?.issue}</p>
          <Select value={assignTech} onValueChange={setAssignTech}>
            <SelectTrigger><SelectValue placeholder="Select technician" /></SelectTrigger>
            <SelectContent>
              {technicians.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssigning(null)}>Cancel</Button>
            <Button onClick={assign} disabled={!assignTech} className="brand-gradient text-white">Assign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
