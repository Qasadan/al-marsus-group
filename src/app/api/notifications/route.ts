import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { handleRoute, ok, fail, requireAuth, buildPagination } from "@/lib/api";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  return handleRoute(async () => {
    const session = await requireAuth(["dashboard", "notifications"]);
    const sp = new URL(req.url).searchParams;
    const { page, pageSize, skip, take } = buildPagination(sp);
    const unreadOnly = sp.get("unread") === "true";

    // Notifications are broadcast (userId null = admins/managers) or targeted
    const isStaff = ["SUPER_ADMIN", "MANAGER"].includes(session.role);
    const where = {
      OR: isStaff ? [{ userId: null }, { userId: session.sub }] : [{ userId: session.sub }],
      ...(unreadOnly ? { isRead: false } : {}),
    };
    const [items, total, unreadCount] = await Promise.all([
      db.notification.findMany({ where, orderBy: { createdAt: "desc" }, skip, take }),
      db.notification.count({ where }),
      db.notification.count({ where: { ...where, isRead: false } }),
    ]);
    return ok({ items, total, page, pageSize, unreadCount });
  });
}

export async function PUT(req: NextRequest) {
  return handleRoute(async () => {
    const session = await getSession();
    if (!session) return fail("Authentication required", 401);
    const id = new URL(req.url).searchParams.get("id");
    if (id === "all") {
      await db.notification.updateMany({
        where: { OR: [{ userId: session.sub }, ...(["SUPER_ADMIN", "MANAGER"].includes(session.role) ? [{ userId: null }] : [])] },
        data: { isRead: true, readAt: new Date() },
      });
      return ok({ markedAll: true });
    }
    if (!id) return fail("id query parameter is required (or 'all')", 400);
    await db.notification.update({ where: { id }, data: { isRead: true, readAt: new Date() } });
    return ok({ marked: true });
  });
}
