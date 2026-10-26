"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader, Pagination, EmptyState } from "@/components/admin/shared";
import { api, ApiClientError, formatDateTimeDisplay } from "@/lib/client";
import { Loader2, ScrollText } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface AuditRow {
  id: string; userName: string | null; action: string; entityType: string; entityId: string | null;
  details: string | null; ipAddress: string | null; createdAt: string;
  user?: { name: string; email: string } | null;
}

const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-green-100 text-green-800", UPDATE: "bg-blue-100 text-blue-800",
  DELETE: "bg-red-100 text-red-700", LOGIN: "bg-purple-100 text-purple-800",
  LOGOUT: "bg-gray-100 text-gray-600", APPROVE: "bg-green-100 text-green-800",
  CONVERT: "bg-amber-100 text-amber-800", RECEIVE: "bg-blue-100 text-blue-800",
  PAYMENT: "bg-green-100 text-green-800", EXPORT: "bg-purple-100 text-purple-800",
  STATUS_CHANGE: "bg-blue-100 text-blue-800",
};

export default function AuditPage() {
  const [items, setItems] = useState<AuditRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("all");
  const [loading, setLoading] = useState(true);
  const pageSize = 30;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (action !== "all") params.set("action", action);
      const data = await api<{ items: AuditRow[]; total: number }>(`/api/audit-logs?${params}`);
      setItems(data.items);
      setTotal(data.total);
    } catch (e) {
      toast({ title: "Failed to load audit log", description: e instanceof ApiClientError ? e.message : "", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [page, action]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <PageHeader title="Audit Log" description="Immutable trail of every significant action: who, what, when and from where." />

      <div className="flex gap-2 flex-wrap mb-4">
        {["all", "CREATE", "UPDATE", "DELETE", "LOGIN", "PAYMENT", "APPROVE", "CONVERT", "RECEIVE", "EXPORT"].map((a) => (
          <button key={a} onClick={() => { setAction(a); setPage(1); }}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${action === a ? "brand-gradient text-white" : "bg-muted text-muted-foreground hover:bg-secondary"}`}>
            {a === "all" ? "All actions" : a}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : items.length === 0 ? (
        <EmptyState message="No audit entries for this filter." />
      ) : (
        <div className="space-y-2">
          {items.map((a) => (
            <div key={a.id} className="flex items-start gap-3 rounded-lg border border-border bg-card p-3.5">
              <div className="rounded-lg bg-secondary p-2 shrink-0">
                <ScrollText className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ACTION_COLORS[a.action] ?? "bg-gray-100 text-gray-700"}`}>{a.action}</span>
                  <span className="text-sm font-medium">{a.entityType}</span>
                  <span className="text-xs text-muted-foreground">by {a.userName ?? "system"}{a.ipAddress ? ` · ${a.ipAddress}` : ""}</span>
                </div>
                {a.details && <p className="mt-1 text-xs text-muted-foreground break-all">{a.details}</p>}
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">{formatDateTimeDisplay(a.createdAt)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4"><Pagination page={page} pageSize={pageSize} total={total} onPage={setPage} /></div>
    </div>
  );
}
