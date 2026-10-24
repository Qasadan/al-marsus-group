import { z } from "zod";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { handleRoute, ok, fail, rateLimit, getClientIp, ApiError } from "@/lib/api";
import { verifyPassword, signSession, setSessionCookie } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

const loginSchema = z.object({
  email: z.string().email("A valid email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function POST(req: NextRequest) {
  return handleRoute(async () => {
    const ip = getClientIp(req);
    if (!rateLimit(`login:${ip}`, 10, 60_000)) {
      throw new ApiError("Too many login attempts. Please try again in a minute.", 429);
    }
    const { email, password } = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) return fail("Please provide a valid email and password", 422);

    const user = await db.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
    if (!user || !user.isActive) {
      return fail("Invalid email or password", 401); // do not reveal which part failed
    }
    const valid = await verifyPassword(parsed.data.password, user.passwordHash);
    if (!valid) return fail("Invalid email or password", 401);

    const token = await signSession({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role as "SUPER_ADMIN" | "MANAGER" | "TECHNICIAN" | "CUSTOMER",
    });
    await setSessionCookie(token);
    await writeAudit(req, { sub: user.id, email: user.email, name: user.name, role: user.role as never }, "LOGIN", "User", user.id);

    return ok({ id: user.id, email: user.email, name: user.name, role: user.role });
  });
}
