import { z } from "zod";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { handleRoute, ok, requireAuth, parseBody, ApiError } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { MEMBER_ROLES, oneOf } from "@/lib/constants";

// ---------- Project members (technician assignments) ----------

const memberSchema = z.object({
  userId: z.string().min(1, "Staff member is required"),
  role: z.string().refine(oneOf(MEMBER_ROLES, "Member role")).default("TECHNICIAN"),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    const session = await requireAuth(["projects"]);
    const { id } = await params;
    const project = await db.project.findUnique({ where: { id } });
    if (!project) throw new ApiError("Project not found", 404);
    const { data } = await parseBody(req, memberSchema);
    const user = await db.user.findUnique({ where: { id: data.userId } });
    if (!user || !user.isActive) throw new ApiError("Staff member not found or inactive", 404);
    if (!["TECHNICIAN", "MANAGER", "SUPER_ADMIN"].includes(user.role)) {
      throw new ApiError("Only staff accounts can be assigned to projects", 422);
    }
    const member = await db.projectMember.upsert({
      where: { projectId_userId: { projectId: id, userId: data.userId } },
      create: { projectId: id, userId: data.userId, role: data.role },
      update: { role: data.role },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    await writeAudit(req, session, "CREATE", "ProjectMember", member.id, { projectId: id, userId: data.userId });
    return ok(member, { status: 201 });
  });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    const session = await requireAuth(["projects"]);
    const { id } = await params;
    const userId = new URL(req.url).searchParams.get("userId");
    if (!userId) throw new ApiError("userId query parameter is required", 400);
    await db.projectMember.deleteMany({ where: { projectId: id, userId } });
    await writeAudit(req, session, "DELETE", "ProjectMember", `${id}:${userId}`);
    return ok({ removed: true });
  });
}
