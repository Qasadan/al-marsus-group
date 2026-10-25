import { z } from "zod";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { handleRoute, ok, requireAuth, parseBody, buildPagination } from "@/lib/api";
import { writeAudit, notifyAdmins } from "@/lib/audit";
import { LEAD_SOURCES, LEAD_STATUSES, oneOf } from "@/lib/constants";
import { DIVISION_CODES } from "@/lib/divisions";

export async function GET(req: NextRequest) {
  return handleRoute(async () => {
    await requireAuth(["leads"]);
    const sp = new URL(req.url).searchParams;
    const { page, pageSize, skip, take } = buildPagination(sp);
    const q = sp.get("q")?.trim();
    const status = sp.get("status") ?? undefined;
    const where = {
      ...(q ? { OR: [{ name: { contains: q } }, { phone: { contains: q } }, { email: { contains: q } }] } : {}),
      ...(status ? { status } : {}),
    };
    const [items, total] = await Promise.all([
      db.lead.findMany({
        where,
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
        skip,
        take,
        include: { convertedCustomer: { select: { id: true, name: true } }, quoteRequest: { select: { id: true, name: true } } },
      }),
      db.lead.count({ where }),
    ]);
    return ok({ items, total, page, pageSize });
  });
}

const createSchema = z.object({
  name: z.string().min(2, "Name is required").max(200),
  email: z.string().email("Invalid email").nullable().optional(),
  phone: z.string().min(7, "Phone is required").max(30),
  division: z.enum(DIVISION_CODES).nullable().optional(),
  source: z.string().refine(oneOf(LEAD_SOURCES, "Source")).default("WEBSITE"),
  status: z.string().refine(oneOf(LEAD_STATUSES, "Status")).default("NEW"),
  notes: z.string().max(2000).nullable().optional(),
  nextFollowUpAt: z.coerce.date().nullable().optional(),
});

export async function POST(req: NextRequest) {
  return handleRoute(async () => {
    const session = await requireAuth(["leads"]);
    const { data } = await parseBody(req, createSchema);
    const lead = await db.lead.create({ data });
    await writeAudit(req, session, "CREATE", "Lead", lead.id, { name: lead.name });
    return ok(lead, { status: 201 });
  });
}

const updateSchema = z.object({
  status: z.string().refine(oneOf(LEAD_STATUSES, "Status")),
  notes: z.string().max(2000).nullable().optional(),
  nextFollowUpAt: z.coerce.date().nullable().optional(),
  assignedToId: z.string().nullable().optional(),
});

// Update lead status / follow-up. ?id= required
export async function PUT(req: NextRequest) {
  return handleRoute(async () => {
    const session = await requireAuth(["leads"]);
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return ok({ error: "id query parameter is required" }, { status: 400 });
    const { data } = await parseBody(req, updateSchema);
    const lead = await db.lead.update({ where: { id }, data });
    await writeAudit(req, session, "UPDATE", "Lead", id, data);
    if (data.status === "CONVERTED") {
      await notifyAdmins("Lead converted", `Lead "${lead.name}" was marked converted.`, "SYSTEM", "/admin/leads");
    }
    return ok(lead);
  });
}

export async function DELETE(req: NextRequest) {
  return handleRoute(async () => {
    const session = await requireAuth(["leads"]);
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return ok({ error: "id query parameter is required" }, { status: 400 });
    await db.lead.delete({ where: { id } });
    await writeAudit(req, session, "DELETE", "Lead", id);
    return ok({ deleted: true });
  });
}

// Convert a lead into a customer: POST /api/leads?id=xxx
export async function PATCH(req: NextRequest) {
  return handleRoute(async () => {
    const session = await requireAuth(["leads"]);
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return ok({ error: "id query parameter is required" }, { status: 400 });
    const lead = await db.lead.findUnique({ where: { id } });
    if (!lead) return ok({ error: "Lead not found" }, { status: 404 });
    if (lead.convertedCustomerId) return ok({ error: "Lead already converted" }, { status: 409 });
    const customer = await db.customer.create({
      data: {
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        notes: lead.notes ?? null,
      },
    });
    const updated = await db.lead.update({
      where: { id },
      data: { status: "CONVERTED", convertedCustomerId: customer.id },
    });
    await writeAudit(req, session, "CONVERT", "Lead", id, { customerId: customer.id });
    return ok({ lead: updated, customer });
  });
}
