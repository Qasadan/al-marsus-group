"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader, StatusBadge, Pagination, EmptyState, ProgressPill } from "@/components/admin/shared";
import { api, ApiClientError, formatDateDisplay } from "@/lib/client";
import { Search, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ProjectRow {
  id: string; code: string; name: string; status: string; progress: number; startDate: string | null;
  systemSizeKw: number | null; createdAt: string;
  customer: { id: string; name: string };
  members: { user: { id: string; name: string } }[];
  _count: { tasks: number; photos: number; invoices: number };
}

export default function ProjectsPage() {
  const [items, setItems] = useState<ProjectRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const pageSize = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (q) params.set("q", q);
      if (status !== "all") params.set("status", status);
      const data = await api<{ items: ProjectRow[]; total: number }>(`/api/projects?${params}`);
      setItems(data.items);
      setTotal(data.total);
    } catch (e) {
      toast({ title: "Failed to load projects", description: e instanceof ApiClientError ? e.message : "", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [page, q, status]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <PageHeader title="Projects" description="Installation projects converted from approved quotations or created manually." />

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search code or name…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className="pl-9" aria-label="Search projects" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {["all", "PLANNING", "SCHEDULED", "IN_PROGRESS", "COMMISSIONING", "COMPLETED"].map((s) => (
            <Button key={s} variant={status === s ? "default" : "outline"} size="sm"
              onClick={() => { setStatus(s); setPage(1); }} className={status === s ? "brand-gradient text-white" : ""}>
              {s === "all" ? "All" : s.replace("_", " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : items.length === 0 ? (
        <EmptyState message="No projects yet. Approve a quotation and convert it into a project." />
      ) : (
        <div className="rounded-lg border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left">
                <th className="px-4 py-3 font-medium">Project</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Team</th>
                <th className="px-4 py-3 font-medium">Progress</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Start</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <Link href={`/admin/projects/${p.id}`} className="font-medium text-[var(--brand-indigo)] hover:underline">
                      {p.code}
                    </Link>
                    <div className="text-xs text-muted-foreground">{p.name}{p.systemSizeKw ? ` · ${p.systemSizeKw} kW` : ""}</div>
                  </td>
                  <td className="px-4 py-3">{p.customer.name}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {p.members.length > 0 ? p.members.map((m) => m.user.name).join(", ") : "Unassigned"}
                  </td>
                  <td className="px-4 py-3"><ProgressPill value={p.progress} /></td>
                  <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatDateDisplay(p.startDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4"><Pagination page={page} pageSize={pageSize} total={total} onPage={setPage} /></div>
    </div>
  );
}
