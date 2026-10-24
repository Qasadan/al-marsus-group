import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { handleRoute, ok, requireAuth, ApiError } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { formatMoney } from "@/lib/constants";
import { getSettings } from "@/lib/settings";

// Reports endpoint with date range / status / customer / project filters.
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

    const dateRange = {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    };
    const settings = await getSettings();

    if (type === "revenue") {
      const where = {
        ...(Object.keys(dateRange).length ? { paidAt: dateRange } : {}),
        ...(customerId ? { invoice: { customerId } } : {}),
      };
      const payments = await db.payment.findMany({
        where,
        orderBy: { paidAt: "desc" },
        include: { invoice: { include: { customer: { select: { name: true } }, project: { select: { code: true, name: true } } } } },
      });
      const totalCents = payments.reduce((s, p) => s + p.amountCents, 0);
      const byMethod = payments.reduce<Record<string, number>>((acc, p) => {
        acc[p.method] = (acc[p.method] ?? 0) + p.amountCents;
        return acc;
      }, {});
      return ok({ type, currency: settings.currency, totalCents, byMethod, rows: payments.slice(0, 500) });
    }

    if (type === "projects") {
      const rows = await db.project.findMany({
        where: {
          ...(Object.keys(dateRange).length ? { createdAt: dateRange } : {}),
          ...(customerId ? { customerId } : {}),
          ...(status ? { status } : {}),
        },
        orderBy: { createdAt: "desc" },
        include: {
          customer: { select: { name: true } },
          _count: { select: { tasks: true, photos: true } },
        },
      });
      return ok({ type, currency: settings.currency, rows });
    }

    if (type === "invoices") {
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
      const totalCents = rows.reduce((s, r) => s + r.totalCents, 0);
      const paidCents = rows.reduce((s, r) => s + r.amountPaidCents, 0);
      return ok({ type, currency: settings.currency, totalCents, paidCents, outstandingCents: totalCents - paidCents, rows });
    }

    if (type === "expenses") {
      const rows = await db.expense.findMany({
        where: {
          ...(Object.keys(dateRange).length ? { expenseDate: dateRange } : {}),
          ...(projectId ? { projectId } : {}),
          ...(status ? { category: status } : {}),
        },
        orderBy: { expenseDate: "desc" },
        include: { project: { select: { code: true, name: true } } },
      });
      const totalCents = rows.reduce((s, r) => s + r.amountCents, 0);
      return ok({ type, currency: settings.currency, totalCents, rows });
    }

    if (type === "inventory") {
      const rows = await db.product.findMany({
        where: { ...(status ? { category: status } : {}) },
        orderBy: { quantity: "asc" },
      });
      return ok({ type, currency: settings.currency, rows });
    }

    if (type === "maintenance") {
      const rows = await db.maintenanceRecord.findMany({
        where: {
          ...(Object.keys(dateRange).length ? { scheduledDate: dateRange } : {}),
          ...(customerId ? { customerId } : {}),
          ...(status ? { status } : {}),
        },
        orderBy: { scheduledDate: "desc" },
        include: {
          customer: { select: { name: true } },
          project: { select: { code: true, name: true } },
          technician: { select: { name: true } },
        },
      });
      return ok({ type, currency: settings.currency, rows });
    }

    throw new ApiError("Unknown report type. Use: revenue | projects | invoices | expenses | inventory | maintenance", 422);
  });
}
