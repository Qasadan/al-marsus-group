import { z } from "zod";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { handleRoute, ok, fail, requireAuth, parseBody, ApiError } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { PROJECT_STATUSES, PROJECT_TRANSITIONS, oneOf } from "@/lib/constants";

async function loadProjectForSession(id: string, sessionSub: string, role: string) {
  const project = await db.project.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, name: true, phone: true, email: true, address: true } },
      quotation: { select: { id: true, quoteNumber: true, totalCents: true, currency: true } },
      members: { include: { user: { select: { id: true, name: true, email: true } } } },
      tasks: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], include: { assignedTo: { select: { id: true, name: true } } } },
      photos: { orderBy: { createdAt: "desc" } },
      invoices: { select: { id: true, invoiceNumber: true, status: true, totalCents: true, amountPaidCents: true, currency: true, issueDate: true } },
      expenses: { select: { id: true, description: true, amountCents: true, currency: true, category: true, expenseDate: true } },
      maintenanceJobs: { orderBy: { scheduledDate: "desc" } },
    },
  });
  if (!project) throw new ApiError("Project not found", 404);
  if (role === "TECHNICIAN") {
    const isMember = project.members.some((m) => m.userId === sessionSub);
    if (!isMember) throw new ApiError("You are not assigned to this project", 403);
  } else if (role === "CUSTOMER") {
    const own = await db.customer.findUnique({ where: { userId: sessionSub }, select: { id: true } });
    if (!own || project.customerId !== own.id) throw new ApiError("Not your project", 403);
  }
  return project;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    const session = await requireAuth(["projects", "portal"]);
    const { id } = await params;
    const project = await loadProjectForSession(id, session.sub, session.role);
    return ok(project);
  });
}

const updateSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  status: z.string().refine(oneOf(PROJECT_STATUSES, "Status")).optional(),
  startDate: z.coerce.date().nullable().optional(),
  endDate: z.coerce.date().nullable().optional(),
  budget: z.number().nonnegative().nullable().optional(),
  systemSizeKw: z.number().positive().nullable().optional(),
  address: z.string().max(300).nullable().optional(),
  description: z.string().max(3000).nullable().optional(),
  warrantyMonths: z.number().int().min(0).max(240).nullable().optional(),
});

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    const session = await requireAuth(["projects"]);
    const { id } = await params;
    const { data } = await parseBody(req, updateSchema);
    const project = await db.project.findUnique({ where: { id } });
    if (!project) throw new ApiError("Project not found", 404);

    // Validate workflow status transitions
    if (data.status && data.status !== project.status) {
      const allowed = PROJECT_TRANSITIONS[project.status] ?? [];
      if (!allowed.includes(data.status)) {
        return fail(`Invalid status transition: ${project.status} → ${data.status}. Allowed: ${allowed.join(", ") || "none"}`, 409);
      }
    }

    const { budget, ...rest } = data;
    const updated = await db.project.update({
      where: { id },
      data: {
        ...rest,
        ...(budget != null ? { budgetCents: Math.round(budget * 100) } : {}),
        ...(data.status === "COMPLETED" && !project.warrantyStart && project.warrantyMonths
          ? { warrantyStart: new Date() }
          : {}),
      },
    });
    await writeAudit(req, session, data.status ? "STATUS_CHANGE" : "UPDATE", "Project", id, data);
    return ok(updated);
  });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    const session = await requireAuth(["projects"]);
    const { id } = await params;
    const linkedInvoices = await db.invoice.count({ where: { projectId: id } });
    if (linkedInvoices > 0) {
      return fail("Cannot delete: project has invoices. Cancel it instead.", 409);
    }
    await db.project.delete({ where: { id } });
    await writeAudit(req, session, "DELETE", "Project", id);
    return ok({ deleted: true });
  });
}
