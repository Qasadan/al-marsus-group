import { z } from "zod";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { handleRoute, ok, requireAuth, parseBody, buildPagination, ApiError } from "@/lib/api";
import { writeAudit, notifyAdmins } from "@/lib/audit";
import { SERVICE_REQUEST_STATUSES, SERVICE_REQUEST_PRIORITIES, oneOf } from "@/lib/constants";
import { getSettings, generateDocNumber } from "@/lib/settings";

export async function GET(req: NextRequest) {
  return handleRoute(async () => {
    const session = await requireAuth(["service-requests"]);
    const sp = new URL(req.url).searchParams;
    const { page, pageSize, skip, take } = buildPagination(sp);
    const status = sp.get("status") ?? undefined;
    const customerId = sp.get("customerId") ?? undefined;
    const where = {
      ...(session.role === "TECHNICIAN" ? { assignedTechnicianId: session.sub } : {}),
      ...(status ? { status } : {}),
      ...(customerId ? { customerId } : {}),
    };
    const [items, total] = await Promise.all([
      db.serviceRequest.findMany({
        where,
        orderBy: { requestedAt: "desc" },
        skip,
        take,
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          project: { select: { id: true, code: true, name: true } },
          assignedTechnician: { select: { id: true, name: true } },
        },
      }),
      db.serviceRequest.count({ where }),
    ]);
    return ok({ items, total, page, pageSize });
  });
}

const createSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  projectId: z.string().nullable().optional(),
  issue: z.string().min(3, "Issue summary is required").max(300),
  description: z.string().max(3000).nullable().optional(),
  priority: z.string().refine(oneOf(SERVICE_REQUEST_PRIORITIES, "Priority")).default("MEDIUM"),
});

export async function POST(req: NextRequest) {
  return handleRoute(async () => {
    const session = await requireAuth(["service-requests"]);
    const { data } = await parseBody(req, createSchema);
    const settings = await getSettings();
    const code = await generateDocNumber(settings.serviceRequestPrefix, "serviceRequest");
    const record = await db.serviceRequest.create({
      data: {
        code,
        customerId: data.customerId,
        projectId: data.projectId ?? null,
        issue: data.issue,
        description: data.description ?? null,
        priority: data.priority,
      },
      include: {
        customer: { select: { id: true, name: true } },
        project: { select: { id: true, code: true, name: true } },
        assignedTechnician: { select: { id: true, name: true } },
      },
    });
    await writeAudit(req, session, "CREATE", "ServiceRequest", record.id, { code });
    await notifyAdmins("New service request", `${code}: ${data.issue}`, "SERVICE_REQUEST", "/admin/service-requests");
    return ok(record, { status: 201 });
  });
}

const updateSchema = z.object({
  status: z.string().refine(oneOf(SERVICE_REQUEST_STATUSES, "Status")).optional(),
  assignedTechnicianId: z.string().nullable().optional(),
  priority: z.string().refine(oneOf(SERVICE_REQUEST_PRIORITIES, "Priority")).optional(),
  resolutionNotes: z.string().max(5000).nullable().optional(),
});

export async function PUT(req: NextRequest) {
  return handleRoute(async () => {
    const session = await requireAuth(["service-requests"]);
    const id = new URL(req.url).searchParams.get("id");
    if (!id) throw new ApiError("id query parameter is required", 400);
    const { data } = await parseBody(req, updateSchema);
    const existing = await db.serviceRequest.findUnique({ where: { id } });
    if (!existing) throw new ApiError("Service request not found", 404);
    if (session.role === "TECHNICIAN" && existing.assignedTechnicianId !== session.sub) {
      return ok({ error: "You can only update requests assigned to you" }, { status: 403 });
    }
    const record = await db.serviceRequest.update({
      where: { id },
      data: {
        ...data,
        ...(data.assignedTechnicianId && existing.status === "OPEN" ? { status: "ASSIGNED" } : {}),
        ...(data.status === "RESOLVED" ? { resolvedAt: new Date() } : {}),
      },
    });
    await writeAudit(req, session, "UPDATE", "ServiceRequest", id, data);
    return ok(record);
  });
}
