"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge, ProgressPill, useConfirm } from "@/components/admin/shared";
import { api, ApiClientError, formatDateDisplay, formatMoneyDisplay } from "@/lib/client";
import { useSettingsStore } from "@/lib/settings-store";
import { ArrowLeft, Plus, Trash2, Loader2, Upload, Handshake, ClipboardCheck } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ProjectDetail {
  id: string; code: string; name: string; status: string; progress: number; startDate: string | null;
  endDate: string | null; budgetCents: number | null; currency: string; systemSizeKw: number | null;
  address: string | null; description: string | null; warrantyMonths: number | null; warrantyStart: string | null;
  handoverStatus: string; handoverNotes: string | null; handoverAt: string | null;
  customer: { id: string; name: string; phone: string | null; email: string | null; address: string | null };
  quotation?: { id: string; quoteNumber: string; totalCents: number } | null;
  members: { id: string; role: string; user: { id: string; name: string; email: string } }[];
  tasks: { id: string; title: string; status: string; priority: string; assignedToId: string | null; dueDate: string | null; assignedTo?: { name: string } | null }[];
  photos: { id: string; url: string; caption: string | null; kind: string; createdAt: string }[];
  invoices: { id: string; invoiceNumber: string; status: string; totalCents: number; amountPaidCents: number; currency: string }[];
  expenses: { id: string; description: string; amountCents: number; currency: string; category: string }[];
}

const TRANSITIONS: Record<string, string[]> = {
  PLANNING: ["SCHEDULED", "CANCELLED"],
  SCHEDULED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMMISSIONING", "CANCELLED"],
  COMMISSIONING: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};

const TEST_ITEMS = [
  { key: "panelsMounted", label: "Panels mounted and secured per design" },
  { key: "wiringInspected", label: "DC/AC wiring inspected" },
  { key: "inverterOperational", label: "Inverter operational (settings configured)" },
  { key: "batteryTested", label: "Battery bank tested (if applicable)" },
  { key: "earthingVerified", label: "Earthing/lightning protection verified" },
  { key: "systemOutputVerified", label: "System output verified against expectations" },
];

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const currency = useSettingsStore((s) => s.currency);
  useSettingsStore((s) => s).load();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [taskDialog, setTaskDialog] = useState(false);
  const [newTask, setNewTask] = useState({ title: "", priority: "MEDIUM", assignedToId: "none", dueDate: "" });
  const [staff, setStaff] = useState<{ id: string; name: string }[]>([]);
  const [photoKind, setPhotoKind] = useState("SITE");
  const fileRef = useRef<HTMLInputElement>(null);
  const [handoverOpen, setHandoverOpen] = useState(false);
  const [tests, setTests] = useState<Record<string, boolean>>({});
  const [handoverNotes, setHandoverNotes] = useState("");
  const { confirm, confirmDialog } = useConfirm();

  const load = useCallback(async () => {
    try {
      const data = await api<ProjectDetail>(`/api/projects/${id}`);
      setProject(data);
    } catch (e) {
      toast({ title: "Failed to load project", description: e instanceof ApiClientError ? e.message : "", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api<{ items: { id: string; name: string }[] }>("/api/staff?pageSize=100").then((d) => setStaff(d.items)).catch(() => {});
  }, []);

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  if (!project) return <p className="text-sm text-muted-foreground">Project not found.</p>;

  const cur = project.currency || currency;

  async function changeStatus(newStatus: string) {
    setBusy(true);
    try {
      await api(`/api/projects/${id}`, { method: "PUT", json: { status: newStatus } });
      toast({ title: `Status changed to ${newStatus.replace("_", " ").toLowerCase()}` });
      await load();
    } catch (e) {
      toast({ title: "Status change rejected", description: e instanceof ApiClientError ? e.message : "", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function addMember(userId: string) {
    if (userId === "none") return;
    setBusy(true);
    try {
      await api(`/api/projects/${id}/members`, { method: "POST", json: { userId, role: "TECHNICIAN" } });
      toast({ title: "Technician assigned" });
      await load();
    } catch (e) {
      toast({ title: "Assignment failed", description: e instanceof ApiClientError ? e.message : "", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function removeMember(userId: string) {
    setBusy(true);
    try {
      await api(`/api/projects/${id}/members?userId=${userId}`, { method: "DELETE" });
      toast({ title: "Member removed" });
      await load();
    } catch (e) {
      toast({ title: "Remove failed", description: e instanceof ApiClientError ? e.message : "", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function createTask() {
    setBusy(true);
    try {
      await api(`/api/projects/${id}/tasks`, {
        method: "POST",
        json: {
          title: newTask.title,
          priority: newTask.priority,
          assignedToId: newTask.assignedToId === "none" ? null : newTask.assignedToId,
          dueDate: newTask.dueDate || null,
        },
      });
      toast({ title: "Task added" });
      setTaskDialog(false);
      setNewTask({ title: "", priority: "MEDIUM", assignedToId: "none", dueDate: "" });
      await load();
    } catch (e) {
      toast({ title: "Failed to add task", description: e instanceof ApiClientError ? e.message : "", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function setTaskStatus(taskId: string, status: string) {
    try {
      const res = await api<{ projectProgress: number }>(`/api/projects/${id}/tasks?taskId=${taskId}`, { method: "PUT", json: { status } });
      setProject((p) => (p ? { ...p, progress: res.projectProgress, tasks: p.tasks.map((t) => (t.id === taskId ? { ...t, status } : t)) } : p));
    } catch (e) {
      toast({ title: "Update failed", description: e instanceof ApiClientError ? e.message : "", variant: "destructive" });
      await load();
    }
  }

  async function uploadPhoto(file: File) {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body: fd });
      const payload = await res.json();
      if (!res.ok || !payload.success) throw new Error(payload?.error?.message ?? "Upload failed");
      await api(`/api/projects/${id}/photos`, { method: "POST", json: { url: payload.data.url, kind: photoKind, caption: null } });
      toast({ title: "Photo uploaded" });
      await load();
    } catch (e) {
      toast({ title: "Upload failed", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function recordHandover() {
    setBusy(true);
    try {
      await api(`/api/projects/${id}/handover`, { method: "POST", json: { tests, notes: handoverNotes || null } });
      toast({ title: "Handover recorded" });
      setHandoverOpen(false);
      await load();
    } catch (e) {
      toast({ title: "Handover failed", description: e instanceof ApiClientError ? e.message : "", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  const totalInvoiced = project.invoices.reduce((s, i) => s + i.totalCents, 0);
  const totalPaid = project.invoices.reduce((s, i) => s + i.amountPaidCents, 0);
  const totalExpenses = project.expenses.reduce((s, e) => s + e.amountCents, 0);
  const canManage = true; // role gating is enforced server-side; UI adjusts naturally

  return (
    <div>
      <div className="mb-4">
        <Link href="/admin/projects" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Back to projects
        </Link>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-[var(--brand-indigo)]">{project.code}</h1>
            <StatusBadge status={project.status} />
            <StatusBadge status={project.handoverStatus} />
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {project.name} · {project.customer.name}{project.systemSizeKw ? ` · ${project.systemSizeKw} kW` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(TRANSITIONS[project.status] ?? []).map((s) => (
            <Button key={s} size="sm" variant={s === "CANCELLED" ? "outline" : "default"}
              className={s === "CANCELLED" ? "text-red-600 border-red-200" : "brand-gradient text-white"}
              onClick={() => changeStatus(s)} disabled={busy}>
              Mark {s.replace("_", " ").toLowerCase()}
            </Button>
          ))}
          {project.handoverStatus === "PENDING" && (
            <Button size="sm" variant="outline" onClick={() => { setTests({}); setHandoverNotes(""); setHandoverOpen(true); }}>
              <Handshake className="h-4 w-4" /> Record handover
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Budget</p><p className="text-xl font-bold">{project.budgetCents != null ? formatMoneyDisplay(project.budgetCents, cur) : "—"}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Invoiced</p><p className="text-xl font-bold">{formatMoneyDisplay(totalInvoiced, cur)}</p><p className="text-xs text-muted-foreground">{formatMoneyDisplay(totalPaid, cur)} paid</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Expenses</p><p className="text-xl font-bold text-red-600">{formatMoneyDisplay(totalExpenses, cur)}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Progress</p><ProgressPill value={project.progress} /></CardContent></Card>
      </div>

      <Tabs defaultValue="tasks">
        <TabsList className="mb-4 flex-wrap h-auto">
          <TabsTrigger value="tasks">Tasks ({project.tasks.length})</TabsTrigger>
          <TabsTrigger value="team">Team ({project.members.length})</TabsTrigger>
          <TabsTrigger value="photos">Photos ({project.photos.length})</TabsTrigger>
          <TabsTrigger value="finance">Invoices & Expenses</TabsTrigger>
          <TabsTrigger value="info">Info</TabsTrigger>
        </TabsList>

        <TabsContent value="tasks">
          <div className="space-y-2">
            <Button size="sm" onClick={() => setTaskDialog(true)}><Plus className="h-4 w-4" /> Add task</Button>
            {project.tasks.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No tasks yet.</p>
            ) : (
              <div className="rounded-lg border border-border divide-y divide-border">
                {project.tasks.map((t) => (
                  <div key={t.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Select value={t.status} onValueChange={(v) => setTaskStatus(t.id, v)}>
                        <SelectTrigger className="w-9 h-9 p-0 border-0" aria-label={`Change status of ${t.title}`}>
                          <ClipboardCheck className={`h-5 w-5 ${t.status === "DONE" ? "text-[var(--brand-green)]" : t.status === "BLOCKED" ? "text-red-500" : "text-muted-foreground"}`} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PENDING">Pending</SelectItem>
                          <SelectItem value="IN_PROGRESS">In progress</SelectItem>
                          <SelectItem value="DONE">Done</SelectItem>
                          <SelectItem value="BLOCKED">Blocked</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="min-w-0">
                        <p className={`text-sm font-medium truncate ${t.status === "DONE" ? "line-through text-muted-foreground" : ""}`}>{t.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {t.priority} · {t.assignedTo?.name ?? "Unassigned"}{t.dueDate ? ` · due ${formatDateDisplay(t.dueDate)}` : ""}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={t.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="team">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-border p-4">
              <h3 className="font-medium mb-3">Assigned members</h3>
              {project.members.length === 0 ? (
                <p className="text-sm text-muted-foreground">No technicians assigned yet.</p>
              ) : (
                <ul className="space-y-2">
                  {project.members.map((m) => (
                    <li key={m.id} className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{m.user.name}</p>
                        <p className="text-xs text-muted-foreground">{m.user.email} · {m.role.replace("_", " ")}</p>
                      </div>
                      {canManage && <Button variant="ghost" size="icon" onClick={() => removeMember(m.user.id)} aria-label={`Remove ${m.user.name}`}><Trash2 className="h-4 w-4 text-red-500" /></Button>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {canManage && (
              <div className="rounded-lg border border-border p-4">
                <h3 className="font-medium mb-3">Assign technician</h3>
                <Select onValueChange={addMember} disabled={busy}>
                  <SelectTrigger><SelectValue placeholder="Select staff member…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" disabled>Select…</SelectItem>
                    {staff.filter((s) => !project.members.some((m) => m.user.id === s.id)).map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-2">Assigned technicians can access this project, its tasks and upload site photos.</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="photos">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3 items-center">
              <Select value={photoKind} onValueChange={setPhotoKind}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SITE">Site photo</SelectItem>
                  <SelectItem value="INSTALLATION">Installation</SelectItem>
                  <SelectItem value="HANDOVER">Handover</SelectItem>
                </SelectContent>
              </Select>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0])} id="photo-input" />
              <Button size="sm" onClick={() => fileRef.current?.click()} disabled={busy}>
                <Upload className="h-4 w-4" /> Upload photo
              </Button>
            </div>
            {project.photos.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No photos uploaded yet.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {project.photos.map((p) => (
                  <div key={p.id} className="rounded-lg border border-border overflow-hidden">
                    { }
                    <img src={p.url} alt={p.caption ?? "Project photo"} className="w-full h-36 object-cover" />
                    <div className="p-2 text-xs text-muted-foreground">{p.kind} · {formatDateDisplay(p.createdAt)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="finance">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-border p-4">
              <h3 className="font-medium mb-3">Invoices</h3>
              {project.invoices.length === 0 ? (
                <p className="text-sm text-muted-foreground">No invoices linked to this project.</p>
              ) : (
                <ul className="space-y-2">
                  {project.invoices.map((i) => (
                    <li key={i.id} className="flex items-center justify-between gap-2 text-sm">
                      <Link href={`/admin/invoices/${i.id}`} className="font-medium text-[var(--brand-indigo)] hover:underline">{i.invoiceNumber}</Link>
                      <div className="flex items-center gap-2">
                        <span>{formatMoneyDisplay(i.totalCents, i.currency)}</span>
                        <StatusBadge status={i.status} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="rounded-lg border border-border p-4">
              <h3 className="font-medium mb-3">Expenses</h3>
              {project.expenses.length === 0 ? (
                <p className="text-sm text-muted-foreground">No expenses recorded for this project.</p>
              ) : (
                <ul className="space-y-2">
                  {project.expenses.map((e) => (
                    <li key={e.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate">{e.description} <span className="text-muted-foreground">({e.category})</span></span>
                      <span className="font-medium whitespace-nowrap">{formatMoneyDisplay(e.amountCents, e.currency)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="info">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-border p-5 text-sm space-y-2">
              <h3 className="font-semibold">Project information</h3>
              <p><span className="text-muted-foreground">Customer:</span> {project.customer.name}{project.customer.phone ? ` · ${project.customer.phone}` : ""}</p>
              <p><span className="text-muted-foreground">Address:</span> {project.address ?? project.customer.address ?? "—"}</p>
              <p><span className="text-muted-foreground">Schedule:</span> {formatDateDisplay(project.startDate)} → {formatDateDisplay(project.endDate)}</p>
              <p><span className="text-muted-foreground">Warranty:</span> {project.warrantyMonths ? `${project.warrantyMonths} months from ${formatDateDisplay(project.warrantyStart ?? project.handoverAt)}` : "Not set"}</p>
              {project.description && <p className="text-muted-foreground">{project.description}</p>}
            </div>
            {project.quotation && (
              <div className="rounded-lg border border-border p-5 text-sm">
                <h3 className="font-semibold mb-2">Source quotation</h3>
                <Link href={`/admin/quotations/${project.quotation.id}`} className="text-[var(--brand-indigo)] hover:underline font-medium">
                  {project.quotation.quoteNumber}
                </Link>
                <p className="text-muted-foreground mt-1">Total: {formatMoneyDisplay(project.quotation.totalCents, cur)}</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* New task dialog */}
      <Dialog open={taskDialog} onOpenChange={setTaskDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Task</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="t-title">Title *</Label>
              <Input id="t-title" value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select value={newTask.priority} onValueChange={(v) => setNewTask({ ...newTask, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="t-due">Due date</Label>
                <Input id="t-due" type="date" value={newTask.dueDate} onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Assign to</Label>
              <Select value={newTask.assignedToId} onValueChange={(v) => setNewTask({ ...newTask, assignedToId: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {staff.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTaskDialog(false)}>Cancel</Button>
            <Button onClick={createTask} disabled={busy || !newTask.title.trim()} className="brand-gradient text-white">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Handover dialog */}
      <Dialog open={handoverOpen} onOpenChange={setHandoverOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Installation Handover</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">All commissioning tests must be confirmed before the handover can be recorded. A warranty period (if set) starts at handover.</p>
          <div className="grid gap-2.5 py-2">
            {TEST_ITEMS.map((t) => (
              <label key={t.key} className="flex items-center gap-3 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!tests[t.key]}
                  onChange={(e) => setTests({ ...tests, [t.key]: e.target.checked })}
                  className="h-4 w-4 accent-[var(--brand-green)]"
                  aria-label={t.label}
                />
                {t.label}
              </label>
            ))}
            <div className="space-y-1.5 mt-2">
              <Label htmlFor="h-notes">Handover notes</Label>
              <Textarea id="h-notes" rows={3} value={handoverNotes} onChange={(e) => setHandoverNotes(e.target.value)} placeholder="Documents delivered, customer briefing, meter readings…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHandoverOpen(false)}>Cancel</Button>
            <Button onClick={recordHandover} disabled={busy || !TEST_ITEMS.every((t) => tests[t.key])} className="brand-gradient-green text-white">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Confirm handover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {confirmDialog}
    </div>
  );
}
