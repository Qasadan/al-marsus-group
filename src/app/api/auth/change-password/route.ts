import { z } from "zod";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { handleRoute, ok, fail, ApiError, requireAuth, parseBody } from "@/lib/api";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

const changeSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

export async function POST(req: NextRequest) {
  return handleRoute(async () => {
    const session = await requireAuth();
    const { data: pwdUpd } = await parseBody(req, changeSchema);
    const currentPassword = pwdUpd.currentPassword as string;
    const newPassword = pwdUpd.newPassword as string;
    const user = await db.user.findUnique({ where: { id: session.sub } });
    if (!user) throw new ApiError("User not found", 404);
    const valid = await verifyPassword(currentPassword, user.passwordHash);
    if (!valid) return fail("Current password is incorrect", 401);
    await db.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(newPassword) },
    });
    await writeAudit(req, session, "UPDATE", "User", user.id, { action: "password_change" });
    return ok({ changed: true });
  });
}
