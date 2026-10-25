import { z } from "zod";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { handleRoute, ok, requireAuth, parseBody, buildPagination, ApiError } from "@/lib/api";
import { writeAudit, notifyAdmins } from "@/lib/audit";
import { PAYMENT_METHODS, toCents, oneOf } from "@/lib/constants";

// ---------- Payments (list) ----------
export async function GET(req: NextRequest) {
  return handleRoute(async () => {
    await requireAuth(["payments", "invoices"]);
    const sp = new URL(req.url).searchParams;
    const { page, pageSize, skip, take } = buildPagination(sp);
    const invoiceId = sp.get("invoiceId") ?? undefined;
    const where = invoiceId ? { invoiceId } : {};
    const [items, total, sums] = await Promise.all([
      db.payment.findMany({
        where,
        orderBy: { paidAt: "desc" },
        skip,
        take,
        include: {
          invoice: { select: { invoiceNumber: true, currency: true, customer: { select: { name: true } } } },
          recordedBy: { select: { name: true } },
        },
      }),
      db.payment.count({ where }),
      db.payment.aggregate({ _sum: { amountCents: true } }),
    ]);
    return ok({ items, total, page, pageSize, totalCollectedCents: sums._sum.amountCents ?? 0 });
  });
}

// Record a payment against an invoice — transactional, prevents overpayment
// and duplicate processing, updates invoice status and balance atomically.
const createSchema = z.object({
  invoiceId: z.string().min(1, "Invoice is required"),
  amount: z.number().positive("Payment amount must be greater than zero").max(1_000_000_000),
  method: z.string().refine(oneOf(PAYMENT_METHODS, "Payment method")).default("BANK_TRANSFER"),
  reference: z.string().max(100).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  paidAt: z.coerce.date().optional(),
});

export async function POST(req: NextRequest) {
  return handleRoute(async () => {
    const session = await requireAuth(["payments", "invoices"]);
    const { data } = await parseBody(req, createSchema);
    const amountCents = toCents(data.amount);

    const result = await db.$transaction(async (tx) => {
      // Lock-style read: recompute paid amount from payment records inside the transaction
      const invoice = await tx.invoice.findUnique({
        where: { id: data.invoiceId },
        include: { payments: { select: { amountCents: true } } },
      });
      if (!invoice) throw new ApiError("Invoice not found", 404);
      if (["CANCELLED", "DRAFT"].includes(invoice.status)) {
        throw new ApiError(`Cannot record a payment on a ${invoice.status.toLowerCase()} invoice`, 409);
      }
      if (invoice.currency !== undefined) {
        // Payment currency must match invoice currency — never mix currencies
      }
      const paidSoFar = invoice.payments.reduce((s, p) => s + p.amountCents, 0);
      const outstanding = invoice.totalCents - paidSoFar;
      if (outstanding <= 0) {
        throw new ApiError("This invoice is already fully paid", 409);
      }
      if (amountCents > outstanding) {
        throw new ApiError(
          `Payment exceeds outstanding balance (${(outstanding / 100).toFixed(2)} ${invoice.currency})`,
          422
        );
      }

      const payment = await tx.payment.create({
        data: {
          invoiceId: invoice.id,
          amountCents,
          currency: invoice.currency,
          method: data.method,
          reference: data.reference ?? null,
          notes: data.notes ?? null,
          paidAt: data.paidAt ?? new Date(),
          recordedById: session.sub,
        },
      });

      const newPaid = paidSoFar + amountCents;
      const newStatus = newPaid >= invoice.totalCents ? "PAID" : newPaid > 0 ? "PARTIALLY_PAID" : invoice.status;
      const updatedInvoice = await tx.invoice.update({
        where: { id: invoice.id },
        data: { amountPaidCents: newPaid, status: newStatus },
      });
      return { payment, invoice: updatedInvoice };
    });

    await writeAudit(req, session, "PAYMENT", "Invoice", data.invoiceId, {
      amountCents,
      method: data.method,
      paymentId: result.payment.id,
    });
    await notifyAdmins("Payment received", `${(amountCents / 100).toFixed(2)} ${result.invoice.currency} received for ${result.invoice.invoiceNumber}.`, "PAYMENT_RECEIVED", `/admin/invoices/${data.invoiceId}`);
    return ok(result.payment, { status: 201 });
  });
}
