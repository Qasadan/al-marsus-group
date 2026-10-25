import { z } from "zod";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { handleRoute, ok, requireAuth, parseBody, ApiError } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { TASK_STATUSES, TASK_PRIORITIES, MEMBER_ROLES, oneOf } from "@/lib/constants";

// ---------- Tasks: /api/projects/[id]/tasks ----------

const taskCreateSchema = z.object({
  title: z.string().min(2, "Task title is required").max(200),
  description: z.string().max(2000).nullable().optional(),
  priority: z.string().refine(oneOf(TASK_PRIORITIES, "Priority")).default("MEDIUM"),
  assignedToId: z.string().nullable().optional(),
  dueDate: z.coerce.date().nullable().optional(),
  sortOrder: z.number().int().default(0),
});

const taskUpdateSchema = z.object({
  status: z.string().refine(oneOf(TASK_STATUSES, "Status")).optional(),
  progressNote: z.string().max(2000).optional(),
});

// POST: create task | PUT: update task status (?taskId=)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    const session = await requireAuth(["projects"]);
    const { id } = await params;
    const project = await db.project.findUnique({ where: { id } });
    if (!project) throw new ApiError("Project not found", 404);
    const { data } = await parseBody(req, taskCreateSchema);
    const task = await db.task.create({
      data: { ...data, projectId: id },
      include: { assignedTo: { select: { id: true, name: true } } },
    });
    await writeAudit(req, session, "CREATE", "Task", task.id, { projectId: id, title: task.title });
    return ok(task, { status: 201 });
  });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    const session = await requireAuth(["projects", "tasks"]);
    const { id } = await params;
    const taskId = new URL(req.url).searchParams.get("taskId");
    if (!taskId) throw new ApiError("taskId query parameter is required", 400);
    const task = await db.task.findUnique({ where: { id: taskId } });
    if (!task || task.projectId !== id) throw new ApiError("Task not found", 404);

    // Technicians can update tasks assigned to them (or unassigned) on their projects
    if (session.role === "TECHNICIAN") {
      const member = await db.projectMember.findFirst({ where: { projectId: id, userId: session.sub } });
      if (!member) throw new ApiError("You are not assigned to this project", 403);
      if (task.assignedToId && task.assignedToId !== session.sub) {
        throw new ApiError("This task is assigned to another technician", 403);
      }
    }

    const { data: taskUpd } = await parseBody(req, taskUpdateSchema);
    const status = taskUpd.status as string | undefined;
    const progressNote = taskUpd.progressNote as string | undefined;
    const updated = await db.task.update({
      where: { id: taskId },
      data: {
        ...(status ? { status, ...(status === "DONE" ? { completedAt: new Date() } : {}) } : {}),
        ...(progressNote ? { description: progressNote } : {}),
      },
    });

    // Recalculate project progress from task completion
    const counts = await db.task.groupBy({ by: ["status"], where: { projectId: id }, _count: true });
    const total = counts.reduce((s, c) => s + c._count, 0);
    const done = counts.find((c) => c.status === "DONE")?._count ?? 0;
    const progress = total > 0 ? Math.round((done / total) * 100) : 0;
    await db.project.update({ where: { id }, data: { progress } });

    await writeAudit(req, session, "STATUS_CHANGE", "Task", taskId, { status, projectId: id });
    return ok({ task: updated, projectProgress: progress });
  });
}
