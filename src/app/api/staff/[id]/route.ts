import { z } from "zod";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { handleRoute, ok, fail, requireAuth, parseBody, ApiError } from "@/lib/api";
import { hashPassword } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { ROLES, oneOf } from "@/lib/constants";

const updateSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  email: z.string().email("Invalid email").optional(),
  phone: z.string().max(30).nullable().optional(),
  role: z.string().refine(oneOf(ROLES, "Role")).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
});

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    const session = await requireAuth("staff"); // SUPER_ADMIN only
    const { id } = await params;
    const { data } = await parseBody(req, updateSchema);
    const existing = await db.user.findUnique({ where: { id } });
    if (!existing) throw new ApiError("Staff member not found", 404);

    // Safety: prevent deactivating or demoting the last active super admin
    if ((data.isActive === false || (data.role && data.role !== "SUPER_ADMIN")) && existing.role === "SUPER_ADMIN") {
      const superAdmins = await db.user.count({ where: { role: "SUPER_ADMIN", isActive: true, NOT: { id } } });
      if (superAdmins === 0) {
        return fail("Cannot demote or deactivate the last active super admin", 409);
      }
    }

    const { password, ...rest } = data;
    const user = await db.user.update({
      where: { id },
      data: {
        ...rest,
        ...(emailLateFix(rest.email)),
        ...(password ? { passwordHash: await hashPassword(password) } : {}),
      },
      select: { id: true, email: true, name: true, role: true, isActive: true },
    });
    await writeAudit(req, session, "UPDATE", "User", id, { keys: Object.keys(data) });
    return ok(user);
  });
}

function emailLateFix(email?: string) {
  return email ? { email: email.toLowerCase() } : {};
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    const session = await requireAuth("staff");
    const { id } = await params;
    if (session.sub === id) return fail("You cannot delete your own account", 409);
    const existing = await db.user.findUnique({ where: { id } });
    if (!existing) throw new ApiError("Staff member not found", 404);
    if (existing.role === "SUPER_ADMIN") {
      const otherAdmins = await db.user.count({ where: { role: "SUPER_ADMIN", isActive: true, NOT: { id } } });
      if (otherAdmins === 0) return fail("Cannot delete the last active super admin", 409);
    }
    // Soft-delete: deactivate instead of destroying history
    await db.user.update({ where: { id }, data: { isActive: false } });
    await writeAudit(req, session, "DELETE", "User", id, { softDelete: true });
    return ok({ deactivated: true });
  });
}
