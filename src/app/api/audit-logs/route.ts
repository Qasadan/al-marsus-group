import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { handleRoute, ok, requireAuth, buildPagination } from "@/lib/api";

export async function GET(req: NextRequest) {
  return handleRoute(async () => {
    await requireAuth(["audit"]); // SUPER_ADMIN + MANAGER only
    const sp = new URL(req.url).searchParams;
    const { page, pageSize, skip, take } = buildPagination(sp);
    const action = sp.get("action") ?? undefined;
    const entityType = sp.get("entityType") ?? undefined;
    const where = { ...(action ? { action } : {}), ...(entityType ? { entityType } : {}) };
    const [items, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
        include: { user: { select: { name: true, email: true } } },
      }),
      db.auditLog.count({ where }),
    ]);
    return ok({ items, total, page, pageSize });
  });
}
