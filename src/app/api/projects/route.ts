import { z } from "zod";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { handleRoute, ok, requireAuth, parseBody, buildPagination, ApiError } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { getSettings, generateDocNumber } from "@/lib/settings";

export async function GET(req: NextRequest) {
  return handleRoute(async () => {
    const session = await requireAuth(["projects", "portal"]);
    const sp = new URL(req.url).searchParams;
    const { page, pageSize, skip, take } = buildPagination(sp);
    const status = sp.get("status") ?? undefined;
    const customerId = sp.get("customerId") ?? undefined;
    const q = sp.get("q")?.trim();

    // Role scoping: technicians see only projects they are assigned to;
    // customers see only their own projects (portal).
    let memberFilter;
    if (session.role === "TECHNICIAN") {
      memberFilter = { members: { some: { userId: session.sub } } };
    } else if (session.role === "CUSTOMER") {
      memberFilter = { customer: { userId: session.sub } };
    }
    const where = {
      ...(memberFilter ?? {}),
      ...(status ? { status } : {}),
      ...(customerId ? { customerId } : {}),
      ...(q ? { OR: [{ code: { contains: q } }, { name: { contains: q } }] } : {}),
    };
    const [items, total] = await Promise.all([
      db.project.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
        include: {
          customer: { select: { id: true, name: true } },
          members: { include: { user: { select: { id: true, name: true } } } },
          _count: { select: { tasks: true, photos: true, invoices: true } },
        },
      }),
      db.project.count({ where }),
    ]);
    return ok({ items, total, page, pageSize });
  });
}

const createSchema = z.object({
  name: z.string().min(2, "Project name is required").max(200),
  customerId: z.string().min(1, "Customer is required"),
  quotationId: z.string().nullable().optional(),
  startDate: z.coerce.date().nullable().optional(),
  endDate: z.coerce.date().nullable().optional(),
  budget: z.number().nonnegative().nullable().optional(),
  systemSizeKw: z.number().positive().nullable().optional(),
  address: z.string().max(300).nullable().optional(),
  description: z.string().max(3000).nullable().optional(),
  warrantyMonths: z.number().int().min(0).max(240).nullable().optional(),
});

export async function POST(req: NextRequest) {
  return handleRoute(async () => {
    const session = await requireAuth(["projects"]);
    const { data } = await parseBody(req, createSchema);
    const settings = await getSettings();
    const code = await generateDocNumber(settings.projectPrefix, "project");
    const project = await db.project.create({
      data: {
        code,
        name: data.name,
        customerId: data.customerId,
        quotationId: data.quotationId ?? null,
        startDate: data.startDate ?? null,
        endDate: data.endDate ?? null,
        budgetCents: data.budget != null ? Math.round(data.budget * 100) : null,
        currency: settings.currency,
        systemSizeKw: data.systemSizeKw ?? null,
        address: data.address ?? null,
        description: data.description ?? null,
        warrantyMonths: data.warrantyMonths ?? null,
        createdById: session.sub,
      },
    });
    await writeAudit(req, session, "CREATE", "Project", project.id, { code });
    return ok(project, { status: 201 });
  });
}
