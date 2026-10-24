"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/admin/shared";
import { api, ApiClientError } from "@/lib/client";
import { Loader2, Save } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface SettingsShape {
  companyName: string; tagline: string; heroTitle: string; heroSubtitle: string;
  aboutText: string; missionText: string; visionText: string; servicesJson: string;
  email: string; phone: string; whatsappNumber: string; address: string;
  currency: string; taxRate: string;
  quotationPrefix: string; invoicePrefix: string; projectPrefix: string;
  quotationTerms: string; invoiceTerms: string;
}

export default function SettingsPage() {
  const [form, setForm] = useState<SettingsShape | null>(null);
  const [services, setServices] = useState<{ title: string; description: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Record<string, unknown>>("/api/settings").then((d) => {
      setForm({
        companyName: d.companyName ?? "", tagline: d.tagline ?? "", heroTitle: d.heroTitle ?? "",
        heroSubtitle: d.heroSubtitle ?? "", aboutText: d.aboutText ?? "", missionText: d.missionText ?? "",
        visionText: d.visionText ?? "", servicesJson: "", email: d.email ?? "", phone: d.phone ?? "",
        whatsappNumber: d.whatsappNumber ?? "", address: d.address ?? "", currency: d.currency ?? "KES",
        taxRate: String(d.taxRate ?? 16), quotationPrefix: d.quotationPrefix ?? "QT",
        invoicePrefix: d.invoicePrefix ?? "INV", projectPrefix: d.projectPrefix ?? "PRJ",
        quotationTerms: d.quotationTerms ?? "", invoiceTerms: d.invoiceTerms ?? "",
      });
      setServices(Array.isArray(d.services) ? d.services : []);
    }).catch((e) => setError(e instanceof ApiClientError ? e.message : "Load failed"));
  }, []);

  async function handleSave() {
    if (!form) return;
    setSaving(true);
    setError("");
    try {
      await api("/api/settings", {
        method: "PUT",
        json: {
          companyName: form.companyName,
          tagline: form.tagline || null,
          heroTitle: form.heroTitle || null,
          heroSubtitle: form.heroSubtitle || null,
          aboutText: form.aboutText || null,
          missionText: form.missionText || null,
          visionText: form.visionText || null,
          servicesJson: JSON.stringify(services),
          email: form.email || null,
          phone: form.phone || null,
          whatsappNumber: form.whatsappNumber || null,
          address: form.address || null,
          currency: form.currency.toUpperCase().slice(0, 3),
          taxRate: Number(form.taxRate || 0),
          quotationPrefix: form.quotationPrefix,
          invoicePrefix: form.invoicePrefix,
          projectPrefix: form.projectPrefix,
          quotationTerms: form.quotationTerms || null,
          invoiceTerms: form.invoiceTerms || null,
        },
      });
      toast({ title: "Settings saved", description: "Public website content and defaults updated." });
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (!form) {
    return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  const set = (patch: Partial<SettingsShape>) => setForm({ ...form, ...patch });

  return (
    <div>
      <PageHeader
        title="Company Settings"
        description="Branding, website content, contact details, currency and document numbering. Everything here is configurable — nothing is hard-coded."
        actions={<Button onClick={handleSave} disabled={saving} className="brand-gradient text-white">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save All</Button>}
      />

      {error && <p className="mb-4 text-sm text-red-600" role="alert">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-5">
          <div className="rounded-lg border border-border p-5 space-y-4">
            <h3 className="font-semibold">Company identity</h3>
            <div className="space-y-1.5">
              <Label htmlFor="s-name">Company name</Label>
              <Input id="s-name" value={form.companyName} onChange={(e) => set({ companyName: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-tagline">Tagline</Label>
              <Input id="s-tagline" value={form.tagline} onChange={(e) => set({ tagline: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-hero">Homepage hero title</Label>
              <Input id="s-hero" value={form.heroTitle} onChange={(e) => set({ heroTitle: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-herosub">Homepage hero subtitle</Label>
              <Textarea id="s-herosub" rows={2} value={form.heroSubtitle} onChange={(e) => set({ heroSubtitle: e.target.value })} />
            </div>
          </div>

          <div className="rounded-lg border border-border p-5 space-y-4">
            <h3 className="font-semibold">Contact details (header/footer & WhatsApp)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="s-email">Email</Label>
                <Input id="s-email" type="email" value={form.email} onChange={(e) => set({ email: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-phone">Phone</Label>
                <Input id="s-phone" value={form.phone} onChange={(e) => set({ phone: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="s-wa">WhatsApp number</Label>
                <Input id="s-wa" value={form.whatsappNumber} onChange={(e) => set({ whatsappNumber: e.target.value })} placeholder="+2547XXXXXXXX" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-addr">Address</Label>
                <Input id="s-addr" value={form.address} onChange={(e) => set({ address: e.target.value })} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Leave any field empty and it will be hidden on the public site instead of showing fake data.</p>
          </div>

          <div className="rounded-lg border border-border p-5 space-y-4">
            <h3 className="font-semibold">Finance defaults</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="s-currency">Currency code (ISO 4217)</Label>
                <Input id="s-currency" maxLength={3} value={form.currency} onChange={(e) => set({ currency: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-tax">Default tax rate (%)</Label>
                <Input id="s-tax" type="number" min="0" max="100" step="any" value={form.taxRate} onChange={(e) => set({ taxRate: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="s-qp">Quote prefix</Label>
                <Input id="s-qp" value={form.quotationPrefix} onChange={(e) => set({ quotationPrefix: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-ip">Invoice prefix</Label>
                <Input id="s-ip" value={form.invoicePrefix} onChange={(e) => set({ invoicePrefix: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-pp">Project prefix</Label>
                <Input id="s-pp" value={form.projectPrefix} onChange={(e) => set({ projectPrefix: e.target.value })} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Changing currency affects new records only — existing records keep their original currency so amounts are never mixed.</p>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-lg border border-border p-5 space-y-4">
            <h3 className="font-semibold">About page content</h3>
            <div className="space-y-1.5">
              <Label htmlFor="s-about">About text</Label>
              <Textarea id="s-about" rows={5} value={form.aboutText} onChange={(e) => set({ aboutText: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="s-mission">Mission</Label>
                <Textarea id="s-mission" rows={3} value={form.missionText} onChange={(e) => set({ missionText: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-vision">Vision</Label>
                <Textarea id="s-vision" rows={3} value={form.visionText} onChange={(e) => set({ visionText: e.target.value })} />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border p-5 space-y-3">
            <h3 className="font-semibold">Services (public services page)</h3>
            {services.map((svc, i) => (
              <div key={i} className="grid gap-2 rounded-md border border-border p-3">
                <Input value={svc.title} onChange={(e) => setServices(services.map((s, idx) => (idx === i ? { ...s, title: e.target.value } : s)))} placeholder="Service title" />
                <Textarea rows={2} value={svc.description} onChange={(e) => setServices(services.map((s, idx) => (idx === i ? { ...s, description: e.target.value } : s)))} placeholder="Service description" />
                <Button variant="ghost" size="sm" className="self-start text-red-600" onClick={() => setServices(services.filter((_, idx) => idx !== i))}>
                  Remove service
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setServices([...services, { title: "", description: "" }])}>
              Add service
            </Button>
          </div>

          <div className="rounded-lg border border-border p-5 space-y-4">
            <h3 className="font-semibold">Document terms</h3>
            <div className="space-y-1.5">
              <Label htmlFor="s-qterms">Quotation terms</Label>
              <Textarea id="s-qterms" rows={3} value={form.quotationTerms} onChange={(e) => set({ quotationTerms: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-iterms">Invoice terms</Label>
              <Textarea id="s-iterms" rows={3} value={form.invoiceTerms} onChange={(e) => set({ invoiceTerms: e.target.value })} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
