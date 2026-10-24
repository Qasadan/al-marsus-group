import { z } from "zod";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { handleRoute, ok, fail, requireAuth, parseBody, ApiError } from "@/lib/api";
import { writeAudit, notifyAdmins } from "@/lib/audit";

// Receive stock against a purchase order — transactional:
// updates received quantities, product balances, and the movement ledger atomically.
const receiveSchema = z.object({
  lines: z
    .array(
      z.object({
        itemId: z.string().min(1),
        quantity: z.number().int().positive().max(1_000_000),
      })
    )
    .min(1, "At least one line must be received"),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    const session = await requireAuth(["purchase-orders", "inventory"]);
    const { id } = await params;
    const { data: receiveData } = await parseBody(req, receiveSchema);
    const { lines } = receiveData as { lines: { itemId: string; quantity: number }[] };

    const result = await db.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.findUnique({ where: { id }, include: { items: true } });
      if (!po) throw new ApiError("Purchase order not found", 404);
      if (!["DRAFT", "ORDERED", "PARTIALLY_RECEIVED"].includes(po.status)) {
        throw new ApiError(`Cannot receive stock for a ${po.status} purchase order`, 409);
      }

      const notifications: { title: string; message: string }[] = [];

      for (const line of lines) {
        const item = po.items.find((i) => i.id === line.itemId);
        if (!item) throw new ApiError(`Purchase order item ${line.itemId} not found`, 404);
        const remaining = item.quantity - item.receivedQuantity;
        if (line.quantity > remaining) {
          throw new ApiError(`Cannot receive ${line.quantity} of "${item.description}": only ${remaining} remain unfulfilled`, 409);
        }

        await tx.purchaseOrderItem.update({
          where: { id: item.id },
          data: { receivedQuantity: { increment: line.quantity } },
        });

        if (item.productId) {
          const product = await tx.product.findUnique({ where: { id: item.productId } });
          if (!product) throw new ApiError(`Linked product not found for "${item.description}"`, 404);
          const newBalance = product.quantity + line.quantity;
          await tx.product.update({ where: { id: product.id }, data: { quantity: newBalance } });
          await tx.stockMovement.create({
            data: {
              productId: product.id,
              type: "IN",
              quantity: line.quantity,
              balanceAfter: newBalance,
              reason: `Received against ${po.poNumber}`,
              referenceType: "PURCHASE_ORDER",
              referenceId: po.id,
              userId: session.sub,
            },
          });
          if (product.reorderLevel > 0 && product.quantity <= product.reorderLevel && newBalance > product.reorderLevel) {
            // restocked above reorder level — no notification needed
          }
        }
      }

      // Recompute PO status
      const updatedItems = await tx.purchaseOrderItem.findMany({ where: { purchaseOrderId: id } });
      const fullyReceived = updatedItems.every((i) => i.receivedQuantity >= i.quantity);
      const anyReceived = updatedItems.some((i) => i.receivedQuantity > 0);
      const newStatus = fullyReceived ? "RECEIVED" : anyReceived ? "PARTIALLY_RECEIVED" : po.status;
      const updated = await tx.purchaseOrder.update({
        where: { id },
        data: { status: newStatus, receivedAt: fullyReceived ? new Date() : po.receivedAt },
        include: { items: true, supplier: { select: { id: true, name: true } } },
      });
      return { po: updated, notifications };
    });

    await writeAudit(req, session, "RECEIVE", "PurchaseOrder", id, { lines });
    await notifyAdmins("Stock received", `${result.po.poNumber} (${result.po.supplier.name}) items were received into stock.`, "SYSTEM", "/admin/inventory");
    return ok(result.po);
  });
}
