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

interface CustomerOption { id: string; name: string }
interface ProjectOption { id: string; code: string; name: string; customerId: string }

const emptyLine = { description: "", quantity: 1, unitPrice: 0 };

export function InvoiceDialog({
  open, onOpenChange, onCreated, presetProjectId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: () => void;
  presetProjectId?: string;
}) {
  // Inner form remounts on each open, so its state always starts fresh.
  if (!open) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>New Invoice</DialogTitle></DialogHeader>
        <InvoiceFormInner presetProjectId={presetProjectId} onDone={() => { onCreated(); onOpenChange(false); }} onCancel={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function InvoiceFormInner({
  presetProjectId, onDone, onCancel,
}: {
  presetProjectId?: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const currency = useSettingsStore((s) => s.currency);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [projectId, setProjectId] = useState(presetProjectId ?? "none");
  const [dueDate, setDueDate] = useState("");
  const [taxRate, setTaxRate] = useState(() => {
    const t = useSettingsStore.getState().taxRate;
    return t > 0 ? String(t) : "0";
  });
  const [discount, setDiscount] = useState("0");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState([{ ...emptyLine }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    api<{ items: CustomerOption[] }>("/api/customers?pageSize=100").then((d) => { if (!cancelled) setCustomers(d.items); }).catch(() => {});
    api<{ items: ProjectOption[] }>("/api/projects?pageSize=100").then((d) => { if (!cancelled) setProjects(d.items); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const subtotal = lines.reduce((s, l) => s + Math.round(l.quantity * l.unitPrice * 100), 0);
  const discountC = Math.max(0, Math.round(Number(discount || 0) * 100));
  const taxC = Math.round(Math.max(0, subtotal - discountC) * (Number(taxRate || 0) / 100));

  async function handleSave(markSent: boolean) {
    setSaving(true);
    setError("");
    try {
      const created = await api<{ id: string }>("/api/invoices", {
        method: "POST",
        json: {
          customerId,
          projectId: projectId === "none" ? null : projectId,
          dueDate: dueDate || null,
          taxRate: Number(taxRate || 0),
          discount: Number(discount || 0),
          notes: notes || null,
          items: lines.map((l) => ({ description: l.description, quantity: l.quantity, unitPrice: l.unitPrice })),
        },
      });
      if (markSent) {
        await api(`/api/invoices?id=${created.id}`, { method: "PUT", json: { status: "SENT" } });
      }
      toast({ title: "Invoice created" });
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
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Customer *</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
              <SelectContent>
                {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Link project (optional)</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.code} — {p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="iv-due">Due date</Label>
            <Input id="iv-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="iv-disc">Discount (amount)</Label>
            <Input id="iv-disc" type="number" min="0" step="any" value={discount} onChange={(e) => setDiscount(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="iv-tax">Tax rate (%)</Label>
            <Input id="iv-tax" type="number" min="0" max="100" step="any" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Line items *</Label>
          {lines.map((l, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-end rounded-md border border-border p-2.5">
              <div className="col-span-12 sm:col-span-7 space-y-1">
                <Label className="text-xs">Description *</Label>
                <Input className="h-9" value={l.description} onChange={(e) => setLines(lines.map((x, idx) => (idx === i ? { ...x, description: e.target.value } : x)))} />
              </div>
              <div className="col-span-4 sm:col-span-2 space-y-1">
                <Label className="text-xs">Qty</Label>
                <Input className="h-9" type="number" min="0" step="any" value={l.quantity} onChange={(e) => setLines(lines.map((x, idx) => (idx === i ? { ...x, quantity: Number(e.target.value) } : x)))} />
              </div>
              <div className="col-span-6 sm:col-span-2 space-y-1">
                <Label className="text-xs">Unit price</Label>
                <Input className="h-9" type="number" min="0" step="any" value={l.unitPrice} onChange={(e) => setLines(lines.map((x, idx) => (idx === i ? { ...x, unitPrice: Number(e.target.value) } : x)))} />
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
          <Label htmlFor="iv-notes">Notes</Label>
          <Input id="iv-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <div className="rounded-md bg-muted p-3 text-sm space-y-1">
          <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatMoneyDisplay(subtotal, currency)}</span></div>
          <div className="flex justify-between font-bold"><span>Total</span><span className="text-primary">{formatMoneyDisplay(Math.max(0, subtotal - discountC) + taxC, currency)}</span></div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => handleSave(false)} disabled={saving || !customerId || lines.length === 0} className="brand-gradient text-white">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save as draft
        </Button>
        <Button onClick={() => handleSave(true)} disabled={saving || !customerId || lines.length === 0} variant="outline">
          Save & send
        </Button>
      </DialogFooter>
    </>
  );
}
