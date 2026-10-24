"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader, Pagination, EmptyState, useConfirm } from "@/components/admin/shared";
import { api, ApiClientError, formatMoneyDisplay, formatDateDisplay } from "@/lib/client";
import { useSettingsStore } from "@/lib/settings-store";
import { Plus, Loader2, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ExpenseRow {
  id: string; category: string; description: string; amountCents: number; currency: string;
  expenseDate: string; reference: string | null;
  project?: { id: string; code: string; name: string } | null;
  supplier?: { id: string; name: string } | null;
}

export default function ExpensesPage() {
  const [items, setItems] = useState<ExpenseRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalCents, setTotalCents] = useState(0);
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ projectId: "none", supplierId: "none", category: "EQUIPMENT", description: "", amount: "", expenseDate: "", reference: "" });
  const [projects, setProjects] = useState<{ id: string; code: string; name: string }[]>([]);
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const { confirm, confirmDialog } = useConfirm();
  const currency = useSettingsStore((s) => s.currency);
  useSettingsStore((s) => s).load();
  const pageSize = 25;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (category !== "all") params.set("category", category);
      const data = await api<{ items: ExpenseRow[]; total: number; totalCents: number }>(`/api/expenses?${params}`);
      setItems(data.items);
      setTotal(data.total);
      setTotalCents(data.totalCents);
    } catch (e) {
      toast({ title: "Failed to load expenses", description: e instanceof ApiClientError ? e.message : "", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [page, category]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api<{ items: { id: string; code: string; name: string }[] }>("/api/projects?pageSize=100").then((d) => setProjects(d.items)).catch(() => {});
    api<{ items: { id: string; name: string }[] }>("/api/suppliers?pageSize=100").then((d) => setSuppliers(d.items)).catch(() => {});
  }, []);

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      await api("/api/expenses", {
        method: "POST",
        json: {
          projectId: form.projectId === "none" ? null : form.projectId,
          supplierId: form.supplierId === "none" ? null : form.supplierId,
          category: form.category,
          description: form.description,
          amount: Number(form.amount),
          expenseDate: form.expenseDate || undefined,
          reference: form.reference || null,
        },
      });
      toast({ title: "Expense recorded" });
      setDialogOpen(false);
      setForm({ projectId: "none", supplierId: "none", category: "EQUIPMENT", description: "", amount: "", expenseDate: "", reference: "" });
      load();
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(e: ExpenseRow) {
    confirm({
      title: "Delete this expense?",
      description: `${e.description} — ${formatMoneyDisplay(e.amountCents, e.currency)}`,
      onConfirm: async () => {
        try {
          await api(`/api/expenses?id=${e.id}`, { method: "DELETE" });
          toast({ title: "Expense deleted" });
          load();
        } catch (err) {
          toast({ title: "Delete failed", description: err instanceof ApiClientError ? err.message : "", variant: "destructive" });
        }
      },
    });
  }

  return (
    <div>
      <PageHeader
        title="Expenses"
        description="Operating and project-linked expenses."
        actions={<Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4" /> Record Expense</Button>}
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex gap-2 flex-wrap">
          {["all", "EQUIPMENT", "LABOR", "TRANSPORT", "PERMIT", "OTHER"].map((c) => (
            <Button key={c} variant={category === c ? "default" : "outline"} size="sm"
              onClick={() => { setCategory(c); setPage(1); }} className={category === c ? "brand-gradient text-white" : ""}>
              {c === "all" ? "All" : c}
            </Button>
          ))}
        </div>
        <p className="text-sm text-muted-foreground sm:ml-auto self-center">
          Filtered total: <strong className="text-foreground">{formatMoneyDisplay(totalCents, currency)}</strong>
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : items.length === 0 ? (
        <EmptyState message="No expenses recorded yet." />
      ) : (
        <div className="rounded-lg border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left">
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Description</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Project</th>
                <th className="px-4 py-3 font-medium">Supplier</th>
                <th className="px-4 py-3 font-medium text-right">Amount</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((e) => (
                <tr key={e.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 whitespace-nowrap">{formatDateDisplay(e.expenseDate)}</td>
                  <td className="px-4 py-3">
                    {e.description}
                    {e.reference && <span className="block text-xs text-muted-foreground">Ref: {e.reference}</span>}
                  </td>
                  <td className="px-4 py-3">{e.category}</td>
                  <td className="px-4 py-3 text-muted-foreground">{e.project?.code ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{e.supplier?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-right font-medium text-red-600 whitespace-nowrap">{formatMoneyDisplay(e.amountCents, e.currency)}</td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(e)} aria-label="Delete expense">
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
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
          <DialogHeader><DialogTitle>Record Expense</DialogTitle></DialogHeader>
          {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EQUIPMENT">Equipment</SelectItem>
                    <SelectItem value="LABOR">Labor</SelectItem>
                    <SelectItem value="TRANSPORT">Transport</SelectItem>
                    <SelectItem value="PERMIT">Permit</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ex-amt">Amount *</Label>
                <Input id="ex-amt" type="number" min="0" step="any" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ex-desc">Description *</Label>
              <Input id="ex-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Project (optional)</Label>
                <Select value={form.projectId} onValueChange={(v) => setForm({ ...form, projectId: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.code}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Supplier (optional)</Label>
                <Select value={form.supplierId} onValueChange={(v) => setForm({ ...form, supplierId: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="ex-date">Date</Label>
                <Input id="ex-date" type="date" value={form.expenseDate} onChange={(e) => setForm({ ...form, expenseDate: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ex-ref">Reference</Label>
                <Input id="ex-ref" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.description.trim() || !form.amount} className="brand-gradient text-white">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {confirmDialog}
    </div>
  );
}
