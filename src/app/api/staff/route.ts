import { z } from "zod";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { handleRoute, ok, requireAuth, parseBody, buildPagination } from "@/lib/api";
import { hashPassword } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { ROLES, oneOf } from "@/lib/constants";

export async function GET(req: NextRequest) {
  return handleRoute(async () => {
    await requireAuth(["staff"]);
    const sp = new URL(req.url).searchParams;
    const { page, pageSize, skip, take } = buildPagination(sp);
    const q = sp.get("q")?.trim();
    const role = sp.get("role") ?? undefined;
    const where = {
      ...(q ? { OR: [{ name: { contains: q } }, { email: { contains: q } }] } : {}),
      ...(role ? { role } : {}),
    };
    const [items, total] = await Promise.all([
      db.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
        select: { id: true, email: true, name: true, phone: true, role: true, isActive: true, createdAt: true, updatedAt: true },
      }),
      db.user.count({ where }),
    ]);
    return ok({ items, total, page, pageSize });
  });
}

const createSchema = z.object({
  name: z.string().min(2, "Name is required").max(200),
  email: z.string().email("Invalid email"),
  phone: z.string().max(30).nullable().optional(),
  role: z.string().refine(oneOf(ROLES, "Role")),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(req: NextRequest) {
  return handleRoute(async () => {
    const session = await requireAuth("staff"); // SUPER_ADMIN only
    const { data } = await parseBody(req, createSchema);
    const user = await db.user.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase(),
        phone: data.phone ?? null,
        role: data.role,
        passwordHash: await hashPassword(data.password),
      },
      select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
    });
    await writeAudit(req, session, "CREATE", "User", user.id, { email: user.email, role: user.role });
    return ok(user, { status: 201 });
  });
}
