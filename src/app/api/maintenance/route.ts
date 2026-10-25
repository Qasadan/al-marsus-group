import { z } from "zod";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { handleRoute, ok, requireAuth, parseBody, buildPagination, ApiError } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { MAINTENANCE_STATUSES, MAINTENANCE_TYPES, toCents, oneOf } from "@/lib/constants";
import { getSettings, generateDocNumber } from "@/lib/settings";

export async function GET(req: NextRequest) {
  return handleRoute(async () => {
    const session = await requireAuth(["maintenance"]);
    const sp = new URL(req.url).searchParams;
    const { page, pageSize, skip, take } = buildPagination(sp);
    const status = sp.get("status") ?? undefined;
    const customerId = sp.get("customerId") ?? undefined;
    const projectId = sp.get("projectId") ?? undefined;
    const upcoming = sp.get("upcoming") === "true";
    const overdue = sp.get("overdue") === "true";
    const now = new Date();

    const baseWhere = {
      // Technicians see only jobs assigned to them
      ...(session.role === "TECHNICIAN" ? { technicianId: session.sub } : {}),
      ...(status ? { status } : {}),
      ...(customerId ? { customerId } : {}),
      ...(projectId ? { projectId } : {}),
      ...(upcoming
        ? { status: "SCHEDULED", scheduledDate: { gte: now, lte: new Date(now.getTime() + 30 * 86400_000) } }
        : {}),
      ...(overdue ? { status: "SCHEDULED", scheduledDate: { lt: now } } : {}),
    };
    const [items, total] = await Promise.all([
      db.maintenanceRecord.findMany({
        where: baseWhere,
        orderBy: { scheduledDate: "desc" },
        skip,
        take,
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          project: { select: { id: true, code: true, name: true } },
          technician: { select: { id: true, name: true } },
        },
      }),
      db.maintenanceRecord.count({ where: baseWhere }),
    ]);
    return ok({ items, total, page, pageSize });
  });
}

const createSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  projectId: z.string().nullable().optional(),
  type: z.string().refine(oneOf(MAINTENANCE_TYPES, "Type")).default("ROUTINE"),
  scheduledDate: z.coerce.date({ message: "Scheduled date is required" }),
  technicianId: z.string().nullable().optional(),
  warrantyCovered: z.boolean().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export async function POST(req: NextRequest) {
  return handleRoute(async () => {
    const session = await requireAuth(["maintenance"]);
    const { data } = await parseBody(req, createSchema);
    const settings = await getSettings();
    const code = await generateDocNumber(settings.maintenancePrefix, "maintenanceRecord");
    const record = await db.maintenanceRecord.create({
      data: {
        code,
        customerId: data.customerId,
        projectId: data.projectId ?? null,
        type: data.type,
        scheduledDate: data.scheduledDate,
        technicianId: data.technicianId ?? null,
        warrantyCovered: data.warrantyCovered ?? null,
        findings: data.notes ?? null,
      },
      include: {
        customer: { select: { id: true, name: true } },
        project: { select: { id: true, code: true, name: true } },
        technician: { select: { id: true, name: true } },
      },
    });
    await writeAudit(req, session, "CREATE", "MaintenanceRecord", record.id, { code });
    return ok(record, { status: 201 });
  });
}

const updateSchema = z.object({
  status: z.string().refine(oneOf(MAINTENANCE_STATUSES, "Status")).optional(),
  scheduledDate: z.coerce.date().optional(),
  technicianId: z.string().nullable().optional(),
  findings: z.string().max(5000).nullable().optional(),
  actionsTaken: z.string().max(5000).nullable().optional(),
  partsUsed: z.string().max(2000).nullable().optional(),
  cost: z.number().nonnegative().nullable().optional(),
  warrantyCovered: z.boolean().nullable().optional(),
  completedDate: z.coerce.date().nullable().optional(),
});

export async function PUT(req: NextRequest) {
  return handleRoute(async () => {
    const session = await requireAuth(["maintenance"]);
    const id = new URL(req.url).searchParams.get("id");
    if (!id) throw new ApiError("id query parameter is required", 400);
    const { data } = await parseBody(req, updateSchema);
    const existing = await db.maintenanceRecord.findUnique({ where: { id } });
    if (!existing) throw new ApiError("Maintenance record not found", 404);
    if (session.role === "TECHNICIAN" && existing.technicianId !== session.sub) {
      return ok({ error: "You can only update maintenance jobs assigned to you" }, { status: 403 });
    }
    const { cost, ...rest } = data;
    const record = await db.maintenanceRecord.update({
      where: { id },
      data: {
        ...rest,
        ...(cost != null ? { costCents: toCents(cost) } : {}),
        ...(data.status === "COMPLETED" && !existing.completedDate ? { completedDate: new Date() } : {}),
      },
    });
    await writeAudit(req, session, "UPDATE", "MaintenanceRecord", id, data);
    return ok(record);
  });
}
