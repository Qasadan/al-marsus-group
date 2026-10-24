import { z } from "zod";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { handleRoute, ok, requireAuth, parseBody, buildPagination, ApiError } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { INVOICE_STATUSES, computeTotals, toCents, oneOf } from "@/lib/constants";
import { getSettings, generateDocNumber } from "@/lib/settings";

export async function GET(req: NextRequest) {
  return handleRoute(async () => {
    const session = await requireAuth(["invoices", "portal"]);
    const sp = new URL(req.url).searchParams;
    const { page, pageSize, skip, take } = buildPagination(sp);
    const status = sp.get("status") ?? undefined;
    const customerId = sp.get("customerId") ?? undefined;
    const projectId = sp.get("projectId") ?? undefined;
    const q = sp.get("q")?.trim();
    const where = {
      ...(session.role === "CUSTOMER" ? { customer: { userId: session.sub } } : {}),
      ...(status ? { status } : {}),
      ...(customerId ? { customerId } : {}),
      ...(projectId ? { projectId } : {}),
      ...(q ? { invoiceNumber: { contains: q } } : {}),
    };
    const [items, total] = await Promise.all([
      db.invoice.findMany({
        where,
        orderBy: { issueDate: "desc" },
        skip,
        take,
        include: {
          customer: { select: { id: true, name: true } },
          project: { select: { id: true, code: true, name: true } },
        },
      }),
      db.invoice.count({ where }),
    ]);
    return ok({ items, total, page, pageSize });
  });
}

const itemSchema = z.object({
  description: z.string().min(1, "Description is required").max(300),
  quantity: z.number().positive().max(1_000_000),
  unitPrice: z.number().nonnegative().max(1_000_000_000),
});

const createSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  projectId: z.string().nullable().optional(),
  quotationId: z.string().nullable().optional(),
  dueDate: z.coerce.date().nullable().optional(),
  taxRate: z.number().min(0).max(100).default(0),
  discount: z.number().nonnegative().default(0),
  notes: z.string().max(3000).nullable().optional(),
  items: z.array(itemSchema).min(1, "At least one line item is required"),
});

export async function POST(req: NextRequest) {
  return handleRoute(async () => {
    const session = await requireAuth(["invoices"]);
    const { data } = await parseBody(req, createSchema);
    const settings = await getSettings();

    const lineItems = data.items.map((it) => ({ ...it, unitPriceCents: toCents(it.unitPrice) }));
    const { subtotalCents, taxCents, totalCents } = computeTotals(
      lineItems.map((l) => ({ quantity: l.quantity, unitPriceCents: l.unitPriceCents })),
      toCents(data.discount),
      data.taxRate
    );
    const invoiceNumber = await generateDocNumber(settings.invoicePrefix, "invoice");

    const invoice = await db.invoice.create({
      data: {
        invoiceNumber,
        customerId: data.customerId,
        projectId: data.projectId ?? null,
        quotationId: data.quotationId ?? null,
        issueDate: new Date(),
        dueDate: data.dueDate ?? null,
        currency: settings.currency,
        subtotalCents,
        discountCents: toCents(data.discount),
        taxRate: data.taxRate,
        taxCents,
        totalCents,
        notes: data.notes ?? null,
        terms: settings.invoiceTerms ?? null,
        createdById: session.sub,
        items: {
          create: lineItems.map((it, i) => ({
            description: it.description,
            quantity: it.quantity,
            unitPriceCents: it.unitPriceCents,
            totalCents: Math.round(it.quantity * it.unitPriceCents),
            sortOrder: i,
          })),
        },
      },
      include: { items: true, customer: { select: { id: true, name: true } } },
    });
    await writeAudit(req, session, "CREATE", "Invoice", invoice.id, { invoiceNumber });
    return ok(invoice, { status: 201 });
  });
}

const statusSchema = z.object({ status: z.string().refine(oneOf(INVOICE_STATUSES, "Status")) });

export async function PUT(req: NextRequest) {
  return handleRoute(async () => {
    const session = await requireAuth(["invoices"]);
    const id = new URL(req.url).searchParams.get("id");
    if (!id) throw new ApiError("id query parameter is required", 400);
    const { data: statusUpd } = await parseBody(req, statusSchema);
    const status = statusUpd.status as string;
    const invoice = await db.invoice.findUnique({ where: { id } });
    if (!invoice) throw new ApiError("Invoice not found", 404);
    if (invoice.status === "PAID" && status !== "PAID") {
      throw new ApiError("Paid invoices cannot be reopened", 409);
    }
    if (status === "PAID" && invoice.amountPaidCents < invoice.totalCents) {
      throw new ApiError("Cannot mark as PAID: outstanding balance remains. Record a payment instead.", 409);
    }
    const updated = await db.invoice.update({ where: { id }, data: { status } });
    await writeAudit(req, session, "STATUS_CHANGE", "Invoice", id, { status });
    return ok(updated);
  });
}
