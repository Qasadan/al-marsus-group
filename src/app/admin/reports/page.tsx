"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader, StatusBadge } from "@/components/admin/shared";
import { Card, CardContent } from "@/components/ui/card";
import { api, ApiClientError, formatMoneyDisplay, formatDateDisplay } from "@/lib/client";
import { useSettingsStore } from "@/lib/settings-store";
import { Download, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type ReportType = "revenue" | "projects" | "invoices" | "expenses" | "inventory" | "maintenance";

interface ReportData {
  type: string;
  currency?: string;
  totalCents?: number;
  paidCents?: number;
  outstandingCents?: number;
  byMethod?: Record<string, number>;
  rows: unknown[];
}

export default function ReportsPage() {
  const [type, setType] = useState<ReportType>("revenue");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState("all");
  const [customerId, setCustomerId] = useState("all");
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);
  const currency = useSettingsStore((s) => s.currency);
  useSettingsStore((s) => s).load();

  useEffect(() => {
    api<{ items: { id: string; name: string }[] }>("/api/customers?pageSize=100").then((d) => setCustomers(d.items)).catch(() => {});
  }, []);

  const buildQuery = useCallback(() => {
    const params = new URLSearchParams({ type });
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (status !== "all") params.set("status", status);
    if (customerId !== "all") params.set("customerId", customerId);
    return params;
  }, [type, from, to, status, customerId]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<ReportData>(`/api/reports?${buildQuery()}`);
      setData(data);
    } catch (e) {
      toast({ title: "Report failed", description: e instanceof ApiClientError ? e.message : "", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [buildQuery]);

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Filter business data by date range, customer and status. Export to CSV for accounting."
        actions={
          <Button variant="outline" onClick={() => window.open(`/api/reports/export?${buildQuery()}`, "_blank")}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        }
      />

      <Card className="mb-6">
        <CardContent className="p-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-1.5">
            <Label>Report type</Label>
            <Select value={type} onValueChange={(v) => setType(v as ReportType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="revenue">Revenue (payments)</SelectItem>
                <SelectItem value="invoices">Invoices</SelectItem>
                <SelectItem value="projects">Projects</SelectItem>
                <SelectItem value="expenses">Expenses</SelectItem>
                <SelectItem value="inventory">Inventory</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="r-from">From</Label>
            <Input id="r-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="r-to">To</Label>
            <Input id="r-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Status / category</Label>
            <Input placeholder="e.g. PAID, COMPLETED…" value={status === "all" ? "" : status} onChange={(e) => setStatus(e.target.value || "all")} />
          </div>
          <div className="space-y-1.5">
            <Label>Customer</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All customers</SelectItem>
                {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2 lg:col-span-5">
            <Button onClick={load} disabled={loading} className="brand-gradient text-white">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Run report
            </Button>
          </div>
        </CardContent>
      </Card>

      {data && (
        <div className="space-y-4">
          {data.totalCents != null && (
            <div className="grid gap-4 sm:grid-cols-3">
              <Card><CardContent className="p-5">
                <p className="text-sm text-muted-foreground">{type === "invoices" ? "Invoiced" : type === "expenses" ? "Total expenses" : "Total"}</p>
                <p className="text-2xl font-bold">{formatMoneyDisplay(data.totalCents, data.currency || currency)}</p>
              </CardContent></Card>
              {data.paidCents != null && (
                <Card><CardContent className="p-5">
                  <p className="text-sm text-muted-foreground">Paid</p>
                  <p className="text-2xl font-bold text-[var(--brand-green)]">{formatMoneyDisplay(data.paidCents, data.currency || currency)}</p>
                </CardContent></Card>
              )}
              {data.outstandingCents != null && (
                <Card><CardContent className="p-5">
                  <p className="text-sm text-muted-foreground">Outstanding</p>
                  <p className="text-2xl font-bold text-red-600">{formatMoneyDisplay(data.outstandingCents, data.currency || currency)}</p>
                </CardContent></Card>
              )}
            </div>
          )}

          {data.byMethod && Object.keys(data.byMethod).length > 0 && (
            <Card><CardContent className="p-5">
              <h3 className="font-medium mb-3">By payment method</h3>
              <ul className="space-y-2 text-sm">
                {Object.entries(data.byMethod).map(([m, cents]) => (
                  <li key={m} className="flex justify-between border-b border-border pb-1.5 last:border-0">
                    <span className="text-muted-foreground">{m.replace("_", " ")}</span>
                    <span className="font-medium">{formatMoneyDisplay(cents, data.currency || currency)}</span>
                  </li>
                ))}
              </ul>
            </CardContent></Card>
          )}

          <div className="rounded-lg border border-border overflow-x-auto">
            {type === "revenue" && <RevenueTable rows={data.rows as never} />}
            {type === "invoices" && <InvoicesTable rows={data.rows as never} />}
            {type === "projects" && <ProjectsTable rows={data.rows as never} />}
            {type === "expenses" && <ExpensesTable rows={data.rows as never} />}
            {type === "inventory" && <InventoryTable rows={data.rows as never} />}
            {type === "maintenance" && <MaintenanceTable rows={data.rows as never} />}
          </div>
        </div>
      )}
    </div>
  );
}

 
function RevenueTable({ rows }: { rows: any[] }) {
  return (
    <table className="w-full text-sm">
      <thead><tr className="border-b bg-muted/50 text-left"><th className="px-4 py-2.5 font-medium">Date</th><th className="px-4 py-2.5 font-medium">Invoice</th><th className="px-4 py-2.5 font-medium">Customer</th><th className="px-4 py-2.5 font-medium">Method</th><th className="px-4 py-2.5 font-medium text-right">Amount</th></tr></thead>
      <tbody>
        {rows.map((p) => (
          <tr key={p.id} className="border-b last:border-0">
            <td className="px-4 py-2.5 whitespace-nowrap">{formatDateDisplay(p.paidAt)}</td>
            <td className="px-4 py-2.5">{p.invoice.invoiceNumber}</td>
            <td className="px-4 py-2.5">{p.invoice.customer.name}</td>
            <td className="px-4 py-2.5">{p.method.replace("_", " ")}</td>
            <td className="px-4 py-2.5 text-right font-medium text-[var(--brand-green)]">{formatMoneyDisplay(p.amountCents, p.currency)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

 
function InvoicesTable({ rows }: { rows: any[] }) {
  return (
    <table className="w-full text-sm">
      <thead><tr className="border-b bg-muted/50 text-left"><th className="px-4 py-2.5 font-medium">Invoice</th><th className="px-4 py-2.5 font-medium">Date</th><th className="px-4 py-2.5 font-medium">Customer</th><th className="px-4 py-2.5 font-medium">Status</th><th className="px-4 py-2.5 font-medium text-right">Total</th><th className="px-4 py-2.5 font-medium text-right">Outstanding</th></tr></thead>
      <tbody>
        {rows.map((i) => (
          <tr key={i.id} className="border-b last:border-0">
            <td className="px-4 py-2.5">{i.invoiceNumber}</td>
            <td className="px-4 py-2.5 whitespace-nowrap">{formatDateDisplay(i.issueDate)}</td>
            <td className="px-4 py-2.5">{i.customer.name}</td>
            <td className="px-4 py-2.5"><StatusBadge status={i.status} /></td>
            <td className="px-4 py-2.5 text-right">{formatMoneyDisplay(i.totalCents, i.currency)}</td>
            <td className="px-4 py-2.5 text-right">{formatMoneyDisplay(i.totalCents - i.amountPaidCents, i.currency)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

 
function ProjectsTable({ rows }: { rows: any[] }) {
  return (
    <table className="w-full text-sm">
      <thead><tr className="border-b bg-muted/50 text-left"><th className="px-4 py-2.5 font-medium">Code</th><th className="px-4 py-2.5 font-medium">Name</th><th className="px-4 py-2.5 font-medium">Customer</th><th className="px-4 py-2.5 font-medium">Status</th><th className="px-4 py-2.5 font-medium text-right">Progress</th></tr></thead>
      <tbody>
        {rows.map((p) => (
          <tr key={p.id} className="border-b last:border-0">
            <td className="px-4 py-2.5">{p.code}</td>
            <td className="px-4 py-2.5">{p.name}</td>
            <td className="px-4 py-2.5">{p.customer.name}</td>
            <td className="px-4 py-2.5"><StatusBadge status={p.status} /></td>
            <td className="px-4 py-2.5 text-right">{p.progress}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

 
function ExpensesTable({ rows }: { rows: any[] }) {
  return (
    <table className="w-full text-sm">
      <thead><tr className="border-b bg-muted/50 text-left"><th className="px-4 py-2.5 font-medium">Date</th><th className="px-4 py-2.5 font-medium">Description</th><th className="px-4 py-2.5 font-medium">Category</th><th className="px-4 py-2.5 font-medium">Project</th><th className="px-4 py-2.5 font-medium text-right">Amount</th></tr></thead>
      <tbody>
        {rows.map((e) => (
          <tr key={e.id} className="border-b last:border-0">
            <td className="px-4 py-2.5 whitespace-nowrap">{formatDateDisplay(e.expenseDate)}</td>
            <td className="px-4 py-2.5">{e.description}</td>
            <td className="px-4 py-2.5">{e.category}</td>
            <td className="px-4 py-2.5">{e.project?.code ?? "—"}</td>
            <td className="px-4 py-2.5 text-right text-red-600">{formatMoneyDisplay(e.amountCents, e.currency)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

 
function InventoryTable({ rows }: { rows: any[] }) {
  return (
    <table className="w-full text-sm">
      <thead><tr className="border-b bg-muted/50 text-left"><th className="px-4 py-2.5 font-medium">SKU</th><th className="px-4 py-2.5 font-medium">Name</th><th className="px-4 py-2.5 font-medium">Category</th><th className="px-4 py-2.5 font-medium text-right">Stock</th><th className="px-4 py-2.5 font-medium text-right">Reorder level</th></tr></thead>
      <tbody>
        {rows.map((p) => (
          <tr key={p.id} className={`border-b last:border-0 ${p.quantity <= p.reorderLevel ? "bg-red-50/50" : ""}`}>
            <td className="px-4 py-2.5">{p.sku}</td>
            <td className="px-4 py-2.5">{p.name}</td>
            <td className="px-4 py-2.5">{p.category}</td>
            <td className="px-4 py-2.5 text-right font-medium">{p.quantity} {p.unit}</td>
            <td className="px-4 py-2.5 text-right">{p.reorderLevel}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

 
function MaintenanceTable({ rows }: { rows: any[] }) {
  return (
    <table className="w-full text-sm">
      <thead><tr className="border-b bg-muted/50 text-left"><th className="px-4 py-2.5 font-medium">Code</th><th className="px-4 py-2.5 font-medium">Scheduled</th><th className="px-4 py-2.5 font-medium">Customer</th><th className="px-4 py-2.5 font-medium">Technician</th><th className="px-4 py-2.5 font-medium">Status</th></tr></thead>
      <tbody>
        {rows.map((m) => (
          <tr key={m.id} className="border-b last:border-0">
            <td className="px-4 py-2.5">{m.code}</td>
            <td className="px-4 py-2.5 whitespace-nowrap">{formatDateDisplay(m.scheduledDate)}</td>
            <td className="px-4 py-2.5">{m.customer.name}</td>
            <td className="px-4 py-2.5">{m.technician?.name ?? "—"}</td>
            <td className="px-4 py-2.5"><StatusBadge status={m.status} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
