"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader, StatusBadge, Pagination, EmptyState, useConfirm } from "@/components/admin/shared";
import { api, ApiClientError, formatDateDisplay } from "@/lib/client";
import { Plus, Search, Loader2, Pencil, UserX } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface StaffMember {
  id: string; email: string; name: string; phone: string | null; role: string;
  isActive: boolean; createdAt: string;
}

const emptyForm = { name: "", email: "", phone: "", role: "TECHNICIAN", password: "" };

export default function StaffPage() {
  const [items, setItems] = useState<StaffMember[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const { confirm, confirmDialog } = useConfirm();
  const pageSize = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (q) params.set("q", q);
      const data = await api<{ items: StaffMember[]; total: number }>(`/api/staff?${params}`);
      setItems(data.items);
      setTotal(data.total);
    } catch (e) {
      toast({ title: "Failed to load staff", description: e instanceof ApiClientError ? e.message : "", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [page, q]);

  useEffect(() => { load(); }, [load]);

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      if (editing) {
        const payload: Record<string, unknown> = {
          name: form.name, email: form.email, phone: form.phone || null, role: form.role,
        };
        if (form.password) payload.password = form.password;
        await api(`/api/staff/${editing.id}`, { method: "PUT", json: payload });
      } else {
        await api("/api/staff", { method: "POST", json: form });
      }
      toast({ title: editing ? "Staff updated" : "Staff account created" });
      setDialogOpen(false);
      load();
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function deactivate(s: StaffMember) {
    confirm({
      title: `Deactivate ${s.name}?`,
      description: "The account will be prevented from signing in. Records and audit history are preserved.",
      confirmLabel: "Deactivate",
      onConfirm: async () => {
        try {
          await api(`/api/staff/${s.id}`, { method: "DELETE" });
          toast({ title: "Account deactivated" });
          load();
        } catch (e) {
          toast({ title: "Failed", description: e instanceof ApiClientError ? e.message : "", variant: "destructive" });
        }
      },
    });
  }

  return (
    <div>
      <PageHeader
        title="Staff Accounts"
        description="Super admin only. Manage accounts, roles and permissions. Roles: Super Admin (full access), Manager (operations), Technician (assigned work)."
        actions={<Button onClick={() => { setEditing(null); setForm(emptyForm); setError(""); setDialogOpen(true); }}><Plus className="h-4 w-4" /> Add Staff</Button>}
      />

      <div className="relative max-w-sm mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search staff…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className="pl-9" aria-label="Search staff" />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : items.length === 0 ? (
        <EmptyState message="No staff accounts found." />
      ) : (
        <div className="rounded-lg border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{s.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.email}</td>
                  <td className="px-4 py-3">{s.role.replace("_", " ")}</td>
                  <td className="px-4 py-3"><StatusBadge status={s.isActive ? "ACTIVE" : "INACTIVE"} /></td>
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{formatDateDisplay(s.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => { setEditing(s); setForm({
                        name: s.name, email: s.email, phone: s.phone ?? "", role: s.role, password: "",
                      }); setError(""); setDialogOpen(true); }} aria-label={`Edit ${s.name}`}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {s.isActive && (
                        <Button variant="ghost" size="icon" onClick={() => deactivate(s)} aria-label={`Deactivate ${s.name}`} title="Deactivate">
                          <UserX className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
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
          <DialogHeader><DialogTitle>{editing ? "Edit Staff Account" : "Add Staff Account"}</DialogTitle></DialogHeader>
          {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="st-name">Name *</Label>
                <Input id="st-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="st-role">Role *</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                  <SelectTrigger id="st-role"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                    <SelectItem value="MANAGER">Manager</SelectItem>
                    <SelectItem value="TECHNICIAN">Technician</SelectItem>
                    <SelectItem value="CUSTOMER">Customer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="st-email">Email *</Label>
                <Input id="st-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="st-phone">Phone</Label>
                <Input id="st-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="st-pass">{editing ? "New password (leave blank to keep)" : "Password *"}</Label>
              <Input id="st-pass" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} minLength={editing ? 0 : 8} />
              {!editing && <p className="text-xs text-muted-foreground">Minimum 8 characters. Share securely — the user should change it after first login.</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.name.trim() || !form.email.trim() || (!editing && !form.password)} className="brand-gradient text-white">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {confirmDialog}
    </div>
  );
}
