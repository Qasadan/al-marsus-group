"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader, EmptyState, useConfirm } from "@/components/admin/shared";
import { api, ApiClientError } from "@/lib/client";
import { DIVISION_CODES, DIVISIONS } from "@/lib/divisions";
import { Plus, Loader2, Pencil, Trash2, Upload, Globe } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface GalleryRow {
  id: string; title: string; description: string | null; imageUrl: string; division: string | null; category: string | null;
  location: string | null; capacityKw: number | null; isPublic: boolean; projectId: string | null; sortOrder: number;
}

const emptyForm = { title: "", description: "", imageUrl: "", division: "MEP_ENGINEERING", category: "RESIDENTIAL", location: "", capacityKw: "", isPublic: true };

export default function GalleryPage() {
  const [items, setItems] = useState<GalleryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<GalleryRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const { confirm, confirmDialog } = useConfirm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<GalleryRow[]>("/api/gallery");
      setItems(data);
    } catch (e) {
      toast({ title: "Failed to load gallery", description: e instanceof ApiClientError ? e.message : "", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function uploadImage(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body: fd });
      const payload = await res.json();
      if (!res.ok || !payload.success) throw new Error(payload?.error?.message ?? "Upload failed");
      setForm((f) => ({ ...f, imageUrl: payload.data.url }));
      toast({ title: "Image uploaded" });
    } catch (e) {
      toast({ title: "Upload failed", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const payload = {
        title: form.title,
        description: form.description || null,
        imageUrl: form.imageUrl,
        division: form.division,
        category: form.category || null,
        location: form.location || null,
        capacityKw: form.capacityKw ? Number(form.capacityKw) : null,
        isPublic: form.isPublic,
      };
      if (editing) await api(`/api/gallery?id=${editing.id}`, { method: "PUT", json: payload });
      else await api("/api/gallery", { method: "POST", json: payload });
      toast({ title: editing ? "Gallery item updated" : "Gallery item created" });
      setDialogOpen(false);
      load();
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function togglePublic(item: GalleryRow) {
    try {
      await api(`/api/gallery?id=${item.id}`, { method: "PUT", json: { isPublic: !item.isPublic } });
      load();
    } catch (e) {
      toast({ title: "Update failed", description: e instanceof ApiClientError ? e.message : "", variant: "destructive" });
    }
  }

  async function handleDelete(item: GalleryRow) {
    confirm({
      title: `Delete "${item.title}"?`,
      description: "This removes the item from the public portfolio.",
      onConfirm: async () => {
        try {
          await api(`/api/gallery?id=${item.id}`, { method: "DELETE" });
          toast({ title: "Deleted" });
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
        title="Project Gallery"
        description="Published portfolio shown on the public website. Toggle visibility per item."
        actions={<Button onClick={() => { setEditing(null); setForm(emptyForm); setError(""); setDialogOpen(true); }}><Plus className="h-4 w-4" /> Add Project</Button>}
      />

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : items.length === 0 ? (
        <EmptyState message="No gallery items yet. Publish completed installations to showcase your work." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((g) => (
            <div key={g.id} className="rounded-xl border border-border overflow-hidden bg-card">
              <div className="relative aspect-[4/3] bg-muted">
                <Image src={g.imageUrl} alt={g.title} fill sizes="33vw" className="object-cover" />
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-medium">{g.title}</h3>
                    <p className="text-xs text-muted-foreground">
                      {[g.division ? DIVISIONS[g.division as keyof typeof DIVISIONS]?.shortName : null, g.category, g.location, g.capacityKw ? `${g.capacityKw} kW` : null].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => { setEditing(g); setForm({
                      title: g.title, description: g.description ?? "", imageUrl: g.imageUrl,
                      division: g.division ?? "MEP_ENGINEERING", category: g.category ?? "RESIDENTIAL", location: g.location ?? "",
                      capacityKw: g.capacityKw?.toString() ?? "", isPublic: g.isPublic,
                    }); setError(""); setDialogOpen(true); }} aria-label={`Edit ${g.title}`}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(g)} aria-label={`Delete ${g.title}`}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                    <Switch checked={g.isPublic} onCheckedChange={() => togglePublic(g)} aria-label={`Toggle visibility of ${g.title}`} />
                    <Globe className="h-3.5 w-3.5" /> {g.isPublic ? "Published" : "Hidden"}
                  </label>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Gallery Item" : "Add Gallery Item"}</DialogTitle></DialogHeader>
          {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Image *</Label>
              <div className="flex gap-2">
                <Input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="/uploads/… or image URL" />
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])} />
                <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload
                </Button>
              </div>
              {form.imageUrl && (
                <div className="relative aspect-video mt-2 rounded-md overflow-hidden border border-border">
                  <Image src={form.imageUrl} alt="Preview" fill sizes="500px" className="object-cover" />
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="g-title">Title *</Label>
              <Input id="g-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="g-desc">Description</Label>
              <Textarea id="g-desc" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Division</Label>
              <Select value={form.division} onValueChange={(v) => setForm({ ...form, division: v })}>
                <SelectTrigger><SelectValue placeholder="Select division" /></SelectTrigger>
                <SelectContent>
                  {DIVISION_CODES.map((code) => (
                    <SelectItem key={code} value={code}>
                      {DIVISIONS[code].fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RESIDENTIAL">Residential</SelectItem>
                    <SelectItem value="COMMERCIAL">Commercial</SelectItem>
                    <SelectItem value="INDUSTRIAL">Industrial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="g-loc">Location</Label>
                <Input id="g-loc" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="g-kw">Capacity (kW)</Label>
                <Input id="g-kw" type="number" min="0" step="any" value={form.capacityKw} onChange={(e) => setForm({ ...form, capacityKw: e.target.value })} />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Switch checked={form.isPublic} onCheckedChange={(v) => setForm({ ...form, isPublic: v })} />
              Visible on public website
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.title.trim() || !form.imageUrl} className="brand-gradient text-white">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {confirmDialog}
    </div>
  );
}
