import { z } from "zod";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { handleRoute, ok, requireAuth, parseBody, ApiError } from "@/lib/api";
import { writeAudit, notifyAdmins } from "@/lib/audit";
import { PRODUCT_CATEGORIES, toCents, oneOf } from "@/lib/constants";

const updateSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  category: z.string().refine(oneOf(PRODUCT_CATEGORIES, "Category")).optional(),
  brand: z.string().max(100).nullable().optional(),
  model: z.string().max(100).nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
  unit: z.string().max(20).optional(),
  cost: z.number().nonnegative().nullable().optional(),
  price: z.number().nonnegative().nullable().optional(),
  reorderLevel: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    const session = await requireAuth(["inventory"]);
    const { id } = await params;
    const { data } = await parseBody(req, updateSchema);
    const existing = await db.product.findUnique({ where: { id } });
    if (!existing) throw new ApiError("Product not found", 404);
    const { cost, price, ...rest } = data;
    const product = await db.product.update({
      where: { id },
      data: {
        ...rest,
        ...(cost != null ? { costCents: toCents(cost) } : {}),
        ...(price != null ? { priceCents: toCents(price) } : {}),
      },
    });
    await writeAudit(req, session, "UPDATE", "Product", id, { keys: Object.keys(data) });
    return ok(product);
  });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    const session = await requireAuth(["inventory"]);
    const { id } = await params;
    const usedInPOs = await db.purchaseOrderItem.count({ where: { productId: id } });
    if (usedInPOs > 0) {
      // Soft-deactivate to preserve movement history integrity
      await db.product.update({ where: { id }, data: { isActive: false } });
      await writeAudit(req, session, "DELETE", "Product", id, { softDelete: true });
      return ok({ deactivated: true });
    }
    await db.product.delete({ where: { id } });
    await writeAudit(req, session, "DELETE", "Product", id);
    return ok({ deleted: true });
  });
}
