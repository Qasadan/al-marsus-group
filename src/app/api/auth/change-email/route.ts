import { z } from "zod";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { handleRoute, ok, fail, ApiError, requireAuth, parseBody } from "@/lib/api";
import { verifyPassword, signSession, setSessionCookie, SessionPayload } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

const changeEmailSchema = z.object({
  currentPassword: z.string().min(1),
  newEmail: z.string().trim().toLowerCase().email("Enter a valid email address"),
});

// POST /api/auth/change-email — change the signed-in user's login email.
// The login IS the email, so this is a sensitive operation: it requires the
// current password and re-issues the session cookie (the JWT embeds the email).
export async function POST(req: NextRequest) {
  return handleRoute(async () => {
    const session = await requireAuth();
    const { data } = await parseBody(req, changeEmailSchema);
    const newEmail = data.newEmail.toLowerCase();

    const user = await db.user.findUnique({ where: { id: session.sub } });
    if (!user) throw new ApiError("User not found", 404);
    if (!user.isActive) return fail("Account is deactivated", 403);

    const valid = await verifyPassword(data.currentPassword, user.passwordHash);
    if (!valid) return fail("Current password is incorrect", 401);

    if (newEmail === user.email.toLowerCase()) {
      return fail("That is already your current email", 422);
    }

    const taken = await db.user.findUnique({ where: { email: newEmail } });
    if (taken && taken.id !== user.id) {
      return fail("Another account already uses that email", 409);
    }

    const updated = await db.user.update({
      where: { id: user.id },
      data: { email: newEmail },
    });

    // The JWT embeds the email — re-issue the session so the user stays signed in.
    const fresh: SessionPayload = {
      sub: updated.id,
      email: updated.email,
      name: updated.name,
      role: updated.role as SessionPayload["role"],
    };
    await setSessionCookie(await signSession(fresh));

    await writeAudit(req, fresh, "UPDATE", "User", updated.id, {
      action: "email_change",
      previousEmail: user.email,
    });
    return ok({ changed: true, email: updated.email });
  });
}
