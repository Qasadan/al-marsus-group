import { z } from "zod";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { handleRoute, ok, fail, requireAuth, parseBody, ApiError } from "@/lib/api";
import { writeAudit, notifyAdmins } from "@/lib/audit";

// ---------- Installation handover ----------

const handoverSchema = z.object({
  notes: z.string().max(5000).nullable().optional(),
  // Commissioning test checklist results (booleans)
  tests: z
    .object({
      panelsMounted: z.boolean().default(false),
      wiringInspected: z.boolean().default(false),
      inverterOperational: z.boolean().default(false),
      batteryTested: z.boolean().default(false),
      earthingVerified: z.boolean().default(false),
      systemOutputVerified: z.boolean().default(false),
    })
    .default({
      panelsMounted: false,
      wiringInspected: false,
      inverterOperational: false,
      batteryTested: false,
      earthingVerified: false,
      systemOutputVerified: false,
    }),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    const session = await requireAuth(["projects"]);
    const { id } = await params;
    const { data } = await parseBody(req, handoverSchema);
    const project = await db.project.findUnique({ where: { id } });
    if (!project) throw new ApiError("Project not found", 404);

    const allTestsPass = Object.values(data.tests).every(Boolean);
    if (!allTestsPass) {
      return fail("All commissioning tests must pass before handover can be recorded", 422);
    }
    if (project.handoverStatus === "HANDED_OVER") {
      return fail("Project has already been handed over", 409);
    }

    const updated = await db.project.update({
      where: { id },
      data: {
        handoverStatus: "HANDED_OVER",
        handoverNotes: JSON.stringify({ tests: data.tests, notes: data.notes ?? "" }),
        handoverAt: new Date(),
        status: project.status === "COMMISSIONING" ? "COMPLETED" : project.status,
        warrantyStart: project.warrantyStart ?? new Date(),
      },
    });
    await writeAudit(req, session, "UPDATE", "Project", id, { action: "handover" });
    await notifyAdmins("Project handed over", `${project.code} — ${project.name} was handed over to the customer.`, "PROJECT_UPDATE", `/admin/projects/${id}`);
    return ok(updated);
  });
}
