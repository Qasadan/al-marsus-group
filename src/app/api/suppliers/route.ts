import { z } from "zod";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { handleRoute, ok, requireAuth, parseBody, buildPagination } from "@/lib/api";
import { writeAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  return handleRoute(async () => {
    await requireAuth(["suppliers", "purchase-orders"]);
    const sp = new URL(req.url).searchParams;
    const { page, pageSize, skip, take } = buildPagination(sp);
    const q = sp.get("q")?.trim();
    const where = q ? { OR: [{ name: { contains: q } }, { email: { contains: q } }, { phone: { contains: q } }] } : {};
    const [items, total] = await Promise.all([
      db.supplier.findMany({
        where,
        orderBy: { name: "asc" },
        skip,
        take,
        include: { _count: { select: { purchaseOrders: true } } },
      }),
      db.supplier.count({ where }),
    ]);
    return ok({ items, total, page, pageSize });
  });
}

const createSchema = z.object({
  name: z.string().min(2, "Supplier name is required").max(200),
  contactPerson: z.string().max(200).nullable().optional(),
  email: z.string().email("Invalid email").nullable().optional(),
  phone: z.string().max(30).nullable().optional(),
  address: z.string().max(300).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export async function POST(req: NextRequest) {
  return handleRoute(async () => {
    const session = await requireAuth(["suppliers"]);
    const { data } = await parseBody(req, createSchema);
    const supplier = await db.supplier.create({ data });
    await writeAudit(req, session, "CREATE", "Supplier", supplier.id, { name: supplier.name });
    return ok(supplier, { status: 201 });
  });
}

const updateSchema = createSchema.partial().extend({ isActive: z.boolean().optional() });

export async function PUT(req: NextRequest) {
  return handleRoute(async () => {
    const session = await requireAuth(["suppliers"]);
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return ok({ error: "id query parameter is required" }, { status: 400 });
    const { data } = await parseBody(req, updateSchema);
    const supplier = await db.supplier.update({ where: { id }, data });
    await writeAudit(req, session, "UPDATE", "Supplier", id, data);
    return ok(supplier);
  });
}

export async function DELETE(req: NextRequest) {
  return handleRoute(async () => {
    const session = await requireAuth(["suppliers"]);
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return ok({ error: "id query parameter is required" }, { status: 400 });
    const linked = await db.purchaseOrder.count({ where: { supplierId: id } });
    if (linked > 0) {
      await db.supplier.update({ where: { id }, data: { isActive: false } });
      await writeAudit(req, session, "DELETE", "Supplier", id, { softDelete: true });
      return ok({ deactivated: true });
    }
    await db.supplier.delete({ where: { id } });
    await writeAudit(req, session, "DELETE", "Supplier", id);
    return ok({ deleted: true });
  });
}
