import { z } from "zod";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { handleRoute, ok, requireAuth, parseBody, ApiError } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { ITEM_KINDS, computeTotals, toCents, oneOf } from "@/lib/constants";
import { getSettings } from "@/lib/settings";

// Edit quotation (draft only) with full item replacement
const itemSchema = z.object({
  kind: z.string().refine(oneOf(ITEM_KINDS, "Item kind")).default("EQUIPMENT"),
  description: z.string().min(1).max(300),
  productId: z.string().nullable().optional(),
  quantity: z.number().positive().max(1_000_000),
  unitPrice: z.number().nonnegative().max(1_000_000_000),
});
const updateSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  surveyId: z.string().nullable().optional(),
  discount: z.number().nonnegative().optional(),
  taxRate: z.number().min(0).max(100).optional(),
  expiryDate: z.coerce.date().nullable().optional(),
  notes: z.string().max(3000).nullable().optional(),
  terms: z.string().max(5000).nullable().optional(),
  items: z.array(itemSchema).min(1).optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    await requireAuth(["quotations"]);
    const { id } = await params;
    const quotation = await db.quotation.findUnique({
      where: { id },
      include: {
        items: { orderBy: { sortOrder: "asc" } },
        customer: true,
        survey: { select: { id: true, scheduledAt: true, roofType: true, avgMonthlyKwh: true, energyNotes: true } },
        createdBy: { select: { name: true } },
        project: { select: { id: true, code: true, name: true } },
      },
    });
    if (!quotation) throw new ApiError("Quotation not found", 404);
    return ok(quotation);
  });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    const session = await requireAuth(["quotations"]);
    const { id } = await params;
    const { data } = await parseBody(req, updateSchema);
    const quotation = await db.quotation.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!quotation) throw new ApiError("Quotation not found", 404);
    if (!["DRAFT", "SENT"].includes(quotation.status)) {
      throw new ApiError("Only draft or sent quotations can be edited", 409);
    }

    const settings = await getSettings();
    const items = data.items ?? quotation.items.map((it) => ({
      kind: it.kind,
      description: it.description,
      productId: it.productId,
      quantity: it.quantity,
      unitPrice: it.unitPriceCents / 100,
    }));
    const discount = data.discount ?? quotation.discountCents / 100;
    const taxRate = data.taxRate ?? quotation.taxRate;
    const lineItems = items.map((it) => ({ ...it, unitPriceCents: toCents(it.unitPrice) }));
    const { subtotalCents, taxCents, totalCents } = computeTotals(
      lineItems.map((l) => ({ quantity: l.quantity, unitPriceCents: l.unitPriceCents })),
      toCents(discount),
      taxRate
    );

    const updated = await db.$transaction(async (tx) => {
      if (data.items) {
        await tx.quotationItem.deleteMany({ where: { quotationId: id } });
        await tx.quotationItem.createMany({
          data: lineItems.map((it, i) => ({
            quotationId: id,
            kind: it.kind,
            description: it.description,
            productId: it.productId ?? null,
            quantity: it.quantity,
            unitPriceCents: it.unitPriceCents,
            totalCents: Math.round(it.quantity * it.unitPriceCents),
            sortOrder: i,
          })),
        });
      }
      return tx.quotation.update({
        where: { id },
        data: {
          ...(data.title ? { title: data.title } : {}),
          ...(data.surveyId !== undefined ? { surveyId: data.surveyId } : {}),
          ...(data.expiryDate !== undefined ? { expiryDate: data.expiryDate } : {}),
          ...(data.notes !== undefined ? { notes: data.notes } : {}),
          ...(data.terms !== undefined ? { terms: data.terms } : {}),
          discountCents: toCents(discount),
          taxRate,
          subtotalCents,
          taxCents,
          totalCents,
        },
        include: { items: { orderBy: { sortOrder: "asc" } } },
      });
    });

    await writeAudit(req, session, "UPDATE", "Quotation", id, { recalculated: true });
    return ok(updated);
  });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    const session = await requireAuth(["quotations"]);
    const { id } = await params;
    const quotation = await db.quotation.findUnique({ where: { id } });
    if (!quotation) throw new ApiError("Quotation not found", 404);
    if (quotation.status === "CONVERTED") throw new ApiError("Converted quotations cannot be deleted", 409);
    await db.quotation.delete({ where: { id } });
    await writeAudit(req, session, "DELETE", "Quotation", id, { quoteNumber: quotation.quoteNumber });
    return ok({ deleted: true });
  });
}
