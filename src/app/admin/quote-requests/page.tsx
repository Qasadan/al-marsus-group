"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { PageHeader, StatusBadge, Pagination, EmptyState } from "@/components/admin/shared";
import { api, ApiClientError, formatDateTimeDisplay } from "@/lib/client";
import { Loader2, Target } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface QuoteRequest {
  id: string; name: string; email: string; phone: string; address: string | null;
  propertyType: string; monthlyBill: string | null; message: string | null;
  status: string; ipAddress: string | null; createdAt: string;
}

export default function QuoteRequestsPage() {
  const [items, setItems] = useState<QuoteRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const pageSize = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (status !== "all") params.set("status", status);
      const data = await api<{ items: QuoteRequest[]; total: number }>(`/api/quote-requests?${params}`);
      setItems(data.items);
      setTotal(data.total);
    } catch (e) {
      toast({ title: "Failed to load", description: e instanceof ApiClientError ? e.message : "", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  useEffect(() => { load(); }, [load]);

  async function setStatusFor(req: QuoteRequest, newStatus: string) {
    try {
      await api(`/api/quote-requests?id=${req.id}`, { method: "PUT", json: { status: newStatus } });
      if (newStatus === "CONVERTED") {
        await api("/api/leads", {
          method: "POST",
          json: {
            name: req.name, email: req.email, phone: req.phone, source: "WEBSITE", status: "NEW",
            notes: `From website quote request. Property: ${req.propertyType}${req.monthlyBill ? `, bill: ${req.monthlyBill}` : ""}${req.message ? `. ${req.message}` : ""}`,
          },
        });
        toast({ title: "Converted to lead" });
      } else {
        toast({ title: "Status updated" });
      }
      load();
    } catch (e) {
      toast({ title: "Update failed", description: e instanceof ApiClientError ? e.message : "", variant: "destructive" });
    }
  }

  return (
    <div>
      <PageHeader title="Quote Requests" description="Public website form submissions — validate, review and convert to leads." />

      <div className="mb-4">
        <div className="flex gap-2 flex-wrap">
          {["all", "NEW", "REVIEWED", "CONVERTED", "SPAM"].map((s) => (
            <Button key={s} variant={status === s ? "default" : "outline"} size="sm"
              onClick={() => { setStatus(s); setPage(1); }}
              className={status === s ? "brand-gradient text-white" : ""}>
              {s === "all" ? "All" : s}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : items.length === 0 ? (
        <EmptyState message="No quote requests yet. Submissions from the website form appear here." />
      ) : (
        <div className="grid gap-4">
          {items.map((r) => (
            <div key={r.id} className="rounded-lg border border-border bg-card p-5">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold">{r.name}</span>
                    <StatusBadge status={r.status} />
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">{r.propertyType}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {r.phone} · {r.email}{r.address ? ` · ${r.address}` : ""}{r.monthlyBill ? ` · Bill: ${r.monthlyBill}` : ""}
                  </p>
                  {r.message && <p className="mt-2 text-sm">{r.message}</p>}
                  <p className="mt-2 text-xs text-muted-foreground">
                    Submitted {formatDateTimeDisplay(r.createdAt)} from IP {r.ipAddress ?? "unknown"}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  {r.status === "NEW" && <Button size="sm" variant="outline" onClick={() => setStatusFor(r, "REVIEWED")}>Mark reviewed</Button>}
                  {(r.status === "NEW" || r.status === "REVIEWED") && (
                    <Button size="sm" onClick={() => setStatusFor(r, "CONVERTED")} className="brand-gradient-green text-white">
                      <Target className="h-4 w-4" /> Convert to lead
                    </Button>
                  )}
                  {r.status !== "SPAM" && <Button size="sm" variant="outline" onClick={() => setStatusFor(r, "SPAM")}>Spam</Button>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4"><Pagination page={page} pageSize={pageSize} total={total} onPage={setPage} /></div>
    </div>
  );
}
