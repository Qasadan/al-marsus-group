"use client";

// Shared admin UI primitives: page header, stat cards, status badges,
// confirm dialogs, empty states, and a simple pagination control.
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Inbox } from "lucide-react";
import { titleCase } from "@/lib/client";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  // positive
  APPROVED: "bg-green-100 text-green-800", PAID: "bg-green-100 text-green-800", COMPLETED: "bg-green-100 text-green-800",
  ACTIVE: "bg-green-100 text-green-800", HANDED_OVER: "bg-green-100 text-green-800", RESOLVED: "bg-green-100 text-green-800",
  RECEIVED: "bg-green-100 text-green-800", CONVERTED: "bg-green-100 text-green-800", DONE: "bg-green-100 text-green-800",
  // working
  IN_PROGRESS: "bg-blue-100 text-blue-800", SENT: "bg-blue-100 text-blue-800", SCHEDULED: "bg-blue-100 text-blue-800",
  PARTIALLY_PAID: "bg-blue-100 text-blue-800", PARTIALLY_RECEIVED: "bg-blue-100 text-blue-800",
  ASSIGNED: "bg-blue-100 text-blue-800", COMMISSIONING: "bg-blue-100 text-blue-800", ORDERED: "bg-blue-100 text-blue-800",
  QUALIFIED: "bg-blue-100 text-blue-800", CONTACTED: "bg-blue-100 text-blue-800", REVIEWED: "bg-blue-100 text-blue-800",
  // waiting
  PENDING: "bg-amber-100 text-amber-800", DRAFT: "bg-gray-100 text-gray-700", NEW: "bg-amber-100 text-amber-800",
  PLANNING: "bg-amber-100 text-amber-800", OPEN: "bg-amber-100 text-amber-800",
  // negative
  REJECTED: "bg-red-100 text-red-700", CANCELLED: "bg-red-100 text-red-700", LOST: "bg-red-100 text-red-700",
  OVERDUE: "bg-red-100 text-red-700", BLOCKED: "bg-red-100 text-red-700", EXPIRED: "bg-red-100 text-red-700",
  INACTIVE: "bg-gray-100 text-gray-600", SPAM: "bg-red-100 text-red-700", CLOSED: "bg-gray-100 text-gray-600",
  URGENT: "bg-red-100 text-red-700", HIGH: "bg-amber-100 text-amber-800", MEDIUM: "bg-blue-100 text-blue-800",
  LOW: "bg-gray-100 text-gray-600",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${STATUS_COLORS[status] ?? "bg-gray-100 text-gray-700"}`}>
      {titleCase(status)}
    </span>
  );
}

export function Pagination({
  page,
  pageSize,
  total,
  onPage,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (p: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return <p className="text-xs text-muted-foreground">{total} record(s)</p>;
  return (
    <div className="flex items-center justify-between gap-2">
      <p className="text-xs text-muted-foreground">
        Page {page} of {pages} · {total} record(s)
      </p>
      <div className="flex gap-1">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function ProgressPill({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-20 rounded-full bg-muted overflow-hidden">
        <div className="h-full brand-gradient-green" style={{ width: `${v}%` }} />
      </div>
      <span className="text-xs text-muted-foreground">{v}%</span>
    </div>
  );
}

export function EmptyState({ message, action }: { message: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-12 text-center">
      <Inbox className="h-10 w-10 text-muted-foreground/50" />
      <p className="text-sm text-muted-foreground max-w-sm">{message}</p>
      {action}
    </div>
  );
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Delete",
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" onClick={() => { onConfirm(); onOpenChange(false); }}>{confirmLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Small helper for admin forms inside dialogs
export function useConfirm() {
  const [confirmState, setConfirmState] = useState<{ title: string; description: string; onConfirm: () => void } | null>(null);
  const dialog = (
    <ConfirmDialog
      open={!!confirmState}
      onOpenChange={(o) => !o && setConfirmState(null)}
      title={confirmState?.title ?? ""}
      description={confirmState?.description ?? ""}
      onConfirm={() => { confirmState?.onConfirm(); setConfirmState(null); }}
    />
  );
  return { confirm: setConfirmState, confirmDialog: dialog };
}
