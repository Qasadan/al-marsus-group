import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { handleRoute, ok, requireAuth } from "@/lib/api";

// Dashboard statistics computed from real records only.
export async function GET(_req: NextRequest) {
  return handleRoute(async () => {
    await requireAuth(["dashboard"]);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalCustomers,
      activeProjects,
      openLeads,
      newQuoteRequests,
      scheduledSurveys,
      pendingQuotations,
      lowStockCount,
      openServiceRequests,
      revenueAgg,
      expensesAgg,
      outstandingInvoices,
      recentProjects,
      projectStatusCounts,
    ] = await Promise.all([
      db.customer.count(),
      db.project.count({ where: { status: { in: ["PLANNING", "SCHEDULED", "IN_PROGRESS", "COMMISSIONING"] } } }),
      db.lead.count({ where: { status: { in: ["NEW", "CONTACTED", "QUALIFIED"] } } }),
      db.quoteRequest.count({ where: { status: "NEW" } }),
      db.siteSurvey.count({ where: { status: "SCHEDULED" } }),
      db.quotation.count({ where: { status: { in: ["DRAFT", "SENT"] } } }),
      db.product.count({ where: { isActive: true, quantity: { lte: db.product.fields.reorderLevel } } }),
      db.serviceRequest.count({ where: { status: { in: ["OPEN", "ASSIGNED", "IN_PROGRESS"] } } }),
      db.payment.aggregate({ _sum: { amountCents: true } }),
      db.expense.aggregate({ _sum: { amountCents: true } }),
      db.invoice.aggregate({
        _sum: { totalCents: true, amountPaidCents: true },
        where: { status: { in: ["SENT", "PARTIALLY_PAID", "OVERDUE"] } },
      }),
      db.project.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { customer: { select: { name: true } } },
      }),
      db.project.groupBy({ by: ["status"], _count: true }),
    ]);

    const paymentsThisMonth = await db.payment.aggregate({
      _sum: { amountCents: true },
      where: { paidAt: { gte: monthStart } },
    });

    return ok({
      customers: totalCustomers,
      activeProjects,
      openLeads,
      newQuoteRequests,
      scheduledSurveys,
      pendingQuotations,
      lowStockCount,
      openServiceRequests,
      totalRevenueCents: revenueAgg._sum.amountCents ?? 0,
      totalExpensesCents: expensesAgg._sum.amountCents ?? 0,
      revenueThisMonthCents: paymentsThisMonth._sum.amountCents ?? 0,
      outstandingCents: (outstandingInvoices._sum.totalCents ?? 0) - (outstandingInvoices._sum.amountPaidCents ?? 0),
      outstandingInvoicesCount: await db.invoice.count({ where: { status: { in: ["SENT", "PARTIALLY_PAID", "OVERDUE"] } } }),
      recentProjects,
      projectStatusCounts,
    });
  });
}
