"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge, useConfirm } from "@/components/admin/shared";
import { api, ApiClientError, formatMoneyDisplay } from "@/lib/client";
import { useSettingsStore } from "@/lib/settings-store";
import { Loader2, Printer, CheckCircle2, XCircle, FolderPlus, Save, ArrowLeft, Trash2, Plus } from "lucide-react";
import Link from "next/link";
import { toast } from "@/hooks/use-toast";

interface Item { kind: string; description: string; productId: string | null; quantity: number; unitPrice: number }
interface QuotationDetail {
  id: string; quoteNumber: string; title: string; status: string; issueDate: string; expiryDate: string | null;
  currency: string; subtotalCents: number; discountCents: number; taxRate: number; taxCents: number; totalCents: number;
  notes: string | null; terms: string | null;
  customer: { id: string; name: string; email: string | null; phone: string | null; address: string | null };
  project?: { id: string; code: string } | null;
  items: { id: string; kind: string; description: string; quantity: number; unitPriceCents: number; totalCents: number }[];
}

const emptyItem: Item = { kind: "EQUIPMENT", description: "", productId: null, quantity: 1, unitPrice: 0 };

export default function QuotationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const currency = useSettingsStore((s) => s.currency);
  useSettingsStore((s) => s).load();
  const [qt, setQt] = useState<QuotationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [convertForm, setConvertForm] = useState({ name: "", startDate: "", systemSizeKw: "", warrantyMonths: "12" });
  const { confirm, confirmDialog } = useConfirm();

  const load = useCallback(async () => {
    try {
      const data = await api<QuotationDetail>(`/api/quotations/${id}`);
      setQt(data);
    } catch (e) {
      toast({ title: "Failed to load quotation", description: e instanceof ApiClientError ? e.message : "", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function action(kind: "send" | "approve" | "reject" | "expire") {
    setBusy(true);
    try {
      await api(`/api/quotations?id=${id}`, { method: "PUT", json: { action: kind } });
      toast({ title: `Quotation ${kind === "send" ? "sent" : kind === "approve" ? "approved" : kind === "reject" ? "rejected" : "expired"}` });
      await load();
    } catch (e) {
      toast({ title: "Action failed", description: e instanceof ApiClientError ? e.message : "", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function handleConvert() {
    setBusy(true);
    try {
      const project = await api<{ id: string; code: string }>(`/api/quotations/${id}/convert`, {
        method: "POST",
        json: {
          ...(convertForm.name ? { name: convertForm.name } : {}),
          ...(convertForm.startDate ? { startDate: convertForm.startDate } : {}),
          ...(convertForm.systemSizeKw ? { systemSizeKw: Number(convertForm.systemSizeKw) } : {}),
          ...(convertForm.warrantyMonths ? { warrantyMonths: Number(convertForm.warrantyMonths) } : {}),
        },
      });
      toast({ title: "Project created", description: `${project.code} was created from this quotation.` });
      setConvertOpen(false);
      router.push(`/admin/projects/${project.id}`);
    } catch (e) {
      toast({ title: "Conversion failed", description: e instanceof ApiClientError ? e.message : "", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    confirm({
      title: "Delete this quotation?",
      description: "Converted quotations cannot be deleted.",
      onConfirm: async () => {
        try {
          await api(`/api/quotations/${id}`, { method: "DELETE" });
          toast({ title: "Quotation deleted" });
          router.push("/admin/quotations");
        } catch (e) {
          toast({ title: "Delete failed", description: e instanceof ApiClientError ? e.message : "", variant: "destructive" });
        }
      },
    });
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  if (!qt) return <p className="text-sm text-muted-foreground">Quotation not found.</p>;

  const editable = qt.status === "DRAFT" || qt.status === "SENT";
  const cur = qt.currency || currency;

  return (
    <div>
      <div className="mb-4">
        <Link href="/admin/quotations" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Back to quotations
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-primary">{qt.quoteNumber}</h1>
            <StatusBadge status={qt.status} />
          </div>
          <p className="text-sm text-muted-foreground mt-1">{qt.title} · {qt.customer.name}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {qt.status === "DRAFT" && <Button variant="outline" onClick={() => action("send")} disabled={busy}><Save className="h-4 w-4" /> Mark as Sent</Button>}
          {(qt.status === "SENT" || qt.status === "DRAFT") && (
            <Button onClick={() => action("approve")} disabled={busy} className="brand-gradient-green text-white">
              <CheckCircle2 className="h-4 w-4" /> Approve
            </Button>
          )}
          {(qt.status === "SENT" || qt.status === "DRAFT") && (
            <Button variant="outline" onClick={() => action("reject")} disabled={busy} className="text-red-600 border-red-200 hover:bg-red-50">
              <XCircle className="h-4 w-4" /> Reject
            </Button>
          )}
          {qt.status === "APPROVED" && !qt.project && (
            <Button onClick={() => setConvertOpen(true)} disabled={busy} className="brand-gradient text-white">
              <FolderPlus className="h-4 w-4" /> Convert to Project
            </Button>
          )}
          {qt.project && (
            <Link href={`/admin/projects/${qt.project.id}`}>
              <Button variant="outline"><FolderPlus className="h-4 w-4" /> View Project {qt.project.code}</Button>
            </Link>
          )}
          {editable && <Button variant="outline" onClick={() => setEditOpen(true)}>Edit</Button>}
          <Link href={`/print/quotation/${qt.id}`} target="_blank">
            <Button variant="outline"><Printer className="h-4 w-4" /> Print / PDF</Button>
          </Link>
          <Button variant="ghost" onClick={handleDelete} aria-label="Delete quotation"><Trash2 className="h-4 w-4 text-red-500" /></Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left">
                <th className="px-4 py-3 font-medium">Description</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium text-right">Qty</th>
                <th className="px-4 py-3 font-medium text-right">Unit Price</th>
                <th className="px-4 py-3 font-medium text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {qt.items.map((it) => (
                <tr key={it.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">{it.description}</td>
                  <td className="px-4 py-3 text-muted-foreground">{it.kind}</td>
                  <td className="px-4 py-3 text-right">{it.quantity}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">{formatMoneyDisplay(it.unitPriceCents, cur)}</td>
                  <td className="px-4 py-3 text-right font-medium whitespace-nowrap">{formatMoneyDisplay(it.totalCents, cur)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-border p-5 space-y-2.5 text-sm">
            <h3 className="font-semibold mb-2">Summary</h3>
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatMoneyDisplay(qt.subtotalCents, cur)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span>-{formatMoneyDisplay(qt.discountCents, cur)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Tax ({qt.taxRate}%)</span><span>{formatMoneyDisplay(qt.taxCents, cur)}</span></div>
            <div className="flex justify-between border-t border-border pt-2.5 text-base font-bold">
              <span>Total</span><span className="text-primary">{formatMoneyDisplay(qt.totalCents, cur)}</span>
            </div>
            <p className="text-xs text-muted-foreground pt-1">Totals are calculated server-side from line items.</p>
          </div>
          <div className="rounded-lg border border-border p-5 text-sm space-y-1.5">
            <h3 className="font-semibold mb-2">Customer</h3>
            <p className="font-medium">{qt.customer.name}</p>
            {qt.customer.phone && <p className="text-muted-foreground">{qt.customer.phone}</p>}
            {qt.customer.email && <p className="text-muted-foreground">{qt.customer.email}</p>}
            {qt.customer.address && <p className="text-muted-foreground">{qt.customer.address}</p>}
          </div>
          {qt.notes && (
            <div className="rounded-lg border border-border p-5 text-sm">
              <h3 className="font-semibold mb-2">Notes</h3>
              <p className="text-muted-foreground whitespace-pre-wrap">{qt.notes}</p>
            </div>
          )}
          {qt.terms && (
            <div className="rounded-lg border border-border p-5 text-sm">
              <h3 className="font-semibold mb-2">Terms</h3>
              <p className="text-muted-foreground whitespace-pre-wrap">{qt.terms}</p>
            </div>
          )}
        </div>
      </div>

      {/* Edit dialog with line-item editor */}
      <EditQuotationDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        quotation={qt}
        onSaved={() => { setEditOpen(false); load(); }}
      />

      {/* Convert dialog */}
      <Dialog open={convertOpen} onOpenChange={setConvertOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Convert to Project</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Creates a project from this approved quotation with budget equal to the quotation total and a default installation task checklist. The conversion is protected against duplicates.
          </p>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="cv-name">Project name</Label>
              <Input id="cv-name" placeholder={qt.title} value={convertForm.name} onChange={(e) => setConvertForm({ ...convertForm, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="cv-start">Start date</Label>
                <Input id="cv-start" type="date" value={convertForm.startDate} onChange={(e) => setConvertForm({ ...convertForm, startDate: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cv-kw">System size (kW)</Label>
                <Input id="cv-kw" type="number" min="0" step="0.1" value={convertForm.systemSizeKw} onChange={(e) => setConvertForm({ ...convertForm, systemSizeKw: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cv-warranty">Warranty (months)</Label>
              <Input id="cv-warranty" type="number" min="0" value={convertForm.warrantyMonths} onChange={(e) => setConvertForm({ ...convertForm, warrantyMonths: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConvertOpen(false)}>Cancel</Button>
            <Button onClick={handleConvert} disabled={busy} className="brand-gradient text-white">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderPlus className="h-4 w-4" />} Create Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {confirmDialog}
    </div>
  );
}

function EditQuotationDialog({
  open, onOpenChange, quotation, onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  quotation: QuotationDetail;
  onSaved: () => void;
}) {
  // Inner form remounts on each open — state derives from quotation via initializers.
  if (!open) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Edit Quotation {quotation.quoteNumber}</DialogTitle></DialogHeader>
        <QuotationEditForm quotation={quotation} onDone={() => { onSaved(); onOpenChange(false); }} onCancel={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function QuotationEditForm({
  quotation, onDone, onCancel,
}: {
  quotation: QuotationDetail;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(quotation.title);
  const [discount, setDiscount] = useState(String(quotation.discountCents / 100));
  const [taxRate, setTaxRate] = useState(String(quotation.taxRate));
  const [notes, setNotes] = useState(quotation.notes ?? "");
  const [items, setItems] = useState<Item[]>(
    quotation.items.map((it) => ({ kind: it.kind, description: it.description, productId: null, quantity: it.quantity, unitPrice: it.unitPriceCents / 100 }))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const subtotal = items.reduce((s, it) => s + Math.round(it.quantity * it.unitPrice * 100), 0);
  const discountC = Math.max(0, Math.round(Number(discount || 0) * 100));
  const taxC = Math.round(Math.max(0, subtotal - discountC) * (Number(taxRate || 0) / 100));
  const total = Math.max(0, subtotal - discountC) + taxC;

  function updateItem(i: number, patch: Partial<Item>) {
    setItems(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      await api(`/api/quotations/${quotation.id}`, {
        method: "PUT",
        json: { title, discount: Number(discount || 0), taxRate: Number(taxRate || 0), notes: notes || null, items },
      });
      toast({ title: "Quotation updated" });
      onSaved();
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
      <div className="grid gap-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="e-title">Title *</Label>
            <Input id="e-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Line items *</Label>
            {items.map((it, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-end rounded-md border border-border p-2.5">
                <div className="col-span-12 sm:col-span-2 space-y-1">
                  <Label className="text-xs">Type</Label>
                  <Select value={it.kind} onValueChange={(v) => updateItem(i, { kind: v })}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EQUIPMENT">Equipment</SelectItem>
                      <SelectItem value="LABOR">Labor</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-12 sm:col-span-5 space-y-1">
                  <Label className="text-xs">Description</Label>
                  <Input className="h-9" value={it.description} onChange={(e) => updateItem(i, { description: e.target.value })} />
                </div>
                <div className="col-span-3 sm:col-span-1 space-y-1">
                  <Label className="text-xs">Qty</Label>
                  <Input className="h-9" type="number" min="0" step="any" value={it.quantity} onChange={(e) => updateItem(i, { quantity: Number(e.target.value) })} />
                </div>
                <div className="col-span-5 sm:col-span-2 space-y-1">
                  <Label className="text-xs">Unit price</Label>
                  <Input className="h-9" type="number" min="0" step="any" value={it.unitPrice} onChange={(e) => updateItem(i, { unitPrice: Number(e.target.value) })} />
                </div>
                <div className="col-span-2 sm:col-span-1 flex justify-end">
                  <Button variant="ghost" size="icon" onClick={() => setItems(items.filter((_, idx) => idx !== i))} aria-label="Remove item">
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setItems([...items, { ...emptyItem }])}>
              <Plus className="h-4 w-4" /> Add item
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="e-discount">Discount (amount)</Label>
              <Input id="e-discount" type="number" min="0" step="any" value={discount} onChange={(e) => setDiscount(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="e-tax">Tax rate (%)</Label>
              <Input id="e-tax" type="number" min="0" max="100" step="any" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="e-notes">Notes</Label>
            <Textarea id="e-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <div className="rounded-md bg-muted p-3 text-sm flex justify-between font-semibold">
            <span>Preview total</span>
            <span>{formatMoneyDisplay(total, quotation.currency)}</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !title.trim() || items.length === 0} className="brand-gradient text-white">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save changes
          </Button>
        </DialogFooter>
    </>
  );
}
