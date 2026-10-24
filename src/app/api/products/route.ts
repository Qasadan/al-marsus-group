import { z } from "zod";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { handleRoute, ok, requireAuth, parseBody, buildPagination, ApiError } from "@/lib/api";
import { writeAudit, notifyAdmins } from "@/lib/audit";
import { PRODUCT_CATEGORIES, toCents, oneOf } from "@/lib/constants";

export async function GET(req: NextRequest) {
  return handleRoute(async () => {
    await requireAuth(["inventory", "quotations"]);
    const sp = new URL(req.url).searchParams;
    const { page, pageSize, skip, take } = buildPagination(sp);
    const q = sp.get("q")?.trim();
    const category = sp.get("category") ?? undefined;
    const lowStock = sp.get("lowStock") === "true";
    const where = {
      ...(q ? { OR: [{ name: { contains: q } }, { sku: { contains: q } }, { brand: { contains: q } }] } : {}),
      ...(category ? { category } : {}),
      ...(lowStock ? { quantity: { lte: db.product.fields.reorderLevel } } : {}),
    };
    const [items, total] = await Promise.all([
      db.product.findMany({ where, orderBy: { name: "asc" }, skip, take }),
      db.product.count({ where }),
    ]);
    return ok({ items, total, page, pageSize });
  });
}

const createSchema = z.object({
  sku: z.string().min(2, "SKU is required").max(50),
  name: z.string().min(2, "Product name is required").max(200),
  category: z.string().refine(oneOf(PRODUCT_CATEGORIES, "Category")).default("ACCESSORY"),
  brand: z.string().max(100).nullable().optional(),
  model: z.string().max(100).nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
  unit: z.string().max(20).default("pcs"),
  cost: z.number().nonnegative().nullable().optional(),
  price: z.number().nonnegative().nullable().optional(),
  reorderLevel: z.number().int().min(0).default(0),
  openingQuantity: z.number().int().min(0).default(0),
});

export async function POST(req: NextRequest) {
  return handleRoute(async () => {
    const session = await requireAuth(["inventory"]);
    const { data } = await parseBody(req, createSchema);
    const { openingQuantity, cost, price, ...rest } = data;

    const product = await db.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          ...rest,
          ...(cost != null ? { costCents: toCents(cost) } : {}),
          ...(price != null ? { priceCents: toCents(price) } : {}),
        },
      });
      if (openingQuantity > 0) {
        await tx.product.update({ where: { id: created.id }, data: { quantity: openingQuantity } });
        await tx.stockMovement.create({
          data: {
            productId: created.id,
            type: "IN",
            quantity: openingQuantity,
            balanceAfter: openingQuantity,
            reason: "Opening stock",
            referenceType: "MANUAL",
            userId: session.sub,
          },
        });
      }
      return created;
    });

    await writeAudit(req, session, "CREATE", "Product", product.id, { sku: product.sku });
    return ok(product, { status: 201 });
  });
}
