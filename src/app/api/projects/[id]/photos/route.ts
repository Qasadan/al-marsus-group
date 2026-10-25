import { z } from "zod";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { handleRoute, ok, requireAuth, parseBody, ApiError } from "@/lib/api";
import { writeAudit } from "@/lib/audit";

// ---------- Project photos (site / installation / handover) ----------

const photoSchema = z.object({
  url: z.string().min(1).max(500),
  caption: z.string().max(300).nullable().optional(),
  kind: z.enum(["SITE", "INSTALLATION", "HANDOVER"]).default("SITE"),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    const session = await requireAuth(["projects", "tasks"]);
    const { id } = await params;
    const project = await db.project.findUnique({ where: { id } });
    if (!project) throw new ApiError("Project not found", 404);
    if (session.role === "TECHNICIAN") {
      const member = await db.projectMember.findFirst({ where: { projectId: id, userId: session.sub } });
      if (!member) throw new ApiError("You are not assigned to this project", 403);
    }
    const { data } = await parseBody(req, photoSchema);
    const photo = await db.projectPhoto.create({
      data: { ...data, projectId: id, uploadedById: session.sub },
    });
    await writeAudit(req, session, "CREATE", "ProjectPhoto", photo.id, { projectId: id });
    return ok(photo, { status: 201 });
  });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    const session = await requireAuth(["projects", "portal", "tasks"]);
    const { id } = await params;
    if (session.role === "TECHNICIAN") {
      const member = await db.projectMember.findFirst({ where: { projectId: id, userId: session.sub } });
      if (!member) throw new ApiError("You are not assigned to this project", 403);
    }
    const photos = await db.projectPhoto.findMany({ where: { projectId: id }, orderBy: { createdAt: "desc" } });
    return ok(photos);
  });
}
