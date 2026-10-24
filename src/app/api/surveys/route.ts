import { z } from "zod";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { handleRoute, ok, requireAuth, parseBody, buildPagination } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { SURVEY_STATUSES, oneOf } from "@/lib/constants";
import { getSettings, generateDocNumber } from "@/lib/settings";

export async function GET(req: NextRequest) {
  return handleRoute(async () => {
    const session = await requireAuth(["surveys"]);
    const sp = new URL(req.url).searchParams;
    const { page, pageSize, skip, take } = buildPagination(sp);
    const status = sp.get("status") ?? undefined;
    const customerId = sp.get("customerId") ?? undefined;
    const q = sp.get("q")?.trim();

    // Technicians only see surveys assigned to them
    const where = {
      ...(session.role === "TECHNICIAN" ? { assignedToId: session.sub } : {}),
      ...(status ? { status } : {}),
      ...(customerId ? { customerId } : {}),
      ...(q ? { customer: { name: { contains: q } } } : {}),
    };
    const [items, total] = await Promise.all([
      db.siteSurvey.findMany({
        where,
        orderBy: { scheduledAt: "desc" },
        skip,
        take,
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          assignedTo: { select: { id: true, name: true } },
          _count: { select: { quotations: true } },
        },
      }),
      db.siteSurvey.count({ where }),
    ]);
    return ok({ items, total, page, pageSize });
  });
}

const createSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  scheduledAt: z.coerce.date({ message: "Scheduled date is required" }),
  location: z.string().max(300).nullable().optional(),
  propertyType: z.string().max(50).nullable().optional(),
  roofType: z.string().max(100).nullable().optional(),
  roofAreaSqm: z.number().positive().nullable().optional(),
  avgMonthlyKwh: z.number().nonnegative().nullable().optional(),
  energyNotes: z.string().max(5000).nullable().optional(),
  assignedToId: z.string().nullable().optional(),
});

export async function POST(req: NextRequest) {
  return handleRoute(async () => {
    const session = await requireAuth(["surveys"]);
    const { data } = await parseBody(req, createSchema);
    const settings = await getSettings();
    const survey = await db.siteSurvey.create({
      data: { ...data, createdById: session.sub },
      include: { customer: { select: { id: true, name: true } }, assignedTo: { select: { id: true, name: true } } },
    });
    await writeAudit(req, session, "CREATE", "SiteSurvey", survey.id);
    return ok(survey, { status: 201 });
  });
}

const updateSchema = z.object({
  scheduledAt: z.coerce.date().optional(),
  status: z.string().refine(oneOf(SURVEY_STATUSES, "Status")).optional(),
  location: z.string().max(300).nullable().optional(),
  propertyType: z.string().max(50).nullable().optional(),
  roofType: z.string().max(100).nullable().optional(),
  roofAreaSqm: z.number().positive().nullable().optional(),
  avgMonthlyKwh: z.number().nonnegative().nullable().optional(),
  energyNotes: z.string().max(5000).nullable().optional(),
  sitePhotos: z.string().max(10000).nullable().optional(),
  assignedToId: z.string().nullable().optional(),
  completedAt: z.coerce.date().nullable().optional(),
});

export async function PUT(req: NextRequest) {
  return handleRoute(async () => {
    const session = await requireAuth(["surveys"]);
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return ok({ error: "id query parameter is required" }, { status: 400 });
    const { data } = await parseBody(req, updateSchema);
    if (data.status === "COMPLETED" && !data.completedAt) data.completedAt = new Date();
    const existing = await db.siteSurvey.findUnique({ where: { id } });
    if (!existing) return ok({ error: "Survey not found" }, { status: 404 });
    // Technicians can only update surveys assigned to them
    if (session.role === "TECHNICIAN" && existing.assignedToId !== session.sub) {
      return ok({ error: "You can only update surveys assigned to you" }, { status: 403 });
    }
    const survey = await db.siteSurvey.update({ where: { id }, data });
    await writeAudit(req, session, "UPDATE", "SiteSurvey", id, data);
    return ok(survey);
  });
}

export async function DELETE(req: NextRequest) {
  return handleRoute(async () => {
    const session = await requireAuth(["surveys"]);
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return ok({ error: "id query parameter is required" }, { status: 400 });
    const linkedQuotes = await db.quotation.count({ where: { surveyId: id } });
    if (linkedQuotes > 0) {
      return ok({ error: "Cannot delete: survey has linked quotations. Cancel it instead." }, { status: 409 });
    }
    await db.siteSurvey.delete({ where: { id } });
    await writeAudit(req, session, "DELETE", "SiteSurvey", id);
    return ok({ deleted: true });
  });
}
