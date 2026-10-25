import { z } from "zod";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { handleRoute, ok, fail, notFound, requireAuth, parseBody, ApiError } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { CUSTOMER_STATUSES, CUSTOMER_TYPES, oneOf } from "@/lib/constants";

const updateSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  email: z.string().email("Invalid email").nullable().optional(),
  phone: z.string().max(30).nullable().optional(),
  address: z.string().max(300).nullable().optional(),
  type: z.string().refine(oneOf(CUSTOMER_TYPES, "Type")).optional(),
  status: z.string().refine(oneOf(CUSTOMER_STATUSES, "Status")).optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    await requireAuth(["customers", "portal"]);
    const { id } = await params;
    const customer = await db.customer.findUnique({
      where: { id },
      include: {
        projects: { select: { id: true, code: true, name: true, status: true, systemSizeKw: true } },
        invoices: { select: { id: true, invoiceNumber: true, status: true, totalCents: true, amountPaidCents: true, currency: true } },
        quotations: { select: { id: true, quoteNumber: true, status: true, totalCents: true, currency: true } },
        _count: { select: { serviceRequests: true, maintenanceJobs: true } },
      },
    });
    if (!customer) throw new ApiError("Customer not found", 404);
    return ok(customer);
  });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    const session = await requireAuth(["customers"]);
    const { id } = await params;
    const { data } = await parseBody(req, updateSchema);
    const existing = await db.customer.findUnique({ where: { id } });
    if (!existing) throw new ApiError("Customer not found", 404);
    const customer = await db.customer.update({ where: { id }, data });
    await writeAudit(req, session, "UPDATE", "Customer", id, data);
    return ok(customer);
  });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    const session = await requireAuth(["customers"]);
    const { id } = await params;
    const linked = await Promise.all([
      db.project.count({ where: { customerId: id } }),
      db.invoice.count({ where: { customerId: id } }),
      db.quotation.count({ where: { customerId: id } }),
    ]);
    if (linked.some((n) => n > 0)) {
      return fail("Cannot delete: customer has linked projects, quotations or invoices. Deactivate instead.", 409);
    }
    await db.customer.delete({ where: { id } });
    await writeAudit(req, session, "DELETE", "Customer", id);
    return ok({ deleted: true });
  });
}
