import { z } from "zod";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { handleRoute, ok, requireAuth, parseBody, buildPagination } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { CUSTOMER_STATUSES, CUSTOMER_TYPES, oneOf } from "@/lib/constants";

export async function GET(req: NextRequest) {
  return handleRoute(async () => {
    await requireAuth(["customers"]);
    const sp = new URL(req.url).searchParams;
    const { page, pageSize, skip, take } = buildPagination(sp);
    const q = sp.get("q")?.trim();
    const status = sp.get("status") ?? undefined;
    const type = sp.get("type") ?? undefined;
    const where = {
      ...(q ? { OR: [{ name: { contains: q } }, { email: { contains: q } }, { phone: { contains: q } }] } : {}),
      ...(status ? { status } : {}),
      ...(type ? { type } : {}),
    };
    const [items, total] = await Promise.all([
      db.customer.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
        include: { _count: { select: { projects: true, invoices: true, quotations: true } } },
      }),
      db.customer.count({ where }),
    ]);
    return ok({ items, total, page, pageSize });
  });
}

const createSchema = z.object({
  name: z.string().min(2, "Customer name is required").max(200),
  email: z.string().email("Invalid email").nullable().optional(),
  phone: z.string().max(30).nullable().optional(),
  address: z.string().max(300).nullable().optional(),
  type: z.string().refine(oneOf(CUSTOMER_TYPES, "Type")).default("RESIDENTIAL"),
  status: z.string().refine(oneOf(CUSTOMER_STATUSES, "Status")).default("ACTIVE"),
  notes: z.string().max(2000).nullable().optional(),
});

export async function POST(req: NextRequest) {
  return handleRoute(async () => {
    const session = await requireAuth(["customers"]);
    const { data } = await parseBody(req, createSchema);
    if (data.email) {
      data.email = data.email.toLowerCase();
    }
    const customer = await db.customer.create({ data });
    await writeAudit(req, session, "CREATE", "Customer", customer.id, { name: customer.name });
    return ok(customer, { status: 201 });
  });
}
