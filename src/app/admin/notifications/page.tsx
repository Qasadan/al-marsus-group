"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeader, EmptyState, Pagination } from "@/components/admin/shared";
import { api, ApiClientError, formatDateTimeDisplay } from "@/lib/client";
import { Loader2, Bell, CheckCheck } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface NotificationRow {
  id: string; type: string; title: string; message: string; link: string | null;
  isRead: boolean; createdAt: string;
}

export default function NotificationsPage() {
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const pageSize = 25;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<{ items: NotificationRow[]; total: number; unreadCount: number }>(`/api/notifications?page=${page}&pageSize=${pageSize}`);
      setItems(data.items);
      setTotal(data.total);
      setUnreadCount(data.unreadCount);
    } catch (e) {
      toast({ title: "Failed to load notifications", description: e instanceof ApiClientError ? e.message : "", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  async function markAll() {
    await api("/api/notifications?id=all", { method: "PUT" });
    toast({ title: "All marked as read" });
    load();
  }

  return (
    <div>
      <PageHeader
        title="Notifications"
        description={`${unreadCount} unread · low stock alerts, payments, approvals and service requests.`}
        actions={unreadCount > 0 ? (
          <Button variant="outline" onClick={markAll}><CheckCheck className="h-4 w-4" /> Mark all read</Button>
        ) : undefined}
      />

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : items.length === 0 ? (
        <EmptyState message="No notifications yet." />
      ) : (
        <div className="space-y-2">
          {items.map((n) => (
            <div key={n.id} className={`flex items-start gap-3 rounded-lg border p-4 ${n.isRead ? "border-border bg-card" : "border-[var(--brand-green)]/40 bg-accent/40"}`}>
              <div className="rounded-lg bg-secondary p-2 shrink-0">
                <Bell className={`h-4 w-4 ${n.isRead ? "text-muted-foreground" : "text-[var(--brand-green)]"}`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{n.title}</p>
                <p className="text-sm text-muted-foreground">{n.message}</p>
                <p className="text-xs text-muted-foreground mt-1">{formatDateTimeDisplay(n.createdAt)} · {n.type.replace("_", " ")}</p>
              </div>
              {n.link && (
                <Link href={n.link} className="shrink-0">
                  <Button size="sm" variant="outline">Open</Button>
                </Link>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-4"><Pagination page={page} pageSize={pageSize} total={total} onPage={setPage} /></div>
    </div>
  );
}
