"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader, StatusBadge, Pagination, EmptyState, useConfirm } from "@/components/admin/shared";
import { api, ApiClientError, formatDateDisplay } from "@/lib/client";
import { DIVISION_CODES, DIVISIONS, divisionLabel } from "@/lib/divisions";
import { Plus, Search, Loader2, Trash2, ArrowRightLeft, CalendarClock } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Lead {
  id: string; name: string; email: string | null; phone: string; division: string | null; source: string; status: string;
  notes: string | null; nextFollowUpAt: string | null; convertedCustomerId: string | null;
  createdAt: string;
  convertedCustomer?: { id: string; name: string } | null;
}

const emptyForm = { name: "", email: "", phone: "", division: "MEP_ENGINEERING", source: "WEBSITE", status: "NEW", notes: "", followUpDate: "" };

export default function LeadsPage() {
  const [items, setItems] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const { confirm, confirmDialog } = useConfirm();
  const pageSize = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (q) params.set("q", q);
      if (status !== "all") params.set("status", status);
      const data = await api<{ items: Lead[]; total: number }>(`/api/leads?${params}`);
      setItems(data.items);
      setTotal(data.total);
    } catch (e) {
      toast({ title: "Failed to load leads", description: e instanceof ApiClientError ? e.message : "", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [page, q, status]);

  useEffect(() => { load(); }, [load]);

  async function handleCreate() {
    setSaving(true);
    setFormError("");
    try {
      await api("/api/leads", {
        method: "POST",
        json: {
          name: form.name,
          email: form.email || null,
          phone: form.phone,
          division: form.division,
          source: form.source,
          status: form.status,
          notes: form.notes || null,
          nextFollowUpAt: form.followUpDate || null,
        },
      });
      toast({ title: "Lead added" });
      setDialogOpen(false);
      setForm(emptyForm);
      load();
    } catch (e) {
      setFormError(e instanceof ApiClientError ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(lead: Lead, newStatus: string) {
    try {
      await api(`/api/leads?id=${lead.id}`, { method: "PUT", json: { status: newStatus } });
      toast({ title: "Lead updated" });
      load();
    } catch (e) {
      toast({ title: "Update failed", description: e instanceof ApiClientError ? e.message : "", variant: "destructive" });
    }
  }

  async function convertLead(lead: Lead) {
    confirm({
      title: `Convert ${lead.name} to a customer?`,
      description: "A customer record will be created from this lead and the lead marked as CONVERTED.",
      confirmLabel: "Convert",
      onConfirm: async () => {
        try {
          await api(`/api/leads?id=${lead.id}`, { method: "PATCH" });
          toast({ title: "Lead converted to customer" });
          load();
        } catch (e) {
          toast({ title: "Conversion failed", description: e instanceof ApiClientError ? e.message : "", variant: "destructive" });
        }
      },
    });
  }

  async function handleDelete(lead: Lead) {
    confirm({
      title: `Delete lead ${lead.name}?`,
      description: "This permanently removes the lead record.",
      onConfirm: async () => {
        try {
          await api(`/api/leads?id=${lead.id}`, { method: "DELETE" });
          toast({ title: "Lead deleted" });
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
        title="Leads"
        description="Track potential customers and follow up until conversion."
        actions={<Button onClick={() => { setForm(emptyForm); setDialogOpen(true); }}><Plus className="h-4 w-4" /> Add Lead</Button>}
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search leads…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className="pl-9" aria-label="Search leads" />
        </div>
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="w-44" aria-label="Filter by status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="NEW">New</SelectItem>
            <SelectItem value="CONTACTED">Contacted</SelectItem>
            <SelectItem value="QUALIFIED">Qualified</SelectItem>
            <SelectItem value="CONVERTED">Converted</SelectItem>
            <SelectItem value="LOST">Lost</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : items.length === 0 ? (
        <EmptyState message="No leads yet. Website quote requests and manual entries appear here." />
      ) : (
        <div className="rounded-lg border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left">
                <th className="px-4 py-3 font-medium">Lead</th>
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Follow-up</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((l) => (
                <tr key={l.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="font-medium">{l.name}</div>
                    <div className="text-xs text-muted-foreground">{l.phone}{l.email ? ` · ${l.email}` : ""}</div>
                    {l.division && <div className="mt-1"><span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-primary">{divisionLabel(l.division)}</span></div>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{l.source.replace("_", " ")}</td>
                  <td className="px-4 py-3">
                    <Select value={l.status} onValueChange={(v) => updateStatus(l, v)}>
                      <SelectTrigger className="w-36 h-8 border-0 p-0 focus:ring-0" aria-label={`Change status for ${l.name}`}>
                        <StatusBadge status={l.status} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NEW">New</SelectItem>
                        <SelectItem value="CONTACTED">Contacted</SelectItem>
                        <SelectItem value="QUALIFIED">Qualified</SelectItem>
                        <SelectItem value="CONVERTED">Converted</SelectItem>
                        <SelectItem value="LOST">Lost</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                    {l.nextFollowUpAt ? <span className="inline-flex items-center gap-1"><CalendarClock className="h-3.5 w-3.5" /> {formatDateDisplay(l.nextFollowUpAt)}</span> : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{formatDateDisplay(l.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      {l.status !== "CONVERTED" && (
                        <Button variant="ghost" size="icon" onClick={() => convertLead(l)} aria-label={`Convert ${l.name}`} title="Convert to customer">
                          <ArrowRightLeft className="h-4 w-4 text-[var(--brand-green)]" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(l)} aria-label={`Delete ${l.name}`}><Trash2 className="h-4 w-4 text-red-500" /></Button>
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
          <DialogHeader><DialogTitle>Add Lead</DialogTitle></DialogHeader>
          {formError && <p className="text-sm text-red-600" role="alert">{formError}</p>}
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="l-name">Name *</Label>
              <Input id="l-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="l-phone">Phone *</Label>
                <Input id="l-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="l-email">Email</Label>
                <Input id="l-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Division</Label>
                <Select value={form.division} onValueChange={(v) => setForm({ ...form, division: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DIVISION_CODES.map((code) => (
                      <SelectItem key={code} value={code}>{DIVISIONS[code].shortName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Source</Label>
                <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WEBSITE">Website</SelectItem>
                    <SelectItem value="REFERRAL">Referral</SelectItem>
                    <SelectItem value="WALK_IN">Walk-in</SelectItem>
                    <SelectItem value="PHONE">Phone</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="l-followup">Next follow-up</Label>
              <Input id="l-followup" type="date" value={form.followUpDate} onChange={(e) => setForm({ ...form, followUpDate: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="l-notes">Notes</Label>
              <Textarea id="l-notes" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving || !form.name.trim() || !form.phone.trim()} className="brand-gradient text-white">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {confirmDialog}
    </div>
  );
}
