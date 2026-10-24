import { z } from "zod";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { handleRoute, ok, requireAuth, parseBody, buildPagination, ApiError } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { PO_STATUSES, toCents, oneOf } from "@/lib/constants";
import { getSettings, generateDocNumber } from "@/lib/settings";

export async function GET(req: NextRequest) {
  return handleRoute(async () => {
    await requireAuth(["purchase-orders"]);
    const sp = new URL(req.url).searchParams;
    const { page, pageSize, skip, take } = buildPagination(sp);
    const status = sp.get("status") ?? undefined;
    const supplierId = sp.get("supplierId") ?? undefined;
    const where = { ...(status ? { status } : {}), ...(supplierId ? { supplierId } : {}) };
    const [items, total] = await Promise.all([
      db.purchaseOrder.findMany({
        where,
        orderBy: { orderDate: "desc" },
        skip,
        take,
        include: {
          supplier: { select: { id: true, name: true } },
          _count: { select: { items: true } },
        },
      }),
      db.purchaseOrder.count({ where }),
    ]);
    return ok({ items, total, page, pageSize });
  });
}

const itemSchema = z.object({
  productId: z.string().nullable().optional(),
  description: z.string().min(1, "Description is required").max(300),
  quantity: z.number().int().positive().max(1_000_000),
  unitCost: z.number().nonnegative().max(1_000_000_000),
});

const createSchema = z.object({
  supplierId: z.string().min(1, "Supplier is required"),
  expectedDate: z.coerce.date().nullable().optional(),
  taxRate: z.number().min(0).max(100).default(0),
  notes: z.string().max(2000).nullable().optional(),
  items: z.array(itemSchema).min(1, "At least one line item is required"),
});

export async function POST(req: NextRequest) {
  return handleRoute(async () => {
    const session = await requireAuth(["purchase-orders"]);
    const { data } = await parseBody(req, createSchema);
    const settings = await getSettings();

    const lines = data.items.map((it) => {
      const unitCostCents = toCents(it.unitCost);
      return { ...it, unitCostCents, totalCents: it.quantity * unitCostCents };
    });
    const subtotalCents = lines.reduce((s, l) => s + l.totalCents, 0);
    const taxCents = Math.round((subtotalCents * data.taxRate) / 100);
    const poNumber = await generateDocNumber(settings.purchaseOrderPrefix, "purchaseOrder");

    const po = await db.purchaseOrder.create({
      data: {
        poNumber,
        supplierId: data.supplierId,
        orderDate: new Date(),
        expectedDate: data.expectedDate ?? null,
        currency: settings.currency,
        subtotalCents,
        taxCents,
        totalCents: subtotalCents + taxCents,
        notes: data.notes ?? null,
        createdById: session.sub,
        items: {
          create: lines.map((l) => ({
            productId: l.productId ?? null,
            description: l.description,
            quantity: l.quantity,
            unitCostCents: l.unitCostCents,
            totalCents: l.totalCents,
          })),
        },
      },
      include: { items: true, supplier: { select: { id: true, name: true } } },
    });
    await writeAudit(req, session, "CREATE", "PurchaseOrder", po.id, { poNumber });
    return ok(po, { status: 201 });
  });
}

const statusSchema = z.object({ status: z.string().refine(oneOf(PO_STATUSES, "Status")) });

export async function PUT(req: NextRequest) {
  return handleRoute(async () => {
    const session = await requireAuth(["purchase-orders"]);
    const id = new URL(req.url).searchParams.get("id");
    if (!id) throw new ApiError("id query parameter is required", 400);
    const { data: statusUpd } = await parseBody(req, statusSchema);
    const status = statusUpd.status as string;
    const po = await db.purchaseOrder.findUnique({ where: { id } });
    if (!po) throw new ApiError("Purchase order not found", 404);
    if (po.status === "RECEIVED" && status !== "RECEIVED") {
      throw new ApiError("Received purchase orders cannot be reopened", 409);
    }
    const updated = await db.purchaseOrder.update({ where: { id }, data: { status } });
    await writeAudit(req, session, "STATUS_CHANGE", "PurchaseOrder", id, { status });
    return ok(updated);
  });
}
