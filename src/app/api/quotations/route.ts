import { z } from "zod";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { handleRoute, ok, requireAuth, parseBody, buildPagination, ApiError } from "@/lib/api";
import { writeAudit, notifyAdmins } from "@/lib/audit";
import { QUOTATION_STATUSES, ITEM_KINDS, computeTotals, toCents, oneOf } from "@/lib/constants";
import { DIVISION_CODES } from "@/lib/divisions";
import { getSettings, generateDocNumber } from "@/lib/settings";

// Quotation line item schema — unit prices supplied in display units (e.g. 15000.00),
// converted to integer cents server-side. Totals are ALWAYS recalculated server-side.
const itemSchema = z.object({
  kind: z.string().refine(oneOf(ITEM_KINDS, "Item kind")).default("EQUIPMENT"),
  description: z.string().min(1, "Description is required").max(300),
  productId: z.string().nullable().optional(),
  quantity: z.number().positive("Quantity must be greater than 0").max(1_000_000),
  unitPrice: z.number().nonnegative("Unit price cannot be negative").max(1_000_000_000),
});

const createSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  surveyId: z.string().nullable().optional(),
  title: z.string().min(2, "Title is required").max(200),
  division: z.enum(DIVISION_CODES).nullable().optional(),
  discount: z.number().nonnegative().default(0),
  taxRate: z.number().min(0).max(100).default(0),
  expiryDate: z.coerce.date().nullable().optional(),
  notes: z.string().max(3000).nullable().optional(),
  terms: z.string().max(5000).nullable().optional(),
  items: z.array(itemSchema).min(1, "At least one line item is required"),
});

function recalc(items: z.infer<typeof itemSchema>[], discount: number, taxRate: number) {
  const lineItems = items.map((it) => ({
    ...it,
    unitPriceCents: toCents(it.unitPrice),
  }));
  const { subtotalCents, taxCents, totalCents } = computeTotals(
    lineItems.map((l) => ({ quantity: l.quantity, unitPriceCents: l.unitPriceCents })),
    toCents(discount),
    taxRate
  );
  return { lineItems, subtotalCents, discountCents: toCents(discount), taxCents, totalCents };
}

export async function GET(req: NextRequest) {
  return handleRoute(async () => {
    const session = await requireAuth(["quotations", "portal"]);
    const sp = new URL(req.url).searchParams;
    const { page, pageSize, skip, take } = buildPagination(sp);
    const status = sp.get("status") ?? undefined;
    const customerId = sp.get("customerId") ?? undefined;
    const q = sp.get("q")?.trim();
    const where = {
      // Technicians have no quotation access; customers only see their own via portal scoping
      ...(session.role === "CUSTOMER" ? { customer: { userId: session.sub } } : {}),
      ...(status ? { status } : {}),
      ...(customerId ? { customerId } : {}),
      ...(q ? { OR: [{ quoteNumber: { contains: q } }, { title: { contains: q } }] } : {}),
    };
    const [items, total] = await Promise.all([
      db.quotation.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
        include: {
          customer: { select: { id: true, name: true } },
          _count: { select: { items: true } },
        },
      }),
      db.quotation.count({ where }),
    ]);
    return ok({ items, total, page, pageSize });
  });
}

export async function POST(req: NextRequest) {
  return handleRoute(async () => {
    const session = await requireAuth(["quotations"]);
    const { data } = await parseBody(req, createSchema);
    const settings = await getSettings();
    const calc = recalc(data.items, data.discount, data.taxRate);
    const quoteNumber = await generateDocNumber(settings.quotationPrefix, "quotation");

    const quotation = await db.quotation.create({
      data: {
        quoteNumber,
        customerId: data.customerId,
        surveyId: data.surveyId ?? null,
        title: data.title,
        division: data.division ?? null,
        issueDate: new Date(),
        expiryDate: data.expiryDate ?? null,
        currency: settings.currency,
        subtotalCents: calc.subtotalCents,
        discountCents: calc.discountCents,
        taxRate: data.taxRate,
        taxCents: calc.taxCents,
        totalCents: calc.totalCents,
        notes: data.notes ?? null,
        terms: data.terms ?? settings.quotationTerms ?? null,
        createdById: session.sub,
        items: {
          create: calc.lineItems.map((it, i) => ({
            kind: it.kind,
            description: it.description,
            productId: it.productId ?? null,
            quantity: it.quantity,
            unitPriceCents: it.unitPriceCents,
            totalCents: Math.round(it.quantity * it.unitPriceCents),
            sortOrder: i,
          })),
        },
      },
      include: { items: true, customer: { select: { id: true, name: true } } },
    });
    await writeAudit(req, session, "CREATE", "Quotation", quotation.id, { quoteNumber });
    return ok(quotation, { status: 201 });
  });
}

// Status transitions: send / approve / reject — PUT /api/quotations?id=xxx
const statusSchema = z.object({
  action: z.enum(["send", "approve", "reject", "expire"]),
  rejectionReason: z.string().max(1000).optional(),
});

export async function PUT(req: NextRequest) {
  return handleRoute(async () => {
    const session = await requireAuth(["quotations"]);
    const id = new URL(req.url).searchParams.get("id");
    if (!id) throw new ApiError("id query parameter is required", 400);
    const { data: statusUpd } = await parseBody(req, statusSchema);
    const action = statusUpd.action as string;
    const rejectionReason = statusUpd.rejectionReason as string | undefined;
    const quotation = await db.quotation.findUnique({ where: { id } });
    if (!quotation) throw new ApiError("Quotation not found", 404);
    if (quotation.status === "CONVERTED") throw new ApiError("Quotation has already been converted to a project", 409);

    const now = new Date();
    let data: Record<string, unknown>;
    if (action === "send") {
      if (quotation.status !== "DRAFT") throw new ApiError("Only draft quotations can be sent", 409);
      data = { status: "SENT" };
    } else if (action === "approve") {
      if (!["SENT", "DRAFT"].includes(quotation.status)) throw new ApiError("Only sent quotations can be approved", 409);
      data = { status: "APPROVED", approvedAt: now };
    } else if (action === "reject") {
      if (!["SENT", "DRAFT"].includes(quotation.status)) throw new ApiError("Only sent quotations can be rejected", 409);
      data = { status: "REJECTED", rejectedAt: now, rejectionReason: rejectionReason ?? null };
    } else {
      data = { status: "EXPIRED" };
    }
    const updated = await db.quotation.update({ where: { id }, data });
    await writeAudit(req, session, action === "approve" ? "APPROVE" : "STATUS_CHANGE", "Quotation", id, { action });
    if (action === "approve") {
      await notifyAdmins("Quotation approved", `${quotation.quoteNumber} was approved by ${session.name}.`, "QUOTE_APPROVED", `/admin/quotations/${id}`);
    }
    return ok(updated);
  });
}
