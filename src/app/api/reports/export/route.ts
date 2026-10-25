import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { handleRoute, requireAuth } from "@/lib/api";
import { writeAudit } from "@/lib/audit";

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.map(csvEscape).join(",")];
  for (const row of rows) lines.push(row.map(csvEscape).join(","));
  return lines.join("\r\n");
}

// CSV export endpoint: /api/reports/export?type=revenue&from=&to=&customerId=&status=
export async function GET(req: NextRequest) {
  return handleRoute(async () => {
    const session = await requireAuth(["reports"]);
    const sp = new URL(req.url).searchParams;
    const type = sp.get("type") ?? "revenue";
    const from = sp.get("from") ? new Date(sp.get("from")!) : null;
    const to = sp.get("to") ? new Date(sp.get("to") + "T23:59:59") : null;
    const customerId = sp.get("customerId") ?? undefined;
    const projectId = sp.get("projectId") ?? undefined;
    const status = sp.get("status") ?? undefined;
    const dateRange = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };

    let csv = "";
    let filename = `${type}-report-${new Date().toISOString().slice(0, 10)}.csv`;

    if (type === "revenue") {
      const payments = await db.payment.findMany({
        where: {
          ...(Object.keys(dateRange).length ? { paidAt: dateRange } : {}),
          ...(customerId ? { invoice: { customerId } } : {}),
        },
        orderBy: { paidAt: "desc" },
        include: { invoice: { include: { customer: { select: { name: true } } } } },
      });
      csv = toCsv(
        ["Payment Date", "Invoice", "Customer", "Method", "Reference", "Currency", "Amount"],
        payments.map((p) => [
          p.paidAt.toISOString().slice(0, 10),
          p.invoice.invoiceNumber,
          p.invoice.customer.name,
          p.method,
          p.reference ?? "",
          p.currency,
          (p.amountCents / 100).toFixed(2),
        ])
      );
    } else if (type === "projects") {
      const rows = await db.project.findMany({
        where: {
          ...(Object.keys(dateRange).length ? { createdAt: dateRange } : {}),
          ...(customerId ? { customerId } : {}),
          ...(status ? { status } : {}),
        },
        orderBy: { createdAt: "desc" },
        include: { customer: { select: { name: true } } },
      });
      csv = toCsv(
        ["Code", "Name", "Customer", "Status", "Progress %", "System kW", "Budget", "Currency", "Start", "End"],
        rows.map((p) => [
          p.code, p.name, p.customer.name, p.status, p.progress,
          p.systemSizeKw ?? "", p.budgetCents != null ? (p.budgetCents / 100).toFixed(2) : "",
          p.currency, p.startDate?.toISOString().slice(0, 10) ?? "", p.endDate?.toISOString().slice(0, 10) ?? "",
        ])
      );
    } else if (type === "invoices") {
      const rows = await db.invoice.findMany({
        where: {
          ...(Object.keys(dateRange).length ? { issueDate: dateRange } : {}),
          ...(customerId ? { customerId } : {}),
          ...(status ? { status } : {}),
          ...(projectId ? { projectId } : {}),
        },
        orderBy: { issueDate: "desc" },
        include: { customer: { select: { name: true } }, project: { select: { code: true } } },
      });
      csv = toCsv(
        ["Invoice #", "Date", "Customer", "Project", "Status", "Currency", "Total", "Paid", "Outstanding"],
        rows.map((i) => [
          i.invoiceNumber, i.issueDate.toISOString().slice(0, 10), i.customer.name,
          i.project?.code ?? "", i.status, i.currency,
          (i.totalCents / 100).toFixed(2), (i.amountPaidCents / 100).toFixed(2),
          ((i.totalCents - i.amountPaidCents) / 100).toFixed(2),
        ])
      );
    } else if (type === "expenses") {
      const rows = await db.expense.findMany({
        where: {
          ...(Object.keys(dateRange).length ? { expenseDate: dateRange } : {}),
          ...(projectId ? { projectId } : {}),
          ...(status ? { category: status } : {}),
        },
        orderBy: { expenseDate: "desc" },
        include: { project: { select: { code: true, name: true } } },
      });
      csv = toCsv(
        ["Date", "Category", "Description", "Project", "Reference", "Currency", "Amount"],
        rows.map((e) => [
          e.expenseDate.toISOString().slice(0, 10), e.category, e.description,
          e.project?.code ?? "", e.reference ?? "", e.currency, (e.amountCents / 100).toFixed(2),
        ])
      );
    } else if (type === "inventory") {
      const rows = await db.product.findMany({ orderBy: { quantity: "asc" }, include: { } });
      csv = toCsv(
        ["SKU", "Name", "Category", "Brand", "Unit", "Quantity", "Reorder Level", "Unit Cost", "Unit Price"],
        rows.map((p) => [
          p.sku, p.name, p.category, p.brand ?? "", p.unit, p.quantity, p.reorderLevel,
          p.costCents != null ? (p.costCents / 100).toFixed(2) : "",
          p.priceCents != null ? (p.priceCents / 100).toFixed(2) : "",
        ])
      );
    } else if (type === "maintenance") {
      const rows = await db.maintenanceRecord.findMany({
        where: {
          ...(Object.keys(dateRange).length ? { scheduledDate: dateRange } : {}),
          ...(customerId ? { customerId } : {}),
          ...(status ? { status } : {}),
        },
        orderBy: { scheduledDate: "desc" },
        include: { customer: { select: { name: true } }, project: { select: { code: true } }, technician: { select: { name: true } } },
      });
      csv = toCsv(
        ["Code", "Scheduled", "Status", "Type", "Customer", "Project", "Technician", "Findings"],
        rows.map((m) => [
          m.code, m.scheduledDate.toISOString().slice(0, 10), m.status, m.type,
          m.customer.name, m.project?.code ?? "", m.technician?.name ?? "", m.findings ?? "",
        ])
      );
    } else {
      csv = toCsv(["Error"], [["Unknown report type"]]);
    }

    await writeAudit(req, session, "EXPORT", "Report", null, { type, from: sp.get("from"), to: sp.get("to") });
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  });
}
