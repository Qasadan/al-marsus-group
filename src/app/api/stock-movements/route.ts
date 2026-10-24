import { z } from "zod";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { handleRoute, ok, fail, requireAuth, parseBody, buildPagination, ApiError } from "@/lib/api";
import { writeAudit, notifyAdmins } from "@/lib/audit";
import { STOCK_MOVEMENT_TYPES } from "@/lib/constants";

// ---------- Stock movement history ----------
// GET /api/stock-movements?productId=xxx — full movement ledger

export async function GET(req: NextRequest) {
  return handleRoute(async () => {
    await requireAuth(["inventory"]);
    const sp = new URL(req.url).searchParams;
    const { page, pageSize, skip, take } = buildPagination(sp);
    const productId = sp.get("productId") ?? undefined;
    const where = productId ? { productId } : {};
    const [items, total] = await Promise.all([
      db.stockMovement.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
        include: {
          product: { select: { sku: true, name: true, unit: true } },
          user: { select: { name: true } },
        },
      }),
      db.stockMovement.count({ where }),
    ]);
    return ok({ items, total, page, pageSize });
  });
}

// Manual stock adjustment (IN/OUT/ADJUSTMENT). All changes go through here or
// PO receiving — product.quantity is updated transactionally with the ledger.
const createSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  type: z.enum(["IN", "OUT", "ADJUSTMENT", "RESERVE", "RELEASE"]),
  quantity: z.number().int().positive("Quantity must be a positive whole number").max(1_000_000),
  reason: z.string().min(3, "Reason is required").max(500),
});

export async function POST(req: NextRequest) {
  return handleRoute(async () => {
    const session = await requireAuth(["inventory"]);
    const { data } = await parseBody(req, createSchema);

    const result = await db.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: data.productId } });
      if (!product) throw new ApiError("Product not found", 404);

      let delta = 0;
      if (data.type === "IN" || data.type === "RELEASE") delta = data.quantity;
      else if (data.type === "OUT" || data.type === "RESERVE") delta = -data.quantity;
      else delta = data.quantity - product.quantity; // ADJUSTMENT: quantity = new absolute balance

      const newBalance = product.quantity + delta;
      if (newBalance < 0) {
        throw new ApiError(
          `Insufficient stock: ${product.name} has ${product.quantity} ${product.unit}, attempted new balance would be ${newBalance}`,
          409
        );
      }

      await tx.product.update({ where: { id: product.id }, data: { quantity: newBalance } });
      const movement = await tx.stockMovement.create({
        data: {
          productId: product.id,
          type: data.type,
          quantity: data.quantity,
          balanceAfter: newBalance,
          reason: data.reason,
          referenceType: "MANUAL",
          userId: session.sub,
        },
      });

      // Low-stock notification
      if (product.reorderLevel > 0 && newBalance <= product.reorderLevel && product.quantity > product.reorderLevel) {
        await tx.notification.create({
          data: {
            type: "LOW_STOCK",
            title: "Low stock alert",
            message: `${product.name} (${product.sku}) dropped to ${newBalance} ${product.unit}, at or below reorder level ${product.reorderLevel}.`,
            link: "/admin/inventory",
          },
        });
      }
      return { movement, product: { ...product, quantity: newBalance } };
    });

    await writeAudit(req, session, "CREATE", "StockMovement", result.movement.id, {
      productId: data.productId,
      type: data.type,
      quantity: data.quantity,
      balanceAfter: result.movement.balanceAfter,
    });
    return ok(result.movement, { status: 201 });
  });
}
